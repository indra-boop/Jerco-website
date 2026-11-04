// Builds the public feed from a local input file and the VPS status JSONs, whitelisting every field.
import { LIMITS, clean, ISO } from './sanitize.mjs';

// existing roster codes in kantor/src/app.js (defaultAgents)
export const CODES = ['GK', 'PM', 'SA', 'UX', 'UI', 'SV', 'RV', 'RAG', 'FE', 'BE', 'AI', 'AU', 'DO', 'GV', 'RT', 'HK', 'SE', 'PR', 'BD', 'SL', 'FN', 'IZ', 'QA', 'NA', 'FO', 'BQ', 'DC'];
const ZONES = ['command', 'studio', 'commercial', 'knowledge', 'engineering', 'trust', 'field'];
const STATUS = ['idle', 'working', 'waiting_decision', 'alert'];
const LEVELS = ['info', 'warning', 'critical'];
const STALE_MIN = 30;

function ts(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const d = new Date(v);
  if (isNaN(d)) throw new Error('timestamp tidak valid: ' + String(v).slice(0, 30));
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
function code(v) { return CODES.includes(v) ? v : undefined; }
function pct(v) { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null; }
function drop(o) { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; }

export function serverEntry(st, displayName, now) {
  const age = (now - Date.parse(st && st.time)) / 60000;
  const runners = Array.isArray(st && st.runners) ? st.runners : [];
  const paused = runners.filter((r) => r && (r.paused === true || r.state === 'paused' || r.accepting === false)).length;
  const ollama = st && st.services ? st.services.ollama : undefined;
  return {
    name: clean(displayName, LIMITS.name),
    online: Number.isFinite(age) && age >= -5 && age <= STALE_MIN,
    mem_pct: pct(st && st.mem_pct),
    disk_pct: pct(st && st.disk_pct),
    runners_total: runners.length,
    runners_busy: runners.filter((r) => r && r.busy === true).length,
    runners_paused: paused,
    ai_up: ollama === undefined ? null : ollama === 'active'
  };
}

export function buildFeed(input, statuses, now = Date.now()) {
  const nowIso = new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const agents = (input.agents || []).map((a) => {
    const id = code(a && a.id);
    if (!id) throw new Error('agent id bukan kode roster: ' + String(a && a.id).slice(0, 8) + ' (pakai salah satu: ' + CODES.join(', ') + ')');
    if (!STATUS.includes(a.status)) throw new Error('status agent ' + id + ' tidak valid');
    return drop({
      id, name: clean(a.name, LIMITS.name), role: clean(a.role, LIMITS.role),
      zone: ZONES.includes(a.zone) ? a.zone : undefined, status: a.status,
      task_summary: clean(a.task_summary, LIMITS.task_summary), updated_at: ts(a.updated_at, nowIso)
    });
  }).slice(0, LIMITS.agents);
  const work = (input.work || []).map((w) => drop({
    title: clean(w.title, LIMITS.title), owner_agent: code(w.owner_agent), status: clean(w.status, LIMITS.status_text) || 'berjalan', updated_at: ts(w.updated_at, nowIso)
  })).filter((w) => w.title).slice(0, LIMITS.work);
  const alerts = (input.alerts || []).map((x) => drop({
    level: LEVELS.includes(x.level) ? x.level : 'info', text: clean(x.text, LIMITS.text), updated_at: ts(x.updated_at, nowIso)
  })).filter((x) => x.text).slice(0, LIMITS.alerts);
  const decisions = (input.decisions || []).map((d) => drop({
    title: clean(d.title, LIMITS.title), agent: code(d.agent), since: ts(d.since, nowIso)
  })).filter((d) => d.title).slice(0, LIMITS.decisions);
  const names = input.server_names || {};
  const servers = Object.entries(statuses).map(([host, st]) => serverEntry(st, names[host] || host, now)).slice(0, LIMITS.servers);
  const feed = { updated_at: nowIso, agents, work, alerts, decisions, servers };
  if (!ISO.test(feed.updated_at)) throw new Error('updated_at');
  return feed;
}
