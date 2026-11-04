#!/usr/bin/env node
// Kantor Jerco feed publisher. Run from a box where `gh` is logged in as indra-boop.
//
//   node tools/kantor-feed/publish.mjs --input my-input.json                 # build + sanitize, print to stdout
//   node tools/kantor-feed/publish.mjs --input my-input.json --out feed.json # write file
//   node tools/kantor-feed/publish.mjs --input my-input.json --push          # commit feed.json to branch kantor-feed (PUBLIC)
//
// Refuses (exit 2) when any value trips the sanitizer; nothing is written or pushed then.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeChecker, scan } from './sanitize.mjs';
import { buildFeed } from './build.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const has = (k) => args.includes(k);
const OWNER = opt('--owner') || 'indra-boop';
const STATUS_REPO = opt('--status-repo') || process.env.KANTOR_STATUS_REPO || '';
const SITE_REPO = opt('--site-repo') || OWNER + '/Jerco-website';
const BRANCH = opt('--branch') || 'kantor-feed';
const HOSTS = (opt('--hosts') || process.env.KANTOR_HOSTS || '').split(',').filter(Boolean);

function gh(a) { return execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 << 20 }); }
function die(msg, code = 1) { process.stderr.write('[kantor-feed] ' + msg + '\n'); process.exit(code); }

const inputPath = opt('--input');
if (!inputPath) die('pakai --input <file.json> (lihat tools/kantor-feed/input.example.json)');
let input;
try { input = JSON.parse(readFileSync(inputPath, 'utf8')); } catch (e) { die('input tidak bisa dibaca: ' + e.message); }

// VPS status from the private status/<host> branches (read-only API calls via gh)
const statuses = {}, runnerRepos = [];
if (!has('--no-servers') && (!STATUS_REPO || !HOSTS.length)) die('set --status-repo/KANTOR_STATUS_REPO dan --hosts/KANTOR_HOSTS (atau --no-servers)');
if (!has('--no-servers')) {
  for (const h of HOSTS) {
    try {
      const b64 = gh(['api', `repos/${STATUS_REPO}/contents/status.json?ref=status/${h}`, '-q', '.content']);
      const st = JSON.parse(Buffer.from(b64.replace(/\s/g, ''), 'base64').toString('utf8'));
      statuses[h] = st;
      for (const r of st.runners || []) if (r && r.repo) runnerRepos.push(r.repo);
    } catch (e) {
      process.stderr.write(`[kantor-feed] status ${h} tidak terbaca, ditandai offline\n`);
      statuses[h] = {};
    }
  }
}

// private repo names are forbidden anywhere in the feed: fail closed if the list cannot be read
let privateRepos;
try {
  privateRepos = gh(['repo', 'list', OWNER, '--visibility', 'private', '--limit', '1000', '--json', 'name', '-q', '.[].name']).split('\n').filter(Boolean);
} catch (e) { die('daftar repo private tidak terbaca (gh login?), feed tidak dipublikasikan'); }
privateRepos = privateRepos.concat(runnerRepos, STATUS_REPO ? [STATUS_REPO] : []);

let feed;
try { feed = buildFeed(input, statuses); } catch (e) { die('input ditolak: ' + e.message); }

const problems = scan(feed, makeChecker(privateRepos));
// host names used as server display names are checked too (they must not be private repo names either)
if (problems.length) {
  process.stderr.write('[kantor-feed] DITOLAK, data sensitif terdeteksi (nilai tidak ditampilkan):\n');
  for (const p of problems) process.stderr.write(`  ${p.path}: ${p.rules.join(', ')}  ${p.preview}\n`);
  process.exit(2);
}
const json = JSON.stringify(feed, null, 2) + '\n';
if (Buffer.byteLength(json) > 64 * 1024) die('feed > 64 KB, ditolak');

if (opt('--out')) { writeFileSync(opt('--out'), json); process.stderr.write('[kantor-feed] ditulis ke ' + opt('--out') + '\n'); }
if (!has('--push')) { if (!opt('--out')) process.stdout.write(json); process.exit(0); }

// --push: commit feed.json (only that file) to the dedicated public branch
const dir = mkdtempSync(join(tmpdir(), 'kantor-feed-'));
const git = (a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  let exists = true;
  try { gh(['api', `repos/${SITE_REPO}/branches/${BRANCH}`, '-q', '.name']); } catch { exists = false; }
  if (exists) {
    execFileSync('gh', ['repo', 'clone', SITE_REPO, dir, '--', '--depth', '1', '--branch', BRANCH, '-q'], { stdio: 'ignore' });
  } else {
    execFileSync('gh', ['repo', 'clone', SITE_REPO, dir, '--', '--depth', '1', '-q'], { stdio: 'ignore' });
    git(['checkout', '-q', '--orphan', BRANCH]);
    git(['rm', '-rq', '--cached', '.']);
    git(['clean', '-qfdx']);
  }
  const extra = git(['ls-files']).split('\n').filter((f) => f && f !== 'feed.json');
  if (extra.length) die('branch ' + BRANCH + ' berisi file lain selain feed.json, berhenti');
  const old = existsSync(join(dir, 'feed.json')) ? readFileSync(join(dir, 'feed.json'), 'utf8') : '';
  const strip = (s) => s.replace(/"updated_at": "[^"]*"/, '');
  if (old && strip(old) === strip(json) && Date.now() - Date.parse(JSON.parse(old).updated_at) < 10 * 60000) {
    process.stderr.write('[kantor-feed] tidak ada perubahan, tidak di-push\n'); process.exit(0);
  }
  writeFileSync(join(dir, 'feed.json'), json);
  git(['add', 'feed.json']);
  git(['-c', 'user.name=kantor-feed', '-c', 'user.email=kantor-feed@users.noreply.github.com', 'commit', '-qm', 'kantor feed ' + feed.updated_at]);
  git(['push', '-q', 'origin', BRANCH]);
  process.stderr.write('[kantor-feed] di-push ke ' + SITE_REPO + '@' + BRANCH + '\n');
} finally { rmSync(dir, { recursive: true, force: true }); }
