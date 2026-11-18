#!/usr/bin/env node
/* Selvtester for Nettverk grunnleggende.
 * Kjør fra tests/: npm test
 * DOM-testen bruker jsdom fra tests/node_modules (npm ci).
 * nettverk/grunnleggende/ finnes ut fra denne filens plassering, ikke ut fra cwd. */
'use strict';
var path = require('path');
var fs = require('fs');
var dir = path.resolve(__dirname, '..', '..', 'nettverk', 'grunnleggende');
var contentDir = path.resolve(__dirname, '..', '..', 'content', 'nettverk', 'grunnleggende');
if (!fs.existsSync(path.join(dir, 'index.html'))) {
  console.error('Fant ikke treneren i ' + dir);
  process.exit(1);
}
require(path.join(dir, 'js/yaml.js'));
require(path.join(dir, 'js/grade.js'));
require(path.join(dir, 'js/content.js'));
require(path.join(dir, 'js/stats.js'));
var NGRUNN = globalThis.NGRUNN;
var G = NGRUNN.grade;
var C = NGRUNN.content;

var fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails <= 40) console.error('  FEIL: ' + msg); } }

console.log('1) Retting');
ok(G.check({ type: 'flervalg', svar: ['Segment'] }, '  segment '), 'flervalg ignorerer små bokstaver og mellomrom');
ok(G.check({ type: 'flervalg', svar: ['Segment'] }, 'SEGMENT'), 'flervalg store bokstaver');
ok(!G.check({ type: 'flervalg', svar: ['Segment'] }, '0'), 'flervalg godtar ikke et indeksnummer');
ok(!G.check({ type: 'flervalg', svar: ['Segment'] }, 'Pakke'), 'flervalg avviser feil alternativ');
ok(G.check({ type: 'tall', svar: ['2'] }, '2,0'), 'tall uten toleranse: komma og ,0');
ok(G.check({ type: 'tall', svar: ['2'] }, '2.0'), 'tall uten toleranse: 2.0');
ok(!G.check({ type: 'tall', svar: ['2'] }, '2.1'), 'tall uten toleranse avviser 2.1');
ok(G.check({ type: 'tall', svar: ['16777216'] }, '16 777 216'), 'tall ignorerer mellomrom');
ok(G.check({ type: 'tall', svar: ['16777216'] }, '16_777_216'), 'tall ignorerer understrek');
ok(!G.check({ type: 'tall', svar: ['16777216'] }, '16.777.216'), 'tall godtar ikke punktum som tusenskille');
ok(G.check({ type: 'tall', svar: ['1.0'], toleranse: 0.1 }, '1,1'), 'toleranse godtar komma på grensen');
ok(G.check({ type: 'tall', svar: ['0.3'], toleranse: 0.1 }, '0.4'), 'toleranse på flyt-grensen');
ok(!G.check({ type: 'tall', svar: ['1'], toleranse: 0.1 }, '1.2'), 'utenfor toleranse');
ok(G.check({ type: 'tall', svar: ['10'], toleranse: 0 }, '10'), 'toleranse 0 er eksakt');
ok(!G.check({ type: 'tall', svar: ['10'], toleranse: 0 }, '10.1'), 'toleranse 0 avviser avvik');
ok(G.check({ type: 'tekst', svar: ['Domain Name System'] }, '  domain   name   system '), 'tekst trim, case og mellomrom');
ok(!G.check({ type: 'tekst', svar: ['DNS'] }, 'dnsx'), 'tekst avviser feil');
ok(!G.check({ type: 'tekst', svar: ['Ramme'] }, ''), 'tekst avviser tomt');
var shuffled = G.shuffle(['Segment', 'Pakke', 'Ramme', 'Bit'], function () { return 0; });
ok(shuffled.slice().sort().join('|') === 'Bit|Pakke|Ramme|Segment', 'stokking beholder alternativene');
ok(shuffled.join('|') !== 'Segment|Pakke|Ramme|Bit', 'stokking endrer rekkefølgen');

