import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeChecker, clean, scan } from './sanitize.mjs';
import { buildFeed, serverEntry } from './build.mjs';

const check = makeChecker(['private-status-repo', 'example-owner/secret-billing', 'zephyrine']);
const bad = {
  email: 'kirim ke indra@example.com', phone62: 'hubungi +62 812-3456-7890', phone08: 'WA 0812 3456 7890', phone628: 'nomor 6281234567890',
  ipv4: 'server 203.0.113.10 down', ipv6: 'alamat 2001:db8:85a3::8a2e:370:7334', url: 'lihat https://x.io/a?token=abc',
  password: 'password server diganti', sandi: 'kata sandi baru', token: 'token GitHub kedaluwarsa', keyeq: 'pakai api_key=abc', secret: 'secret baru',
  hex: 'commit 3f9a1c2b4d5e6f708192a3b4c5d6e7f8', b64: 'nilai QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo0NTY3', ghp: 'ghp_abcdef',
  repo: 'deploy secret-billing selesai', repo2: 'backup ke private-status-repo', repo3: 'proyek Zephyrine jalan', money: 'tagihan Rp 1.500.000', money2: 'nilai 25 juta', money3: 'biaya $40'
};
for (const [k, v] of Object.entries(bad)) test('reject ' + k, () => assert.ok(check(v).length > 0, v));

const good = ['Merapikan server redundansi dan menyiapkan feed kantor.', 'Revisi tampilan halaman harga partneraiku untuk PT Contoh', 'Rapat jam 14:30 tanggal 30-10-2026', 'Uji 3 model lokal, 23 runner online', 'Server CI & AI'];
for (const v of good) test('accept: ' + v, () => assert.deepEqual(check(v), []));

test('clean caps and strips control chars', () => {
  assert.equal(clean('a\u0000b\n  c', 40), 'a b c');
  assert.equal(clean('x'.repeat(200), 120).length, 120);
});

test('scan reports path without the value', () => {
  const r = scan({ agents: [{ task_summary: 'email a@b.co' }] }, check);
  assert.equal(r[0].path, '$.agents[0].task_summary');
  assert.ok(!r[0].preview.includes('a@b.co'));
});

test('buildFeed whitelists fields and rejects unknown codes', () => {
  const now = Date.parse('2026-10-30T07:30:00Z');
  const f = buildFeed({ agents: [{ id: 'GK', status: 'working', task_summary: 'ok', phone: '0812' }] }, {}, now);
  assert.deepEqual(Object.keys(f.agents[0]).sort(), ['id', 'status', 'task_summary', 'updated_at']);
  assert.throws(() => buildFeed({ agents: [{ id: 'XX', status: 'working' }] }, {}, now));
});

test('serverEntry keeps only counts', () => {
  const now = Date.parse('2026-10-30T07:30:00Z');
  const s = serverEntry({ time: '2026-10-30T07:20:00Z', mem_pct: 12, disk_pct: 26, services: { ollama: 'active' },
    runners: [{ name: 'linode-x', repo: 'example-owner/zephyrine', busy: true, state: 'active' }, { repo: 'a/b', state: 'paused' }] }, 'Server CI & AI', now);
  assert.deepEqual(s, { name: 'Server CI & AI', online: true, mem_pct: 12, disk_pct: 26, runners_total: 2, runners_busy: 1, runners_paused: 1, ai_up: true });
  assert.equal(serverEntry({ time: '2026-10-30T06:00:00Z' }, 'x', now).online, false);
});
