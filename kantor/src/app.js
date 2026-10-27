import { h, render, Component } from 'preact';
import htm from 'htm';
const html = htm.bind(h);

class Kantor extends Component {
  constructor(props) {
    super(props);
    var self = this, s = {};
    this.agents().forEach(function (a) { s[a[0]] = a[3]; });
    this.R = this.defaultRot();
    this.D = this.buildDesks();
    this.P = {};
    this.timers = [];
    var L = this.liftPt();
    this.agents().forEach(function (a) {
      self.P[a[0]] = { x: L.x, y: L.y, dur: 0, walk: false, face: 1, show: false, place: 'out', busy: false, inner: [L], rapatSpot: -1, pantrySpot: -1, trip: false, seated: false, seatOff: 0, ease: 'linear', bubbleUntil: 0 };
    });
    this.state = {
      status: s, filter: 'lantai', query: '', shift: 'Pagi', mode: 'pick', spin: -20, tilt: 56, dragging: false, auto: false, now: Date.now(),
      log: [{ t: 'sekarang', text: 'Shift pagi naik lift dan menuju meja masing-masing.' }]
    };
  }
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
  }
  componentWillUnmount() {
    clearInterval(this.clockT); clearInterval(this.simT); clearInterval(this.bubT); clearInterval(this.autoT);
    this.timers.forEach(function (t) { clearTimeout(t); });
  }
  agents() {
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
  zoneRooms() {
    return [
      { id: 'command', name: 'Command', x: 1, y: 3, w: 27, h: 38, top: true },
      { id: 'studio', name: 'Studio', x: 29, y: 3, w: 24, h: 38, top: true },
      { id: 'knowledge', name: 'Knowledge', x: 54, y: 3, w: 19, h: 38, top: true },
      { id: 'engineering', name: 'Engineering', x: 1, y: 58, w: 25, h: 39, top: false },
      { id: 'trust', name: 'Trust', x: 27, y: 58, w: 25, h: 39, top: false },
      { id: 'commercial', name: 'Commercial', x: 53, y: 58, w: 25, h: 39, top: false },
      { id: 'field', name: 'Field', x: 79, y: 58, w: 20, h: 39, top: false }
    ];
  }
  heads() { return this.assets("head"); }
  figures() { return this.assets("fig"); }
  backs() { return this.assets("back"); }
  metrics() {
    return {
      GK: [0.679, 38.0, 60.8], PM: [0.600, 45.8, 60.8], SA: [0.596, 48.3, 60.4], UX: [0.617, 42.6, 57.9], UI: [0.617, 48.0, 58.8], SV: [0.708, 60.0, 59.2], RV: [0.558, 43.7, 68.3], RAG: [0.558, 42.9, 59.6],
      FE: [0.642, 42.2, 61.7], BE: [0.625, 47.3, 59.6], AI: [0.600, 55.2, 64.2], AU: [0.512, 57.7, 60.8], DO: [0.512, 49.6, 64.6], GV: [0.583, 52.9, 74.2], RT: [0.588, 52.8, 64.6], HK: [0.662, 50.3, 65.0],
      SE: [0.588, 48.2, 57.5], PR: [0.508, 46.7, 59.2], BD: [0.613, 49.7, 61.3], SL: [0.642, 52.0, 62.0], FN: [0.575, 58.0, 58.8], IZ: [0.575, 43.1, 60.0], QA: [0.571, 43.8, 60.0], NA: [0.717, 37.8, 60.0],
      FO: [0.613, 46.6, 62.9], BQ: [0.733, 40.1, 61.7], DC: [0.575, 44.2, 61.3]
    };
  }
  openLift() {
    var self = this;
    this.liftUntil = Date.now() + 1300;
    this.timers.push(setTimeout(function () { self.forceUpdate(); }, 1350));
  }
  arrive(code, place) {
    var p = this.P[code];
    if (place === 'desk') { p.seated = true; p.seatOff = 0.5; p.face = 1; }
    else if (place === 'rapat') {
      if (p.rapatSpot >= 2) { p.seated = true; p.seatOff = 1.6; p.face = 1; }
      else { p.face = p.rapatSpot === 0 ? 1 : -1; }
    }
  }
  chatter() {
    var self = this, P = this.P, now = Date.now();
    var cand = Object.keys(P).filter(function (c) { var p = P[c]; return p.show && !p.walk && (p.place === 'desk' || p.place === 'rapat') && now > p.bubbleUntil; });
    if (!cand.length) return;
    var c = cand[Math.floor(Math.random() * cand.length)];
    P[c].bubbleUntil = now + 2800;
    this.forceUpdate();
    this.timers.push(setTimeout(function () { self.forceUpdate(); }, 2850));
  }
  cy() { return 49.5; }
  liftPt() { return { x: 3.2, y: 49.5 }; }
  tops() { return this.assets("top"); }
  roomOf(code) {
    var a = this.agent(code);
    return this.zoneRooms().filter(function (z) { return z.id === a[2]; })[0];
  }
  defaultRot() {
    var self = this, R = {};
    this.agents().forEach(function (a) { R[a[0]] = self.roomOf(a[0]).top ? 0 : 180; });
    return R;
  }
  buildDesks() {
    var self = this, D = {};
    this.agents().forEach(function (a) { D[a[0]] = self.deskOne(a[0]); });
    return D;
  }
  deskOne(code) {
    var CY = this.cy(), r = this.roomOf(code);
    var list = this.agents().filter(function (x) { return x[2] === r.id; }).map(function (x) { return x[0]; });
    var i = list.indexOf(code), slot = r.w / list.length, cx = r.x + r.w / 2;
    var dx = r.x + (i + 0.5) * slot;
    var dy = r.top ? r.y + r.h * 0.5 : r.y + r.h * 0.58;
    var rot = ((this.R[code] % 360) + 360) % 360;
    var v = rot === 0 ? [0, 1] : rot === 90 ? [-1, 0] : rot === 180 ? [0, -1] : [1, 0];
    var fx = dx + v[0] * 3.4, fy = dy + v[1] * 6.8;
    var ay = r.top ? r.y + r.h - 3.5 : r.y + 6.5;
    return { x: dx, y: dy, inner: [{ x: cx, y: CY }, { x: cx, y: ay }, { x: fx, y: ay }, { x: fx, y: fy }] };
  }
  rotate(code) {
    var p = this.P[code];
    if (p.busy) return;
    this.R[code] += 90;
    this.D[code] = this.deskOne(code);
    if (p.place === 'desk') {
      var inn = this.D[code].inner, last = inn[inn.length - 1];
      p.inner = inn; p.x = last.x; p.y = last.y; p.dur = 0;
    }
    this.addLog('Meja ' + this.agent(code)[1] + ' diputar ke ' + (this.R[code] % 360) + '°');
    this.forceUpdate();
  }
  rapatInner(k) {
    var CY = this.cy();
    var spots = [{ x: 80, y: 30 }, { x: 93, y: 30 }, { x: 84, y: 18 }, { x: 89, y: 18 }];
    var sp = spots[k], base = [{ x: 86.5, y: CY }, { x: 86.5, y: 37 }];
    if (k < 2) return base.concat([{ x: sp.x, y: 37 }, sp]);
    return base.concat([{ x: 78, y: 37 }, { x: 78, y: 14 }, { x: sp.x, y: 14 }, sp]);
  }
  pantryInner(k) {
    var sp = [{ x: 94.4, y: 56 }, { x: 97.4, y: 56 }][k];
    return [{ x: sp.x, y: this.cy() }, sp];
  }
  agent(code) { return this.agents().filter(function (x) { return x[0] === code; })[0]; }
  zoneName(id) { return this.zoneRooms().filter(function (z) { return z.id === id; })[0].name; }
  hhmm() {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  addLog(text) {
    this.setState({ log: [{ t: this.hhmm(), text: text }].concat(this.state.log).slice(0, 8) });
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
      p.x = t.x; p.y = t.y; p.dur = dur; p.ease = ease;
      self.forceUpdate();
      self.timers.push(setTimeout(step, dur));
    };
    step();
  }
  go(code, dest, place, done) {
    var self = this, p = this.P[code];
    var path = p.inner.slice().reverse().slice(1).concat(dest);
    if (place !== 'rapat') p.rapatSpot = -1;
    if (place !== 'pantry') p.pantrySpot = -1;
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
  enter(code) {
    var self = this, p = this.P[code], L = this.liftPt();
    p.x = L.x; p.y = L.y; p.dur = 0; p.ease = 'linear'; p.face = 1; p.seated = false; p.busy = true; p.place = 'move'; p.inner = [L];
    this.openLift();
    this.forceUpdate();
    this.timers.push(setTimeout(function () { p.show = true; self.forceUpdate(); }, 350));
    this.timers.push(setTimeout(function () { self.go(code, self.D[code].inner, 'desk'); }, 700));
  }
  leave(code) {
    var self = this, p = this.P[code];
    p.trip = false;
    this.go(code, [this.liftPt()], 'out', function () {
      self.openLift();
      p.busy = true;
      self.timers.push(setTimeout(function () { p.show = false; p.busy = false; self.forceUpdate(); }, 450));
    });
  }
  back(code) {
    var p = this.P[code];
    p.trip = false;
    if (this.state.status[code] !== 'kerja' || p.busy) return;
    if (p.place !== 'rapat' && p.place !== 'pantry') return;
    this.go(code, this.D[code].inner, 'desk');
  }
  toggle(code) {
    var p = this.P[code];
    if (p.busy) return;
    var a = this.agent(code), zn = this.zoneName(a[2]);
    var status = Object.assign({}, this.state.status), text;
    if (status[code] === 'kerja') {
      status[code] = 'luar';
      text = a[1] + ' selesai dan berjalan ke lift · ' + zn;
      this.leave(code);
    } else {
      status[code] = 'kerja';
      text = a[1] + ' ditugaskan, naik lift ke meja · ' + zn;
      this.enter(code);
    }
    this.setState({ status: status, log: [{ t: this.hhmm(), text: text }].concat(this.state.log).slice(0, 8) });
  }
  tick() {
    var sim = this.props.simulate ?? true;
    if (!sim) return;
    var self = this, P = this.P, st = this.state.status;
    var codes = this.agents().map(function (a) { return a[0]; });
    var away = codes.filter(function (c) { return st[c] === 'kerja' && (P[c].trip || P[c].place === 'rapat' || P[c].place === 'pantry'); }).length;
    if (away >= 3) return;
    var ready = codes.filter(function (c) { return st[c] === 'kerja' && !P[c].busy && P[c].place === 'desk'; });
    if (!ready.length) return;
    var c = ready[Math.floor(Math.random() * ready.length)], p = P[c], a = this.agent(c);
    if (Math.random() < 0.55) {
      var usedR = codes.map(function (x) { return P[x].rapatSpot; });
      var k = [0, 1, 2, 3].filter(function (n) { return usedR.indexOf(n) < 0; })[0];
      if (k === undefined) return;
      p.rapatSpot = k; p.trip = true;
      this.go(c, this.rapatInner(k), 'rapat', function () {
        self.timers.push(setTimeout(function () { self.back(c); }, 7000 + Math.random() * 6000));
      });
      this.addLog(a[1] + ' berjalan ke ruang rapat');
    } else {
      var usedP = codes.map(function (x) { return P[x].pantrySpot; });
      var j = [0, 1].filter(function (n) { return usedP.indexOf(n) < 0; })[0];
      if (j === undefined) return;
      p.pantrySpot = j; p.trip = true;
      this.go(c, this.pantryInner(j), 'pantry', function () {
        self.timers.push(setTimeout(function () { self.back(c); }, 3500 + Math.random() * 3000));
      });
    }
  }
  renderVals() {
    var self = this, st = this.state, P = this.P, D = this.D;
    var theme = this.props.theme ?? 'jerco-dark';
    var HD = this.heads(), FG = this.figures(), M = this.metrics(), BK = this.backs(), NOW = Date.now();
    var liftOpen = Date.now() < (this.liftUntil || 0);
    var liftDoor = 'display: block; height: 100%; background: var(--desk); border: 1px solid var(--desk-edge); transition: width 450ms cubic-bezier(0.2, 0, 0, 1); width: ' + (liftOpen ? '0.25cqw' : '1.4cqw') + ';';
    var SEG_ON = 'background: var(--surface-raised); color: var(--foreground); box-shadow: 0 0 0 1px var(--border-strong);';
    var SEG_OFF = 'background: transparent; color: var(--foreground-muted); box-shadow: none;';
    var LABEL = { kerja: 'Di meja', rapat: 'Rapat', pantry: 'Di pantry', bergerak: 'Berjalan', luar: 'Di luar' };
    var rooms = this.zoneRooms(), zoneName = {}, zoneIdx = {};
    rooms.forEach(function (z, i) { zoneName[z.id] = z.name; zoneIdx[z.id] = i; });
    var people = this.agents().map(function (a) {
      var code = a[0], p = P[code], assigned = st.status[code] === 'kerja';
      var ds = p.walk ? 'bergerak' : (assigned && p.place === 'desk') ? 'kerja' : p.place === 'rapat' ? 'rapat' : p.place === 'pantry' ? 'pantry' : assigned ? 'bergerak' : 'luar';
      return {
        code: code, name: a[1], zone: a[2], zoneName: zoneName[a[2]], assigned: assigned, ds: ds, busy: p.busy,
        statusLabel: LABEL[ds],
        action: assigned ? 'Selesaikan' : 'Tugaskan',
        aria: (assigned ? 'Selesaikan tugas ' : 'Tugaskan ') + a[1],
        btnClass: assigned ? 'btn-soft' : 'btn-line',
        btnStyle: assigned ? 'background: var(--action-secondary); color: var(--foreground); border: 1px solid transparent;' : 'background: transparent; color: var(--foreground); border: 1px solid var(--border-strong);',
        avatarStyle: ds === 'luar' ? 'filter: grayscale(1); opacity: 0.55;' : '',
        dotStyle: ds === 'kerja' ? 'background: var(--status-success);' : ds === 'rapat' ? 'background: var(--status-info);' : (ds === 'bergerak' || ds === 'pantry') ? 'background: var(--status-warning);' : 'display: none;',
        head: HD[code], figure: FG[code],
        toggle: function () { self.toggle(code); }
      };
    });
    var total = people.length;
    var count = function (k) { return people.filter(function (p) { return p.ds === k; }).length; };
    var assignedN = people.filter(function (p) { return p.assigned; }).length;
    var pct = Math.round(assignedN / total * 100);
    var nRapat = count('rapat');

    var WH = 5.5;
    var labelStyle = 'position: absolute; left: 0.8cqw; top: 0.6cqw; display: flex; align-items: baseline; gap: 0.5cqw; padding: 0.15cqw 0.5cqw; border-radius: 0.3cqw; background: var(--surface-raised); border: 1px solid var(--border); font-size: max(11px, 0.95cqw); font-weight: 700; color: var(--foreground); white-space: nowrap; transform-origin: 0 100%; transform: translateZ(0.3px) rotateZ(' + (-st.spin) + 'deg) rotateX(' + (-st.tilt) + 'deg); transition: ' + ((st.dragging || st.auto) ? 'none' : 'transform 650ms cubic-bezier(0.2, 0, 0, 1)') + ';';
    var wallsFor = function (rw, door) {
      var g = 3 / rw * 100, out = [];
      var hz = function (top, l, w) { out.push({ style: 'position: absolute; left: ' + l + '%; width: ' + w + '%; top: ' + top + '; height: ' + WH + 'cqw; transform-origin: 50% 0; transform: rotateX(90deg); background: var(--glass3d); border-top: 0.35cqw solid var(--wall); border-bottom: 0.2cqw solid var(--frame); pointer-events: none;' }); };
      var vt = function (left) { out.push({ style: 'position: absolute; top: 0; height: 100%; left: ' + left + '; width: ' + WH + 'cqw; transform-origin: 0 50%; transform: rotateY(-90deg); background: var(--glass3d); border-left: 0.35cqw solid var(--wall); border-right: 0.2cqw solid var(--frame); pointer-events: none;' }); };
      if (door === 'top') { hz('0', 0, 50 - g); hz('0', 50 + g, 50 - g); } else { hz('0', 0, 100); }
      if (door === 'bottom') { hz('100%', 0, 50 - g); hz('100%', 50 + g, 50 - g); } else { hz('100%', 0, 100); }
      vt('0'); vt('100%');
      return out;
    };
    var roomVals = rooms.map(function (r) {
      var inZ = people.filter(function (p) { return p.zone === r.id; });
      var on = inZ.filter(function (p) { return p.assigned; }).length;
      var door = r.top ? 'bottom: -0.3cqw;' : 'top: -0.3cqw;';
      return {
        name: r.name, count: on + '/' + inZ.length, walls: wallsFor(r.w, r.top ? 'bottom' : 'top'), labelStyle: labelStyle,
        style: 'position: absolute; left: ' + r.x + '%; top: ' + r.y + '%; width: ' + r.w + '%; height: ' + r.h + '%; z-index: 1; background: var(--background); border: 0.22cqw solid var(--wall); border-radius: 0.4cqw; transform: translateZ(0.2px); transform-style: preserve-3d;',
        doorStyle: 'position: absolute; left: 50%; width: 6cqw; margin-left: -3cqw; height: 0.4cqw; ' + door + ' background: var(--surface);'
      };
    });
    roomVals.push({
      name: 'Ruang rapat', count: nRapat + '/4', walls: wallsFor(25, 'bottom'), labelStyle: labelStyle,
      style: 'position: absolute; left: 74%; top: 3%; width: 25%; height: 38%; z-index: 1; background: var(--background); border: 0.22cqw solid var(--wall); border-radius: 0.4cqw; transform: translateZ(0.2px); transform-style: preserve-3d;',
      doorStyle: 'position: absolute; left: 50%; width: 6cqw; margin-left: -3cqw; height: 0.4cqw; bottom: -0.3cqw; background: var(--surface);'
    });

    var TP = this.tops(), RM = st.mode === 'rotate', is3d = st.tilt > 15;
    var smoothD = (st.dragging || st.auto) ? 'none' : 'transform 650ms cubic-bezier(0.2, 0, 0, 1)';
    var desks = people.map(function (p, idx) {
      var d = D[p.code], on = p.assigned, pp = P[p.code];
      var atDesk = pp.seated && !pp.walk && pp.place === 'desk', working = on && atDesk;
      var Rr = self.R[p.code], away = Math.cos((Rr + st.spin) * Math.PI / 180) > 0, mm = M[p.code];
      var sW = away ? 2.4 : 6.4 * mm[0], sH = away ? 2.6 : 6.4, sZ = away ? 1.9 : -2.1;
      return {
        label: p.name, busy: p.busy,
        click: function () { if (self.state.mode === 'orbit') return; self.toggle(p.code); },
        btnClass: RM ? 'desk rot' : 'desk',
        aria: RM ? 'Putar meja ' + p.name + ' 90 derajat' : (on ? 'Selesaikan tugas ' : 'Tugaskan ') + p.name + ', meja ' + p.zoneName,
        title: p.name + (RM ? ' · klik untuk memutar meja' : (on ? ' · klik untuk selesaikan' : ' · klik untuk tugaskan')),
        style: 'position: absolute; left: ' + d.x + '%; top: ' + d.y + '%; z-index: ' + Math.round((d.y - 5) * 10) + '; width: 5cqw; height: 5cqw; transform: translate(-50%, -50%) translateZ(1px); transform-style: preserve-3d; padding: 0; border: 0; background: transparent; display: block;',
        unitStyle: 'position: absolute; inset: 0; transform-style: preserve-3d; transform: rotate(' + self.R[p.code] + 'deg); transition: transform 450ms cubic-bezier(0.2, 0, 0, 1);',
        seatWrap: 'position: absolute; left: 50%; top: 3.85cqw; width: 0; height: 0; transform-style: preserve-3d; transform: translateZ(' + sZ + 'cqw);',
        seatBill: 'position: absolute; left: 0; bottom: 0; width: ' + sW.toFixed(2) + 'cqw; height: ' + sH + 'cqw; margin-left: -' + (sW / 2).toFixed(2) + 'cqw; transform-origin: 50% 100%; transform: rotateZ(' + (-(Rr + st.spin)) + 'deg) rotateX(' + (-st.tilt) + 'deg); transition: ' + smoothD + '; opacity: ' + (atDesk && is3d ? 1 : 0) + ';',
        seatImg: away ? BK[p.code] : FG[p.code], seatClass: atDesk ? 'typer' : '',
        seatImgStyle: 'display: block; width: 100%; height: 100%; transform-origin: 50% 100%; ' + (away ? 'image-rendering: pixelated; ' : '') + 'animation-delay: -' + ((idx * 0.37) % 2.6).toFixed(2) + 's;',
        monClass: working ? 'screen-on' : '',
        screenStyle: 'position: absolute; left: 50%; top: -0.45cqw; width: 2.4cqw; height: 1.5cqw; margin-left: -1.2cqw; transform-origin: 50% 100%; transform: translateZ(3.4cqw) rotateX(-90deg); backface-visibility: hidden; border-radius: 0.15cqw; border: 0.14cqw solid #1a212c; background-color: #0a1322; ' + (on ? 'background-image: repeating-linear-gradient(180deg, rgba(86, 200, 242, 0.9) 0 0.1cqw, transparent 0.1cqw 0.26cqw), repeating-linear-gradient(180deg, rgba(150, 226, 140, 0.8) 0 0.1cqw, transparent 0.1cqw 0.4cqw); background-size: 60% 1.5cqw, 36% 1.5cqw; background-position: 0.15cqw 0.1cqw, 0.15cqw 0.24cqw; background-repeat: repeat-y; box-shadow: 0 0 1cqw rgba(86, 200, 242, ' + (working ? '0.55' : '0.15') + ');' + (working ? '' : ' filter: brightness(0.55);') : ''),
        top: TP[p.code], topClass: atDesk ? 'typer' : '',
        topStyle: 'position: absolute; left: 50%; top: 1.6cqw; width: 2.6cqw; height: 2.6cqw; margin-left: -1.3cqw; display: block; image-rendering: pixelated; transform-origin: 50% 60%; transform: translateZ(2.6cqw); transition: opacity 300ms ease; opacity: ' + (atDesk && !is3d ? 1 : 0) + '; animation-delay: -' + ((idx * 0.37) % 2.6).toFixed(2) + 's;',
        bubbleStyle: 'position: absolute; right: -0.5cqw; top: -0.9cqw; z-index: 3; padding: 0.3cqw 0.45cqw; gap: 0.22cqw; align-items: center; border-radius: 0.7cqw 0.7cqw 0.12cqw 0.7cqw; background: var(--surface-raised); border: 1px solid var(--border); display: ' + ((atDesk && !is3d && NOW < pp.bubbleUntil) ? 'flex' : 'none') + ';',
        handleStyle: 'position: absolute; left: -0.5cqw; top: -0.5cqw; z-index: 4; width: 1.5cqw; height: 1.5cqw; min-width: 18px; min-height: 18px; border-radius: 50%; background: var(--action-primary); color: var(--action-primary-foreground); align-items: center; justify-content: center; display: ' + (RM ? 'flex' : 'none') + ';',
        plateStyle: 'position: absolute; left: 50%; top: calc(100% + 0.1cqw); transform: translateX(-50%); display: ' + (is3d ? 'none' : 'block') + '; max-width: 5.4cqw; padding: 0.05cqw 0.35cqw; border-radius: 0.25cqw; font-size: max(10px, 0.72cqw); line-height: 1.3; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ' + (on ? 'color: var(--foreground); background: var(--surface);' : 'color: var(--foreground-muted); background: transparent;')
      };
    });
    var modes = [['pick', 'Tugaskan'], ['orbit', 'Putar tampilan']].map(function (m) {
      var on = st.mode === m[0];
      return { label: m[1], isPick: m[0] === 'pick', isHand: m[0] === 'orbit', pressed: on ? 'true' : 'false', style: on ? SEG_ON : SEG_OFF, pick: function () { self.setState({ mode: m[0] }); } };
    });
    var OR = st.mode === 'orbit';
    var modeHint = OR ? 'Seret denah: geser kiri-kanan untuk memutar 360°, atas-bawah untuk mengatur kemiringan.' : 'Klik meja untuk menugaskan atau menyelesaikan agent.';
    var smooth = (st.dragging || st.auto) ? 'none' : 'transform 650ms cubic-bezier(0.2, 0, 0, 1)';
    var spinRad = st.spin * Math.PI / 180;
    var fit = (0.97 - 0.2 * Math.abs(Math.sin(spinRad))).toFixed(3);
    var floorStyle = 'transform: rotateX(' + st.tilt + 'deg) rotateZ(' + st.spin + 'deg) scale(' + fit + '); transition: ' + smooth + ';';
    var billBase = 'position: relative; transform-origin: 50% 100%; transform: rotateZ(' + (-st.spin) + 'deg) rotateX(' + (-st.tilt) + 'deg); transition: ' + smooth + ';';
    var isTop = st.tilt < 1 && Math.abs(st.spin % 360) < 1;
    var setView = function (spin, tilt) { self.setState({ spin: spin, tilt: tilt, auto: false }); };

    var walkers = people.map(function (pp, idx) {
      var p = P[pp.code];
      var showTag = p.show && (p.walk || p.place === 'rapat' || p.place === 'pantry');
      var m = M[pp.code], seat = (p.seated && !p.walk) ? p.seatOff : 0;
      var seatX = 0, atDesk = p.seated && !p.walk && p.place === 'desk';
      var sc = (0.86 + 0.18 * p.y / 100).toFixed(3), rw = (7.2 * m[0]).toFixed(2);
      var mode = p.walk ? 'walking' : (p.seated ? 'seated' : 'standing');
      var bub = p.show && !p.walk && !atDesk && Date.now() < p.bubbleUntil;
      var delay = (idx * 0.37 % 2.6).toFixed(2);
      return {
        name: pp.name, figure: pp.figure, billStyle: billBase,
        rigClass: 'rig ' + (p.show ? mode : ''),
        style: 'position: absolute; left: ' + p.x + '%; top: ' + p.y + '%; z-index: ' + Math.round(p.y * 10) + '; opacity: ' + (p.show && !atDesk ? 1 : 0) + '; transform: translate(-50%, -100%) translateZ(2px); transform-style: preserve-3d; transition: left ' + p.dur + 'ms ' + p.ease + ', top ' + p.dur + 'ms ' + p.ease + ', opacity 300ms ease; pointer-events: none;',
        bodyStyle: 'position: relative; transform: translate(' + seatX + 'cqw, ' + seat + 'cqw) scale(' + sc + '); transform-origin: 50% 100%; transition: transform ' + (p.walk ? p.dur + 'ms linear' : '420ms cubic-bezier(0.2, 0, 0, 1)') + ';',
        rigStyle: 'position: relative; height: 7.2cqw; width: ' + rw + 'cqw; transform: scaleX(' + p.face + ');',
        legLStyle: 'clip-path: inset(' + (m[2] - 1) + '% ' + (100 - m[1]).toFixed(1) + '% 0 0); transform-origin: ' + m[1] + '% ' + (m[2] - 2) + '%;',
        legRStyle: 'clip-path: inset(' + (m[2] - 1) + '% 0 0 ' + m[1] + '%); transform-origin: ' + m[1] + '% ' + (m[2] - 2) + '%;',
        torsoStyle: 'clip-path: inset(0 0 ' + (97 - m[2]).toFixed(1) + '% 0); transform-origin: 50% ' + m[2] + '%; animation-delay: -' + delay + 's;',
        shadowStyle: 'position: absolute; left: 50%; bottom: -0.35cqw; width: ' + (3.4 * sc).toFixed(2) + 'cqw; height: 0.8cqw; transform: translateX(-50%); border-radius: 999px; background: rgba(0, 0, 0, 0.32); transition: opacity 300ms ease; opacity: ' + (seat ? 0 : 1) + ';',
        bubbleStyle: 'position: absolute; left: 60%; bottom: calc(100% - ' + seat + 'cqw + 0.1cqw); z-index: 2; padding: 0.35cqw 0.55cqw; gap: 0.25cqw; align-items: center; border-radius: 0.8cqw 0.8cqw 0.8cqw 0.15cqw; background: var(--surface-raised); border: 1px solid var(--border); display: ' + (bub ? 'flex' : 'none') + ';',
        tagStyle: 'position: absolute; left: 50%; bottom: calc(100% + 0.2cqw); transform: translateX(-50%); padding: 0.1cqw 0.5cqw; border-radius: 999px; font-size: max(10px, 0.72cqw); font-weight: 600; white-space: nowrap; background: var(--surface-raised); border: 1px solid var(--border); color: var(--foreground); display: ' + (showTag ? 'block' : 'none') + ';'
      };
    });

    var q = (st.query || '').toLowerCase().trim();
    var roster = people.filter(function (p) {
      if (st.filter === 'lantai' && !p.assigned) return false;
      if (st.filter === 'luar' && p.assigned) return false;
      if (q && (p.name + ' ' + p.zoneName + ' ' + p.code).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return (b.assigned - a.assigned) || (zoneIdx[a.zone] - zoneIdx[b.zone]); });
    var filters = [['lantai', 'Di lantai', assignedN], ['luar', 'Di luar', total - assignedN], ['semua', 'Semua', total]].map(function (f) {
      var on = st.filter === f[0];
      return { label: f[1], count: f[2], pressed: on ? 'true' : 'false', style: on ? SEG_ON : SEG_OFF, pick: function () { self.setState({ filter: f[0] }); } };
    });
    var shifts = ['Pagi', 'Rilis', 'Lapangan', 'Trust'].map(function (n) {
      var on = st.shift === n;
      return { label: n, pressed: on ? 'true' : 'false', style: on ? SEG_ON : SEG_OFF, pick: function () { self.setState({ shift: n }); } };
    });
    var clock = new Date(st.now).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return {
      theme: theme, clock: clock,
      stats: { kerja: count('kerja'), rapat: nRapat, bergerak: count('bergerak') + count('pantry'), luar: count('luar'), total: total },
      occupancyPct: pct, occupancyStyle: 'width: ' + pct + '%;', occupancyText: assignedN + ' dari ' + total + ' meja · ' + pct + '%',
      rooms: roomVals, desks: desks, walkers: walkers, liftDoor: liftDoor, modes: modes, modeHint: modeHint,
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
        var spin = self.drag.s + (e.clientX - self.drag.x) * 0.45;
        var tilt = Math.max(0, Math.min(72, self.drag.t - (e.clientY - self.drag.y) * 0.35));
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
      roster: roster, noResults: roster.length === 0, filters: filters, shifts: shifts,
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
        <p style="margin: 0; color: var(--foreground-muted); max-width: 560px;">Agent muncul di meja hanya saat sedang bekerja. Yang idle tetap di luar lantai.</p>
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
          Di luar lantai
        </div>
        <span style="font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -0.02em;">${v.stats.luar}</span>
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
          <p style="margin: 0; color: var(--foreground-muted);">[Ringkasan terbaru dari Grok tampil di sini]</p>
          <span style="font-size: 12px; color: var(--foreground-subtle); font-family: 'Geist Mono', ui-monospace, monospace;">Diperbarui —</span>
        </div>
      </div>
    </section>

    <section id="lantai" aria-labelledby="judul-lantai" style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h2 id="judul-lantai" style="margin: 0; font-size: 18px; line-height: 1.2; font-weight: 700;">Jerco HQ · Lantai 7</h2>
          <p style="margin: 0; color: var(--foreground-muted);">Denah tampak atas. Agent naik lift, berjalan ke kursinya, lalu duduk bekerja di depan monitor.</p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--foreground-muted);">
          <span style="display: flex; align-items: center; gap: 6px;"><span aria-hidden="true" style="width: 14px; height: 9px; border-radius: 2px; background: var(--action-primary);"></span>Monitor menyala: meja ditugaskan</span>
          <span style="display: flex; align-items: center; gap: 6px;"><span aria-hidden="true" style="width: 14px; height: 9px; border-radius: 2px; background: var(--desk); border: 1px solid var(--desk-edge);"></span>Meja kosong</span>
        </div>
      </div>

      <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
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
      <div role="group" aria-label="Denah lantai 7" style="position: absolute; left: 0; top: 10%; width: 100%; aspect-ratio: 2 / 1; container-type: inline-size; background-color: var(--surface); background-image: linear-gradient(var(--tile) 1px, transparent 1px), linear-gradient(90deg, var(--tile) 1px, transparent 1px); background-size: 2.5cqw 2.5cqw; transform-style: preserve-3d; ${v.floorStyle}">
        <span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 100%; height: 1.4cqw; transform-origin: 50% 0; transform: rotateX(-90deg); background: var(--slab-edge);"></span>
        <span aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 0; height: 1.4cqw; transform-origin: 50% 0; transform: rotateX(-90deg); background: var(--slab-edge);"></span>
        <span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; left: 0; width: 1.4cqw; transform-origin: 0 50%; transform: rotateY(90deg); background: var(--slab-edge);"></span>
        <span aria-hidden="true" style="position: absolute; top: 0; bottom: 0; left: 100%; width: 1.4cqw; transform-origin: 0 50%; transform: rotateY(90deg); background: var(--slab-edge);"></span>

        ${v.rooms.map((r) => html`
          <div style=${r.style}>
            <span style=${r.labelStyle}>${r.name}<span style="font-family: 'Geist Mono', ui-monospace, monospace; font-weight: 500; color: var(--foreground-muted);">${r.count}</span></span>
            <span aria-hidden="true" style=${r.doorStyle}></span>
            ${r.walls.map((wl) => html`<span aria-hidden="true" style=${wl.style}></span>`)}
          </div>
        `)}

        <div aria-hidden="true" style="position: absolute; left: 81.5%; top: 19%; width: 10%; height: 9%; z-index: 280; transform: translateZ(2.8cqw); border-radius: 1cqw; background: var(--desk); border: 1px solid var(--desk-edge); box-shadow: 0 0.4cqw 0 var(--desk-edge);"></div>

        <div aria-hidden="true" style="position: absolute; left: 0.6%; top: 42.5%; width: 4.6%; height: 14%; z-index: 2; transform: translateZ(0.6px); border-radius: 0.3cqw; background: var(--surface-raised); border: 0.22cqw solid var(--wall); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3cqw;">
          <span style="font-family: 'Geist Mono', ui-monospace, monospace; font-size: max(10px, 0.75cqw); font-weight: 600; letter-spacing: 0.08em; color: var(--foreground-muted);">LIFT</span>
          <span style="position: relative; width: 2.8cqw; height: 3.2cqw; display: flex; justify-content: space-between; background: var(--background); border: 1px solid var(--wall); overflow: hidden;"><span style=${v.liftDoor}></span><span style=${v.liftDoor}></span></span>
        </div>

        <div aria-hidden="true" style="position: absolute; left: 92.4%; top: 42%; width: 6.8%; height: 5.4%; z-index: 2; transform: translateZ(3cqw); border-radius: 0.3cqw; background: var(--desk); border: 1px solid var(--desk-edge); display: flex; align-items: center; justify-content: center;">
          <span style="font-size: max(10px, 0.75cqw); font-weight: 600; color: var(--foreground-muted);">Pantry</span>
        </div>

        <span aria-hidden="true" style="position: absolute; left: 36%; top: 47.6%; z-index: 1; transform: translateZ(0.4px); font-family: 'Geist Mono', ui-monospace, monospace; font-size: max(10px, 0.8cqw); letter-spacing: 0.3em; color: var(--foreground-subtle); opacity: 0.6;">KORIDOR</span>

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
              <span style=${d.seatWrap}><span style=${d.seatBill}><img class=${d.seatClass} src=${d.seatImg} alt="" style=${d.seatImgStyle} /></span></span>
            </span>
            <span aria-hidden="true" style=${d.bubbleStyle}><span class="dot"></span><span class="dot d2"></span><span class="dot d3"></span></span>
            <span aria-hidden="true" style=${d.handleStyle}><svg width="70%" height="70%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg></span>
            <span class="plate" style=${d.plateStyle}>${d.label}</span>
          </button>
        `)}

        ${v.walkers.map((w) => html`
          <div class="agent" aria-hidden="true" style=${w.style}>
            <span style=${w.shadowStyle}></span>
            <div style=${w.billStyle}>
              <span style=${w.tagStyle}>${w.name}</span>
              <span style=${w.bubbleStyle}><span class="dot"></span><span class="dot d2"></span><span class="dot d3"></span></span>
              <div style=${w.bodyStyle}>
                <div class=${w.rigClass} style=${w.rigStyle}>
                  <img src=${w.figure} alt="" class="legL" style=${w.legLStyle} />
                  <img src=${w.figure} alt="" class="legR" style=${w.legRStyle} />
                  <img src=${w.figure} alt="" class="torso" style=${w.torsoStyle} />
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
