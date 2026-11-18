#!/usr/bin/env node
/* Selvtester for IPv6-treneren.
 * Kjør fra tests/: npm test
 * DOM-testen bruker jsdom fra tests/node_modules (npm ci).
 * nettverk/ipv6/ finnes ut fra denne filens plassering, ikke ut fra cwd. */
'use strict';
var path = require('path');
var fs = require('fs');
var dir = path.resolve(__dirname, '..', '..', 'nettverk', 'ipv6');
if (!fs.existsSync(path.join(dir, 'index.html'))) {
  console.error('Fant ikke IPv6-treneren i ' + dir);
  process.exit(1);
}
require(path.join(dir, 'js/registry.js'));
require(path.join(dir, 'js/modules/hex.js'));
require(path.join(dir, 'js/modules/planned.js'));
require(path.join(dir, 'js/modules/hvorfor.js'));
require(path.join(dir, 'js/stats.js'));
require(path.join(dir, 'js/charts.js'));
var IPV6T = globalThis.IPV6T, U = IPV6T.util;

var fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails <= 30) console.error('  FEIL: ' + msg); } }

// Seedbar RNG (mulberry32) for reproduserbare tester
function rngFrom(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

console.log('1) Register');
var mods = IPV6T.registry.list();
ok(mods.length === 6, 'forventer 6 moduler, fikk ' + mods.length);
ok(IPV6T.registry.active().length === 2, 'to aktive moduler');
ok(mods[0].id === 'ipv6-hvorfor' && mods[0].code === '0' && mods[0].statsKey === 'ipv6t.hvorfor.stats.v1', 'modul 0 ligger først og har egen statistikk-nøkkel');
ok(mods[1].id === 'hex' && mods[1].code === '1', 'hex beholder kode 1');
var threw = false; try { IPV6T.registry.register({ id: 'hex', title: 'x' }); } catch (e) { threw = true; }
ok(threw, 'duplikat-id avvises');

console.log('2) Parsere');
ok(U.parseHex('0x2F') === 47 && U.parseHex(' 2f ') === 47 && U.parseHex('0X2f') === 47 && U.parseHex('002F') === 47, 'parseHex varianter');
ok(U.parseHex('2g') === null && U.parseHex('') === null && U.parseHex('0x') === null, 'parseHex avviser ugyldig');
ok(U.parseDec('65 535') === 65535 && U.parseDec('047') === 47 && U.parseDec('4,7') === null, 'parseDec');
ok(U.parseBin('0010 1111').value === 47 && U.parseBin('0b101111').value === 47 && U.parseBin('1012') === null, 'parseBin');
ok(U.groupBits('101111') === '10 1111', 'groupBits');

console.log('3) 1000+ tilfeldige oppgaver per nivå validerer egen fasit');
var hex = IPV6T.registry.get('hex');
var levels = ['lett', 'middels', 'vanskelig'];
var typeCount = {};
var total = 0;
function variants(t) {
  var a = t.answers[0], v = [a, t.answerDisplay, ' ' + a + ' ', a.toUpperCase(), a.toLowerCase()];
  if (t.inputKind === 'hex') v.push('0x' + a, '0X' + a.toUpperCase(), '0' + a);
  if (t.inputKind === 'bin') v.push(U.groupBits(a), '0b' + a, a.replace(/^0+(?=.)/, ''));
  if (t.inputKind === 'dec') v.push('0' + a, Number(a).toLocaleString('nb-NO'));
  return v;
}
function wrongAnswer(t) {
  var a = t.answers[0];
  if (t.inputKind === 'dec') return String(Number(a) + 1);
  if (t.inputKind === 'hex') return (parseInt(a, 16) + 1).toString(16);
  if (t.inputKind === 'bin') return (parseInt(a, 2) ^ 1).toString(2);
  return a + 'x';
}
levels.forEach(function (level, li) {
  var rng = rngFrom(1234 + li);
  for (var i = 0; i < 1000; i++) {
    var t = hex.generate({ level: level, rng: rng });
    checkTask(t, level + '#' + i);
  }
  // hver type eksplisitt på hvert nivå
  hex.taskTypes.forEach(function (tt) {
    for (var j = 0; j < 100; j++) checkTask(hex.generate({ level: level, type: tt.id, rng: rng }), level + '/' + tt.id + '#' + j);
  });
});
function checkTask(t, id) {
  total++;
  typeCount[t.type] = (typeCount[t.type] || 0) + 1;
  ok(t.module === 'hex' && t.type && t.typeLabel, id + ': mangler metadata');
  ok(typeof t.question === 'string' && t.question.length > 5, id + ': tomt spørsmål');
  ok(Array.isArray(t.answers) && t.answers.length > 0 && t.answerDisplay, id + ': mangler fasit');
  ok(['hex', 'dec', 'bin'].indexOf(t.inputKind) >= 0, id + ': ukjent inputKind ' + t.inputKind);
  ok(t.explanation && Array.isArray(t.explanation.steps) && t.explanation.steps.length > 0 &&
     t.explanation.steps.every(function (s) { return typeof s === 'string' && s.trim().length > 0 && s.indexOf('undefined') < 0 && s.indexOf('NaN') < 0; }),
     id + ': forklaring tom/ugyldig ' + JSON.stringify(t.explanation));
  if (t.explanation && t.explanation.table) {
    ok(t.explanation.table.rows.every(function (r) { return r.length === t.explanation.table.head.length; }), id + ': tabellrader har feil lengde');
  }
  t.answers.forEach(function (a) { ok(t.validate(a), id + ': godtar ikke egen fasit «' + a + '» (' + t.subject + ')'); });
  variants(t).forEach(function (v) { ok(t.validate(v), id + ': godtar ikke variant «' + v + '» av ' + t.answers[0] + ' (' + t.type + ')'); });
  ok(!t.validate(wrongAnswer(t)), id + ': godtar feil svar ' + wrongAnswer(t) + ' (' + t.type + ')');
  ok(!t.validate('') && !t.validate('   ') && !t.validate('hei'), id + ': godtar tomt/tull');
  ok(typeof t.hint === 'function', id + ': hint mangler');
}
console.log('   ' + total + ' oppgaver testet. Fordeling: ' + JSON.stringify(typeCount));
hex.taskTypes.forEach(function (tt) { ok(typeCount[tt.id] > 0, 'type ' + tt.id + ' ble aldri generert'); });

console.log('4) Kjente eksempler');
var G = hex._internal.GEN;
function fixed(vals) { var i = 0; return function () { return vals[i++ % vals.length]; }; }
(function () {
  // hex2dec via validator
  var t = hex.generate({ level: 'middels', type: 'hex2dec' });
  var v = parseInt(t.subject.replace(/^0x/, ''), 16);
  ok(t.validate(String(v)), 'hex2dec stemmer med parseInt');
  var steps = t.explanation.steps.join(' ');
  ok(/=\s[\d\u00a0 ]+$/.test(steps), 'hex2dec-forklaring slutter med sum');
  // nibble
  var n = hex.generate({ level: 'lett', type: 'digit2nibble', rng: fixed([0.1, 0.99]) }); // bokstav, største -> F
  ok(n.subject === 'F' && n.answers[0] === '1111', 'F -> 1111 (' + n.subject + '/' + n.answers[0] + ')');
  ok(n.validate('1111') && !n.validate('1110'), 'nibble F validering');
  var g16 = hex.generate({ level: 'vanskelig', type: 'group2bin' });
  ok(g16.answers[0].length === 16, 'group2bin gir 16 bit');
  var hint = g16.hint(g16.answers[0].replace(/^0+(?=.)/, ''));
  ok(g16.answers[0][0] === '1' || typeof hint === 'string', 'hint om ledende nuller for kort binærsvar');
})();

console.log('5) Statistikk');
(function () {
  var mem = {};
  var store = { getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
  var S = new IPV6T.Stats(store);
  var d1 = new Date(2026, 10, 16, 12), d2 = new Date(2026, 10, 17, 12), d4 = new Date(2026, 10, 19, 12);
  S.recordAnswer('hex', 'hex2dec', true, d1);
  S.recordAnswer('hex', 'hex2dec', false, d1);
  S.recordAnswer('hex', 'dec2hex', true, d2);
  S.recordRound('hex', { level: 'lett', correct: 2, total: 3, timeMs: 30000 }, d2);
  S.recordRound('hex', { level: 'lett', correct: 1, total: 1, timeMs: 5000, replay: true }, d2);
  var m = S.data.modules.hex;
  ok(m.attempts === 3 && m.correct === 2, 'attempts/correct');
  ok(m.types.hex2dec.attempts === 2 && m.types.hex2dec.correct === 1, 'per type');
  ok(m.rounds.length === 2 && m.bestPct === 67, 'runder og beste (repetisjon teller ikke som beste): ' + m.bestPct);
  ok(S.data.streak.days === 2 && S.data.streak.best === 2, 'dagsrekke 2');
  S.recordAnswer('hex', 'facts', true, d4);
  ok(S.data.streak.days === 1 && S.data.streak.best === 2, 'dagsrekke brytes');
  ok(S.data.run.best === 2, 'riktige på rad');
  var S2 = new IPV6T.Stats(store);
  ok(S2.data.modules.hex.attempts === 4, 'lagres og lastes');
  mem[IPV6T.Stats.KEY] = '{korrupt';
  ok(new IPV6T.Stats(store).data.version === 1, 'korrupt data tåles');
  S2.reset();
  ok(!mem[IPV6T.Stats.KEY] && Object.keys(S2.data.modules).length === 0, 'nullstill');
})();

console.log('6) Hvorfor IPv6');
(function () {
  var content = path.resolve(__dirname, '..', '..', 'content', 'nettverk', 'ipv6', 'ipv6-hvorfor');
  require(path.resolve(__dirname, '..', '..', 'nettverk', 'grunnleggende', 'js', 'yaml.js'));
  require(path.resolve(__dirname, '..', '..', 'nettverk', 'grunnleggende', 'js', 'grade.js'));
  require(path.resolve(__dirname, '..', '..', 'nettverk', 'grunnleggende', 'js', 'markdown.js'));
  var teori = fs.readFileSync(path.join(content, 'teori.md'), 'utf8');
  var tasks = JSON.parse(fs.readFileSync(path.join(content, 'oppgaver.json'), 'utf8'));
  IPV6T.hvorfor.install(teori, tasks);
  ok(IPV6T.hvorfor.count() === 28, '28 oppgaver, fikk ' + IPV6T.hvorfor.count());
  var types = { flervalg: 0, tall: 0, tekst: 0 };
  var G = globalThis.NGRUNN.grade;
  IPV6T.hvorfor.tasks().forEach(function (raw) {
    types[raw.type]++;
    ok(raw.id.indexOf('hvorfor-') === 0 && raw['nivå'] === 1, raw.id + ' id og nivå');
    raw.svar.forEach(function (s) { ok(G.check(raw, s), raw.id + ' godtar «' + s + '»'); });
    if (raw.type === 'tall') ok(!G.check(raw, String(Number(raw.svar[0]) + 1)), raw.id + ' avviser annet tall');
    if (raw.type === 'tekst') ok(!G.check(raw, 'zz-feil'), raw.id + ' avviser tull');
    if (raw.type === 'flervalg') {
      var other = raw.alternativer.filter(function (a) { return raw.svar.indexOf(a) < 0; })[0];
      ok(other && !G.check(raw, other), raw.id + ' avviser et annet alternativ');
      if (raw.svar[0].indexOf('`') >= 0) ok(!G.check(raw, raw.svar[0].replace(/`/g, '')), raw.id + ' krever baktegnene i svaret');
    }
  });
  ok(types.flervalg === 18 && types.tall === 6 && types.tekst === 4, 'fordeling ' + JSON.stringify(types));
  var shown = globalThis.NGRUNN.markdown.renderInline(IPV6T.hvorfor.tasks().filter(function (t) { return t.id === 'hvorfor-007'; })[0].alternativer[0]);
  ok(shown.indexOf('<code>') >= 0 && shown.indexOf('`') < 0 && shown.indexOf('<script') < 0, 'alternativ rendres som kode: ' + shown);
  var math = globalThis.NGRUNN.markdown.renderInline('Skriv hele tallet ($2^{32}$).');
  ok(math.indexOf('katex') >= 0 && math.indexOf('$') < 0, 'inline-matte i spørsmål: ' + math.slice(0, 80));
  var banned = ['46,77', '46.77', '35,96', '35.96', '59,2', '59.2', '51,5', '51.5', '44,6', '44.6', '41,0', '41.0', '48,01', '48.01', '50,10'];
  var sources = [
    fs.readFileSync(path.join(content, 'oppgaver.json'), 'utf8'),
    fs.readFileSync(path.join(dir, 'js/modules/hvorfor.js'), 'utf8'),
    fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8')
  ].join('\n');
  banned.forEach(function (n) { ok(sources.indexOf(n) < 0, 'adopsjonstall står ikke i oppgaver eller JS: ' + n); });
  ok(teori.indexOf('46,77 %') >= 0 && teori.indexOf('18. november 2026') >= 0, 'adopsjonstallene står i teorien, med dato');
  var mem = {};
  var store = { getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
  var blob = JSON.stringify({ version: 1, marker: 'behold', modules: { hex: { attempts: 9, correct: 4 } }, streak: { days: 3, best: 3, lastDay: '2026-11-01' }, run: { current: 2, best: 5 } });
  mem[IPV6T.Stats.KEY] = blob;
  var hv = new IPV6T.Stats(store, 'ipv6t.hvorfor.stats.v1');
  hv.recordAnswer('ipv6-hvorfor', 'flervalg', true, new Date(2026, 10, 18));
  hv.recordRound('ipv6-hvorfor', { level: 'alle', correct: 1, total: 1, timeMs: 1000 });
  ok(mem[IPV6T.Stats.KEY] === blob, 'ferdig utfylt IPv6-statistikk er uendret');
  ok(JSON.parse(mem['ipv6t.hvorfor.stats.v1']).modules['ipv6-hvorfor'].attempts === 1, 'hvorfor skriver til egen nøkkel');
  ok(mem['ipv6t.hvorfor.stats.v1'].indexOf('hvorfor-001') < 0, 'oppgave-id kolliderer ikke med statistikk-nøkkelen');
  var drawn = IPV6T.registry.get('ipv6-hvorfor').draw({ count: 28 });
  ok(drawn.length === 28 && drawn.every(function (t) { return t.validate(t.answers[0]); }), 'en hel runde godtar egen fasit');
})();

console.log('7) DOM-røyktest (jsdom)');
var JSDOM = null;
try { JSDOM = require('jsdom').JSDOM; } catch (e) { /* ikke installert */ }
if (!JSDOM) {
  console.log('   jsdom ikke tilgjengelig – hoppet over (kjør med NODE_PATH til en node_modules med jsdom).');
  finish();
} else {
  var html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  var errors = [];
  var vc = new (require('jsdom').VirtualConsole)();
  vc.on('jsdomError', function (e) { errors.push(String(e && (e.stack || e.message) || e)); });
  vc.on('error', function (e) { errors.push(String(e)); });
  var dom = new JSDOM(html, {
    url: 'http://localhost/nettverk/ipv6/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc
  });
  var w = dom.window;
  w.confirm = function () { return true; };
  w.scrollTo = function () {}; // ikke implementert i jsdom
  w.onerror = function (msg) { errors.push(String(msg)); };
  var repo = path.resolve(__dirname, '..', '..');
  w.fetch = function (url) {
    var u = new w.URL(String(url), w.location.href);
    var file = path.join(repo, decodeURIComponent(u.pathname));
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return Promise.resolve({ ok: false, status: 404, text: function () { return Promise.resolve(''); }, json: function () { return Promise.resolve(null); } });
    }
    var text = fs.readFileSync(file, 'utf8');
    return Promise.resolve({
      ok: true, status: 200,
      text: function () { return Promise.resolve(text); },
      json: function () { return Promise.resolve(JSON.parse(text)); }
    });
  };
  var vendor = path.join(repo, 'ai', 'lora', 'vendor');
  var shared = path.join(repo, 'nettverk', 'grunnleggende', 'js');
  [path.join(vendor, 'katex/katex.min.js'), path.join(vendor, 'marked/marked.min.js'), path.join(shared, 'yaml.js'), path.join(shared, 'grade.js'), path.join(shared, 'markdown.js'), path.join(dir, 'js/registry.js'), path.join(dir, 'js/modules/hex.js'), path.join(dir, 'js/modules/planned.js'), path.join(dir, 'js/modules/hvorfor.js'), path.join(dir, 'js/stats.js'), path.join(dir, 'js/charts.js'), path.join(dir, 'js/app.js')].forEach(function (abs) {
    var rel = abs.indexOf(dir + path.sep) === 0 ? abs.slice(dir.length + 1) : path.relative(path.join(dir, '..'), abs).split(path.sep).join('/');
    if (abs.indexOf(vendor) === 0) rel = '../../ai/lora/vendor/' + path.relative(vendor, abs).split(path.sep).join('/');
    if (abs.indexOf(shared) === 0) rel = '../grunnleggende/js/' + path.basename(abs);
    ok(html.indexOf(rel) >= 0, 'index.html laster ' + rel);
    try { w.eval(fs.readFileSync(abs, 'utf8')); } catch (e) { errors.push(rel + ': ' + e.stack); }
  });
  var d = w.document;
  function clickModule(title) {
    var found = null;
    Array.prototype.forEach.call(d.querySelectorAll('.module-card'), function (c) {
      var el = c.querySelector('.module-title');
      if (el && el.textContent === title) found = c;
    });
    ok(!!found && !found.disabled, 'modulknapp ' + title);
    if (found) found.click();
  }
  ok(d.querySelectorAll('.module-card').length === 6, 'startsiden viser 6 modulkort');
  ok(d.querySelectorAll('.module-card.soon').length === 4, '4 «Kommer snart»-kort');
  ok(d.getElementById('level-fieldset').hidden, 'modul 0 har ingen vanskelighetsgrad');
  clickModule('Heksadesimalt tallsystem');
  ok(!d.getElementById('level-fieldset').hidden && d.getElementById('lvl-middels'), 'hex har vanskelighetsgrad');
  ok(d.querySelectorAll('.module-card.soon .badge')[0].textContent === 'Kommer snart', 'badge-tekst');
  // Start runde med 5 oppgaver på middels
  d.getElementById('lvl-middels').click();
  d.getElementById('count-input').value = '5';
  d.getElementById('setup-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  ok(!d.getElementById('view-round').hidden, 'rundevisning åpnes');
  var app = w.IPV6T.app;
  ok(app.state.round.tasks.length === 5 && app.state.round.level === 'middels', 'runde: 5 oppgaver, middels');
  var form = d.getElementById('answer-form'), inp = d.getElementById('answer-input');
  for (var i = 0; i < 5; i++) {
    var t = app.state.round.tasks[i];
    inp.value = i < 3 ? t.answers[0] : 'zz';  // 3 riktige, 2 feil
    form.dispatchEvent(new w.Event('submit', { cancelable: true }));
    var fb = d.getElementById('feedback');
    ok(!fb.hidden && fb.querySelectorAll('.steps li').length > 0, 'tilbakemelding med forklaring vises (oppg. ' + (i + 1) + ')');
    ok(fb.querySelector('.verdict').textContent.indexOf(i < 3 ? 'Riktig' : 'Feil') >= 0, 'riktig/feil-dom (oppg. ' + (i + 1) + ')');
    form.dispatchEvent(new w.Event('submit', { cancelable: true })); // Enter = neste
  }
  ok(!d.getElementById('view-result').hidden, 'resultatside vises');
  ok(d.getElementById('result-score').textContent.indexOf('3 / 5 (60 %)') === 0, 'score 3/5: ' + d.getElementById('result-score').textContent);
  ok(d.querySelectorAll('#missed-list .missed').length === 2, '2 bommede oppgaver listet');
  ok(!d.getElementById('replay-btn').hidden, 'Øv på feilene-knapp vises');
  d.getElementById('replay-btn').click();
  ok(app.state.round.tasks.length === 2 && app.state.round.replay, 'repetisjonsrunde med 2 oppgaver');
  d.getElementById('dontknow-btn').click();
  ok(d.querySelector('#feedback .verdict').textContent === 'Fasit', '«Vet ikke» viser fasit');
  // Teori
  d.querySelector('.nav [data-nav="teori"]').click();
  ok(d.querySelectorAll('#theory-content .theory-table tbody tr').length === 16, 'teoritabell 0–F');
  var th = d.getElementById('theory-content').textContent;
  ['16 mulige verdier (0–15)', 'Plassverdier', 'Telle forbi F', 'Desimal → heks', 'Vanlig feil', '0–65 535', '0–255'].forEach(function (k) {
    ok(th.indexOf(k) >= 0, 'teori inneholder «' + k + '»');
  });
  ok(d.querySelectorAll('#theory-content .mini-table').length === 4, 'fire små teoritabeller');
  // Statistikk
  d.querySelector('.nav [data-nav="statistikk"]').click();
  ok(d.querySelectorAll('#stats-content svg.chart').length === 2, 'to SVG-diagrammer');
  ok(d.querySelectorAll('#stats-content .stats-table').length === 3, 'tre statistikktabeller');
  var saved = JSON.parse(w.localStorage.getItem('ipv6t.stats.v1'));
  ok(saved.modules.hex.attempts === 6 && saved.modules.hex.rounds.length === 1, 'localStorage: 6 svar, 1 fullført runde');
  var snapshot = w.localStorage.getItem('ipv6t.stats.v1');
  setTimeout(function () {
    ok(w.IPV6T.hvorfor.ready(), 'modulen er lastet i nettleseren');
    clickModule('Hvorfor IPv6: historie og fremtid');
    var task = w.IPV6T.hvorfor.taskById('hvorfor-007');
    w.IPV6T.app.startRound([task], false);
    var qHtml = d.getElementById('task-question').innerHTML;
    ok(qHtml.indexOf('<code>') < 0 || qHtml.indexOf('`') < 0, 'spørsmålet har ikke rå baktegn');
    var radios = d.querySelectorAll('#choice-list input');
    var rawHit = false, coded = false;
    Array.prototype.forEach.call(radios, function (el) {
      if (el.value === task.answers[0]) rawHit = true;
      var span = el.parentNode.querySelector('span');
      if (span && span.querySelector('code') && span.innerHTML.indexOf('`') < 0) coded = true;
    });
    ok(radios.length === task.choices.length && rawHit && coded, 'alternativet er kode og verdien er rå tekst');
    Array.prototype.forEach.call(radios, function (el) { if (el.value === task.answers[0]) el.click(); });
    d.getElementById('answer-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
    ok(d.querySelector('#feedback .verdict').textContent.indexOf('Riktig') >= 0, 'rå alternativtekst rettes som riktig');
    d.getElementById('answer-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
    ok(w.localStorage.getItem('ipv6t.stats.v1') === snapshot, 'IPv6-statistikken er uendret etter hvorfor-oppgaven');
    var own = JSON.parse(w.localStorage.getItem('ipv6t.hvorfor.stats.v1'));
    ok(own && own.modules['ipv6-hvorfor'].attempts === 1 && JSON.stringify(own).indexOf('hvorfor-007') < 0, 'hvorfor-statistikken er egen og uten oppgave-id');
    d.querySelector('.nav [data-nav="teori"]').click();
    var theory = d.getElementById('theory-content');
    ok(theory.textContent.indexOf('Problemet med IPv4') >= 0 && theory.textContent.indexOf('46,77') >= 0, 'teorien viser historien og adopsjonstallet');
    ok(!!theory.querySelector('table') && !!theory.querySelector('code') && !theory.querySelector('script'), 'teorien har tabell og kode, ikke script');
    ok(!theory.querySelector('.katex-error'), 'ingen KaTeX-feil');
    d.getElementById('reset-stats-btn').click();
    ok(w.localStorage.getItem('ipv6t.stats.v1') === null, 'nullstilling sletter lagret statistikk');
    ok(w.localStorage.getItem('ipv6t.hvorfor.stats.v1') === null, 'nullstilling sletter også hvorfor-nøkkelen');
    ok(errors.length === 0, 'ingen JS-feil: ' + errors.join('\n'));
    w.close();
    finish();
  }, 50);
}

function finish() {
  console.log('\n' + (checks - fails) + '/' + checks + ' sjekker OK' + (fails ? ' – ' + fails + ' FEIL' : ''));
  process.exit(fails ? 1 : 0);
}
