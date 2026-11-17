/* Statistikk lagret i localStorage (eller annen storage med getItem/setItem/removeItem). */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T = g.IPV6T || {};
  var KEY = 'ipv6t.stats.v1';
  var MAX_ROUNDS = 300;

  function empty() { return { version: 1, modules: {}, streak: { days: 0, best: 0, lastDay: null }, run: { current: 0, best: 0 } }; }
  function dayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayDiff(a, b) { // antall dager fra a til b (YYYY-MM-DD)
    var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }

  function Stats(storage) {
    this.storage = storage || null;
    this.data = this.load();
  }
  Stats.prototype.load = function () {
    try {
      var raw = this.storage && this.storage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.version === 1) {
          var e = empty();
          d.modules = d.modules || {}; d.streak = d.streak || e.streak; d.run = d.run || e.run;
          return d;
        }
      }
    } catch (err) { /* korrupt data: start på nytt */ }
    return empty();
  };
  Stats.prototype.save = function () {
    try { if (this.storage) this.storage.setItem(KEY, JSON.stringify(this.data)); } catch (err) { /* privat modus e.l. */ }
  };
  Stats.prototype.mod = function (id) {
    var m = this.data.modules[id];
    if (!m) m = this.data.modules[id] = { attempts: 0, correct: 0, bestPct: null, bestByLevel: {}, types: {}, rounds: [] };
    return m;
  };
  Stats.prototype.touchDay = function (now) {
    var s = this.data.streak, today = dayStr(now);
    if (s.lastDay === today) return;
    if (s.lastDay && dayDiff(s.lastDay, today) === 1) s.days += 1; else s.days = 1;
    s.lastDay = today;
    if (s.days > s.best) s.best = s.days;
  };
  /* Kalles for hvert svar. */
  Stats.prototype.recordAnswer = function (moduleId, type, correct, now) {
    var m = this.mod(moduleId);
    m.attempts++; if (correct) m.correct++;
    var t = m.types[type] || (m.types[type] = { attempts: 0, correct: 0 });
    t.attempts++; if (correct) t.correct++;
    var r = this.data.run;
    if (correct) { r.current++; if (r.current > r.best) r.best = r.current; } else r.current = 0;
    this.touchDay(now);
    this.save();
  };
  /* Kalles når en runde er ferdig. */
  Stats.prototype.recordRound = function (moduleId, round, now) {
    var m = this.mod(moduleId);
    var pct = round.total ? Math.round(100 * round.correct / round.total) : 0;
    var entry = { date: (now || new Date()).toISOString(), level: round.level, correct: round.correct, total: round.total, pct: pct, timeMs: round.timeMs, replay: !!round.replay };
    m.rounds.push(entry);
    if (m.rounds.length > MAX_ROUNDS) m.rounds.splice(0, m.rounds.length - MAX_ROUNDS);
    if (!round.replay) {
      if (m.bestPct == null || pct > m.bestPct) m.bestPct = pct;
      var b = m.bestByLevel[round.level];
      if (!b || pct > b.pct || (pct === b.pct && round.timeMs < b.timeMs)) m.bestByLevel[round.level] = { pct: pct, correct: round.correct, total: round.total, timeMs: round.timeMs };
    }
    this.touchDay(now);
    this.save();
    return entry;
  };
  Stats.prototype.reset = function () {
    this.data = empty();
    try { if (this.storage) this.storage.removeItem(KEY); } catch (err) { /* ignorer */ }
  };
  Stats.KEY = KEY;
  Stats._dayStr = dayStr;
  IPV6T.Stats = Stats;
})(typeof window !== 'undefined' ? window : globalThis);