console.log('2) Nivåfilter');
var sample = [
  { id: 'a', nivå: 1, loadError: null, oppgaver: [
    { id: 'a1', nivå: 1, type: 'tekst' },
    { id: 'a2', nivå: 2, type: 'tall' }
  ]},
  { id: 'b', nivå: 2, loadError: null, oppgaver: [{ id: 'b1', nivå: 2, type: 'flervalg' }] },
  { id: 'c', nivå: 1, loadError: 'mangler', oppgaver: [{ id: 'c1', nivå: 1, type: 'tekst' }] }
];
var p1 = C.pool(sample, { level: 1, topicId: '', type: '' });
ok(p1.length === 1 && p1[0].id === 'a1', 'nivå 1 tar ikke med nivå 2 eller en modul som ikke ble lastet');
ok(C.pool(sample, { level: 1, topicId: 'a', type: 'tall' }).length === 0, 'tema- og typefilter');
ok(C.pool(sample, { level: 2 }).length === 1 && C.pool(sample, { level: 2 })[0].id === 'b1', 'nivå 2-pool finnes i data, men siden tilbyr det ikke');
ok(C.pool(sample, { level: 3 }).length === 0, 'nivå 3 er tomt');
ok(C.topicsForLevel(sample, 1).length === 1 && C.topicsForLevel(sample, 1)[0].id === 'a', 'temaliste for nivå 1');
var soon = C.LEVELS.filter(function (l) { return l.status === 'soon'; });
ok(soon.length === 2 && soon[0].id === 2 && soon[1].id === 3 && soon[0].tittel === 'Adressering og oppsett' && soon[1].tittel === 'Feilsøking og scenarioer', 'nivå 2 og 3 er sperret');
ok(C.levelById(1).status === 'active' && C.parseLevel('1') === 1 && C.parseLevel(2) === 2 && C.parseLevel('4') == null, 'nivå parser bare 1–3');

console.log('3) Innholdet til DOELad');
var manifest = JSON.parse(fs.readFileSync(path.join(contentDir, 'index.json'), 'utf8'));
ok(JSON.stringify(manifest) === JSON.stringify({ moduler: ['11-osi-tcpip', '12-tcp-udp', '13-porter-protokoller', '14-http-https', '15-mac-ip-arp-dns-dhcp'] }), 'manifestet er de fem temaene');
var seenTask = {};
var typeCount = {};
var totalTasks = 0;
var modules = manifest.moduler.map(function (folder) {
  var teoriPath = path.join(contentDir, folder, 'teori.md');
  var oppPath = path.join(contentDir, folder, 'oppgaver.json');
  var teori = fs.readFileSync(teoriPath, 'utf8');
  var opp = fs.readFileSync(oppPath, 'utf8');
  var mod = C.normalizeModule(folder, teori, opp);
  ok(!mod.warnings.length, folder + ' uten merknader: ' + mod.warnings.join(' | '));
  ok(mod.id === folder && mod.nivå === 1 && mod.tittel && mod.beskrivelse && mod.kode, folder + ' har id, nivå 1, tittel og kode');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(mod.oppdatert), folder + ' oppdatert er en dato: ' + mod.oppdatert);
  ok(mod.kilder.length > 0 && mod.kilder.every(function (k) { return k.tittel && /^https:\/\//.test(k.url); }), folder + ' kilder er {tittel, url}');
  ok(mod.teori.indexOf('Plassholder') < 0, folder + ' er ikke plassholdertekst');
  mod.oppgaver.forEach(function (t) {
    totalTasks++;
    typeCount[t.type] = (typeCount[t.type] || 0) + 1;
    ok(!seenTask[t.id], 'unik oppgave-id ' + t.id);
    seenTask[t.id] = folder;
    ok(t.nivå === 1, t.id + ' har nivå 1');
    ok(t.toleranse === 0, t.id + ' har ingen toleranse');
    ok(t.forklaring.steg.length >= 1 && t.forklaring.steg.length <= 4, t.id + ' har 1–4 forklaringssteg');
    t.svar.forEach(function (s) { ok(G.check(t, s), t.id + ' godtar eget svar «' + s + '»'); });
    ok(!G.check(t, 'dette-er-feil'), t.id + ' avviser tull');
    if (t.type === 'flervalg') {
      var known = {};
      t.alternativer.forEach(function (a) { known[G.normText(a)] = a; });
      ok(t.alternativer.length >= 2, t.id + ' har alternativer');
      t.svar.forEach(function (s) { ok(!!known[G.normText(s)], t.id + ' sitt svar finnes blant alternativene'); });
    }
    if (t.type === 'tall') t.svar.forEach(function (s) { ok(G.parseAuthorTall(s) != null, t.id + ' tallsvar med punktum'); });
  });
  return mod;
});
ok(totalTasks === 121, '121 oppgaver, fikk ' + totalTasks);
ok(typeCount.flervalg === 72 && typeCount.tall === 34 && typeCount.tekst === 15, 'fordeling flervalg/tall/tekst: ' + JSON.stringify(typeCount));
ok(C.pool(modules, { level: 1 }).length === 121, 'pool nivå 1 er alle oppgavene');
ok(C.pool(modules, { level: 2 }).length === 0 && C.pool(modules, { level: 3 }).length === 0, 'ingen oppgaver på nivå 2 eller 3');
ok(C.pool(modules, { level: 1, topicId: '13-porter-protokoller', type: 'tall' }).length === 13, 'port-temaet har 13 talloppgaver');

console.log('4) Statistikk, egen nøkkel');
(function () {
  var mem = {
    'ipv6t.stats.v1': JSON.stringify({ version: 1, marker: 'ipv6', modules: { hex: { attempts: 4 } } }),
    'lora.stats.v1': JSON.stringify({ version: 1, marker: 'lora' })
  };
  var store = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; }
  };
  ok(NGRUNN.Stats.KEY === 'ngrunn.stats.v1', 'nøkkelen er ngrunn.stats.v1');
  var S = new NGRUNN.Stats(store);
  S.recordAnswer('11-osi-tcpip', 'tekst', true);
  S.recordRound('11-osi-tcpip', { level: 1, correct: 1, total: 1, timeMs: 1000 });
  var ipv6 = JSON.parse(mem['ipv6t.stats.v1']);
  var lora = JSON.parse(mem['lora.stats.v1']);
  ok(ipv6.modules.hex.attempts === 4 && ipv6.marker === 'ipv6', 'IPv6-nøkkelen er urørt');
  ok(lora.marker === 'lora' && !lora.modules, 'LoRA-nøkkelen er urørt');
  ok(mem['ngrunn.stats.v1'] && JSON.parse(mem['ngrunn.stats.v1']).modules['11-osi-tcpip'].attempts === 1, 'egne tall lagres for seg');
  S.reset();
  ok(!mem['ngrunn.stats.v1'] && mem['ipv6t.stats.v1'] && mem['lora.stats.v1'], 'nullstilling sletter bare egen nøkkel');
})();

