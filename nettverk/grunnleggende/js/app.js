/* Brukergrensesnitt for Nettverk grunnleggende.
 * Samme runde, retting, fasit og statistikk som IPv6- og LoRA-treneren.
 * Nivå 2 og 3 er sperret. IPv6- og LoRA-sidene er ikke endret. */
(function (g) {
  'use strict';
  var NGRUNN = g.NGRUNN;
  var doc = g.document;
  var $ = function (id) { return doc.getElementById(id); };

  var storage = null;
  try { storage = g.localStorage; storage.getItem('x'); } catch (e) { storage = null; }
  var stats = new NGRUNN.Stats(storage);

  var state = {
    modules: [],
    manifestWarnings: [],
    level: 1,
    topicId: '',
    count: 10,
    type: '',
    round: null,
    lastResult: null,
    timerId: null
  };

  function topics() { return NGRUNN.content.topicsForLevel(state.modules, state.level); }
  function topicById(id) {
    var list = state.modules;
    var i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function currentPool() {
    return NGRUNN.content.pool(state.modules, { level: state.level, topicId: state.topicId, type: state.type });
  }
  function levelName(id) { return NGRUNN.content.levelName(id); }
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
        var n = NGRUNN.grade.parseAuthorTall(s);
        return n == null ? s : fmtNumber(n);
      });
      var text = parts.join(' eller ');
      if (task.toleranse > 0) text += ' (± ' + fmtNumber(task.toleranse) + ')';
      return text;
    }
    return task.svar.join(' eller ');
  }
  function statsKeyForRound() {
    return state.topicId || ('niva-' + state.level);
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
    if (view === 'teori') renderTheoryPage();
    if (view === 'statistikk') renderStats();
    if (g.scrollTo) try { g.scrollTo(0, 0); } catch (e) { /* jsdom */ }
  }
  doc.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-nav]');
    if (!t) return;
    if (t.disabled || t.getAttribute('aria-disabled') === 'true') {
      ev.preventDefault();
      return;
    }
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

  function bindLevels() {
    doc.querySelectorAll('#level-list [data-level]').forEach(function (btn) {
      var level = NGRUNN.content.levelById(btn.getAttribute('data-level'));
      var soon = !level || level.status !== 'active';
      if (soon) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.add('soon');
        btn.classList.remove('selected');
        return;
      }
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        state.level = level.id;
        state.topicId = '';
        renderStart();
      });
    });
  }

  function paintLevels() {
    doc.querySelectorAll('#level-list [data-level]').forEach(function (btn) {
      var level = NGRUNN.content.levelById(btn.getAttribute('data-level'));
      var soon = !level || level.status !== 'active';
      var selected = !soon && level.id === state.level;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (soon) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      }
    });
  }

  function renderTopics() {
    var list = $('topic-list');
    list.textContent = '';
    var available = topics();
    if (!state.modules.length) return;
    function add(id, kode, title, desc, broken) {
      var selected = state.topicId === id;
      var card = h('button', {
        type: 'button',
        class: 'module-card' + (broken ? ' soon' : '') + (selected ? ' selected' : ''),
        'aria-pressed': selected ? 'true' : 'false'
      }, [
        h('span', { class: 'module-code', text: kode }),
        h('span', { class: 'module-title', text: title }),
        h('span', { class: 'module-desc', text: desc || '' })
      ]);
      if (broken) {
        card.disabled = true;
        card.setAttribute('aria-disabled', 'true');
      } else {
        card.addEventListener('click', function () {
          state.topicId = id;
          renderStart();
        });
      }
      list.appendChild(card);
    }
    add('', 'Alle', 'Alle temaer', 'Oppgaver fra alle temaene på dette nivået.', false);
    available.forEach(function (m) {
      add(m.id, m.kode, m.tittel, m.beskrivelse, false);
    });
    state.modules.forEach(function (m) {
      if (m.loadError) add(m.id, m.kode, m.tittel, m.loadError, true);
    });
    if (!available.length && !state.modules.some(function (m) { return m.loadError; })) {
      list.appendChild(h('p', { class: 'muted', text: 'Ingen temaer på dette nivået ennå.' }));
    }
  }

  function renderStart() {
    paintLevels();
    renderTopics();
    var notes = $('content-notes');
    notes.textContent = '';
    renderWarnings(notes, state.manifestWarnings);
    state.modules.forEach(function (m) {
      if (m.warnings && m.warnings.length) renderWarnings(notes, m.warnings);
    });

    var form = $('setup-form');
    var active = NGRUNN.content.levelById(state.level);
    var ready = active && active.status === 'active' && topics().length > 0;
    form.hidden = !ready;
    if (!ready) return;

    var sel = $('type-select');
    var previous = state.type;
    sel.textContent = '';
    sel.appendChild(h('option', { value: '', text: 'Blandet (anbefalt)' }));
    var types = {};
    NGRUNN.content.pool(state.modules, { level: state.level, topicId: state.topicId, type: '' }).forEach(function (t) {
      types[t.type] = t.typeLabel;
    });
    ['flervalg', 'tall', 'tekst'].forEach(function (id) {
      if (!types[id]) return;
      var o = h('option', { value: id, text: types[id] });
      if (id === previous) o.selected = true;
      sel.appendChild(o);
    });
    if (previous && !types[previous]) state.type = '';
    $('count-input').value = state.count;
    updateSetupNote();
  }

  function updateSetupNote() {
    var el = $('setup-note');
    var n = currentPool().length;
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
    var active = NGRUNN.content.levelById(state.level);
    if (!active || active.status !== 'active') return;
    var n = parseInt($('count-input').value, 10);
    state.count = Math.min(100, Math.max(1, isNaN(n) ? 10 : n));
    var tasks = NGRUNN.grade.shuffle(currentPool()).slice(0, state.count);
    if (!tasks.length) { updateSetupNote(); return; }
    startRound(tasks, false);
  });

  function startRound(tasks, replay) {
    state.round = {
      level: state.level,
      topicId: state.topicId,
      statsId: state.topicId || ('niva-' + state.level),
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
    $('round-level').textContent = levelName(state.level) + (replay ? ' · Øv på feilene' : '');
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
    r.choices = t.type === 'flervalg' ? NGRUNN.grade.shuffle(t.alternativer) : null;
    $('round-progress').textContent = 'Oppgave ' + (r.idx + 1) + ' av ' + r.tasks.length;
    var right = r.results.filter(function (x) { return x.correct; }).length;
    $('round-score').textContent = right + ' riktige';
    var donePct = r.tasks.length ? Math.round(100 * r.idx / r.tasks.length) : 0;
    $('round-bar').style.width = donePct + '%';
    var bar = $('round-progressbar');
    bar.setAttribute('aria-valuenow', String(donePct));
    bar.setAttribute('aria-valuetext', r.idx + ' av ' + r.tasks.length + ' besvart');
    $('task-type').textContent = t.typeLabel + (t.modulKode ? ' · ' + t.modulKode : '');
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
        var input = h('input', { type: 'radio', name: 'ngrunn-valg', id: id, value: alt });
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

  function fillStep(li, text) {
    try {
      var html = NGRUNN.markdown.render(text);
      var wrapped = /^<p>([\s\S]*)<\/p>$/.exec(String(html).trim());
      li.innerHTML = wrapped ? wrapped[1] : html;
    } catch (err) {
      li.textContent = text;
    }
  }
  function renderExplanation(container, task) {
    var ol = h('ol', { class: 'steps' });
    var steps = (task.forklaring && task.forklaring.steg) || [];
    if (!steps.length) ol.appendChild(h('li', { text: 'Ingen forklaring er skrevet for denne oppgaven.' }));
    steps.forEach(function (s) {
      var li = h('li');
      fillStep(li, s);
      ol.appendChild(li);
    });
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
      var isAnswer = task.svar.some(function (s) { return NGRUNN.grade.normText(s) === NGRUNN.grade.normText(text); });
      if (isAnswer) lab.classList.add('right');
      else if (!ok && NGRUNN.grade.normText(text) === NGRUNN.grade.normText(given)) lab.classList.add('wrong');
    });
  }

  function submitAnswer(given, skipped) {
    var r = state.round;
    var t = r.tasks[r.idx];
    if (!skipped && NGRUNN.grade.normText(given) === '' && (t.type !== 'tall' || NGRUNN.grade.parseUserTall(given) == null)) {
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
    if (!skipped && t.type === 'tall' && NGRUNN.grade.parseUserTall(given) == null) {
      showAlert('Det ser ikke ut som et tall. Prøv igjen.');
      $('answer-input').classList.add('shake');
      return;
    }
    var ok = !skipped && NGRUNN.grade.check(t, given);
    r.answered = true;
    r.results.push({ task: t, given: skipped ? '' : given, correct: ok, skipped: !!skipped });
    stats.recordAnswer(t.modulId || r.statsId, t.type, ok);
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
    if (open && state.round) renderTheoryInto(box, topicById(state.round.tasks[state.round.idx].modulId));
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
    stats.recordRound(r.statsId, { level: r.level, correct: correct, total: total, timeMs: timeMs, replay: r.replay });
    state.lastResult = { round: r, correct: correct, total: total, timeMs: timeMs };
    renderResult();
    show('result');
  }

  function renderResult() {
    var res = state.lastResult;
    var p = pct(res.correct, res.total);
    $('result-title').textContent = p === 100 ? 'Perfekt.' : p >= 80 ? 'Veldig bra.' : p >= 50 ? 'Bra jobbet.' : 'Fortsett å øve.';
    $('result-score').textContent = res.correct + ' / ' + res.total + ' (' + p + ' %)';
    var bucket = stats.mod(res.round.statsId);
    var best = bucket.bestByLevel[res.round.level];
    $('result-meta').textContent = 'Tid brukt: ' + fmtTime(res.timeMs) + ' · ' + levelName(res.round.level) +
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
    state.level = res.round.level;
    state.topicId = res.round.topicId;
    startRound(missed, true);
  });
  $('again-btn').addEventListener('click', function () {
    var res = state.lastResult;
    if (!res) return;
    state.level = res.round.level;
    state.topicId = res.round.topicId;
    var tasks = NGRUNN.grade.shuffle(currentPool()).slice(0, state.count);
    if (tasks.length) startRound(tasks, false);
  });

  function renderTheoryInto(container, mod) {
    container.textContent = '';
    if (!mod) {
      container.appendChild(h('p', { text: 'Temaet ble ikke funnet.' }));
      return;
    }
    container.appendChild(h('p', { class: 'muted', text: (mod.kode || '') + ' · ' + mod.tittel }));
    if (mod.loadError) {
      container.appendChild(h('p', { text: mod.loadError }));
      return;
    }
    var body = h('div', { class: 'theory-body' });
    try { body.innerHTML = NGRUNN.markdown.render(mod.teori || ''); }
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
  function renderTheoryPage() {
    var box = $('theory-content');
    box.textContent = '';
    var list = state.topicId ? state.modules.filter(function (m) { return m.id === state.topicId; }) : topics();
    if (!list.length) {
      box.appendChild(h('div', { class: 'card theory' }, [h('p', { text: 'Ingen teori er lastet for dette nivået.' })]));
      return;
    }
    list.forEach(function (mod) {
      var card = h('div', { class: 'card theory' });
      renderTheoryInto(card, mod);
      box.appendChild(card);
    });
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
    var today = NGRUNN.Stats._dayStr();
    var y = new Date();
    y.setDate(y.getDate() - 1);
    return (s.lastDay === today || s.lastDay === NGRUNN.Stats._dayStr(y)) ? s.days : 0;
  }
  function renderStatsBlock(sec, key, title) {
    var m = stats.data.modules[key];
    sec.appendChild(h('h2', { text: title }));
    if (!m || (!m.attempts && !(m.rounds && m.rounds.length))) {
      sec.appendChild(h('p', { class: 'muted', text: 'Ingen oppgaver løst ennå. Start en runde fra startsiden.' }));
      return false;
    }
    var normal = (m.rounds || []).filter(function (r) { return !r.replay; });
    sec.appendChild(h('div', { class: 'tiles' }, [
      statTile('Oppgaver', String(m.attempts || 0)),
      statTile('Riktige', String(m.correct || 0)),
      statTile('Treffsikkerhet', (m.attempts ? pct(m.correct, m.attempts) : 0) + ' %'),
      statTile('Beste runde', m.bestPct == null ? '–' : m.bestPct + ' %'),
      statTile('Runder', String((m.rounds || []).length))
    ]));
    if ((m.rounds || []).length) {
      var lastRounds = m.rounds.slice(-30);
      sec.appendChild(h('h3', { text: 'Utvikling (siste ' + lastRounds.length + ' runder)' }));
      sec.appendChild(NGRUNN.charts.line(doc, lastRounds.map(function (r) {
        return { label: fmtDate(r.date).slice(0, 5), value: r.pct };
      }), 'Score per runde i prosent'));
      var hist = h('table', { class: 'stats-table' }, [
        h('thead', null, [h('tr', null, ['Dato', 'Nivå', 'Score', 'Tid'].map(function (c) { return h('th', { text: c }); }))]),
        h('tbody', null, m.rounds.slice(-20).reverse().map(function (r) {
          return h('tr', null, [
            fmtDate(r.date),
            levelName(r.level) + (r.replay ? ' (feil)' : ''),
            r.correct + '/' + r.total + ' (' + r.pct + ' %)',
            fmtTime(r.timeMs)
          ].map(function (c) { return h('td', { text: c }); }));
        }))
      ]);
      sec.appendChild(h('div', { class: 'table-wrap' }, [hist]));
    }
    return true;
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
      var sec = h('section', { class: 'card stats-mod' });
      var types = mod.taskTypes || [];
      var had = renderStatsBlock(sec, mod.id, mod.kode + ' ' + mod.tittel);
      var m = s.modules[mod.id];
      if (m && types.length && m.attempts) {
        var items = types.map(function (t) {
          var ts = m.types[t.id] || { attempts: 0, correct: 0 };
          return { label: t.label, value: pct(ts.correct, ts.attempts), note: ts.correct + ' av ' + ts.attempts + ' riktige', ts: ts };
        });
        sec.appendChild(h('h3', { text: 'Per oppgavetype' }));
        sec.appendChild(NGRUNN.charts.bars(doc, items, 'Treffsikkerhet per oppgavetype'));
      }
      if (had) any = true;
      box.appendChild(sec);
    });
    NGRUNN.content.LEVELS.forEach(function (level) {
      var key = 'niva-' + level.id;
      if (!s.modules[key] || !(s.modules[key].rounds || []).length) return;
      var sec = h('section', { class: 'card stats-mod' });
      if (renderStatsBlock(sec, key, 'Alle temaer · ' + levelName(level.id))) any = true;
      box.appendChild(sec);
    });
    $('reset-stats-btn').hidden = !any;
  }
  $('reset-stats-btn').addEventListener('click', function () {
    if (g.confirm('Er du sikker på at du vil slette all statistikk for Nettverk grunnleggende? Dette kan ikke angres.')) {
      stats.reset();
      renderStats();
    }
  });

  function boot() {
    $('load-error').hidden = true;
    $('load-error').textContent = '';
    setStatus('Laster temaer …');
    $('setup-form').hidden = true;
    NGRUNN.content.load().then(function (result) {
      state.modules = result.modules;
      state.manifestWarnings = result.warnings || [];
      if (state.topicId && !topicById(state.topicId)) state.topicId = '';
      setStatus('');
      if (!state.modules.length) setStatus('Ingen temaer i manifestet ennå.');
      renderStart();
    }).catch(function (err) {
      setStatus('');
      showLoadError(err.message || String(err));
    });
  }

  NGRUNN.app = { state: state, stats: stats, show: show, boot: boot };
  bindLevels();
  show('start');
  boot();
})(window);
