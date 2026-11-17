/* Brukergrensesnitt: startside, runde, resultat, teori og statistikk. */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T, R = IPV6T.registry, U = IPV6T.util, doc = g.document;
  var $ = function (id) { return doc.getElementById(id); };

  var storage = null;
  try { storage = g.localStorage; storage.getItem('x'); } catch (e) { storage = null; }
  var stats = new IPV6T.Stats(storage);

  var state = {
    moduleId: (R.active()[0] || {}).id,
    level: 'lett',
    count: 10,
    type: '',
    round: null,
    lastResult: null,
    timerId: null
  };

  function levelLabel(id) { return (IPV6T.LEVELS.filter(function (l) { return l.id === id; })[0] || {}).label || id; }
  function fmtTime(ms) {
    var s = Math.round(ms / 1000), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  }
  function pct(c, a) { return a ? Math.round(100 * c / a) : null; }
  function h(tag, attrs, children) {
    var e = doc.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }

  function headerOffset() {
    var tb = doc.querySelector('.topbar');
    if (!tb) return 0;
    return Math.ceil(tb.getBoundingClientRect().height) + 2;
  }
  function prefersReducedMotion() {
    try { return !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  /* Rull mykt til en seksjon, under den faste topplinjen. Hopper over hvis den allerede er synlig. */
  function scrollToEl(el, force) {
    if (!el) return;
    if (!force) try {
      var rect = el.getBoundingClientRect();
      var vh = g.innerHeight || 0;
      var top = headerOffset();
      if (rect.top >= top - 2 && rect.bottom <= vh) return;
    } catch (e) { /* jsdom */ }
    var y;
    try { y = el.getBoundingClientRect().top + (g.pageYOffset || doc.documentElement.scrollTop || 0) - headerOffset(); }
    catch (e) { return; }
    var behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (g.scrollTo) {
      try { g.scrollTo({ top: Math.max(0, y), behavior: behavior }); return; }
      catch (e) { try { g.scrollTo(0, Math.max(0, y)); return; } catch (e2) { /* jsdom */ } }
    }
    try { el.scrollIntoView({ behavior: behavior, block: 'start' }); }
    catch (e) { try { el.scrollIntoView(true); } catch (e2) { /* jsdom */ } }
  }

  // ---------- navigasjon ----------
  var VIEWS = ['start', 'round', 'result', 'teori', 'statistikk'];
  function show(view) {
    if (view !== 'round') stopTimer();
    VIEWS.forEach(function (v) { $('view-' + v).hidden = v !== view; });
    doc.querySelectorAll('.nav button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-nav') === view); });
    if (view === 'start') renderStart();
    if (view === 'teori') renderTheory($('theory-content'));
    if (view === 'statistikk') renderStats();
    if (g.scrollTo) try { g.scrollTo(0, 0); } catch (e) { /* jsdom */ }
  }
  doc.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-nav]');
    if (!t) return;
    ev.preventDefault();
    var view = t.getAttribute('data-nav');
    if (state.round && !state.round.finished && !$('view-round').hidden) {
      if (!g.confirm('Vil du avslutte runden? Svarene du har gitt, er lagret i statistikken.')) return;
      state.round = null;
    }
    show(view);
  });

  // ---------- start ----------
  function renderStart() {
    var list = $('module-list');
    list.textContent = '';
    R.list().forEach(function (m) {
      var active = m.status === 'active';
      var card = h('button', { type: 'button', class: 'module-card' + (active ? '' : ' soon') + (m.id === state.moduleId ? ' selected' : '') }, [
        h('span', { class: 'module-code', text: m.code }),
        h('span', { class: 'module-title', text: m.title }),
        h('span', { class: 'module-desc', text: m.description || '' }),
        active ? null : h('span', { class: 'badge', text: 'Kommer snart' })
      ]);
      if (active) card.addEventListener('click', function () {
        state.moduleId = m.id; state.type = ''; renderStart();
        var go = function () { scrollToEl($('setup-form'), true); };
        if (g.requestAnimationFrame) g.requestAnimationFrame(go); else go();
      });
      else { card.disabled = true; card.setAttribute('aria-disabled', 'true'); }
      list.appendChild(card);
    });

    var mod = R.get(state.moduleId);
    var lc = $('level-choices');
    lc.textContent = '';
    IPV6T.LEVELS.forEach(function (l) {
      var id = 'lvl-' + l.id;
      var inp = h('input', { type: 'radio', name: 'level', id: id, value: l.id });
      inp.checked = l.id === state.level;
      inp.addEventListener('change', function () { state.level = l.id; });
      lc.appendChild(inp);
      lc.appendChild(h('label', { for: id, text: l.label }));
    });
    var sel = $('type-select');
    sel.textContent = '';
    sel.appendChild(h('option', { value: '', text: 'Blandet (anbefalt)' }));
    (mod ? mod.taskTypes : []).forEach(function (t) {
      var o = h('option', { value: t.id, text: t.label });
      if (t.id === state.type) o.selected = true;
      sel.appendChild(o);
    });
    $('count-input').value = state.count;
  }
  $('type-select').addEventListener('change', function (e) { state.type = e.target.value; });
  $('setup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = parseInt($('count-input').value, 10);
    state.count = Math.min(100, Math.max(1, isNaN(n) ? 10 : n));
    startRound(makeTasks(state.moduleId, state.level, state.count, state.type), false);
  });

  function makeTasks(moduleId, level, count, type) {
    var mod = R.get(moduleId), tasks = [], seen = {};
    for (var i = 0; i < count; i++) {
      var t, tries = 0;
      do { t = mod.generate({ level: level, type: type || null }); t.key = t.key || (t.type + '|' + t.question + '|' + t.subject); tries++; } while (seen[t.key] && tries < 25);
      seen[t.key] = true;
      tasks.push(t);
    }
    return tasks;
  }

  // ---------- runde ----------
  function startRound(tasks, replay) {
    state.round = {
      moduleId: state.moduleId, level: state.level, tasks: tasks, idx: 0, results: [],
      start: Date.now(), answered: false, finished: false, replay: replay
    };
    show('round');
    $('round-theory').hidden = true;
    $('theory-toggle').textContent = 'Vis teori';
    $('round-level').textContent = levelLabel(state.level) + (replay ? ' · Øv på feilene' : '');
    startTimer();
    renderTask();
  }
  function startTimer() {
    stopTimer();
    var tick = function () { if (state.round) $('round-timer').textContent = fmtTime(Date.now() - state.round.start); };
    tick();
    state.timerId = g.setInterval(tick, 1000);
  }
  function stopTimer() { if (state.timerId) { g.clearInterval(state.timerId); state.timerId = null; } }

  var INPUTMODE = { dec: 'numeric', bin: 'numeric', hex: 'text' };
  function renderTask() {
    var r = state.round, t = r.tasks[r.idx];
    r.answered = false;
    $('round-progress').textContent = 'Oppgave ' + (r.idx + 1) + ' av ' + r.tasks.length;
    var right = r.results.filter(function (x) { return x.correct; }).length;
    $('round-score').textContent = right + ' riktige';
    $('round-bar').style.width = (100 * r.idx / r.tasks.length) + '%';
    $('task-type').textContent = t.typeLabel;
    $('task-question').textContent = t.question;
    $('task-subject').textContent = t.subject || '';
    $('task-subject').hidden = !t.subject;
    var inp = $('answer-input');
    inp.value = '';
    inp.readOnly = false;
    inp.className = '';
    inp.placeholder = t.placeholder || 'Svar';
    inp.setAttribute('inputmode', INPUTMODE[t.inputKind] || 'text');
    $('answer-btn').textContent = 'Svar';
    $('dontknow-btn').hidden = false;
    $('feedback').hidden = true;
    $('feedback').textContent = '';
    scrollToEl($('view-round'));
    try { inp.focus(); } catch (e) { /* ignorer */ }
  }

  function renderExplanation(container, t) {
    var ex = t.explanation || { steps: [] };
    var ol = h('ol', { class: 'steps' });
    ex.steps.forEach(function (s) { ol.appendChild(h('li', { text: s })); });
    container.appendChild(ol);
    if (ex.table) {
      var table = h('table', { class: 'ex-table' });
      var thead = h('thead', null, [h('tr', null, ex.table.head.map(function (c) { return h('th', { text: c }); }))]);
      var tbody = h('tbody', null, ex.table.rows.map(function (row) {
        return h('tr', null, row.map(function (c) { return h('td', { text: c }); }));
      }));
      table.appendChild(thead); table.appendChild(tbody);
      container.appendChild(h('div', { class: 'table-wrap' }, [table]));
    }
  }

  function submitAnswer(given, skipped) {
    var r = state.round, t = r.tasks[r.idx];
    if (!skipped && U.clean(given) === '') { $('answer-input').classList.add('shake'); return; }
    var ok = !skipped && t.validate(given);
    r.answered = true;
    r.results.push({ task: t, given: skipped ? '' : given, correct: ok, skipped: !!skipped });
    stats.recordAnswer(r.moduleId, t.type, ok);

    var inp = $('answer-input');
    inp.readOnly = true;
    inp.className = ok ? 'is-right' : 'is-wrong';
    $('dontknow-btn').hidden = true;
    var fb = $('feedback');
    fb.textContent = '';
    fb.className = 'feedback ' + (ok ? 'right' : 'wrong');
    fb.appendChild(h('div', { class: 'verdict', text: ok ? '✓ Riktig!' : (skipped ? 'Fasit' : '✗ Feil') }));
    if (!ok && !skipped) fb.appendChild(h('div', { class: 'given' }, ['Du svarte: ', h('code', { text: given.trim() })]));
    fb.appendChild(h('div', { class: 'answer' }, ['Riktig svar: ', h('code', { text: t.answerDisplay })]));
    var hint = ok && t.hint ? t.hint(given) : null;
    if (hint) fb.appendChild(h('div', { class: 'hint', text: hint }));
    fb.appendChild(h('div', { class: 'ex-title', text: 'Forklaring' }));
    renderExplanation(fb, t);
    fb.hidden = false;
    var last = r.idx === r.tasks.length - 1;
    $('answer-btn').textContent = last ? 'Se resultat' : 'Neste →';
    $('round-score').textContent = r.results.filter(function (x) { return x.correct; }).length + ' riktige';
    $('round-bar').style.width = (100 * (r.idx + 1) / r.tasks.length) + '%';
    try { inp.focus(); } catch (e) { /* ignorer */ }
  }

  function next() {
    var r = state.round;
    if (r.idx < r.tasks.length - 1) { r.idx++; renderTask(); } else finishRound();
  }

  $('answer-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!state.round) return;
    if (state.round.answered) next(); else submitAnswer($('answer-input').value, false);
  });
  $('answer-input').addEventListener('animationend', function () { this.classList.remove('shake'); });
  $('dontknow-btn').addEventListener('click', function () { if (state.round && !state.round.answered) submitAnswer('', true); });
  $('theory-toggle').addEventListener('click', function () {
    var box = $('round-theory');
    box.hidden = !box.hidden;
    this.textContent = box.hidden ? 'Vis teori' : 'Skjul teori';
    if (!box.hidden) renderTheory(box);
  });
  $('quit-btn').addEventListener('click', function () {
    if (g.confirm('Vil du avslutte runden? Svarene du har gitt, er lagret i statistikken.')) { state.round = null; show('start'); }
  });

  function finishRound() {
    var r = state.round;
    r.finished = true;
    stopTimer();
    var timeMs = Date.now() - r.start;
    var correct = r.results.filter(function (x) { return x.correct; }).length;
    var total = r.results.length;
    stats.recordRound(r.moduleId, { level: r.level, correct: correct, total: total, timeMs: timeMs, replay: r.replay });
    state.lastResult = { round: r, correct: correct, total: total, timeMs: timeMs };
    renderResult();
    show('result');
  }

  function renderResult() {
    var res = state.lastResult, p = pct(res.correct, res.total);
    $('result-title').textContent = p === 100 ? 'Perfekt! 🎉' : p >= 80 ? 'Veldig bra!' : p >= 50 ? 'Bra jobbet!' : 'Fortsett å øve!';
    $('result-score').textContent = res.correct + ' / ' + res.total + ' (' + p + ' %)';
    var m = stats.mod(res.round.moduleId);
    var best = m.bestByLevel[res.round.level];
    $('result-meta').textContent = 'Tid brukt: ' + fmtTime(res.timeMs) + ' · ' + levelLabel(res.round.level) +
      (res.round.replay ? ' · Øv på feilene' : (best ? ' · Beste på dette nivået: ' + best.pct + ' %' : ''));
    var missed = res.round.results.filter(function (x) { return !x.correct; });
    $('replay-btn').hidden = missed.length === 0;
    var list = $('missed-list');
    list.textContent = '';
    $('missed-wrap').hidden = missed.length === 0;
    missed.forEach(function (x, i) {
      var t = x.task;
      var body = h('div', { class: 'missed-body' });
      renderExplanation(body, t);
      list.appendChild(h('details', { class: 'card missed', open: i < 3 ? '' : null }, [
        h('summary', null, [
          h('span', { class: 'task-type', text: t.typeLabel }),
          h('span', { class: 'missed-q' }, [t.question + ' ', t.subject ? h('code', { text: t.subject }) : null]),
          h('span', { class: 'missed-a' }, (x.skipped ? ['Hoppet over'] : ['Ditt svar: ', h('code', { text: x.given.trim() })])
            .concat([' · Fasit: ', h('code', { text: t.answerDisplay })]))
        ]),
        body
      ]));
    });
  }
  $('replay-btn').addEventListener('click', function () {
    var res = state.lastResult;
    var missed = res.round.results.filter(function (x) { return !x.correct; }).map(function (x) { return x.task; });
    if (!missed.length) return;
    state.moduleId = res.round.moduleId; state.level = res.round.level;
    startRound(missed, true);
  });
  $('again-btn').addEventListener('click', function () {
    var res = state.lastResult;
    state.moduleId = res.round.moduleId; state.level = res.round.level;
    startRound(makeTasks(state.moduleId, state.level, state.count, state.type), false);
  });

  // ---------- teori ----------
  function renderTheory(container) {
    var mod = R.get(state.moduleId) || R.active()[0];
    // theoryHtml er statisk innhold fra modulen selv (ikke brukerdata)
    container.innerHTML = mod && mod.theoryHtml ? mod.theoryHtml() : '<p>Ingen teori for denne modulen ennå.</p>';
  }

  // ---------- statistikk ----------
  function statTile(label, value) { return h('div', { class: 'tile' }, [h('div', { class: 'tile-value', text: value }), h('div', { class: 'tile-label', text: label })]); }
  function currentStreak() {
    var s = stats.data.streak;
    if (!s.lastDay) return 0;
    var today = IPV6T.Stats._dayStr(), y = new Date(); y.setDate(y.getDate() - 1);
    return (s.lastDay === today || s.lastDay === IPV6T.Stats._dayStr(y)) ? s.days : 0;
  }
  function renderStats() {
    var box = $('stats-content');
    box.textContent = '';
    var any = false;
    var s = stats.data;
    box.appendChild(h('div', { class: 'tiles' }, [
      statTile('Dager på rad', String(currentStreak())),
      statTile('Lengste dagsrekke', String(s.streak.best || 0)),
      statTile('Riktige på rad nå', String(s.run.current || 0)),
      statTile('Flest riktige på rad', String(s.run.best || 0))
    ]));
    R.active().forEach(function (mod) {
      var m = s.modules[mod.id];
      var sec = h('section', { class: 'card stats-mod' }, [h('h2', { text: mod.code + ' ' + mod.title })]);
      if (!m || !m.attempts) {
        sec.appendChild(h('p', { class: 'muted', text: 'Ingen oppgaver løst ennå. Start en runde fra startsiden.' }));
        box.appendChild(sec); return;
      }
      any = true;
      var normal = m.rounds.filter(function (r) { return !r.replay; });
      sec.appendChild(h('div', { class: 'tiles' }, [
        statTile('Oppgaver', String(m.attempts)),
        statTile('Riktige', String(m.correct)),
        statTile('Treffsikkerhet', pct(m.correct, m.attempts) + ' %'),
        statTile('Beste runde', m.bestPct == null ? '–' : m.bestPct + ' %'),
        statTile('Runder', String(m.rounds.length))
      ]));

      // Per nivå
      var lv = h('table', { class: 'stats-table' }, [
        h('thead', null, [h('tr', null, ['Nivå', 'Runder', 'Snitt', 'Beste', 'Beste tid'].map(function (c) { return h('th', { text: c }); }))])
      ]);
      var lvb = h('tbody');
      IPV6T.LEVELS.forEach(function (l) {
        var rs = normal.filter(function (r) { return r.level === l.id; });
        var b = m.bestByLevel[l.id];
        var avg = rs.length ? Math.round(rs.reduce(function (a, r) { return a + r.pct; }, 0) / rs.length) + ' %' : '–';
        lvb.appendChild(h('tr', null, [l.label, String(rs.length), avg, b ? b.pct + ' % (' + b.correct + '/' + b.total + ')' : '–', b ? fmtTime(b.timeMs) : '–'].map(function (c) { return h('td', { text: c }); })));
      });
      lv.appendChild(lvb);
      sec.appendChild(h('h3', { text: 'Per vanskelighetsgrad' }));
      sec.appendChild(h('div', { class: 'table-wrap' }, [lv]));

      // Per oppgavetype
      sec.appendChild(h('h3', { text: 'Per oppgavetype' }));
      var items = mod.taskTypes.map(function (t) {
        var ts = m.types[t.id] || { attempts: 0, correct: 0 };
        return { label: t.label, value: pct(ts.correct, ts.attempts), note: ts.correct + ' av ' + ts.attempts + ' riktige', ts: ts };
      });
      sec.appendChild(IPV6T.charts.bars(doc, items, 'Treffsikkerhet per oppgavetype'));
      var tt = h('table', { class: 'stats-table' }, [
        h('thead', null, [h('tr', null, ['Oppgavetype', 'Forsøk', 'Riktige', 'Treff'].map(function (c) { return h('th', { text: c }); }))]),
        h('tbody', null, items.map(function (it) {
          return h('tr', null, [it.label, String(it.ts.attempts), String(it.ts.correct), it.value == null ? '–' : it.value + ' %'].map(function (c) { return h('td', { text: c }); }));
        }))
      ]);
      sec.appendChild(h('div', { class: 'table-wrap' }, [tt]));

      // Utvikling
      var lastRounds = m.rounds.slice(-30);
      sec.appendChild(h('h3', { text: 'Utvikling (siste ' + lastRounds.length + ' runder)' }));
      sec.appendChild(IPV6T.charts.line(doc, lastRounds.map(function (r) {
        return { label: fmtDate(r.date).slice(0, 5), value: r.pct };
      }), 'Score per runde i prosent'));

      // Historikk
      sec.appendChild(h('h3', { text: 'Rundehistorikk' }));
      var hist = h('table', { class: 'stats-table' }, [
        h('thead', null, [h('tr', null, ['Dato', 'Nivå', 'Score', 'Tid'].map(function (c) { return h('th', { text: c }); }))]),
        h('tbody', null, m.rounds.slice(-20).reverse().map(function (r) {
          return h('tr', null, [fmtDate(r.date), levelLabel(r.level) + (r.replay ? ' (feil)' : ''), r.correct + '/' + r.total + ' (' + r.pct + ' %)', fmtTime(r.timeMs)].map(function (c) { return h('td', { text: c }); }));
        }))
      ]);
      sec.appendChild(h('div', { class: 'table-wrap' }, [hist]));
      box.appendChild(sec);
    });
    $('reset-stats-btn').hidden = !any;
  }
  $('reset-stats-btn').addEventListener('click', function () {
    if (g.confirm('Er du sikker på at du vil slette all statistikk? Dette kan ikke angres.')) { stats.reset(); renderStats(); }
  });

  // til testing
  IPV6T.app = { state: state, stats: stats, show: show, makeTasks: makeTasks, startRound: startRound };
  show('start');
})(window);