console.log('5) DOM-røyktest (jsdom)');
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
    url: 'http://localhost/nettverk/grunnleggende/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  var w = dom.window;
  w.confirm = function () { return true; };
  w.scrollTo = function () {};
  w.onerror = function (msg) { errors.push(String(msg)); };
  w.localStorage.setItem('ipv6t.stats.v1', JSON.stringify({ version: 1, marker: 'ipv6', modules: { hex: { attempts: 4 } } }));
  w.localStorage.setItem('lora.stats.v1', JSON.stringify({ version: 1, marker: 'lora' }));
  w.fetch = function (url) {
    var u = new w.URL(url, w.location.href);
    var rel = decodeURIComponent(u.pathname.replace(/^\/content\/nettverk\/grunnleggende\//, ''));
    var file = path.join(contentDir, rel);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return Promise.resolve({ ok: false, status: 404, text: function () { return Promise.resolve(''); } });
    }
    var text = fs.readFileSync(file, 'utf8');
    return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(text); } });
  };
  var vendor = path.resolve(__dirname, '..', '..', 'ai', 'lora', 'vendor');
  var scripts = [
    path.join(vendor, 'katex/katex.min.js'),
    path.join(vendor, 'marked/marked.min.js'),
    path.join(dir, 'js/yaml.js'),
    path.join(dir, 'js/grade.js'),
    path.join(dir, 'js/markdown.js'),
    path.join(dir, 'js/content.js'),
    path.join(dir, 'js/stats.js'),
    path.join(dir, 'js/charts.js'),
    path.join(dir, 'js/app.js')
  ];
  scripts.forEach(function (f) {
    var rel = f.indexOf(dir) === 0 ? f.slice(dir.length + 1) : path.basename(f);
    ok(html.indexOf(rel) >= 0 || html.indexOf(path.basename(f)) >= 0, 'index.html laster ' + path.basename(f));
    try { w.eval(fs.readFileSync(f, 'utf8')); }
    catch (e) { errors.push(path.basename(f) + ': ' + (e && e.stack || e)); }
  });
  var d = w.document;
  function waitReady(n) {
    var app = w.NGRUNN && w.NGRUNN.app;
    if (app && app.state.modules.length === 5) return runDom();
    if (n > 50) {
      ok(false, 'temaene ble ikke lastet: ' + (app && app.state.modules.length));
      return finishDom();
    }
    setTimeout(function () { waitReady(n + 1); }, 20);
  }
  function runDom() {
    var app = w.NGRUNN.app;
    ok(d.querySelector('meta[name="ngrunn-innhold-versjon"]').getAttribute('content') === '20261118b', 'innholdsversjon 20261118b');
    ok(!d.getElementById('setup-form').hidden, 'oppsettet vises når nivå 1 har temaer');
    ok(d.querySelectorAll('#topic-list .module-card:not([disabled])').length === 6, 'Alle temaer pluss fem temaer');
    [2, 3].forEach(function (n) {
      var b = d.getElementById('level-' + n);
      ok(b && b.tagName === 'BUTTON' && b.disabled && b.getAttribute('aria-disabled') === 'true', 'nivå ' + n + ' er disabled og aria-disabled');
      ok(b.classList.contains('soon') && !b.classList.contains('selected'), 'nivå ' + n + ' er merket kommer snart og ikke valgt');
      ok(b.querySelector('.badge') && b.querySelector('.badge').textContent === 'Kommer snart', 'nivå ' + n + ' sier Kommer snart');
      ok(b.getAttribute('aria-pressed') === 'false', 'nivå ' + n + ' er ikke trykket inn');
      b.click();
      b.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      b.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    });
    ok(app.state.level === 1 && d.getElementById('level-1').classList.contains('selected'), 'klikk og tastatur på nivå 2/3 endrer ikke valget');
    try { d.getElementById('level-2').focus(); } catch (e) { /* ignorer */ }
    ok(d.activeElement !== d.getElementById('level-2'), 'nivå 2 kan ikke få fokus');

    var form = d.getElementById('setup-form');
    var inp = d.getElementById('answer-input');
    var firstType = d.getElementById('type-select');
    firstType.value = 'flervalg';
    firstType.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('count-input').value = '2';
    form.dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
    ok(!d.getElementById('view-round').hidden && app.state.round.tasks.length === 2 && app.state.round.level === 1 && app.state.round.tasks.every(function (t) { return t.type === 'flervalg'; }), 'en runde med to flervalg på nivå 1');
    function answerCurrent(correct) {
      var t = app.state.round.tasks[app.state.round.idx];
      if (t.type === 'flervalg') {
        var inputs = d.querySelectorAll('#choice-list input');
        var pick = null;
        Array.prototype.forEach.call(inputs, function (el) {
          var right = t.svar.some(function (s) { return G.normText(s) === G.normText(el.value); });
          if (pick) return;
          if (correct === right) pick = el;
        });
        ok(!!pick, 'fant et alternativ å velge');
        if (pick) pick.click();
      } else if (t.type === 'tall') {
        if (correct) inp.value = String(t.svar[0]).replace('.', ',');
        else {
          var n = G.parseAuthorTall(t.svar[0]);
          inp.value = String((n == null ? 0 : n) + 1);
        }
      } else if (correct) inp.value = String(t.svar[0]).toUpperCase();
      else inp.value = 'zz-feil';
      d.getElementById('answer-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
    }
    answerCurrent(true);
    var fb = d.getElementById('feedback');
    ok(!fb.hidden && fb.querySelector('.verdict').textContent.indexOf('Riktig') >= 0, 'første svar er riktig');
    ok(fb.querySelectorAll('.steps li').length > 0, 'forklaring vises');
    d.getElementById('answer-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
    answerCurrent(false);
    ok(d.querySelector('#feedback .verdict').textContent.indexOf('Feil') >= 0, 'andre svar er feil');
    d.getElementById('answer-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
    ok(!d.getElementById('view-result').hidden, 'resultatsiden vises');
    ok(d.getElementById('result-score').textContent.indexOf('1 / 2') === 0, 'score 1/2: ' + d.getElementById('result-score').textContent);
    ok(d.querySelectorAll('#missed-list .missed').length === 1, 'én bommet oppgave');

    function clickTopic(title) {
      var buttons = d.querySelectorAll('#topic-list .module-card');
      var found = null;
      Array.prototype.forEach.call(buttons, function (b) {
        var el = b.querySelector('.module-title');
        if (el && el.textContent === title) found = b;
      });
      ok(!!found && !found.disabled, 'temaknapp ' + title);
      if (found) found.click();
    }
    modules.forEach(function (mod) {
      ['flervalg', 'tall', 'tekst'].forEach(function (type) {
        d.querySelector('[data-nav="start"]').click();
        clickTopic(mod.tittel);
        var sel = d.getElementById('type-select');
        sel.value = type;
        sel.dispatchEvent(new w.Event('change', { bubbles: true }));
        d.getElementById('count-input').value = '1';
        form.dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
        var task = app.state.round && app.state.round.tasks[0];
        ok(task && task.type === type && task.modulId === mod.id && task.nivå === 1, mod.kode + ' runde ' + type);
        answerCurrent(true);
        ok(d.querySelector('#feedback .verdict') && d.querySelector('#feedback .verdict').textContent.indexOf('Riktig') >= 0, mod.kode + ' ' + type + ' rettet riktig');
        d.getElementById('answer-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
      });
    });

    d.querySelector('[data-nav="start"]').click();
    clickTopic('Alle temaer');
    d.querySelector('.nav [data-nav="teori"]').click();
    ok(!d.getElementById('view-teori').hidden, 'teorifanene åpnes');
    var bodies = d.querySelectorAll('#theory-content .theory-body');
    ok(bodies.length === 5, 'fem teoripaneler, fikk ' + bodies.length);
    modules.forEach(function (mod, i) {
      var body = bodies[i];
      ok(!!body, mod.kode + ' har et teoripanel');
      if (!body) return;
      ok(!!body.querySelector('table'), mod.kode + ' viser en tabell');
      ok(body.textContent.indexOf(mod.tittel) >= 0 || d.getElementById('theory-content').textContent.indexOf(mod.tittel) >= 0, mod.kode + ' sin tittel vises');
      ok(body.innerHTML.indexOf('LORAMATH') < 0 && body.innerHTML.indexOf('LORACODE') < 0, mod.kode + ' har ikke rå matte-merker');
      ok(!body.querySelector('.katex-error'), mod.kode + ' har ingen KaTeX-feil');
      ok(!body.querySelector('script'), mod.kode + ' har ikke script-tagger');
    });
    ok(d.getElementById('theory-content').textContent.indexOf('Plassholder') < 0, 'teorien er ikke plassholder');

    d.querySelector('.nav [data-nav="statistikk"]').click();
    ok(d.querySelectorAll('#stats-content svg.chart').length > 0, 'statistikken har diagram');
    var ipv6 = JSON.parse(w.localStorage.getItem('ipv6t.stats.v1'));
    var lora = JSON.parse(w.localStorage.getItem('lora.stats.v1'));
    var own = JSON.parse(w.localStorage.getItem('ngrunn.stats.v1'));
    ok(ipv6.modules.hex.attempts === 4 && ipv6.marker === 'ipv6', 'DOM: IPv6-statistikken er urørt');
    ok(lora.marker === 'lora', 'DOM: LoRA-statistikken er urørt');
    ok(own && own.modules && own.modules['11-osi-tcpip'], 'DOM: egne tall er lagret');
    d.getElementById('reset-stats-btn').click();
    ok(w.localStorage.getItem('ngrunn.stats.v1') === null, 'nullstilling sletter ngrunn.stats.v1');
    ok(w.localStorage.getItem('ipv6t.stats.v1') && w.localStorage.getItem('lora.stats.v1'), 'nullstilling rører ikke de andre nøklene');
    ok(errors.length === 0, 'ingen JS-feil: ' + errors.join('\n'));
    finishDom();
  }
  function finishDom() {
    setTimeout(function () { w.close(); finish(); }, 30);
  }
  waitReady(0);
}

function finish() {
  console.log('\n' + (checks - fails) + '/' + checks + ' sjekker OK' + (fails ? ' – ' + fails + ' FEIL' : ''));
  process.exit(fails ? 1 : 0);
}
