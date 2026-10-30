// Strict sanitizer for the public /kantor/ feed. Every free-text value must pass every rule,
// otherwise the publisher refuses to write or push anything. Rules err on the side of rejecting.

export const LIMITS = {
  name: 40, role: 40, task_summary: 120, title: 120, text: 160, status_text: 24,
  agents: 40, work: 20, alerts: 10, decisions: 10, servers: 10
};

const RULES = [
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['at-handle', /(^|\s)@[A-Za-z0-9_.-]{2,}/],
  ['ipv4', /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
  ['ipv6', /(?:\b[0-9a-f]{1,4}:){3,7}[0-9a-f]{0,4}\b|\b[0-9a-f]{0,4}::[0-9a-f]{0,4}(?::[0-9a-f]{0,4})*/i],
  ['url-with-credentials-or-query', /\b(?:https?|ftp|ssh|git):\/\/[^\s]*[?#@]/i],
  ['url-private-host', /\b(?:localhost|127\.0\.0\.1|10\.\d|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i],
  ['secret-word', /\b(pass(?:word|wd|code|phrase)?|kata ?sandi|sandi|pwd|token|secret|rahasia|api[ _-]?key|apikey|private[ _-]?key|bearer|credentials?|kredensial|otp|pin|cookie|session[ _-]?id)\b/i],
  ['assignment', /\b\w*(?:key|token|secret|pass\w*|auth\w*|sig\w*)\s*[=:]/i],
  ['token-prefix', /\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|xox[abpsr]-|sk-[A-Za-z0-9]|AKIA[0-9A-Z]{8}|AIza[0-9A-Za-z_-]{8})|-----BEGIN/],
  ['long-hex', /\b[0-9a-f]{24,}\b/i],
  ['long-base64', /[A-Za-z0-9+/_=-]{32,}/],
  ['money', /(?:\b(?:rp|idr|usd|sgd|eur)\s?\.?\s?\d)|[$€£¥]\s?\d|\d[\d.,]*\s?(?:rb|ribu|jt|juta|miliar|milyar|triliun)\b/i]
];

// phone numbers: +62 / 62 / 08 formats, and any run that holds 9+ digits with separators
function phone(s) {
  if (/(?:\+\s?62|\b62|\b0)\s?8[\d\s().-]{6,}\d/.test(s)) return true;
  const runs = s.match(/[+\d][\d\s().-]{6,}\d/g) || [];
  return runs.some((r) => (r.match(/\d/g) || []).length >= 9);
}

function escapeRe(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function makeChecker(privateRepos = []) {
  const repos = [...new Set(privateRepos.map((r) => String(r).split('/').pop().toLowerCase()).filter((r) => r.length >= 4))];
  const repoRes = repos.map((r) => [r, new RegExp('(?<![A-Za-z0-9_.-])' + escapeRe(r) + '(?![A-Za-z0-9_-])', 'i')]);
  return function check(s) {
    const hits = [];
    for (const [name, re] of RULES) if (re.test(s)) hits.push(name);
    if (phone(s)) hits.push('phone');
    for (const [r, re] of repoRes) if (re.test(s)) { hits.push('private-repo'); break; }
    return hits;
  };
}

// normalise a free-text value: drop control chars, collapse whitespace, cap length
export function clean(v, max) {
  if (v === undefined || v === null) return undefined;
  let s = String(v).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return undefined;
  if (s.length > max) s = s.slice(0, max - 1).trimEnd() + '…';
  return s;
}

// walk every string in the finished feed; returns [{path, rules, preview}] (preview never shows the value)
export function scan(obj, check, path = '$') {
  const out = [];
  if (typeof obj === 'string') {
    const hits = check(obj);
    if (hits.length) out.push({ path, rules: hits, preview: obj.slice(0, 3) + '… (' + obj.length + ' chars)' });
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...scan(v, check, path + '[' + i + ']')));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (/(_at|^since)$/.test(k) && typeof v === 'string') { if (!ISO.test(v)) out.push({ path: path + '.' + k, rules: ['bad-timestamp'], preview: '' }); continue; }
      out.push(...scan(v, check, path + '.' + k));
    }
  }
  return out;
}

export const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/;
