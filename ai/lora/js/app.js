/* Brukergrensesnitt for LoRA-treneren: start, runde, resultat, teori og statistikk.
 * Flyten er den samme som IPv6-treneren. Oppgaver leses fra innholdsfilene,
 * de genereres ikke. IPv6-siden er ikke endret. */
(function (g) {
  'use strict';
  var LORAT = g.LORAT;
  var doc = g.document;
  var $ = function (id) { return doc.getElementById(id); };

  var storage = null;
  try { storage = g.localStorage; storage.getItem('x'); } catch (e) { storage = null; }
  var stats = new LORAT.Stats(storage);

  var state = {
    modules: [],
    manifestWarnings: [],
    moduleId: null,
    level: 'lett',
    count: 10,
    type: '',
    round: null,
    lastResult: null,
    timerId: null
  };

  function currentModule() {
    var i;
    for (i = 0; i < state.modules.length; i++) {
      if (state.modules[i].id === state.moduleId) return state.modules[i];
    }
    return null;
  }
  function levelName(mod, id) {
    var i, levels = mod && mod.nivåer || [];
    for (i = 0; i < levels.length; i++) if (levels[i].id === id) return levels[i].label;
    return LORAT.content.levelLabel(id);
  }
  function fmtTime(ms) {
    var s = Math.round(ms / 1000), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    try {
      return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }
  function fmtUpdated(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return s || '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (isNaN(d.getTime())) return s;
    try { return d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }); }
    catch (e) { return s; }
  }
  function fmtNumber(n) {
    try { return n.toLocaleString('nb-NO', { maximumFractionDigits: 12 }); }
    catch (e) { return String(n).replace('.', ','); }
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
    (children || []).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
    });
    return e;
  }
  function answerDisplay(task) {
    if (task.type === 'tall') {
      var parts = task.svar.map(function (s) {
        var n = LORAT.grade.parseAuthorTall(s);
        return n == null ? s : fmtNumber(n);
      });
      var text = parts.join(' eller ');
      if (task.toleranse > 0) text += ' (± ' + fmtNumber(task.toleranse) + ')';
      return text;
    }
    return task.svar.join(' eller ');
  }
  function poolOf(mod) {
    if (!mod) return [];
    return mod.oppgaver.filter(function (t) {
      return t.nivå === state.level && (!state.type || t.type === state.type);
    });
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
    catch (e2) { return; }
    var behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (g.scrollTo) {
      try { g.scrollTo({ top: Math.max(0, y), behavior: behavior }); return; }
      catch (e3) { try { g.scrollTo(0, Math.max(0, y)); return; } catch (e4) { /* jsdom */ } }
    }
  }

  var VIEWS = ['start', 'round', 'result', 'teori', 'statistikk'];
  function show(view) {
    if (view !== 'round') stopTimer();
    VIEWS.forEach(function (v) {
      var el = $('view-' + v);
      if (el) el.hidden = v !== view;
    });
    doc.querySelectorAll('.nav button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === view);
      if (b.getAttribute('data-nav') === view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
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

  function setStatus(text) {
    var el = $('load-status');
    if (!text) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = text;
  }
  function showLoadError(message) {
    var el = $('load-error');
    el.hidden = false;
    el.textContent = '';
    el.appendChild(h('p', { text: message }));
    el.appendChild(h('button', { type: 'button', class: 'btn', id: 'retry-btn', text: 'Prøv igjen', onclick: function () { boot(); } }));
  }

  function renderWarnings(parent, warnings) {
    if (!warnings || !warnings.length) return;
    var list = h('ul');
    warnings.forEach(function (w) { list.appendChild(h('li', { text: w })); });
    parent.appendChild(h('details', { class: 'warnings' }, [
      h('summary', { text: 'Merknader til innholdet (' + warnings.length + ')' }),
      list
    ]));
  }

  function renderStart() {
    var list = $('module-list');
    if (!list) return;
    list.textContent = '';
    var modNow = currentModule();
    state.modules.forEach(function (m) {
      var broken = !!m.loadError;
      var selected = m.id === state.moduleId;
      var card = h('button', {
        type: 'button',
        class: 'module-card' + (broken ? ' soon' : '') + (selected ? ' selected' : ''),
        'aria-pressed': selected ? 'true' : 'false'
      }, [
        h('span', { class: 'module-code', text: m.kode }),
        h('span', { class: 'module-title', text: m.tittel }),
        h('span', { class: 'module-desc', text: broken ? m.loadError : (m.beskrivelse || '') })
      ]);
      if (broken) { card.disabled = true; card.setAttribute('aria-disabled', 'true'); }
      else card.addEventListener('click', function () {
        state.moduleId = m.id;
        if (!m.taskTypes.some(function (t) { return t.id === state.type; })) state.type = '';
        var keep = m.nivåer.some(function (l) { return l.id === state.level; });
        if (!keep) state.level = (m.nivåer.filter(function (l) { return l.id === 'lett'; })[0] || m.nivåer[0] || { id: 'lett' }).id;
        renderStart();
        var go = function () { scrollToEl($('setup-form'), true); };
        if (g.requestAnimationFrame) g.requestAnimationFrame(go); else go();
      });
      list.appendChild(card);
    });

    var notes = $('content-notes');
    notes.textContent = '';
    renderWarnings(notes, state.manifestWarnings);
    if (modNow && modNow.warnings && modNow.warnings.length) renderWarnings(notes, modNow.warnings);

    var form = $('setup-form');
    var ready = state.modules.some(function (m) { return !m.loadError; });
    form.hidden = !ready;
    if (!modNow || modNow.loadError) return;

    var lc = $('level-choices');
    lc.textContent = '';
    var levels = modNow.nivåer.length ? modNow.nivåer : [{ id: 'lett', label: 'Lett' }];
    if (!levels.some(function (l) { return l.id === state.level; })) state.level = levels[0].id;
    levels.forEach(function (l) {
      var id = 'lvl-' + String(l.id).replace(/[^A-Za-z0-9_-]/g, '');
      var inp = h('input', { type: 'radio', name: 'level', id: id, value: l.id });
      inp.checked = l.id === state.level;
      inp.addEventListener('change', function () { state.level = l.id; updateSetupNote(); });
      lc.appendChild(inp);
      lc.appendChild(h('label', { for: id, text: l.label }));
    });

    var sel = $('type-select');
    sel.textContent = '';
    sel.appendChild(h('option', { value: '', text: 'Blandet (anbefalt)' }));
    modNow.taskTypes.forEach(function (t) {
      var o = h('option', { value: t.id, text: t.label });
      if (t.id === state.type) o.selected = true;
      sel.appendChild(o);
    });
    if (state.type && !modNow.taskTypes.some(function (t) { return t.id === state.type; })) state.type = '';
    $('count-input').value = state.count;
    updateSetupNote();
  }

  function updateSetupNote() {
    var el = $('setup-note');
    var mod = currentModule();
    var n = poolOf(mod).length;
    var btn = $('start-btn');
    if (!n) {
      el.textContent = 'Ingen oppgaver for dette valget.';
      btn.disabled = true;
    } else if (n === 1) {
      el.textContent = '1 oppgave tilgjengelig.';
      btn.disabled = false;
    } else {
      el.textContent = n + ' oppgaver tilgjengelige. Ber du om flere, brukes alle.';
      btn.disabled = false;
    }
  }

  $('type-select').addEventListener('change', function (e) { state.type = e.target.value; updateSetupNote(); });
  $('count-input').addEventListener('input', function () {
    var n = parseInt(this.value, 10);
    if (!isNaN(n)) state.count = Math.min(100, Math.max(1, n));
  });
  $('setup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var mod = currentModule();
    if (!mod || mod.loadError) return;
    var n = parseInt($('count-input').value, 10);
    state.count = Math.min(100, Math.max(1, isNaN(n) ? 10 : n));
    var tasks = LORAT.grade.shuffle(poolOf(mod)).slice(0, state.count);
    if (!tasks.length) { updateSetupNote(); return; }
    startRound(tasks, false);
  });

  function startRound(tasks, replay) {
    state.round = {
      moduleId: state.moduleId,
      level: state.level,
      tasks: tasks,
      idx: 0,
      results: [],
      start: Date.now(),
      answered: false,
      finished: false,
      replay: !!replay,
      choices: null
    };
    show('round');
    $('round-theory').hidden = true;
    $('theory-toggle').textContent = 'Vis teori';
    $('theory-toggle').setAttribute('aria-expanded', 'false');
    var mod = currentModule();
    $('round-level').textContent = levelName(mod, state.level) + (replay ? ' · Øv på feilene' : '');
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

  function clearAlert() {
    var alert = $('form-alert');
    alert.hidden = true;
    alert.textContent = '';
  }
  function showAlert(text) {
    var alert = $('form-alert');
    alert.hidden = false;
    alert.textContent = text;
  }

  function renderTask() {
    var r = state.round;
    var t = r.tasks[r.idx];
    r.answered = false;
    r.choices = t.type === 'flervalg' ? LORAT.grade.shuffle(t.alternativer) : null;
    $('round-progress').textContent = 'Oppgave ' + (r.idx + 1) + ' av ' + r.tasks.length;
    var right = r.results.filter(function (x) { return x.correct; }).length;
    $('round-score').textContent = right + ' riktige';
    var donePct = r.tasks.length ? Math.round(100 * r.idx / r.tasks.length) : 0;
    $('round-bar').style.width = donePct + '%';
    var bar = $('round-progressbar');
    bar.setAttribute('aria-valuenow', String(donePct));
    bar.setAttribute('aria-valuetext', (r.idx) + ' av ' + r.tasks.length + ' besvart');
    $('task-type').textContent = t.typeLabel;
    $('task-question').textContent = t.spørsmål;

    var choiceBlock = $('choice-block');
    var choiceList = $('choice-list');
    var textBlock = $('text-block');
    var inp = $('answer-input');
    choiceList.textContent = '';
    clearAlert();
    $('feedback').hidden = true;
    $('feedback').textContent = '';
    $('dontknow-btn').hidden = false;
    $('answer-btn').textContent = 'Svar';
    inp.readOnly = false;
    inp.className = '';
    inp.value = '';
    inp.removeAttribute('aria-invalid');

    if (t.type === 'flervalg') {
      choiceBlock.hidden = false;
      textBlock.hidden = true;
      inp.hidden = true;
      r.choices.forEach(function (alt, i) {
        var id = 'valg-' + i;
        var input = h('input', { type: 'radio', name: 'lora-valg', id: id, value: alt });
        input.addEventListener('change', function () {
          choiceList.querySelectorAll('.choice').forEach(function (lab) { lab.classList.remove('selected'); });
          input.parentNode.classList.add('selected');
          clearAlert();
        });
        choiceList.appendChild(h('label', { class: 'choice', for: id }, [
          input,
          h('span', { text: alt })
        ]));
      });
    } else {
      choiceBlock.hidden = true;
      textBlock.hidden = false;
      inp.hidden = false;
      $('answer-label').textContent = t.type === 'tall' ? 'Svar (tall)' : 'Svar';
      $('answer-hint').textContent = t.type === 'tall'
        ? 'Komma eller punktum fungerer som desimaltegn. Mellomrom ignoreres.'
        : 'Store og små bokstaver teller likt.';
      inp.placeholder = t.type === 'tall' ? 'Skriv et tall' : 'Skriv svaret';
      inp.setAttribute('inputmode', t.type === 'tall' ? 'decimal' : 'text');
    }
    scrollToEl($('view-round'));
    try {
      if (t.type === 'flervalg') {
        var first = choiceList.querySelector('input');
        if (first) first.focus();
      } else inp.focus();
    } catch (e) { /* ignorer */ }
  }

  function renderExplanation(container, task) {
    var ol = h('ol', { class: 'steps' });
    (task.forklaring.steg || []).forEach(function (s) { ol.appendChild(h('li', { text: s })); });
    if (!task.forklaring.steg || !task.forklaring.steg.length) {
      ol.appendChild(h('li', { text: 'Ingen forklaring er skrevet for denne oppgaven.' }));
    }
    container.appendChild(ol);
  }

  function selectedChoice() {
    var picked = doc.querySelector('#choice-list input:checked');
    return picked ? picked.value : '';
  }

  function markChoices(task, given, ok) {
    var labels = doc.querySelectorAll('#choice-list .choice');
    Array.prototype.forEach.call(labels, function (lab) {
      var input = lab.querySelector('input');
      var text = input.value;
      input.disabled = true;
      var isAnswer = task.svar.some(function (s) { return LORAT.grade.normText(s) === LORAT.grade.normText(text); });
      if (isAnswer) lab.classList.add('right');
      else if (!ok && LORAT.grade.normText(text) === LORAT.grade.normText(given)) lab.classList.add('wrong');
    });
  }

  function submitAnswer(given, skipped) {
    var r = state.round;
    var t = r.tasks[r.idx];
    if (!skipped && LORAT.grade.normText(given) === '' && (t.type !== 'tall' || LORAT.grade.parseUserTall(given) == null)) {
      if (t.type === 'flervalg') {
        showAlert('Velg et alternativ.');
        var box = $('choice-block');
        box.classList.remove('shake');
        void box.offsetWidth;
        box.classList.add('shake');
      } else {
        showAlert(t.type === 'tall' ? 'Skriv et tall.' : 'Skriv et svar.');
        $('answer-input').classList.add('shake');
      }
      return;
    }
    if (!skipped && t.type === 'tall' && LORAT.grade.parseUserTall(given) == null) {
      showAlert('Det ser ikke ut som et tall. Prøv igjen.');
      $('answer-input').classList.add('shake');
      return;
    }
    var ok = !skipped && LORAT.grade.check(t, given);
    r.answered = true;
    r.results.push({ task: t, given: skipped ? '' : given, correct: ok, skipped: !!skipped });
    stats.recordAnswer(r.moduleId, t.type, ok);
    clearAlert();

    var inp = $('answer-input');
    inp.readOnly = true;
    if (t.type === 'flervalg') markChoices(t, given, ok);
    else {
      inp.className = ok ? 'is-right' : 'is-wrong';
      inp.setAttribute('aria-invalid', ok ? 'false' : 'true');
    }
    $('dontknow-btn').hidden = true;
    var fb = $('feedback');
    fb.textContent = '';
    fb.className = 'feedback ' + (ok ? 'right' : 'wrong');
    fb.appendChild(h('div', { class: 'verdict', text: ok ? 'Riktig.' : (skipped ? 'Fasit' : 'Feil.') }));
    if (!ok && !skipped) fb.appendChild(h('div', { class: 'given' }, ['Du svarte: ', h('code', { text: String(given).trim() })]));
    fb.appendChild(h('div', { class: 'answer' }, ['Riktig svar: ', h('code', { text: answerDisplay(t) })]));
    fb.appendChild(h('div', { class: 'ex-title', text: 'Forklaring' }));
    renderExplanation(fb, t);
    fb.hidden = false;
    var last = r.idx === r.tasks.length - 1;
    $('answer-btn').textContent = last ? 'Se resultat' : 'Neste';
    $('round-score').textContent = r.results.filter(function (x) { return x.correct; }).length + ' riktige';
    var nowPct = Math.round(100 * (r.idx + 1) / r.tasks.length);
    $('round-bar').style.width = nowPct + '%';
    $('round-progressbar').setAttribute('aria-valuenow', String(nowPct));
    $('round-progressbar').setAttribute('aria-valuetext', (r.idx + 1) + ' av ' + r.tasks.length + ' besvart');
    try { $('answer-btn').focus(); } catch (e) { /* ignorer */ }
  }

  function next() {
    var r = state.round;
    if (r.idx < r.tasks.length - 1) { r.idx++; renderTask(); }
    else finishRound();
  }

  $('answer-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!state.round) return;
    if (state.round.answered) { next(); return; }
    var t = state.round.tasks[state.round.idx];
    var given = t.type === 'flervalg' ? selectedChoice() : $('answer-input').value;
    submitAnswer(given, false);
  });
  $('answer-input').addEventListener('animationend', function () { this.classList.remove('shake'); });
  $('choice-block').addEventListener('animationend', function () { this.classList.remove('shake'); });
  $('dontknow-btn').addEventListener('click', function () {
    if (state.round && !state.round.answered) submitAnswer('', true);
  });
  $('theory-toggle').addEventListener('click', function () {
    var box = $('round-theory');
    box.hidden = !box.hidden;
    var open = !box.hidden;
    this.textContent = open ? 'Skjul teori' : 'Vis teori';
    this.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) renderTheory(box);
  });
  $('quit-btn').addEventListener('click', function () {
    if (g.confirm('Vil du avslutte runden? Svarene du har gitt, er lagret i statistikken.')) {
      state.round = null;
      show('start');
    }
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
    var res = state.lastResult;
    var p = pct(res.correct, res.total);
    var mod = state.modules.filter(function (m) { return m.id === res.round.moduleId; })[0];
    $('result-title').textContent = p === 100 ? 'Perfekt.' : p >= 80 ? 'Veldig bra.' : p >= 50 ? 'Bra jobbet.' : 'Fortsett å øve.';
    $('result-score').textContent = res.correct + ' / ' + res.total + ' (' + p + ' %)';
    var m = stats.mod(res.round.moduleId);
    var best = m.bestByLevel[res.round.level];
    $('result-meta').textContent = 'Tid brukt: ' + fmtTime(res.timeMs) + ' · ' + levelName(mod, res.round.level) +
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
          h('span', { class: 'missed-q', text: t.spørsmål }),
          h('span', { class: 'missed-a' }, (x.skipped ? ['Hoppet over'] : ['Ditt svar: ', h('code', { text: String(x.given).trim() })])
            .concat([' · Fasit: ', h('code', { text: answerDisplay(t) })]))
        ]),
        body
      ]));
    });
  }
  $('replay-btn').addEventListener('click', function () {
    var res = state.lastResult;
    if (!res) return;
    var missed = res.round.results.filter(function (x) { return !x.correct; }).map(function (x) { return x.task; });
    if (!missed.length) return;
    state.moduleId = res.round.moduleId;
    state.level = res.round.level;
    startRound(missed, true);
  });
  $('again-btn').addEventListener('click', function () {
    var res = state.lastResult;
    if (!res) return;
    state.moduleId = res.round.moduleId;
    state.level = res.round.level;
    var mod = currentModule();
    var tasks = LORAT.grade.shuffle(poolOf(mod)).slice(0, state.count);
    if (tasks.length) startRound(tasks, false);
  });

  function renderTheory(container) {
    var mod = currentModule();
    container.textContent = '';
    if (!mod) {
      container.appendChild(h('p', { text: 'Velg en modul på startsiden.' }));
      return;
    }
    container.appendChild(h('p', { class: 'muted', text: mod.kode + ' · ' + mod.tittel }));
    if (mod.loadError) {
      container.appendChild(h('p', { text: mod.loadError }));
      return;
    }
    var body = h('div', { class: 'theory-body' });
    try { body.innerHTML = LORAT.markdown.render(mod.teori || ''); }
    catch (err) { body.appendChild(h('p', { text: 'Teorien kunne ikke vises: ' + (err.message || err) })); }
    container.appendChild(body);
    if (mod.kilder && mod.kilder.length) {
      container.appendChild(h('h2', { text: 'Kilder' }));
      var ul = h('ul', { class: 'kilder' });
      mod.kilder.forEach(function (k) {
        var href = k.url;
        var safe = href && /^(https?:|mailto:)/i.test(href) && !/[\u0000-\u001F]/.test(href);
        var label = k.tittel || k.url || 'Kilde';
        ul.appendChild(h('li', null, [
          safe ? h('a', { href: href, rel: 'noopener noreferrer', text: label }) : h('span', { text: label })
        ]));
      });
      container.appendChild(ul);
    }
    if (mod.oppdatert) container.appendChild(h('p', { class: 'muted', text: 'Oppdatert ' + fmtUpdated(mod.oppdatert) + '.' }));
  }

  function statTile(label, value) {
    return h('div', { class: 'tile' }, [
      h('div', { class: 'tile-value', text: value }),
      h('div', { class: 'tile-label', text: label })
    ]);
  }
  function currentStreak() {
    var s = stats.data.streak;
    if (!s.lastDay) return 0;
    var today = LORAT.Stats._dayStr();
    var y = new Date();
    y.setDate(y.getDate() - 1);
    return (s.lastDay === today || s.lastDay === LORAT.Stats._dayStr(y)) ? s.days : 0;
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
    state.modules.forEach(function (mod) {
      if (mod.loadError) return;
      var m = s.modules[mod.id];
      var sec = h('section', { class: 'card stats-mod' }, [h('h2', { text: mod.kode + ' ' + mod.tittel })]);
      if (!m || !m.attempts) {
        sec.appendChild(h('p', { class: 'muted', text: 'Ingen oppgaver løst ennå. Start en runde fra startsiden.' }));
        box.appendChild(sec);
        return;
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
      var levels = mod.nivåer.length ? mod.nivåer : [{ id: state.level, label: levelName(mod, state.level) }];
      var lv = h('table', { class: 'stats-table' }, [
        h('thead', null, [h('tr', null, ['Nivå', 'Runder', 'Snitt', 'Beste', 'Beste tid'].map(function (c) { return h('th', { text: c }); }))])
      ]);
      var lvb = h('tbody');
      levels.forEach(function (l) {
        var rs = normal.filter(function (r) { return r.level === l.id; });
        var b = m.bestByLevel[l.id];
        var avg = rs.length ? Math.round(rs.reduce(function (a, r) { return a + r.pct; }, 0) / rs.length) + ' %' : '–';
        lvb.appendChild(h('tr', null, [
          l.label, String(rs.length), avg,
          b ? b.pct + ' % (' + b.correct + '/' + b.total + ')' : '–',
          b ? fmtTime(b.timeMs) : '–'
        ].map(function (c) { return h('td', { text: c }); })));
      });
      lv.appendChild(lvb);
      sec.appendChild(h('h3', { text: 'Per vanskelighetsgrad' }));
      sec.appendChild(h('div', { class: 'table-wrap' }, [lv]));

      sec.appendChild(h('h3', { text: 'Per oppgavetype' }));
      var items = mod.taskTypes.map(function (t) {
        var ts = m.types[t.id] || { attempts: 0, correct: 0 };
        return { label: t.label, value: pct(ts.correct, ts.attempts), note: ts.correct + ' av ' + ts.attempts + ' riktige', ts: ts };
      });
      if (items.length) sec.appendChild(LORAT.charts.bars(doc, items, 'Treffsikkerhet per oppgavetype'));
      var tt = h('table', { class: 'stats-table' }, [
        h('thead', null, [h('tr', null, ['Oppgavetype', 'Forsøk', 'Riktige', 'Treff'].map(function (c) { return h('th', { text: c }); }))]),
        h('tbody', null, items.map(function (it) {
          return h('tr', null, [
            it.label, String(it.ts.attempts), String(it.ts.correct), it.value == null ? '–' : it.value + ' %'
          ].map(function (c) { return h('td', { text: c }); }));
        }))
      ]);
      sec.appendChild(h('div', { class: 'table-wrap' }, [tt]));

      var lastRounds = m.rounds.slice(-30);
      sec.appendChild(h('h3', { text: 'Utvikling (siste ' + lastRounds.length + ' runder)' }));
      sec.appendChild(LORAT.charts.line(doc, lastRounds.map(function (r) {
        return { label: fmtDate(r.date).slice(0, 5), value: r.pct };
      }), 'Score per runde i prosent'));
      sec.appendChild(h('h3', { text: 'Rundehistorikk' }));
      var hist = h('table', { class: 'stats-table' }, [
        h('thead', null, [h('tr', null, ['Dato', 'Nivå', 'Score', 'Tid'].map(function (c) { return h('th', { text: c }); }))]),
        h('tbody', null, m.rounds.slice(-20).reverse().map(function (r) {
          return h('tr', null, [
            fmtDate(r.date),
            levelName(mod, r.level) + (r.replay ? ' (feil)' : ''),
            r.correct + '/' + r.total + ' (' + r.pct + ' %)',
            fmtTime(r.timeMs)
          ].map(function (c) { return h('td', { text: c }); }));
        }))
      ]);
      sec.appendChild(h('div', { class: 'table-wrap' }, [hist]));
      box.appendChild(sec);
    });
    $('reset-stats-btn').hidden = !any;
  }
  $('reset-stats-btn').addEventListener('click', function () {
    if (g.confirm('Er du sikker på at du vil slette all statistikk for LoRA? Dette kan ikke angres.')) {
      stats.reset();
      renderStats();
    }
  });

  function boot() {
    $('load-error').hidden = true;
    $('load-error').textContent = '';
    setStatus('Laster moduler …');
    $('setup-form').hidden = true;
    LORAT.content.load().then(function (result) {
      state.modules = result.modules;
      state.manifestWarnings = result.warnings || [];
      var ids = {};
      state.modules.forEach(function (m) {
        if (ids[m.id]) {
          m.warnings.push('id «' + m.id + '» er allerede brukt. Mappenavnet er lagt til i id-en.');
          m.id = m.id + '--' + m.mappe;
        }
        ids[m.id] = true;
      });
      var first = null;
      state.modules.forEach(function (m) { if (!first && !m.loadError) first = m; });
      state.moduleId = first ? first.id : (state.modules[0] && state.modules[0].id);
      if (first && first.nivåer.length && !first.nivåer.some(function (l) { return l.id === state.level; })) {
        state.level = (first.nivåer.filter(function (l) { return l.id === 'lett'; })[0] || first.nivåer[0]).id;
      }
      setStatus('');
      if (!state.modules.length) setStatus('Ingen moduler i manifestet ennå.');
      renderStart();
    }).catch(function (err) {
      setStatus('');
      showLoadError(err.message || String(err));
    });
  }

  LORAT.app = { state: state, stats: stats, show: show, boot: boot };
  show('start');
  boot();
})(window);
