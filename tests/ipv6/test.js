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
ok(mods.length === 5, 'forventer 5 moduler, fikk ' + mods.length);
ok(IPV6T.registry.active().length === 1 && IPV6T.registry.active()[0].id === 'hex', 'hex er eneste aktive modul');
ok(mods[0].id === 'hex', 'hex sorteres først');
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

console.log('6) DOM-røyktest (jsdom)');
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
    url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc
  });
  var w = dom.window;
  w.confirm = function () { return true; };
  w.scrollTo = function () {}; // ikke implementert i jsdom
  w.onerror = function (msg) { errors.push(String(msg)); };
  ['js/registry.js', 'js/modules/hex.js', 'js/modules/planned.js', 'js/stats.js', 'js/charts.js', 'js/app.js'].forEach(function (f) {
    ok(html.indexOf('src="' + f + '"') >= 0 || html.indexOf('src="' + f + '?v=') >= 0, 'index.html laster ' + f);
    try { w.eval(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.stack); }
  });
  var d = w.document;
  ok(d.querySelectorAll('.module-card').length === 5, 'startsiden viser 5 modulkort');
  ok(d.querySelectorAll('.module-card.soon').length === 4, '4 «Kommer snart»-kort');
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
  d.getElementById('reset-stats-btn').click();
  ok(w.localStorage.getItem('ipv6t.stats.v1') === null, 'nullstilling sletter lagret statistikk');
  ok(errors.length === 0, 'ingen JS-feil: ' + errors.join('\n'));
  setTimeout(function () { w.close(); finish(); }, 50);
}

function finish() {
  console.log('\n' + (checks - fails) + '/' + checks + ' sjekker OK' + (fails ? ' – ' + fails + ' FEIL' : ''));
  process.exit(fails ? 1 : 0);
}
