import { h, render, Component } from 'preact';
import htm from 'htm';
const html = htm.bind(h);

class Kantor extends Component {
  constructor(props) {
    super(props);
    var self = this, s = {};
    this.agents().forEach(function (a) { s[a[0]] = a[3]; });
    this.SL = this.buildSlots();
    this.D = {};
    this.SL.forEach(function (sl) { if (sl.code) self.D[sl.code] = sl; });
    this.IDLE = this.idleSpots();
    this.RAP = this.rapatSpots();
    this.HUD = this.huddleSpots();
    this.occ = {};
    this.P = {};
    this.timers = [];
    this.liftUntil = {};
    // live feed (/kantor/feed.json). null = no fresh feed, the hardcoded roster below is used.
    this.feed = null; this.feedNames = {}; this.feedSummary = {}; this.feedSeen = {};
    var L = this.liftInner(0), door = L[L.length - 1];
    this.agents().forEach(function (a) {
      self.P[a[0]] = { floor: 7, x: door.x, y: door.y, dur: 0, walk: false, face: 1, fx: 0, fy: 1, vx: 0, vy: 0, show: false, place: 'out', busy: false, inner: L, spot: -1, rs: -1, hs: -1, trip: false, seated: false, seatOff: 0, ease: 'linear', bubbleUntil: 0 };
    });
    var start = this.startSpots();
    this.agents().forEach(function (a) {
      if (s[a[0]] === 'kerja') return;
      var k = start[a[0]];
      if (k === undefined || self.occ[k] !== undefined) k = self.freeIdle(['pantry', 'sofa', 'booth', 'pod']);
      if (k >= 0) self.placeIdle(a[0], k);
    });
    this.state = {
      status: s, filter: 'lantai', query: '', shift: 'Pagi', floor: 7, mode: 'pick', spin: -20, tilt: 56, dragging: false, auto: false, now: Date.now(),
      log: [{ t: 'sekarang', text: 'Shift pagi turun dari Lantai 8 dan menuju meja masing-masing.' }]
    };
  }
  mobile() { return false; }
  componentDidMount() {
    var self = this, i = 0;
    this.clockT = setInterval(function () { self.setState({ now: Date.now() }); }, 1000);
    this.agents().forEach(function (a) {
      if (self.state.status[a[0]] === 'kerja') {
        var delay = 300 + i * 700; i++;
        self.timers.push(setTimeout(function () { self.enter(a[0]); }, delay));
      }
    });
    this.simT = setInterval(function () { self.tick(); }, 4200);
    this.bubT = setInterval(function () { self.chatter(); }, 2600);
    this.autoT = setInterval(function () { if (self.state.auto) self.setState({ spin: Math.round((self.state.spin + 0.9) * 10) / 10 }); }, 40);
    this.loadFeed();
    this.feedT = setInterval(function () { self.loadFeed(); }, 60000);
  }
  componentWillUnmount() {
    clearInterval(this.clockT); clearInterval(this.simT); clearInterval(this.bubT); clearInterval(this.autoT); clearInterval(this.feedT); clearTimeout(this.syncT);
    this.timers.forEach(function (t) { clearTimeout(t); });
  }
  // Roster: codes, zones and sprites are fixed by the floor plan. A fresh feed only overrides the display name
  // and the work status of known codes (see kantor/feed.schema.json); unknown ids in the feed are ignored.
  agents() {
    var names = this.feedNames || {};
    return this.defaultAgents().map(function (a) { return names[a[0]] ? [a[0], names[a[0]], a[2], a[3]] : a; });
  }
  defaultAgents() {
    return [
      ['GK', 'Grok', 'command', 'kerja'], ['PM', 'Project Manager', 'command', 'kerja'], ['SA', 'Solution Architect', 'command', 'luar'],
      ['UX', 'UX Designer', 'studio', 'kerja'], ['UI', 'UI Designer', 'studio', 'luar'], ['SV', 'Social & Visual', 'studio', 'luar'],
      ['RV', 'Research', 'knowledge', 'kerja'], ['RAG', 'RAG & Knowledge', 'knowledge', 'luar'],
      ['FE', 'Frontend', 'engineering', 'kerja'], ['BE', 'Backend', 'engineering', 'kerja'], ['AI', 'AI Engineer', 'engineering', 'kerja'], ['AU', 'Automation', 'engineering', 'luar'], ['DO', 'DevOps & Cloud', 'engineering', 'kerja'],
      ['GV', 'AI Governance', 'trust', 'kerja'], ['RT', 'Eval & Red Team', 'trust', 'luar'], ['HK', 'Hacker', 'trust', 'luar'], ['SE', 'Security', 'trust', 'luar'], ['PR', 'Data Privacy', 'trust', 'luar'],
      ['BD', 'Business Dev', 'commercial', 'luar'], ['SL', 'Sales', 'commercial', 'luar'], ['FN', 'Admin & Finance', 'commercial', 'luar'], ['IZ', 'Permit', 'commercial', 'luar'], ['QA', 'Risk & QA', 'commercial', 'luar'],
      ['NA', 'Network Architect', 'field', 'luar'], ['FO', 'FO / OSP', 'field', 'luar'], ['BQ', 'BOQ & RAB', 'field', 'luar'], ['DC', 'Technical Docs', 'field', 'luar']
    ];
  }
  // Lantai 7 zones, laid out after the Command Center plan: x/y/w/h in % of the floor (height = width / 2).
  // ax = the open aisle used to reach the zone from the corridor; mid = zone sits right above the corridor.
  zones() {
    return [
      { id: 'studio', name: 'Studio', x: 4, y: 8, w: 16.2, h: 24.3, cols: 3, rows: 2, ax: 23.6, mid: false },
      { id: 'command', name: 'Command', x: 39.5, y: 8, w: 21, h: 14.8, cols: 4, rows: 1, ax: 53, mid: false },
      { id: 'commercial', name: 'Commercial', x: 80.2, y: 8, w: 16.2, h: 24.3, cols: 3, rows: 2, ax: 77, mid: false },
      { id: 'knowledge', name: 'Knowledge', x: 4, y: 35.6, w: 11, h: 24.3, cols: 2, rows: 2, ax: 17, mid: true },
      { id: 'engineering', name: 'Engineering', x: 27, y: 29.7, w: 21.6, h: 24.3, cols: 4, rows: 2, ax: 24.5, mid: true },
      { id: 'trust', name: 'Trust', x: 57.6, y: 29.7, w: 16.2, h: 24.3, cols: 3, rows: 2, ax: 55.5, mid: true },
      { id: 'field', name: 'Field', x: 80.2, y: 35.6, w: 16.2, h: 24.3, cols: 3, rows: 2, ax: 77, mid: true }
    ];
  }
  cy() { return 63.5; }
  buildSlots() {
    var self = this, C = this.cy(), out = [];
    this.zones().forEach(function (z) {
      var codes = self.agents().filter(function (a) { return a[2] === z.id; }).map(function (a) { return a[0]; });
      var sp = 5.2, x0 = z.x + z.w / 2 - (z.cols - 1) * sp / 2, mid = z.y + z.h / 2;
      for (var r = 0; r < z.rows; r++) {
        for (var c = 0; c < z.cols; c++) {
          var i = r * z.cols + c, dx = x0 + c * sp, rot, dy;
          if (z.rows === 1) { rot = 0; dy = z.y + z.h * 0.45; }
          else { rot = r === 0 ? 180 : 0; dy = r === 0 ? mid - 5.2 : mid + 5.2; }
          var fy = rot === 0 ? dy + 6.8 : dy - 6.8;
          var inner = (z.mid && r === 1) ? [{ x: dx, y: C }, { x: dx, y: fy }] : [{ x: z.ax, y: C }, { x: z.ax, y: fy }, { x: dx, y: fy }];
          out.push({ zone: z.id, x: dx, y: dy, rot: rot, code: codes[i] || null, inner: inner });
        }
      }
    });
    return out;
  }
  liftX() { return [85.3, 92.2]; }
  liftInner(k) {
    var C = this.cy(), lx = this.liftX()[k];
    return [{ x: 88.7, y: C }, { x: 88.7, y: 70 }, { x: lx, y: 73.5 }, { x: lx, y: 77 }];
  }
  rapatSpots() {
    var C = this.cy(), c0 = { x: 16.5, y: C }, d = { x: 16.5, y: 70.5 }, out = [];
    [11, 16.8, 22.6].forEach(function (x) { out.push({ inner: [c0, d, { x: x, y: 73 }, { x: x, y: 76.5 }], f: { x: 0, y: 1 } }); });
    [11, 16.8, 22.6].forEach(function (x) { out.push({ inner: [c0, d, { x: 6.5, y: 73 }, { x: 6.5, y: 94.5 }, { x: x, y: 94.5 }, { x: x, y: 91.6 }], f: { x: 0, y: -1 } }); });
    out.push({ inner: [c0, d, { x: 27, y: 73 }, { x: 27, y: 84.3 }, { x: 26.3, y: 84.3 }], f: { x: -1, y: 0 } });
    return out;
  }
  huddleSpots() {
    var C = this.cy();
    return [
      { inner: [{ x: 66.3, y: C }, { x: 66.3, y: 74.5 }], f: { x: 0, y: 1 } },
      { inner: [{ x: 60.4, y: C }, { x: 60.4, y: 82.5 }], f: { x: 1, y: 0 } },
      { inner: [{ x: 72.2, y: C }, { x: 72.2, y: 82.5 }], f: { x: -1, y: 0 } },
      { inner: [{ x: 57, y: C }, { x: 57, y: 94 }, { x: 66.3, y: 94 }, { x: 66.3, y: 91 }], f: { x: 0, y: -1 } }
    ];
  }
  // Lantai 8 idle spots: 0-11 pantry tables, 12-17 lounge sofas, 18-25 rest pods, 26-27 phone booths.
  idleSpots() {
    var C = this.cy(), out = [];
    [10.6, 27.7, 44.9].forEach(function (tx) {
      var ty = 35.6;
      out.push({ kind: 'pantry', inner: [{ x: tx + 8.5, y: C }, { x: tx + 8.5, y: 22.5 }, { x: tx, y: 22.5 }, { x: tx, y: 26.1 }], f: { x: 0, y: 1 } });
      out.push({ kind: 'pantry', inner: [{ x: tx - 5.3, y: C }, { x: tx - 5.3, y: ty }], f: { x: 1, y: 0 } });
      out.push({ kind: 'pantry', inner: [{ x: tx + 5.3, y: C }, { x: tx + 5.3, y: ty }], f: { x: -1, y: 0 } });
      out.push({ kind: 'pantry', inner: [{ x: tx, y: C }, { x: tx, y: 45.1 }], f: { x: 0, y: -1 } });
    });
    [8.6, 16.6, 24.4].forEach(function (x) { out.push({ kind: 'sofa', inner: [{ x: 5.2, y: C }, { x: 5.2, y: 80.8 }, { x: x, y: 80.8 }, { x: x, y: 78.6 }], f: { x: 0, y: 1 } }); });
    [8.6, 16.6, 24.4].forEach(function (x) { out.push({ kind: 'sofa', inner: [{ x: 5.2, y: C }, { x: 5.2, y: 87.9 }, { x: x, y: 87.9 }, { x: x, y: 90.2 }], f: { x: 0, y: -1 } }); });
    [6.5, 19, 31.6, 44].forEach(function (py) {
      [0, 1].forEach(function (c) {
        var px = c === 0 ? 63.5 : 81.5, cy2 = py + 5.4, sx = px + 7.5;
        out.push({ kind: 'pod', col: c, px: px, py: py, inner: [{ x: 80, y: C }, { x: 80, y: cy2 }, { x: sx, y: cy2 }], f: { x: c === 0 ? 1 : -1, y: 0 } });
      });
    });
    [67.1, 74.7].forEach(function (x) { out.push({ kind: 'booth', inner: [{ x: x, y: C }, { x: x, y: 70.5 }, { x: x, y: 84.5 }], f: { x: 0, y: 1 } }); });
    return out;
  }
  startSpots() {
    return { SA: 0, RAG: 1, UI: 2, SV: 3, AU: 4, SE: 5, RT: 6, HK: 7, PR: 8, FN: 9, BD: 10, SL: 11, IZ: 12, QA: 17, NA: 18, FO: 19, BQ: 20, DC: 21 };
  }
  freeIdle(kinds) {
    for (var n = 0; n < kinds.length; n++) {
      for (var k = 0; k < this.IDLE.length; k++) {
        if (this.IDLE[k].kind === kinds[n] && this.occ[k] === undefined) return k;
      }
    }
    return -1;
  }
  freeIdleRandom(kind) {
    var self = this, free = [];
    this.IDLE.forEach(function (sp, k) { if (sp.kind === kind && self.occ[k] === undefined) free.push(k); });
    return free.length ? free[Math.floor(Math.random() * free.length)] : -1;
  }
  placeIdle(code, k) {
    var p = this.P[code], sp = this.IDLE[k], last = sp.inner[sp.inner.length - 1];
    this.occ[k] = code; p.spot = k; p.floor = 8; p.x = last.x; p.y = last.y; p.dur = 0; p.inner = sp.inner; p.place = 'idle'; p.show = true; p.busy = false;
    this.arrive(code, 'idle');
  }
  release(code) {
    var p = this.P[code];
    if (p.spot >= 0) { delete this.occ[p.spot]; p.spot = -1; }
  }
  heads() { return this.assets("head"); }
  figures() { return this.assets("fig"); }
  backs() { return this.assets("back"); }
  tops() { return this.assets("top"); }
  sheets() {
    var b = 'base';
    return { DO: 'do', AI: 'ai', GK: b, PM: b, SA: b, RAG: b, FE: b, BE: b, IZ: b, QA: b, NA: b, FO: b, BQ: b, DC: b,
      AU: 'au', GV: 'gv', SL: 'sl', HK: 'hk', SE: 'se', BD: 'bd', RT: 'rt', FN: 'fn', UI: 'ui' };
  }
  metrics() {
    return {
      GK: [0.679, 38.0, 60.8], PM: [0.600, 45.8, 60.8], SA: [0.596, 48.3, 60.4], UX: [0.617, 42.6, 57.9], UI: [0.617, 48.0, 58.8], SV: [0.708, 60.0, 59.2], RV: [0.558, 43.7, 68.3], RAG: [0.558, 42.9, 59.6],
      FE: [0.642, 42.2, 61.7], BE: [0.625, 47.3, 59.6], AI: [0.600, 55.2, 64.2], AU: [0.512, 57.7, 60.8], DO: [0.512, 49.6, 64.6], GV: [0.583, 52.9, 74.2], RT: [0.588, 52.8, 64.6], HK: [0.662, 50.3, 65.0],
      SE: [0.588, 48.2, 57.5], PR: [0.508, 46.7, 59.2], BD: [0.613, 49.7, 61.3], SL: [0.642, 52.0, 62.0], FN: [0.575, 58.0, 58.8], IZ: [0.575, 43.1, 60.0], QA: [0.571, 43.8, 60.0], NA: [0.717, 37.8, 60.0],
      FO: [0.613, 46.6, 62.9], BQ: [0.733, 40.1, 61.7], DC: [0.575, 44.2, 61.3]
    };
  }
  openLift(floor, k) {
    var self = this;
    this.liftUntil[floor + '-' + k] = Date.now() + 1300;
    this.timers.push(setTimeout(function () { self.forceUpdate(); }, 1350));
  }
  arrive(code, place) {
    var p = this.P[code], f = null;
    p.seated = false;
    if (place === 'desk') { p.seated = true; p.seatOff = 0.5; f = { x: 0, y: 1 }; }
    else if (place === 'rapat' && p.rs >= 0) { p.seated = true; p.seatOff = -0.6; f = this.RAP[p.rs].f; }
    else if (place === 'huddle' && p.hs >= 0) { f = this.HUD[p.hs].f; }
    else if (place === 'idle' && p.spot >= 0) { p.seated = true; p.seatOff = -0.6; f = this.IDLE[p.spot].f; }
    if (f) { p.fx = f.x; p.fy = f.y; if (f.x) p.face = f.x < 0 ? -1 : 1; }
  }
  chatter() {
    var self = this, P = this.P, now = Date.now(), F = this.state.floor;
    var cand = Object.keys(P).filter(function (c) {
      var p = P[c];
      var social = p.place === 'desk' || p.place === 'rapat' || p.place === 'huddle' || (p.place === 'idle' && self.IDLE[p.spot] && self.IDLE[p.spot].kind !== 'pod');
      return p.show && p.floor === F && !p.walk && !p.busy && social && now > p.bubbleUntil;
    });
    if (!cand.length) return;
    var c = cand[Math.floor(Math.random() * cand.length)];
    P[c].bubbleUntil = now + 2800;
    this.forceUpdate();
    this.timers.push(setTimeout(function () { self.forceUpdate(); }, 2850));
  }
  // ---- live feed ----
  loadFeed() {
    var self = this;
    if (typeof fetch !== 'function') return;
    fetch('/kantor/feed.json', { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { self.applyFeed(j); })
      .catch(function () { self.applyFeed(null); });
  }
  // a feed is used only when it parses, has agents[] and updated_at is at most 30 minutes old
  freshFeed(j) {
    if (!j || typeof j !== 'object' || !Array.isArray(j.agents)) return null;
    var t = Date.parse(j.updated_at);
    if (!isFinite(t) || Date.now() - t > 30 * 60000 || t - Date.now() > 5 * 60000) return null;
    return j;
  }
  clip(s, n) { s = typeof s === 'string' ? s.trim() : ''; return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  applyFeed(raw) {
    var self = this, j = this.freshFeed(raw), known = {}, names = {}, sum = {}, want = {};
    this.defaultAgents().forEach(function (a) { known[a[0]] = a; want[a[0]] = a[3]; });
    if (j) {
      // live: agents not listed in the feed are idle (Lantai 8)
      Object.keys(want).forEach(function (c) { want[c] = 'luar'; });
      j.agents.forEach(function (a) {
        if (!a || !known[a.id]) return;
        var nm = self.clip(a.name, 40);
        if (nm) names[a.id] = nm;
        var ts = self.clip(a.task_summary, 120);
        if (ts) sum[a.id] = ts;
        want[a.id] = (a.status === 'working' || a.status === 'waiting_decision' || a.status === 'alert') ? 'kerja' : 'luar';
      });
    }
    this.feed = j; this.feedNames = names; this.feedSummary = sum; this.want = want;
    if (j && Array.isArray(j.work)) {
      // new or changed work items go to the existing "Jejak langsung" log
      var log = (this._log || this.state.log).slice(), seen = {};
      j.work.slice(0, 20).forEach(function (w) {
        if (!w) return;
        var title = self.clip(w.title, 120), st = self.clip(w.status, 24), who = known[w.owner_agent] ? (names[w.owner_agent] || known[w.owner_agent][1]) : '';
        if (!title) return;
        var key = title + '|' + st + '|' + (w.owner_agent || '');
        seen[key] = true;
        if (self.feedSeen[key]) return;
        var t = Date.parse(w.updated_at), hh = isFinite(t) ? new Date(t).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }) : self.hhmm();
        log.unshift({ t: hh, text: (who ? who + ' · ' : '') + title + (st ? ' · ' + st : '') });
      });
      this.feedSeen = seen;
      this._log = log.slice(0, 8);
      this.setState({ log: this._log });
    } else {
      this.feedSeen = {};
      this.forceUpdate();
    }
    this.syncStatus();
  }
  // walk agents to/from their desks until the floor matches the wanted status; busy agents are retried
  syncStatus() {
    var self = this, want = this.want || {}, pending = false;
    clearTimeout(this.syncT);
    Object.keys(want).forEach(function (c) {
      if ((self._status || self.state.status)[c] === want[c]) return;
      if (self.P[c].busy) { pending = true; return; }
      self.toggle(c);
    });
    if (pending) this.syncT = setTimeout(function () { self.syncStatus(); }, 3000);
  }
  agent(code) { return this.agents().filter(function (x) { return x[0] === code; })[0]; }
  zoneName(id) { return this.zones().filter(function (z) { return z.id === id; })[0].name; }
  hhmm() {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  addLog(text) {
    var log = [{ t: this.hhmm(), text: text }].concat(this._log || this.state.log).slice(0, 8);
    this._log = log;
    this.setState({ log: log });
  }
  walk(code, pts, done) {
    var self = this, p = this.P[code], i = 0;
    p.busy = true; p.walk = true; p.place = 'move';
    var step = function () {
      if (i >= pts.length) {
        p.walk = false; p.busy = false; p.dur = 0;
        if (done) done();
        self.forceUpdate();
        return;
      }
      var t = pts[i++], first = i === 1, last = i === pts.length;
      var ease = first && last ? 'ease-in-out' : first ? 'ease-in' : last ? 'ease-out' : 'linear';
      var dx = t.x - p.x, dy = (t.y - p.y) * 0.5;
      var dur = Math.max(90, Math.round(Math.sqrt(dx * dx + dy * dy) * 62 * (ease === 'linear' ? 1 : 1.15)));
      if (Math.abs(dx) > 0.2) p.face = dx < 0 ? -1 : 1;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) { p.vx = dx; p.vy = dy; }
      p.x = t.x; p.y = t.y; p.dur = dur; p.ease = ease;
      self.forceUpdate();
      self.timers.push(setTimeout(step, dur));
    };
    step();
  }
  go(code, dest, place, done) {
    var self = this, p = this.P[code];
    var path = p.inner.slice().reverse().slice(1).concat(dest);
    if (place !== 'rapat') p.rs = -1;
    if (place !== 'huddle') p.hs = -1;
    var start = function () {
      self.walk(code, path, function () { p.inner = dest; p.place = place; self.arrive(code, place); if (done) done(); });
    };
    if (p.seated) {
      p.seated = false; p.busy = true; p.bubbleUntil = 0;
      this.forceUpdate();
      this.timers.push(setTimeout(start, 440));
    } else {
      start();
    }
  }
  // first arrival of the morning shift: step out of a Lantai 7 lift and walk to the desk
  enter(code) {
    var self = this, p = this.P[code], k = Math.random() < 0.5 ? 0 : 1, L = this.liftInner(k), door = L[L.length - 1];
    if (this.state.status[code] !== 'kerja' || p.place !== 'out') return;
    p.floor = 7; p.x = door.x; p.y = door.y; p.dur = 0; p.ease = 'linear'; p.face = 1; p.seated = false; p.busy = true; p.place = 'lift'; p.inner = L;
    this.openLift(7, k);
    this.forceUpdate();
    this.timers.push(setTimeout(function () { p.show = true; self.forceUpdate(); }, 350));
    this.timers.push(setTimeout(function () { self.go(code, self.D[code].inner, 'desk'); }, 700));
  }
  // walk to a lift, ride to the other floor, step out, then continue with `then`
  travel(code, toFloor, then) {
    var self = this, p = this.P[code], k = Math.random() < 0.5 ? 0 : 1;
    this.release(code);
    p.trip = false;
    this.go(code, this.liftInner(k), 'lift', function () {
      p.busy = true;
      self.openLift(p.floor, k);
      self.timers.push(setTimeout(function () { p.show = false; self.forceUpdate(); }, 420));
      self.timers.push(setTimeout(function () {
        p.floor = toFloor;
        self.openLift(toFloor, k);
        self.forceUpdate();
        self.timers.push(setTimeout(function () { p.show = true; self.forceUpdate(); }, 350));
        self.timers.push(setTimeout(function () { p.busy = false; then(); }, 750));
      }, 1800));
    });
  }
  toIdle(code) {
    var p = this.P[code], j = this.freeIdle(['pantry', 'sofa', 'booth', 'pod']);
    if (j < 0) { p.show = false; this.forceUpdate(); return; }
    this.occ[j] = code; p.spot = j;
    this.go(code, this.IDLE[j].inner, 'idle');
  }
  back(code) {
    var p = this.P[code];
    p.trip = false;
    if (this.state.status[code] !== 'kerja' || p.busy) return;
    if (p.place !== 'rapat' && p.place !== 'huddle') return;
    this.go(code, this.D[code].inner, 'desk');
  }
  toggle(code) {
    var self = this, p = this.P[code];
    if (p.busy) return;
    var a = this.agent(code), zn = this.zoneName(a[2]);
    var status = Object.assign({}, this._status || this.state.status), text;
    if (status[code] === 'kerja') {
      status[code] = 'luar';
      text = a[1] + ' selesai, naik lift ke Lantai 8 · ' + zn;
      if (p.place === 'out') {
        // not on the floor yet (shift still arriving): stay upstairs
        var j = this.freeIdle(['pantry', 'sofa', 'booth', 'pod']);
        if (j >= 0) this.placeIdle(code, j);
      } else {
        this.travel(code, 8, function () { self.toIdle(code); });
      }
    } else {
      status[code] = 'kerja';
      text = a[1] + ' ditugaskan, turun ke Lantai 7 · ' + zn;
      if (p.floor === 8) this.travel(code, 7, function () { self.go(code, self.D[code].inner, 'desk'); });
      else this.go(code, this.D[code].inner, 'desk');
    }
    // several toggles can run in one tick (feed sync): build on the not-yet-rendered state
    var log = [{ t: this.hhmm(), text: text }].concat(this._log || this.state.log).slice(0, 8);
    this._status = status; this._log = log;
    this.setState({ status: status, log: log });
  }
  componentDidUpdate() { this._status = null; this._log = null; }
  tick() {
    var sim = this.props.simulate ?? true;
    if (!sim) return;
    var self = this, P = this.P, st = this.state.status;
    var codes = this.agents().map(function (a) { return a[0]; });
    // Lantai 8: idle agents drift between pantry, lounge, phone booth and rest pods
    if (Math.random() < 0.45) {
      var idle = codes.filter(function (c) { return st[c] !== 'kerja' && P[c].floor === 8 && !P[c].busy && P[c].place === 'idle'; });
      if (idle.length) {
        var c8 = idle[Math.floor(Math.random() * idle.length)], p8 = P[c8];
        var cur = this.IDLE[p8.spot] ? this.IDLE[p8.spot].kind : '';
        var kinds = ['pantry', 'sofa', 'pod', 'booth'].filter(function (k) { return k !== cur; });
        var kind = kinds[Math.floor(Math.random() * kinds.length)];
        var j = this.freeIdleRandom(kind);
        if (j >= 0) {
          this.release(c8); this.occ[j] = c8; p8.spot = j;
          this.go(c8, this.IDLE[j].inner, 'idle');
          if (kind === 'pod') this.addLog(this.agent(c8)[1] + ' pindah ke rest pod · standby');
        }
      }
    }
    // Lantai 7: working agents step out to the war room or a stand-up at the huddle point
    var away = codes.filter(function (c) { return st[c] === 'kerja' && (P[c].trip || P[c].place === 'rapat' || P[c].place === 'huddle'); }).length;
    if (away >= 3) return;
    var ready = codes.filter(function (c) { return st[c] === 'kerja' && !P[c].busy && P[c].place === 'desk'; });
    if (!ready.length) return;
    var c = ready[Math.floor(Math.random() * ready.length)], p = P[c], a = this.agent(c), free, k;
    if (Math.random() < 0.55) {
      free = [0, 1, 2, 3, 4, 5, 6].filter(function (n) { return codes.every(function (x) { return P[x].rs !== n; }); });
      if (!free.length) return;
      k = free[Math.floor(Math.random() * free.length)];
      p.rs = k; p.trip = true;
      this.go(c, this.RAP[k].inner, 'rapat', function () {
        self.timers.push(setTimeout(function () { self.back(c); }, 8000 + Math.random() * 6000));
      });
      this.addLog(a[1] + ' masuk war room untuk rapat');
    } else {
      free = [0, 1, 2, 3].filter(function (n) { return codes.every(function (x) { return P[x].hs !== n; }); });
      if (!free.length) return;
      k = free[Math.floor(Math.random() * free.length)];
      p.hs = k; p.trip = true;
      this.go(c, this.HUD[k].inner, 'huddle', function () {
        self.timers.push(setTimeout(function () { self.back(c); }, 4500 + Math.random() * 3000));
      });
      this.addLog(a[1] + ' ikut stand-up di huddle point');
    }
  }
  renderVals() {
    var self = this, st = this.state, P = this.P, MOB = this.mobile(), F = st.floor;
    var theme = this.props.theme ?? 'jerco-dark';
    var HD = this.heads(), FG = this.figures(), M = this.metrics(), BK = this.backs(), SH = this.sheets(), TP = this.tops(), NOW = Date.now();
    var SEG_ON = 'background: var(--surface-raised); color: var(--foreground); box-shadow: 0 0 0 1px var(--border-strong);';
    var SEG_OFF = 'background: transparent; color: var(--foreground-muted); box-shadow: none;';
    var CHIP_ON = 'background: var(--action-primary); color: var(--action-primary-foreground); border: 1px solid var(--action-primary);';
    var CHIP_OFF = 'background: var(--surface); color: var(--foreground-muted); border: 1px solid var(--border);';
    var KIND = { pantry: 'pantry', sofa: 'lounge', pod: 'standby', booth: 'phone booth' };
    var zones = this.zones(), zoneName = {}, zoneIdx = {};
    zones.forEach(function (z, i) { zoneName[z.id] = z.name; zoneIdx[z.id] = i; });

    var people = this.agents().map(function (a) {
      var code = a[0], p = P[code], assigned = st.status[code] === 'kerja', sp = self.IDLE[p.spot];
      var ds = p.walk || p.place === 'move' ? 'bergerak' : p.place === 'lift' ? 'lift' : p.place === 'desk' ? 'kerja' : p.place === 'rapat' ? 'rapat' : p.place === 'huddle' ? 'huddle' : p.place === 'idle' ? (sp && sp.kind === 'pod' ? 'standby' : 'idle') : 'bergerak';
      var LABEL = { kerja: 'Di meja', rapat: 'War room', huddle: 'Huddle point', bergerak: 'Berjalan · Lantai ' + p.floor, lift: 'Di lift', idle: 'Lantai 8 · ' + (sp ? KIND[sp.kind] : 'idle'), standby: 'Lantai 8 · standby' };
      return {
        code: code, name: a[1], zone: a[2], zoneName: zoneName[a[2]], assigned: assigned, ds: ds, busy: p.busy,
        statusLabel: LABEL[ds],
        action: assigned ? 'Selesaikan' : 'Tugaskan',
        aria: (assigned ? 'Selesaikan tugas ' : 'Tugaskan ') + a[1],
        btnClass: assigned ? 'btn-soft' : 'btn-line',
        btnStyle: assigned ? 'background: var(--action-secondary); color: var(--foreground); border: 1px solid transparent;' : 'background: transparent; color: var(--foreground); border: 1px solid var(--border-strong);',
        avatarStyle: (ds === 'idle' || ds === 'standby') ? 'filter: grayscale(1); opacity: 0.6;' : '',
        dotStyle: ds === 'kerja' ? 'background: var(--status-success);' : (ds === 'rapat' || ds === 'huddle') ? 'background: var(--status-info);' : (ds === 'bergerak' || ds === 'lift') ? 'background: var(--status-warning);' : ds === 'idle' ? 'background: var(--status-offline);' : 'display: none;',
        head: HD[code], figure: FG[code],
        toggle: function () { self.toggle(code); }
      };
    });
    var byCode = {};
    people.forEach(function (p) { byCode[p.code] = p; });
    var total = people.length, SLOTS = this.SL.length;
    var count = function (k) { return people.filter(function (p) { return p.ds === k; }).length; };
    var assignedN = people.filter(function (p) { return p.assigned; }).length;
    var pct = Math.round(assignedN / SLOTS * 100);
    var nRapat = count('rapat'), nHud = count('huddle');
    var onL8 = people.filter(function (p) { return P[p.code].floor === 8; }).length;
    var occKind = function (kind) {
      return Object.keys(self.occ).filter(function (k) { var c = self.occ[k]; return self.IDLE[k].kind === kind && P[c].place === 'idle' && P[c].spot === +k; }).length;
    };

    // ---- floor geometry ----
    var smooth = (st.dragging || st.auto) ? 'none' : 'transform 650ms cubic-bezier(0.2, 0, 0, 1)';
    var labelStyle = 'position: absolute; left: 0.8cqw; bottom: 0.6cqw; display: flex; align-items: baseline; gap: 0.5cqw; padding: 0.15cqw 0.5cqw; border-radius: 0.3cqw; background: var(--surface-raised); border: 1px solid var(--border); font-size: ' + (MOB ? '11px' : 'max(11px, 0.95cqw)') + '; font-weight: 700; color: var(--foreground); white-space: nowrap; transform-origin: 0 100%; transform: translateZ(0.3px) rotateZ(' + (-st.spin) + 'deg) rotateX(' + (-st.tilt) + 'deg); transition: ' + smooth + ';';
    var WH = 4.5;
    var wallsFor = function (r, doors) {
      var out = [], g = 2.5 / r.w * 100, x = 0;
      var gaps = (doors || []).map(function (dx) { return (dx - r.x) / r.w * 100; }).sort(function (a, b) { return a - b; });
      var hz = function (top, l, w) {
        if (w <= 0.1) return;
        out.push({ style: 'position: absolute; left: ' + l.toFixed(2) + '%; width: ' + w.toFixed(2) + '%; top: ' + top + '; height: ' + WH + 'cqw; transform-origin: 50% 0; transform: rotateX(90deg); background: var(--glass3d); border-top: 0.3cqw solid var(--wall); border-bottom: 0.2cqw solid var(--frame); pointer-events: none;' });
      };
      var vt = function (left) {
        out.push({ style: 'position: absolute; top: 0; height: 100%; left: ' + left + '; width: ' + WH + 'cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: var(--glass3d); border-left: 0.3cqw solid var(--wall); border-right: 0.2cqw solid var(--frame); pointer-events: none;' });
      };
      gaps.forEach(function (c) { hz('0', x, c - g - x); x = c + g; });
      hz('0', x, 100 - x);
      hz('100%', 0, 100);
      vt('0'); vt('100%');
      return out;
    };
    var area = function (o) {
      var border = o.kind === 'room' ? 'solid var(--wall)' : o.kind === 'zone' ? 'solid var(--border)' : 'dashed var(--border-strong)';
      return {
        name: o.name, count: o.count, labelStyle: labelStyle, walls: o.kind === 'room' ? wallsFor(o, o.doors) : [],
        style: 'position: absolute; left: ' + o.x + '%; top: ' + o.y + '%; width: ' + o.w + '%; height: ' + o.h + '%; z-index: 1; background: ' + (o.kind === 'open' ? 'transparent' : 'var(--background)') + '; border: 0.16cqw ' + border + '; border-radius: 0.4cqw; transform: translateZ(0.2px); transform-style: preserve-3d;'
      };
    };
    var areas = (F === 7 ? zones.map(function (z) {
      var on = people.filter(function (p) { return p.zone === z.id && p.assigned; }).length;
      return { kind: 'zone', name: z.name, x: z.x, y: z.y, w: z.w, h: z.h, count: on + '/' + (z.cols * z.rows) };
    }).concat([
      { kind: 'room', name: 'War room · rapat', x: 4, y: 68, w: 25, h: 28.7, doors: [16.5], count: nRapat + '/7' },
      { kind: 'room', name: 'MDF · rack jaringan', x: 31.7, y: 68, w: 19.7, h: 28.7, doors: [41.5], count: '' },
      { kind: 'open', name: 'Huddle point', x: 54.1, y: 68, w: 24.4, h: 28.7, count: nHud + '/4' },
      { kind: 'room', name: 'Lift & tangga', x: 81.3, y: 68, w: 14.8, h: 28.7, doors: [88.7], count: '' }
    ]) : [
      { kind: 'open', name: 'Pantry', x: 2, y: 3, w: 56, h: 56.5, count: occKind('pantry') + '/12' },
      { kind: 'open', name: 'Rest pod · tempat tidur', x: 61.5, y: 3, w: 36.5, h: 56.5, count: occKind('pod') + '/8' },
      { kind: 'open', name: 'Lounge · sofa', x: 4, y: 68, w: 37, h: 28.7, count: occKind('sofa') + '/6' },
      { kind: 'room', name: 'Toilet', x: 43.6, y: 68, w: 17, h: 28.7, doors: [47.8, 56.4], count: '' },
      { kind: 'room', name: 'Phone booth', x: 62.7, y: 68, w: 16.3, h: 28.7, doors: [67.1, 74.7], count: occKind('booth') + '/2' },
      { kind: 'room', name: 'Lift & tangga', x: 81.3, y: 68, w: 14.8, h: 28.7, doors: [88.7], count: '' }
    ]).map(area);

    // ---- furniture as simple 3D boxes: x/y/w/h on the floor (%), z0 = lift off the floor, H = height (cqw) ----
    var box = function (x, y, w, h, z0, H, o) {
      o = o || {};
      var side = o.side || 'var(--desk-edge)', faces = [];
      faces.push({ cls: o.topCls || '', text: o.text || '', style: 'position: absolute; inset: 0; transform: translateZ(' + H + 'cqw); background: ' + (o.top || 'var(--desk)') + '; border: 1px solid ' + side + '; border-radius: ' + (o.round ? '50%' : (o.r || '0.2cqw')) + '; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: ' + (MOB ? '9px' : 'max(9px, 0.7cqw)') + '; font-weight: 600; color: ' + (o.ink || 'var(--foreground-muted)') + '; white-space: nowrap;' });
      if (!o.round) {
        faces.push({ cls: '', text: '', style: 'position: absolute; left: 0; right: 0; top: 0; height: ' + H + 'cqw; transform-origin: 50% 0; transform: rotateX(90deg); background: ' + (o.north || side) + ';' });
        faces.push({ cls: o.sCls || '', text: o.sText || '', style: 'position: absolute; left: 0; right: 0; bottom: 0; height: ' + H + 'cqw; transform-origin: 50% 100%; transform: rotateX(-90deg); background: ' + (o.south || side) + '; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: ' + (MOB ? '9px' : 'max(9px, 0.7cqw)') + '; font-weight: 600; color: ' + (o.ink || 'var(--foreground-muted)') + '; white-space: nowrap;' + (o.sExtra || '') });
        faces.push({ cls: '', text: '', style: 'position: absolute; top: 0; bottom: 0; left: 0; width: ' + H + 'cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: ' + (o.west || side) + ';' });
        faces.push({ cls: '', text: '', style: 'position: absolute; top: 0; bottom: 0; left: 100%; width: ' + H + 'cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: ' + (o.east || side) + ';' });
      }
      return { style: 'position: absolute; left: ' + x.toFixed(2) + '%; top: ' + y.toFixed(2) + '%; width: ' + w.toFixed(2) + '%; height: ' + h.toFixed(2) + '%; z-index: 2; transform-style: preserve-3d; transform: translateZ(' + (z0 ? z0 + 'cqw' : '0.4px') + '); pointer-events: none;', faces: faces };
    };
    var chair = function (pt) { return box(pt.x - 0.8, pt.y - 1.6, 1.6, 3.2, 0, 1.2, { top: '#1b1f26', side: '#4a5262', r: '0.5cqw' }); };
    var roundTable = function (cx, cy2, d, label) {
      return [box(cx - 0.3, cy2 - 0.6, 0.6, 1.2, 0, 2.8, { top: '#9aa3ae', side: '#7d8792' }), box(cx - d / 2, cy2 - d, d, d * 2, 0, 2.9, { round: true, top: 'var(--desk)', side: 'var(--desk-edge)', text: label || '' })];
    };
    var last = function (sp) { return sp.inner[sp.inner.length - 1]; };
    var panel = { top: 'var(--panel)', side: 'var(--panel-side)' };
    var props = [], sleepers = [];
    var lifts = function () {
      self.liftX().forEach(function (lx, k) {
        var open = NOW < (self.liftUntil[F + '-' + k] || 0);
        props.push(box(lx - 2.2, 74.6, 4.4, 0.8, 0, 0.05, { top: open ? 'var(--action-primary)' : 'var(--border)' }));
        props.push(box(lx - 3, 76, 6, 18, 0, 5.5, { top: 'var(--surface-raised)', side: 'var(--wall)', text: k ? 'Lift B' : 'Lift A', north: open ? '#05080d' : 'linear-gradient(90deg, var(--desk) 0 48%, var(--frame) 48% 52%, var(--desk) 52% 100%)' }));
      });
    };
    if (F === 7) {
      props.push(box(26, 1, 0.6, 1, 0, 1.6, panel), box(49.7, 1, 0.6, 1, 0, 1.6, panel), box(73.4, 1, 0.6, 1, 0, 1.6, panel));
      // video wall 8x4, mounted above the cubicle partitions (bottom 1.6cqw, top 9.6cqw)
      props.push(box(25, 0.6, 50, 1.4, 1.6, 8, { top: '#0b111a', side: '#0b111a', south: '#14385c', sCls: 'screen-on', sExtra: ' background-image: linear-gradient(90deg, #0b111a 0.22cqw, transparent 0.22cqw), linear-gradient(180deg, #0b111a 0.22cqw, transparent 0.22cqw), repeating-linear-gradient(180deg, transparent 0 0.55cqw, rgba(86, 200, 242, 0.28) 0.55cqw 0.68cqw), linear-gradient(180deg, rgba(47, 191, 143, 0.18), rgba(27, 168, 229, 0.22)); background-size: 12.5% 100%, 100% 25%, 6.25% 25%, 100% 100%; border: 0.22cqw solid #0b111a; border-bottom: 0.3cqw solid var(--action-primary);' }));
      props.push(box(9.6, 79.6, 14.6, 9.3, 0, 2.9, { top: 'var(--wood)', side: 'var(--wood-edge)', r: '2.2cqw' }));
      this.RAP.forEach(function (sp) { props.push(chair(last(sp))); });
      props.push(box(4.3, 79.5, 0.5, 9.6, 1.4, 2.6, { top: '#0b111a', side: '#0b111a', east: 'var(--action-primary)' }));
      [33.4, 37.9, 42.4, 46.9].forEach(function (x, i) {
        props.push(box(x, 73, 3.6, 13, 0, 6.5, { top: '#0d1520', side: '#141d2b', south: '#0d1520', sExtra: ' background-image: repeating-linear-gradient(180deg, transparent 0 0.45cqw, ' + (i === 3 ? '#d99a2b' : '#2fbf8f') + ' 0.45cqw 0.62cqw, transparent 0.62cqw 1.1cqw); background-size: 70% 100%; background-repeat: no-repeat; background-position: 50% 0;' }));
      });
      roundTable(66.3, 82.5, 6, 'Huddle').forEach(function (b) { props.push(b); });
      lifts();
    } else {
      props.push(box(2.7, 6.1, 39.5, 6.6, 0, 3, { top: 'var(--desk)', side: 'var(--desk-edge)' }));
      ['Kopi', 'Teh & air', 'Sink', 'Microwave', 'Kulkas'].forEach(function (t, i) {
        props.push(box(3.4 + i * 7.8, 6.9, 7, 5, 3, 0.7, { top: '#0f1622', side: '#2a3a50', text: t }));
      });
      props.push(box(2.7, 12.7, 3.9, 7.9, 0, 3, { top: 'var(--desk)', side: 'var(--desk-edge)' }));
      [10.6, 27.7, 44.9].forEach(function (tx, i) { roundTable(tx, 35.6, 6, 'Meja ' + (i + 1)).forEach(function (b) { props.push(b); }); });
      this.IDLE.forEach(function (sp) { if (sp.kind === 'pantry' || sp.kind === 'booth') props.push(box(last(sp).x - 0.8, last(sp).y - 1.6, 1.6, 3.2, 0, 1.2, { top: '#2c3d55', side: '#4a5d76', r: '0.8cqw' })); });
      props.push(box(6.7, 74.2, 19.8, 5.7, 0, 1.2, { top: '#2c3d55', side: '#22324a' }), box(6.7, 74.2, 19.8, 1.4, 0, 3.0, { top: '#34475f', side: '#22324a' }));
      props.push(box(6.7, 88.9, 19.8, 5.6, 0, 1.2, { top: '#2c3d55', side: '#22324a' }), box(6.7, 93.1, 19.8, 1.4, 0, 3.0, { top: '#34475f', side: '#22324a' }));
      props.push(box(11.3, 81.7, 10.6, 5.4, 0, 1.4, { top: 'var(--wood)', side: 'var(--wood-edge)' }));
      props.push(box(29.5, 88.5, 9, 1.2, 0.8, 4, { top: '#0b111a', side: '#0b111a', south: '#0b111a', sText: 'Antrian task · Grok assign', ink: 'var(--action-primary)' }));
      this.IDLE.forEach(function (sp, i) {
        if (sp.kind !== 'pod') return;
        var px = sp.px, py = sp.py, w = 15, h = 10.8, who = self.occ[i], here = who && P[who].place === 'idle' && P[who].spot === i;
        var bx = sp.col === 0 ? px + 0.8 : px + w - 9;
        props.push(box(px, py, w, 0.6, 0, 1.8, panel), box(px, py + h - 0.6, w, 0.6, 0, 1.8, panel), box(sp.col === 0 ? px : px + w - 0.4, py, 0.4, h, 0, 1.8, panel));
        props.push(box(bx, py + 1.6, 8.2, h - 3.2, 0, 1, { top: '#33445c', side: '#26344a', text: here ? '' : 'P' + (i - 17) + ' · kosong' }));
        props.push(box(sp.col === 0 ? bx + 0.3 : bx + 6.3, py + 2.3, 1.6, h - 4.6, 1, 0.35, { top: '#c9d3df', side: '#9aa6b4' }));
        // resting agent: only the head shows on the pillow, the body is under a blanket
        if (here && P[who].seated && !P[who].walk) {
          var dir = sp.col === 0 ? 1 : -1, hx = (sp.col === 0 ? bx + 1.1 : bx + 7.1) + dir * 0.6, hy = py + h / 2;
          var bc = ['#3d5a80', '#5b4a8a', '#2f6f6a', '#7a4b5c'][(i - 18) % 4];
          var b0 = sp.col === 0 ? bx + 2.6 : bx + 0.1, b1 = sp.col === 0 ? bx + 8.1 : bx + 5.6;
          props.push(box(b0, py + 2, b1 - b0, h - 4, 1, 0.75, { top: bc, side: bc, r: '0.6cqw', text: who + ' · standby', ink: '#e4eaf0' }));
          props.push(box(sp.col === 0 ? b0 : b1 - 0.7, py + 2, 0.7, h - 4, 1, 0.8, { top: '#dfe6ee', side: '#b8c4d2', r: '0.3cqw' }));
          sleepers.push({
            head: HD[who],
            style: 'position: absolute; left: ' + hx.toFixed(2) + '%; top: ' + hy.toFixed(2) + '%; width: 2.4cqw; height: 2.4cqw; margin: -1.2cqw 0 0 -1.2cqw; transform-style: preserve-3d; transform: translateZ(1.4cqw); pointer-events: none;',
            headStyle: 'display: block; width: 100%; height: 100%; border-radius: 50% 50% 44% 44%; transform: rotate(' + (sp.col === 0 ? -90 : 90) + 'deg);',
            zzStyle: 'position: absolute; left: 50%; bottom: 100%; transform-origin: 50% 100%; transform: rotateZ(' + (-st.spin) + 'deg) rotateX(' + (-st.tilt) + 'deg) translateY(-0.6cqw); transition: ' + smooth + '; font-family: ' + "'Geist Mono', ui-monospace, monospace" + '; font-size: ' + (MOB ? '10px' : 'max(10px, 0.8cqw)') + '; font-weight: 700; color: var(--foreground-muted); white-space: nowrap;'
          });
        }
      });
      props.push(box(51.8, 69, 0.4, 27, 0, 4.5, panel), box(46.3, 86, 3, 6, 0, 1.6, { top: '#d7dee7', side: '#9aa6b4', r: '1cqw' }), box(54.9, 86, 3, 6, 0, 1.6, { top: '#d7dee7', side: '#9aa6b4', r: '1cqw' }));
      props.push(box(70.7, 69, 0.4, 27, 0, 4.5, panel), box(64.1, 91.5, 6, 2.6, 0, 3, { top: 'var(--wood)', side: 'var(--wood-edge)' }), box(71.7, 91.5, 6, 2.6, 0, 3, { top: 'var(--wood)', side: 'var(--wood-edge)' }));
      lifts();
    }

    // ---- floor text ----
    var ftxt = function (x, y, text, o) {
      o = o || {};
      return { text: text, style: 'position: absolute; left: ' + x + '%; top: ' + y + '%; transform: translateZ(0.6px) translate(' + (o.align === 'right' ? '-100%' : o.align === 'center' ? '-50%' : '0') + ', -50%); white-space: nowrap; font-family: ' + (o.mono ? "'Geist Mono', ui-monospace, monospace" : 'inherit') + '; font-size: ' + (MOB ? '10px' : 'max(10px, 0.85cqw)') + '; font-weight: ' + (o.accent ? 600 : 500) + '; color: ' + (o.accent ? 'var(--action-primary)' : 'var(--foreground-muted)') + '; pointer-events: none;' };
    };
    var texts = [{ text: '', style: 'position: absolute; left: 2%; right: 2%; top: 61.5%; height: 4%; border-top: 1px dashed var(--border-strong); border-bottom: 1px dashed var(--border-strong); transform: translateZ(0.3px); pointer-events: none;' }];
    if (F === 7) {
      texts.push(ftxt(50, 4.6, 'Video wall 8×4 · status site client, MikroTik, CCTV, IPTV', { align: 'center' }));
      texts.push(ftxt(3, 63.5, 'Koridor · kosong saat agent idle'));
      texts.push(ftxt(97, 63.5, 'Idle: jalan ke lift, naik ke Lantai 8 →', { align: 'right', accent: true }));
      texts.push(ftxt(41.5, 93.5, 'core · switch · NVR · server', { align: 'center', mono: true }));
      texts.push(ftxt(66.3, 95, 'Stand-up harian · ringkasan lantai dari Grok', { align: 'center' }));
      texts.push(ftxt(88.7, 95.4, '↑ Lantai 8 · pantry & rest', { align: 'center', accent: true }));
    } else {
      texts.push(ftxt(3, 63.5, 'Koridor'));
      texts.push(ftxt(97, 63.5, 'Task masuk: ke lift, turun ke Lantai 7 →', { align: 'right', accent: true }));
      texts.push(ftxt(88.7, 95.4, '↓ Lantai 7 · command floor', { align: 'center', accent: true }));
    }

    // ---- desks (Lantai 7 only) ----
    var is3d = st.tilt > 15;
    var desks = F !== 7 ? [] : this.SL.map(function (sl, idx) {
      var code = sl.code, p = code ? byCode[code] : null, pp = code ? P[code] : null;
      var on = !!(p && p.assigned), atDesk = !!(pp && pp.seated && !pp.walk && pp.place === 'desk' && pp.floor === 7), working = on && atDesk;
      var Rr = sl.rot, away = Math.cos((Rr + st.spin) * Math.PI / 180) > 0, mm = code ? M[code] : [0.6, 50, 60];
      var sW = away ? 2.4 : 6.4 * mm[0], sH = away ? 2.6 : 6.4, sZ = away ? 1.9 : -2.1;
      // seated sheet agents: a bit smaller, at the back of the chair, and nearly upright so the head does not hide the screen
      var SK = code ? SH[code] : null, seatTop = 3.85, seatTilt = st.tilt;
      var dth = st.spin * Math.PI / 180, dfy = Rr % 360 === 0 ? -1 : 1;
      var dsx = -dfy * Math.sin(dth), dsy = dfy * Math.cos(dth) * Math.cos(st.tilt * Math.PI / 180), dside = Math.abs(dsx) > Math.abs(dsy);
      if (SK) { sW = 5.49; sH = 6.8; sZ = dside ? 0.2 : (away ? 1.0 : 2.4); seatTop = away ? 4.6 : 4.0; seatTilt = 90 - 0.15 * (90 - st.tilt); }
      var dl = ((idx * 0.37) % 2.6).toFixed(2);
      return {
        label: p ? p.name : 'Slot ekspansi', busy: !p || p.busy,
        click: function () { if (!p || self.state.mode === 'orbit') return; self.toggle(code); },
        btnClass: p ? 'desk' : 'desk empty',
        aria: p ? (on ? 'Selesaikan tugas ' : 'Tugaskan ') + p.name + ', meja ' + p.zoneName : 'Slot ekspansi ' + zoneName[sl.zone] + ', belum ada agent',
        title: p ? p.name + (self.feedSummary[code] ? ' · ' + self.feedSummary[code] : (on ? ' · klik untuk selesaikan' : ' · klik untuk tugaskan')) : 'Slot ekspansi · belum ada agent',
        style: 'position: absolute; left: ' + sl.x.toFixed(2) + '%; top: ' + sl.y.toFixed(2) + '%; z-index: ' + Math.round((sl.y - 5) * 10) + '; width: 5cqw; height: 5cqw; transform: translate(-50%, -50%) translateZ(1px); transform-style: preserve-3d; padding: 0; border: 0; background: transparent; display: block;',
        unitStyle: 'position: absolute; inset: 0; transform-style: preserve-3d; transform: rotate(' + Rr + 'deg);',
        seatWrap: 'position: absolute; left: 50%; top: ' + seatTop + 'cqw; width: 0; height: 0; transform-style: preserve-3d; transform: translateZ(' + sZ + 'cqw);',
        seatBill: 'position: absolute; left: 0; bottom: 0; width: ' + sW.toFixed(2) + 'cqw; height: ' + sH + 'cqw; margin-left: -' + (sW / 2).toFixed(2) + 'cqw; transform-origin: 50% 100%; transform: rotateZ(' + (-(Rr + st.spin)) + 'deg) rotateX(' + (-seatTilt).toFixed(1) + 'deg); transition: ' + smooth + '; opacity: ' + (atDesk && is3d ? 1 : 0) + ';',
        seatImg: code ? (away ? BK[code] : FG[code]) : FG.GK, seatClass: atDesk ? 'typer' : '',
        seatImgStyle: 'display: block; width: 100%; height: 100%; transform-origin: 50% 100%; ' + (away ? 'image-rendering: pixelated; ' : '') + 'animation-delay: -' + dl + 's;' + (SK ? ' display: none;' : ''),
        sheetClass: SK ? 'sheet sh-' + SK + (dside ? (dsx < 0 ? ' r2' : ' r3') + ' still seatside' : (away ? ' r4' : ' r5') + (atDesk ? ' type' : ' still')) : 'sheet',
        sheetStyle: SK ? 'animation-delay: -' + ((idx * 0.37) % 1.8).toFixed(2) + 's;' : 'display: none;',
        monClass: working ? 'screen-on' : '',
        screenStyle: 'position: absolute; left: 50%; top: -0.45cqw; width: 2.4cqw; height: 1.5cqw; margin-left: -1.2cqw; transform-origin: 50% 100%; transform: translateZ(3.4cqw) rotateX(-90deg); backface-visibility: hidden; border-radius: 0.15cqw; border: 0.14cqw solid #1a212c; background-color: #0a1322; ' + (on ? 'background-image: repeating-linear-gradient(180deg, rgba(86, 200, 242, 0.9) 0 0.1cqw, transparent 0.1cqw 0.26cqw), repeating-linear-gradient(180deg, rgba(150, 226, 140, 0.8) 0 0.1cqw, transparent 0.1cqw 0.4cqw); background-size: 60% 1.5cqw, 36% 1.5cqw; background-position: 0.15cqw 0.1cqw, 0.15cqw 0.24cqw; background-repeat: repeat-y; box-shadow: 0 0 1cqw rgba(86, 200, 242, ' + (working ? '0.55' : '0.15') + ');' + (working ? '' : ' filter: brightness(0.55);') : ''),
        top: code ? TP[code] : TP.GK, topClass: atDesk ? 'typer' : '',
        topStyle: 'position: absolute; left: 50%; top: 1.6cqw; width: 2.6cqw; height: 2.6cqw; margin-left: -1.3cqw; display: block; image-rendering: pixelated; transform-origin: 50% 60%; transform: translateZ(2.6cqw); transition: opacity 300ms ease; opacity: ' + (atDesk && !is3d ? 1 : 0) + '; animation-delay: -' + dl + 's;',
        bubbleStyle: 'position: absolute; right: -0.5cqw; top: -0.9cqw; z-index: 3; padding: 0.3cqw 0.45cqw; gap: 0.22cqw; align-items: center; border-radius: 0.7cqw 0.7cqw 0.12cqw 0.7cqw; background: var(--surface-raised); border: 1px solid var(--border); display: ' + ((atDesk && !is3d && NOW < pp.bubbleUntil) ? 'flex' : 'none') + ';',
        plateStyle: 'position: absolute; left: 50%; top: calc(100% + 0.1cqw); transform: translateX(-50%); display: ' + (is3d ? 'none' : 'block') + '; max-width: 5.4cqw; padding: 0.05cqw 0.35cqw; border-radius: 0.25cqw; font-size: ' + (MOB ? '10px' : 'max(10px, 0.72cqw)') + '; line-height: 1.3; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ' + (on ? 'color: var(--foreground); background: var(--surface);' : 'color: var(--foreground-muted); background: transparent;')
      };
    });

    // ---- walking / standing / lounging agents ----
    // conversations: in each group (war room, huddle, a pantry table, the lounge) one agent talks at a time, taking turns
    var talk = {}, groups = {}, grouped = {};
    people.forEach(function (q) {
      var pq = P[q.code], g = null;
      if (pq.walk || !pq.show) return;
      if (pq.place === 'rapat' || pq.place === 'huddle') g = pq.floor + pq.place;
      else if (pq.place === 'idle' && self.IDLE[pq.spot] && self.IDLE[pq.spot].kind === 'pantry') g = 'meja' + Math.floor(pq.spot / 4);
      else if (pq.place === 'idle' && self.IDLE[pq.spot] && self.IDLE[pq.spot].kind === 'sofa') g = 'sofa';
      if (g) { (groups[g] = groups[g] || []).push(q.code); grouped[q.code] = true; }
    });
    Object.keys(groups).forEach(function (g, gi) {
      var list = groups[g];
      if (list.length >= 2) talk[list[(Math.floor(st.now / 2400) + gi) % list.length]] = true;
    });
    var billBase = 'position: relative; transform-origin: 50% 100%; transform: rotateZ(' + (-st.spin) + 'deg) rotateX(' + (-st.tilt) + 'deg); transition: ' + smooth + ';';
    var th = st.spin * Math.PI / 180, ct = Math.cos(st.tilt * Math.PI / 180);
    var walkers = people.map(function (pp, idx) {
      var p = P[pp.code], vis = p.show && p.floor === F;
      var atDesk = p.seated && !p.walk && p.place === 'desk';
      var inPod = p.seated && !p.walk && p.place === 'idle' && self.IDLE[p.spot] && self.IDLE[p.spot].kind === 'pod';
      var showTag = vis && (p.walk || p.place === 'rapat' || p.place === 'huddle');
      // seated agents are drawn a bit smaller so neighbours at a table do not overlap
      var seatedNow = p.seated && !p.walk, m = M[pp.code], sc = seatedNow ? '0.85' : '1.05';
      // full-body seated pose (legs bent on the chair) away from the desks; desks keep the typing bust
      var seatMode = seatedNow && !atDesk && !inPod;
      // seated: hips on the seat (about 1.7cqw); figures without a sheet drop their legs and sink to the crotch line
      var seat = seatedNow ? (0.54 * 7.2 * +sc - 2.4) : 0;
      var rw = (7.2 * m[0]).toFixed(2);
      var mode = p.walk ? 'walking' : (p.seated ? 'seated' : 'standing');
      var bub = vis && !p.walk && !atDesk && !inPod && ((!grouped[pp.code] && NOW < p.bubbleUntil) || !!talk[pp.code]);
      var delay = (idx * 0.37 % 2.6).toFixed(2);
      var SK = SH[pp.code], sheetCls = 'sheet';
      var fsy = (p.fx * Math.sin(th) + p.fy * Math.cos(th)), fsx = p.fx * Math.cos(th) - p.fy * Math.sin(th);
      var backView = fsy < 0 && Math.abs(fsy) * ct >= Math.abs(fsx);
      var seatSide = Math.abs(fsx) > Math.abs(fsy) * ct, seatCol = seatSide ? (fsx < 0 ? 2 : 3) : (fsy >= 0 ? 0 : 1);
      var useSeat = seatMode && !(!SK && seatCol === 1);
      if (SK) {
        // pick the sheet row from the walking (or facing) direction as seen by the orbiting camera
        var vx = p.walk ? p.vx : p.fx, vy = p.walk ? p.vy : p.fy;
        var sx = vx * Math.cos(th) - vy * Math.sin(th), sy = (vx * Math.sin(th) + vy * Math.cos(th)) * ct;
        var row = Math.abs(sx) >= Math.abs(sy) ? (sx < 0 ? 2 : 3) : (sy > 0 ? 0 : 1);
        var sideSeat = seatedNow && Math.abs(sx) > Math.abs(sy);
        if (seatedNow) { row = sideSeat ? (sx < 0 ? 2 : 3) : (sy >= 0 ? 5 : 4); seat = sideSeat ? 0.2 : -1.0; }
        sheetCls = 'sheet sh-' + SK + ' r' + row + (p.walk ? ' walk' : (sideSeat ? ' still seatside' : (p.seated ? ' type' : ' still')));
      }
      return {
        name: pp.name, figure: pp.figure, back: BK[pp.code],
        backStyle: (!SK && seatedNow && backView) ? 'position: absolute; left: 50%; bottom: 3.2cqw; top: auto; width: 3cqw; height: 3.25cqw; margin-left: -1.5cqw; image-rendering: pixelated; display: block;' : 'display: none;',
        // seated agents stand almost upright so they sit on their chair instead of leaning back over tables
        billStyle: seatedNow ? 'position: relative; transform-origin: 50% 100%; transform: rotateZ(' + (-st.spin) + 'deg) rotateX(' + (-(90 - 0.15 * (90 - st.tilt))).toFixed(1) + 'deg); transition: ' + smooth + ';' : billBase,
        rigClass: 'rig ' + (vis ? mode : '') + (SK ? ' has-sheet' : '') + (useSeat ? ' has-seat' : ''),
        seatClass: useSeat ? 'seat4 st-' + (SK || pp.code.toLowerCase()) + ' c' + seatCol : 'seat4',
        seatStyle: useSeat ? '' : 'display: none;',
        sheetClass: sheetCls,
        sheetStyle: SK ? 'animation-delay: -' + delay + 's;' : 'display: none;',
        style: 'position: absolute; left: ' + p.x + '%; top: ' + p.y + '%; z-index: ' + Math.round(p.y * 10) + '; opacity: ' + (vis && !atDesk && !inPod ? 1 : 0) + '; transform: translate(-50%, -100%) translateZ(2px); transform-style: preserve-3d; transition: left ' + p.dur + 'ms ' + p.ease + ', top ' + p.dur + 'ms ' + p.ease + ', opacity 300ms ease; pointer-events: none;',
        bodyStyle: 'position: relative; transform: translate(0, ' + (useSeat ? 0 : seat) + 'cqw) scale(' + (useSeat ? '0.95' : sc) + '); transform-origin: 50% 100%; transition: transform ' + (p.walk ? p.dur + 'ms linear' : '420ms cubic-bezier(0.2, 0, 0, 1)') + ';',
        rigStyle: (SK || useSeat) ? 'position: relative; height: 7.49cqw; width: 6.05cqw;' : 'position: relative; height: 7.2cqw; width: ' + rw + 'cqw; transform: scaleX(' + p.face + ');',
        legLStyle: 'clip-path: inset(' + (m[2] - 1) + '% ' + (100 - m[1]).toFixed(1) + '% 0 0); transform-origin: ' + m[1] + '% ' + (m[2] - 2) + '%;',
        legRStyle: 'clip-path: inset(' + (m[2] - 1) + '% 0 0 ' + m[1] + '%); transform-origin: ' + m[1] + '% ' + (m[2] - 2) + '%;',
        torsoStyle: 'clip-path: inset(0 0 ' + (97 - m[2]).toFixed(1) + '% 0); transform-origin: 50% ' + m[2] + '%; animation-delay: -' + delay + 's;' + (seatedNow && backView ? ' display: none;' : '') + (seatedNow ? ' clip-path: inset(0 0 54% 0); -webkit-mask-image: linear-gradient(to bottom, #000 34%, transparent 46%); mask-image: linear-gradient(to bottom, #000 34%, transparent 46%);' : ''),
        shadowStyle: 'position: absolute; left: 50%; bottom: -0.35cqw; width: ' + (3.4 * sc).toFixed(2) + 'cqw; height: 0.8cqw; transform: translateX(-50%); border-radius: 999px; background: rgba(0, 0, 0, 0.32); transition: opacity 300ms ease; opacity: ' + (seat ? 0 : 1) + ';',
        bubbleStyle: 'position: absolute; left: 60%; bottom: calc(100% - ' + (useSeat ? 1.6 : (seat + (seatedNow && SK ? 2.6 : 0))).toFixed(2) + 'cqw + 0.1cqw); z-index: 2; padding: 0.35cqw 0.55cqw; gap: 0.25cqw; align-items: center; border-radius: 0.8cqw 0.8cqw 0.8cqw 0.15cqw; background: var(--surface-raised); border: 1px solid var(--border); display: ' + (bub ? 'flex' : 'none') + ';',
        tagStyle: 'position: absolute; left: 50%; bottom: calc(100% + 0.2cqw); transform: translateX(-50%); padding: ' + (MOB ? '0' : '0.1cqw') + ' 0.5cqw; border-radius: 999px; font-size: ' + (MOB ? '10px' : 'max(10px, 0.72cqw)') + '; font-weight: 600; white-space: nowrap; background: var(--surface-raised); border: 1px solid var(--border); color: var(--foreground); display: ' + (showTag ? 'block' : 'none') + ';'
      };
    });

    // ---- controls ----
    var modes = [['pick', 'Tugaskan'], ['orbit', 'Putar tampilan']].map(function (m) {
      var on = st.mode === m[0];
      return { label: m[1], isPick: m[0] === 'pick', isHand: m[0] === 'orbit', pressed: on ? 'true' : 'false', style: on ? SEG_ON : SEG_OFF, pick: function () { self.setState({ mode: m[0] }); } };
    });
    var floors = [[7, 'Lantai 7', 'Command'], [8, 'Lantai 8', 'Pantry & rest']].map(function (f) {
      var on = F === f[0], n = f[0] === 7 ? people.filter(function (p) { return P[p.code].floor === 7 && P[p.code].show; }).length : onL8;
      return { label: f[1], sub: f[2] + ' · ' + n, pressed: on ? 'true' : 'false', style: on ? SEG_ON : SEG_OFF, pick: function () { self.setState({ floor: f[0] }); } };
    });
    var legend = (F === 7 ? [
      ['Bekerja · layar menyala', 'border: 2px solid var(--status-success);'],
      ['Kursi kosong · agent di Lantai 8', 'border: 2px solid var(--border-strong);'],
      ['Slot ekspansi · belum ada agent', 'border: 2px dashed var(--border-strong);']
    ] : [
      ['Idle · siap ambil task', 'border: 2px solid var(--status-warning);'],
      ['Standby · istirahat di rest pod', 'border: 2px dashed var(--status-warning);'],
      ['Kursi atau pod kosong', 'border: 2px solid var(--border-strong);']
    ]).map(function (l) { return { label: l[0], style: 'flex: none; width: 12px; height: 12px; border-radius: 999px; ' + l[1] }; });
    var OR = st.mode === 'orbit';
    var modeHint = OR ? (MOB ? 'Seret denah untuk memutar 360° dan mengatur kemiringan.' : 'Seret denah: geser kiri-kanan untuk memutar 360°, atas-bawah untuk mengatur kemiringan.') : (F === 7 ? (MOB ? 'Ketuk meja untuk menugaskan atau menyelesaikan agent.' : 'Klik meja untuk menugaskan atau menyelesaikan agent.') : 'Tugaskan agent dari daftar: dia naik lift dan turun ke Lantai 7.');
    var spinRad = st.spin * Math.PI / 180;
    var fit = (0.97 - 0.2 * Math.abs(Math.sin(spinRad))).toFixed(3);
    var floorStyle = 'transform: rotateX(' + st.tilt + 'deg) rotateZ(' + st.spin + 'deg) scale(' + fit + '); transition: ' + smooth + ';';
    var isTop = st.tilt < 1 && Math.abs(st.spin % 360) < 1;
    var setView = function (spin, tilt) { self.setState({ spin: spin, tilt: tilt, auto: false }); };

    var q = (st.query || '').toLowerCase().trim();
    var roster = people.filter(function (p) {
      if (st.filter === 'lantai' && !p.assigned) return false;
      if (st.filter === 'luar' && p.assigned) return false;
      if (q && (p.name + ' ' + p.zoneName + ' ' + p.code).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return (b.assigned - a.assigned) || (zoneIdx[a.zone] - zoneIdx[b.zone]); });
    var filters = [['lantai', 'Lantai 7', assignedN], ['luar', 'Lantai 8', total - assignedN], ['semua', 'Semua', total]].map(function (f) {
      var on = st.filter === f[0];
      return { label: f[1], count: f[2], pressed: on ? 'true' : 'false', style: on ? SEG_ON : SEG_OFF, pick: function () { self.setState({ filter: f[0] }); } };
    });
    var shifts = ['Pagi', 'Rilis', 'Lapangan', 'Trust'].map(function (n) {
      var on = st.shift === n;
      return { label: n, pressed: on ? 'true' : 'false', style: on ? (MOB ? CHIP_ON : SEG_ON) : (MOB ? CHIP_OFF : SEG_OFF), pick: function () { self.setState({ shift: n }); } };
    });
    var tabs = [['lantai', 'Lantai'], ['roster', 'Roster'], ['jejak', 'Jejak']].map(function (t) {
      var on = st.tab === t[0];
      return {
        label: t[1], current: on ? 'page' : 'false',
        isLantai: t[0] === 'lantai', isRoster: t[0] === 'roster', isJejak: t[0] === 'jejak',
        labelStyle: on ? 'color: var(--foreground);' : 'color: var(--foreground-muted);',
        pillStyle: on ? 'background: var(--action-primary); color: var(--action-primary-foreground);' : 'background: transparent; color: var(--foreground-muted);',
        pick: function () { self.setState({ tab: t[0] }); }
      };
    });
    var clock = new Date(st.now).toLocaleTimeString('en-GB', MOB ? { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false } : { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    var FD = this.feed, gkSum = FD ? (this.feedSummary.GK || this.feedSummary.PM || '') : '';
    var fdT = FD ? Date.parse(FD.updated_at) : NaN;
    return {
      theme: theme, clock: clock,
      summaryText: gkSum || '[Ringkasan terbaru dari Grok tampil di sini]',
      summaryUpdated: isFinite(fdT) ? 'Diperbarui ' + new Date(fdT).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }) : 'Diperbarui —',
      stats: { kerja: count('kerja'), rapat: nRapat + nHud, bergerak: count('bergerak') + count('lift'), l8: onL8, total: total, kosong: SLOTS - total },
      occupancyPct: pct, occupancyStyle: 'width: ' + pct + '%;', occupancyText: assignedN + ' dari ' + SLOTS + ' meja · ' + (SLOTS - total) + ' slot ekspansi',
      areas: areas, props: props, sleepers: sleepers, texts: texts, desks: desks, walkers: walkers, modes: modes, floors: floors, legend: legend, modeHint: modeHint,
      floorTitle: F === 7 ? 'Jerco HQ · Lantai 7 · Command floor' : 'Jerco HQ · Lantai 8 · Pantry & rest',
      floorDesc: F === 7 ? 'Agent duduk di meja hanya saat bekerja. Selesai task, naik lift ke Lantai 8.' : 'Agent idle menunggu di pantry. Idle lama pindah ke rest pod. Task masuk, turun ke Lantai 7.',
      floorAria: F === 7 ? 'Denah Lantai 7, command floor' : 'Denah Lantai 8, pantry dan rest',
      floorStyle: floorStyle,
      viewClass: OR ? (st.dragging ? 'orbit grabbing' : 'orbit') : '',
      viewStyle: OR ? 'touch-action: none;' : '',
      onDown: function (e) {
        if (self.state.mode !== 'orbit') return;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
        self.drag = { x: e.clientX, y: e.clientY, s: self.state.spin, t: self.state.tilt };
        self.setState({ dragging: true, auto: false });
      },
      onMove: function (e) {
        if (!self.drag) return;
        var spin = self.drag.s + (e.clientX - self.drag.x) * (MOB ? 0.5 : 0.45);
        var tilt = Math.max(0, Math.min(72, self.drag.t - (e.clientY - self.drag.y) * (MOB ? 0.4 : 0.35)));
        self.setState({ spin: Math.round(spin * 10) / 10, tilt: Math.round(tilt * 10) / 10 });
      },
      onUp: function () { if (!self.drag) return; self.drag = null; self.setState({ dragging: false }); },
      orbitLeft: function () { setView(st.spin - 45, st.tilt < 1 ? 50 : st.tilt); },
      orbitRight: function () { setView(st.spin + 45, st.tilt < 1 ? 50 : st.tilt); },
      viewTop: function () { setView(Math.round(st.spin / 360) * 360, 0); },
      view3d: function () { setView(Math.round(st.spin / 360) * 360 - 20, 56); },
      toggleAuto: function () { self.setState({ auto: !st.auto, tilt: st.tilt < 1 ? 50 : st.tilt }); },
      topPressed: isTop ? 'true' : 'false', topStyle: isTop ? SEG_ON : SEG_OFF,
      isoPressed: (!isTop && !st.auto) ? 'true' : 'false', isoStyle: (!isTop && !st.auto) ? SEG_ON : SEG_OFF,
      autoPressed: st.auto ? 'true' : 'false', autoStyle: st.auto ? SEG_ON : SEG_OFF,
      roster: roster, noResults: roster.length === 0, filters: filters, shifts: shifts, tabs: tabs,
      tabLantai: st.tab === 'lantai', tabRoster: st.tab === 'roster', tabJejak: st.tab === 'jejak',
      query: st.query, onSearch: function (e) { self.setState({ query: e.target.value }); },
      log: st.log
    };
  }
  assets(kind) {
    var m = {};
    this.agents().forEach(function (a) { m[a[0]] = '/kantor/img/' + kind + '/' + a[0].toLowerCase() + '.png'; });
    return m;
  }
  render() {
    var v = this.renderVals();
    return html`<div class="kj" data-theme=${v.theme} style="min-height: 100vh; background: var(--background); color: var(--foreground); font-family: 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5;">

  <header style="border-bottom: 1px solid var(--border); background: var(--surface);">
    <div style="max-width: 1360px; margin: 0 auto; padding: 0 24px; min-height: 64px; display: flex; flex-wrap: wrap; align-items: center; gap: 16px;">
      <a href="/" aria-label="Jerco Digital Solusi, beranda" style="display: flex; align-items: center; gap: 12px; flex: 1 1 auto; color: inherit; text-decoration: none;">
        <div aria-hidden="true" style="width: 32px; height: 32px; border-radius: 7px; background: var(--action-secondary); color: var(--foreground); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px;">J</div>
        <div style="display: flex; flex-direction: column; line-height: 1.2;">
          <span style="font-size: 15px; font-weight: 700;">Jerco HQ</span>
          <span style="font-size: 12px; color: var(--foreground-muted);">Kantor virtual agent</span>
        </div>
      </a>
      <nav class="topnav" aria-label="Bagian halaman" style="display: flex; gap: 4px;">
        <a class="navlink" href="#lantai" style="padding: 8px 12px; border-radius: 5px; color: var(--foreground-muted); text-decoration: none; font-weight: 500;">Lantai</a>
        <a class="navlink" href="#roster" style="padding: 8px 12px; border-radius: 5px; color: var(--foreground-muted); text-decoration: none; font-weight: 500;">Roster</a>
        <a class="navlink" href="#jejak" style="padding: 8px 12px; border-radius: 5px; color: var(--foreground-muted); text-decoration: none; font-weight: 500;">Jejak</a>
      </nav>
      <div role="timer" aria-label="Waktu kantor" style="display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: var(--background);">
        <span class="pulse" aria-hidden="true" style="width: 8px; height: 8px; border-radius: 999px; background: var(--status-success); animation: kjpulse 2s infinite;"></span>
        <span style="font-family: 'Geist Mono', ui-monospace, monospace; font-size: 15px; font-weight: 600; letter-spacing: 0.02em;">${v.clock}</span>
        <span style="font-size: 12px; font-weight: 600; color: var(--foreground-muted);">WIB</span>
      </div>
    </div>
  </header>

  <main style="max-width: 1360px; margin: 0 auto; padding: 32px 24px 48px; display: flex; flex-direction: column; gap: 24px;">

    <section aria-labelledby="judul" style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end; justify-content: space-between;">
      <div style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 420px;">
        <span style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--foreground-subtle);">Lantai 7 · Jakarta</span>
        <h1 id="judul" style="margin: 0; font-size: 28px; line-height: 1.2; font-weight: 700;">Kantor Jerco</h1>
        <p style="margin: 0; color: var(--foreground-muted); max-width: 560px;">Agent duduk di meja hanya saat bekerja. Selesai task, naik lift ke Lantai 8 untuk pantry dan rest pod.</p>
      </div>
      <div style="flex: 1 1 360px; max-width: 460px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 13px;">
          <span style="font-weight: 500;">Okupansi meja</span>
          <span style="font-family: 'Geist Mono', ui-monospace, monospace; color: var(--foreground-muted);">${v.occupancyText}</span>
        </div>
        <div role="progressbar" aria-label="Okupansi meja" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${v.occupancyPct} style="height: 8px; border-radius: 999px; background: var(--border); overflow: hidden;">
          <div style="height: 100%; border-radius: 999px; background: var(--status-success); transition: width 400ms ease; ${v.occupancyStyle}"></div>
        </div>
      </div>
    </section>

    <section aria-label="Ringkasan status" class="metrics" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px;">
      <div style="padding: 20px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; color: var(--foreground-muted); font-weight: 500;">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--status-success);"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
          Di meja
        </div>
        <span style="font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em;">${v.stats.kerja}</span>
      </div>
      <div style="padding: 20px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; color: var(--foreground-muted); font-weight: 500;">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--status-info);"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Rapat
        </div>
        <span style="font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em;">${v.stats.rapat}</span>
      </div>
      <div style="padding: 20px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; color: var(--foreground-muted); font-weight: 500;">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--status-warning);"><path d="m16 3 4 4-4 4"></path><path d="M20 7H4"></path><path d="m8 21-4-4 4-4"></path><path d="M4 17h16"></path></svg>
          Bergerak
        </div>
        <span style="font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em;">${v.stats.bergerak}</span>
      </div>
      <div style="padding: 20px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; color: var(--foreground-muted); font-weight: 500;">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--status-offline);"><circle cx="12" cy="12" r="10"></circle></svg>
          Di Lantai 8
        </div>
        <span style="font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em;">${v.stats.l8}</span>
      </div>
    </section>

    <section aria-label="Shift dan ringkasan" style="display: flex; flex-wrap: wrap; gap: 16px;">
      <div style="flex: 999 1 520px; min-width: 0; padding: 20px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pulse" aria-hidden="true" style="width: 8px; height: 8px; border-radius: 999px; background: var(--status-success); animation: kjpulse 2s infinite;"></span>
            <h2 style="margin: 0; font-size: 16px; font-weight: 700;">Shift langsung</h2>
          </div>
          <div role="group" aria-label="Pilih shift" style="display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; border-radius: 7px; background: var(--background); border: 1px solid var(--border);">
            ${v.shifts.map((s) => html`
              <button class="seg" aria-pressed=${s.pressed} onClick=${s.pick} style="height: 36px; padding: 0 16px; border: 0; border-radius: 5px; font-size: 14px; font-weight: 600; ${s.style}">${s.label}</button>
            `)}
          </div>
        </div>
        <p style="margin: 0; color: var(--foreground-muted);">Shift berjalan sendiri. Agent Active lebih sering naik. Yang kamu tugaskan tetap duduk sampai diselesaikan.</p>
      </div>
      <div style="flex: 1 1 340px; min-width: 0; padding: 20px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); display: flex; gap: 14px;">
        <div style="flex: none; width: 52px; height: 52px; border-radius: 7px; background: var(--background); border: 1px solid var(--border); overflow: hidden;"><img src="/kantor/img/head/gk.png" alt="" width="50" height="50" style="display: block; width: 50px; height: 50px;" /></div>
        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 600;">Grok · ringkasan keputusan lantai</h2>
          <p style="margin: 0; color: var(--foreground-muted);">${v.summaryText}</p>
          <span style="font-size: 12px; color: var(--foreground-subtle); font-family: 'Geist Mono', ui-monospace, monospace;">${v.summaryUpdated}</span>
        </div>
      </div>
    </section>

    <section id="lantai" aria-labelledby="judul-lantai" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h2 id="judul-lantai" style="margin: 0; font-size: 18px; line-height: 1.2; font-weight: 700;">${v.floorTitle}</h2>
          <p style="margin: 0; color: var(--foreground-muted);">${v.floorDesc}</p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--foreground-muted);">
          ${v.legend.map((l) => html`
            <span style="display: flex; align-items: center; gap: 6px;"><span aria-hidden="true" style=${l.style}></span>${l.label}</span>
          `)}
        </div>
      </div>

      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
        <div role="group" aria-label="Pilih lantai" style="display: flex; gap: 4px; padding: 4px; border-radius: 7px; background: var(--surface); border: 1px solid var(--border);">
          ${v.floors.map((fl) => html`
            <button class="seg" aria-pressed=${fl.pressed} onClick=${fl.pick} style="height: 44px; padding: 0 14px; border: 0; border-radius: 5px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; line-height: 1.2; ${fl.style}"><span style="font-size: 13px; font-weight: 700;">${fl.label}</span><span style="font-size: 11px; font-weight: 500; color: var(--foreground-muted);">${fl.sub}</span></button>
          `)}
        </div>
        <div role="group" aria-label="Mode lantai" style="display: flex; gap: 4px; padding: 4px; border-radius: 7px; background: var(--surface); border: 1px solid var(--border);">
          ${v.modes.map((m) => html`
            <button class="seg" aria-pressed=${m.pressed} onClick=${m.pick} style="height: 36px; padding: 0 14px; border: 0; border-radius: 5px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; ${m.style}">
              ${m.isPick ? html`<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"></path></svg>` : null}
              ${m.isHand ? html`<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"></path><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>` : null}
              ${m.label}
            </button>
          `)}
        </div>
        <div role="group" aria-label="Kontrol tampilan 3D" style="display: flex; gap: 4px; padding: 4px; border-radius: 7px; background: var(--surface); border: 1px solid var(--border);">
          <button class="seg" aria-label="Putar tampilan ke kiri 45 derajat" title="Putar kiri 45°" onClick=${v.orbitLeft} style="width: 36px; height: 36px; border: 0; border-radius: 5px; background: transparent; color: var(--foreground-muted); display: flex; align-items: center; justify-content: center;"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg></button>
          <button class="seg" aria-label="Putar tampilan ke kanan 45 derajat" title="Putar kanan 45°" onClick=${v.orbitRight} style="width: 36px; height: 36px; border: 0; border-radius: 5px; background: transparent; color: var(--foreground-muted); display: flex; align-items: center; justify-content: center;"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg></button>
          <button class="seg" aria-pressed=${v.topPressed} onClick=${v.viewTop} style="height: 36px; padding: 0 12px; border: 0; border-radius: 5px; font-size: 13px; font-weight: 600; ${v.topStyle}">Atas</button>
          <button class="seg" aria-pressed=${v.isoPressed} onClick=${v.view3d} style="height: 36px; padding: 0 12px; border: 0; border-radius: 5px; font-size: 13px; font-weight: 600; ${v.isoStyle}">3D</button>
          <button class="seg" aria-pressed=${v.autoPressed} onClick=${v.toggleAuto} style="height: 36px; padding: 0 12px; border: 0; border-radius: 5px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; ${v.autoStyle}"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>360°</button>
        </div>
        <span style="font-size: 13px; color: var(--foreground-muted);">${v.modeHint}</span>
      </div>

      <div class="scene-scroll"><div class="${v.viewClass} scene" onPointerDown=${v.onDown} onPointerMove=${v.onMove} onPointerUp=${v.onUp} onPointerCancel=${v.onUp} style="position: relative; width: 100%; aspect-ratio: 16 / 10; perspective: 2200px; perspective-origin: 50% 30%; overflow: hidden; border: 1px solid var(--border); border-radius: 10px; background: var(--background); ${v.viewStyle}">
      <div role="group" aria-label=${v.floorAria} style="position: absolute; left: 0; top: 10%; width: 100%; aspect-ratio: 2 / 1; container-type: inline-size; background-color: var(--surface); background-image: linear-gradient(var(--tile) 1px, transparent 1px), linear-gradient(90deg, var(--tile) 1px, transparent 1px); background-size: 2.5cqw 2.5cqw; transform-style: preserve-3d; ${v.floorStyle}">
        <span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 100%; height: 1.4cqw; transform-origin: 50% 0; transform: rotateX(-90deg); background: var(--slab-edge);"></span>
        <span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 0; height: 1.4cqw; transform-origin: 50% 0; transform: rotateX(-90deg); background: var(--slab-edge);"></span>
        <span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; left: 0; width: 1.4cqw; transform-origin: 0 50%; transform: rotateY(90deg); background: var(--slab-edge);"></span>
        <span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; left: 100%; width: 1.4cqw; transform-origin: 0 50%; transform: rotateY(90deg); background: var(--slab-edge);"></span>

        ${v.areas.map((r) => html`
          <div style=${r.style}>
            <span style=${r.labelStyle}>${r.name}<span style="font-family: 'Geist Mono', ui-monospace, monospace; font-weight: 500; color: var(--foreground-muted);">${r.count}</span></span>
            ${r.walls.map((wl) => html`<span aria-hidden="true" style=${wl.style}></span>`)}
          </div>
        `)}

        ${v.texts.map((t) => html`<span aria-hidden="true" style=${t.style}>${t.text}</span>`)}

        ${v.props.map((o) => html`
          <div aria-hidden="true" style=${o.style}>
            ${o.faces.map((f) => html`<span class=${f.cls} style=${f.style}>${f.text}</span>`)}
          </div>
        `)}

        ${v.sleepers.map((z) => html`
          <div aria-hidden="true" style=${z.style}>
            <img src=${z.head} alt="" style=${z.headStyle} />
            <span class="zz" style=${z.zzStyle}>z Z</span>
          </div>
        `)}

        ${v.desks.map((d) => html`
          <button class=${d.btnClass} aria-label=${d.aria} title=${d.title} disabled=${d.busy} onClick=${d.click} style=${d.style}>
            <span aria-hidden="true" style=${d.unitStyle}>
              <span style="position: absolute; left: 0; right: 0; top: 0; height: 4.6cqw; transform-origin: 50% 0; transform: rotateX(90deg); background: var(--panel); border: 0.1cqw solid var(--frame);"><span style="position: absolute; left: 6%; right: 6%; bottom: 0.15cqw; height: 1.4cqw; background: var(--glass);"></span></span>
              <span style="position: absolute; left: 0; top: 0; width: 4.6cqw; height: 3.3cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: var(--panel-side); border: 0.1cqw solid var(--frame);"><span style="position: absolute; top: 6%; bottom: 6%; right: 0.15cqw; width: 1.4cqw; background: var(--glass);"></span></span>
              <span style="position: absolute; left: 100%; top: 0; width: 4.6cqw; height: 3.3cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: var(--panel-side); border: 0.1cqw solid var(--frame);"><span style="position: absolute; top: 6%; bottom: 6%; right: 0.15cqw; width: 1.4cqw; background: var(--glass);"></span></span>
              <span style="position: absolute; left: 0.5cqw; right: 0.5cqw; top: 2.6cqw; height: 3cqw; transform-origin: 50% 0; transform: rotateX(90deg); background: var(--wood-edge);"></span>
              <span style="position: absolute; left: 0.5cqw; top: 0.5cqw; width: 3cqw; height: 2.1cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: var(--wood-edge);"></span>
              <span style="position: absolute; left: calc(100% - 0.5cqw); top: 0.5cqw; width: 3cqw; height: 2.1cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: var(--wood-edge);"></span>
              <span class="slab" style="position: absolute; left: 0.5cqw; right: 0.5cqw; top: 0.5cqw; height: 2.1cqw; transform: translateZ(3cqw); background: var(--wood); border: 1px solid var(--wood-edge);"></span>
              <span style="position: absolute; left: 0.8cqw; top: 1.1cqw; width: 0.9cqw; height: 1.15cqw; transform: translateZ(3.03cqw) rotate(-8deg); background: #f2f4f7; border: 1px solid #c9d0d9;"></span>
              <span style="position: absolute; right: 0.8cqw; top: 0.85cqw; width: 0.55cqw; height: 0.55cqw; transform: translateZ(3.03cqw); border-radius: 50%; background: #f5f0e8; border: 0.12cqw solid #b85c38;"></span>
              <span style="position: absolute; left: 50%; top: 0.75cqw; width: 0.8cqw; height: 0.45cqw; margin-left: -0.4cqw; transform: translateZ(3.03cqw); border-radius: 0.1cqw; background: #20252e;"></span>
              <span style="position: absolute; left: calc(50% - 0.12cqw); top: 0.97cqw; width: 0.24cqw; height: 0.45cqw; transform-origin: 50% 0; transform: translateZ(3cqw) rotateX(90deg); background: #20252e;"></span>
              <span class=${d.monClass} style=${d.screenStyle}></span>
              <span style="position: absolute; left: 50%; top: -0.45cqw; width: 2.4cqw; height: 1.5cqw; margin-left: -1.2cqw; transform-origin: 50% 100%; transform: translateZ(3.4cqw) rotateX(-90deg) rotateY(180deg); backface-visibility: hidden; border-radius: 0.15cqw; background-color: #2b3442; border: 0.12cqw solid #1a212c; background-image: radial-gradient(circle at 50% 50%, #5a6678 0 0.12cqw, transparent 0.14cqw);"></span>
              <span style="position: absolute; left: 50%; top: 1.75cqw; width: 1.8cqw; height: 0.5cqw; margin-left: -0.9cqw; transform: translateZ(3.03cqw); border-radius: 0.08cqw; background-color: #1d222b; border: 1px solid #3a4250; background-image: repeating-linear-gradient(90deg, #4a5262 0 0.12cqw, transparent 0.12cqw 0.22cqw);"></span>
              <span style="position: absolute; left: 72%; top: 1.8cqw; width: 0.3cqw; height: 0.42cqw; transform: translateZ(3.03cqw); border-radius: 0.15cqw; background: #1d222b; border: 1px solid #3a4250;"></span>
              <span style="position: absolute; left: 50%; top: 3.85cqw; width: 2.2cqw; height: 0.22cqw; margin-left: -1.1cqw; background: #9aa3ae;"></span>
              <span style="position: absolute; left: calc(50% - 0.11cqw); top: 2.95cqw; width: 0.22cqw; height: 1.8cqw; background: #9aa3ae;"></span>
              <span style="position: absolute; left: calc(50% - 0.14cqw); top: 3.85cqw; width: 0.28cqw; height: 1.8cqw; transform-origin: 50% 0; transform: rotateX(90deg); background: #7d8792;"></span>
              <span style="position: absolute; left: 50%; top: 2.85cqw; width: 2.1cqw; height: 1.9cqw; margin-left: -1.05cqw; transform: translateZ(1.8cqw); border-radius: 0.6cqw; background: #1b1f26; border: 0.12cqw solid #4a5262;"></span>
              <span style="position: absolute; left: 50%; top: 4.7cqw; width: 2.1cqw; height: 2.4cqw; margin-left: -1.05cqw; transform-origin: 50% 0; transform: translateZ(1.8cqw) rotateX(90deg); border-radius: 0.2cqw 0.2cqw 0.6cqw 0.6cqw; background: #101318; border: 0.12cqw solid #9aa3ae;"></span>
              <img class=${d.topClass} src=${d.top} alt="" style=${d.topStyle} />
              <span style=${d.seatWrap}><span style=${d.seatBill}><img class=${d.seatClass} src=${d.seatImg} alt="" style=${d.seatImgStyle} /><span class=${d.sheetClass} style=${d.sheetStyle}></span></span></span>
            </span>
            <span aria-hidden="true" style=${d.bubbleStyle}><span class="dot"></span><span class="dot d2"></span><span class="dot d3"></span></span>
            <span class="plate" style=${d.plateStyle}>${d.label}</span>
          </button>
        `)}

        ${v.walkers.map((w) => html`
          <div class="agent" aria-hidden="true" style=${w.style}>
            <span style=${w.shadowStyle}></span>
            <div style=${w.billStyle}>
              <span style=${w.tagStyle}>${w.name}</span>
              <span style=${w.bubbleStyle}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display: block; width: 1.1cqw; height: 1.1cqw; min-width: 11px; min-height: 11px; color: var(--action-primary);"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg><span class="dot"></span><span class="dot d2"></span><span class="dot d3"></span></span>
              <div style=${w.bodyStyle}>
                <div class=${w.rigClass} style=${w.rigStyle}>
                  <img src=${w.figure} alt="" class="legL" style=${w.legLStyle} />
                  <img src=${w.figure} alt="" class="legR" style=${w.legRStyle} />
                  <img src=${w.figure} alt="" class="torso" style=${w.torsoStyle} />
                  <img src=${w.back} alt="" class="bbust" style=${w.backStyle} />
                  <span class=${w.sheetClass} style=${w.sheetStyle}></span>
                  <span class=${w.seatClass} style=${w.seatStyle}></span>
                </div>
              </div>
            </div>
          </div>
        `)}
      </div>
      </div></div>
    </section>

    <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start;">
      <section id="roster" aria-labelledby="judul-roster" style="flex: 3 1 460px; min-width: 0; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); display: flex; flex-direction: column;">
        <div style="padding: 16px 16px 12px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <h2 id="judul-roster" style="margin: 0; font-size: 18px; line-height: 1.2; font-weight: 700;">Daftar agent</h2>
            <span style="font-size: 12px; color: var(--foreground-muted); font-family: 'Geist Mono', ui-monospace, monospace;">${v.stats.total} agent</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 12px;">
            <div style="position: relative; flex: 1 1 220px;">
              <label for="cari-agent" class="sr">Cari agent</label>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 12px; top: 12px; color: var(--foreground-muted);"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              <input id="cari-agent" type="search" placeholder="Cari nama atau divisi" value=${v.query} onInput=${v.onSearch} style="width: 100%; height: 40px; padding: 0 12px 0 36px; border: 1px solid var(--border-input); border-radius: 7px; background: var(--background); color: var(--foreground); font-size: 14px;" />
            </div>
            <div role="group" aria-label="Filter agent" style="flex: 1 1 260px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 7px; background: var(--background); border: 1px solid var(--border);">
              ${v.filters.map((f) => html`
                <button class="seg" aria-pressed=${f.pressed} onClick=${f.pick} style="height: 30px; padding: 0 8px; border: 0; border-radius: 5px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; ${f.style}">${f.label}<span style="font-family: 'Geist Mono', ui-monospace, monospace; font-weight: 500; opacity: 0.85;">${f.count}</span></button>
              `)}
            </div>
          </div>
        </div>
        <ul style="list-style: none; margin: 0; padding: 8px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2px 12px; max-height: 420px; overflow-y: auto;">
          ${v.roster.map((r) => html`
            <li class="row" style="display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 5px;">
              <div style="position: relative; flex: none; width: 36px; height: 36px; border-radius: 5px; background: var(--background); border: 1px solid var(--border);"><img src=${r.head} alt="" width="34" height="34" style="display: block; width: 34px; height: 34px; border-radius: 4px; ${r.avatarStyle}" /><span aria-hidden="true" style="position: absolute; right: -3px; bottom: -3px; width: 10px; height: 10px; border-radius: 999px; border: 2px solid var(--surface); ${r.dotStyle}"></span></div>
              <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
                <span style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.name}</span>
                <span style="font-size: 12px; color: var(--foreground-muted);">${r.zoneName} · ${r.statusLabel}</span>
              </div>
              <button class=${r.btnClass} aria-label=${r.aria} disabled=${r.busy} onClick=${r.toggle} style="flex: none; height: 32px; padding: 0 12px; border-radius: 7px; font-size: 13px; font-weight: 600; line-height: 1; ${r.btnStyle}">${r.action}</button>
            </li>
          `)}
          ${v.noResults ? html`
            <li style="padding: 32px 16px; text-align: center; display: flex; flex-direction: column; gap: 4px;">
              <span style="font-weight: 700;">Tidak ada agent yang cocok</span>
              <span style="font-size: 13px; color: var(--foreground-muted);">Ubah kata kunci atau pilih filter lain.</span>
            </li>
          ` : null}
        </ul>
      </section>

      <section id="jejak" aria-labelledby="judul-jejak" style="flex: 2 1 340px; min-width: 0; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); padding: 16px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--foreground-muted);"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          <h2 id="judul-jejak" style="margin: 0; font-size: 18px; line-height: 1.2; font-weight: 700;">Jejak langsung</h2>
        </div>
        <ol aria-live="polite" style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column;">
          ${v.log.map((l) => html`
            <li style="display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-top: 1px solid var(--border);">
              <span style="font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12px; color: var(--foreground-muted); padding-top: 1px;">${l.t}</span>
              <span style="font-size: 13px;">${l.text}</span>
            </li>
          `)}
        </ol>
      </section>
    </div>
  </main>
</div>`;
  }
}

var root = document.getElementById('app');
root.textContent = '';
render(h(Kantor, { theme: 'jerco-dark', simulate: true }), root);
