/* Modul 0: statisk innhold «Hvorfor IPv6».
 * Tekst og oppgaver leses fra content/nettverk/ipv6/ipv6-hvorfor/.
 * Retting, YAML og markdown kommer fra Nettverk grunnleggende (NGRUNN).
 * Adopsjonstall skal bare stå i teori.md, ikke i denne filen. */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T;
  var pool = [];
  var body = '';
  var meta = null;
  var TYPE_LABEL = { flervalg: 'Flervalg', tall: 'Tall', tekst: 'Tekst' };

  function grade() {
    if (!g.NGRUNN || !g.NGRUNN.grade) throw new Error('Rettingen fra Nettverk grunnleggende er ikke lastet.');
    return g.NGRUNN.grade;
  }

  function toTask(raw, rng) {
    var choices = raw.type === 'flervalg' ? grade().shuffle(raw.alternativer, rng) : null;
    return {
      module: 'ipv6-hvorfor',
      id: raw.id,
      type: raw.type,
      typeLabel: TYPE_LABEL[raw.type] || raw.type,
      level: String(raw['nivå'] == null ? '' : raw['nivå']),
      question: raw['spørsmål'],
      subject: '',
      inputKind: raw.type === 'flervalg' ? 'choice' : 'text',
      choices: choices,
      placeholder: raw.type === 'tall' ? 'Tall' : 'Svar',
      answers: raw.svar.slice(),
      answerDisplay: raw.svar.join(' eller '),
      validate: function (input) { return grade().check(raw, input); },
      hint: function () { return null; },
      explanation: { steps: (raw.forklaring && raw.forklaring.steg) ? raw.forklaring.steg.slice() : [] },
      key: raw.id,
      raw: raw
    };
  }

  function matching(type) {
    return pool.filter(function (t) { return !type || t.type === type; });
  }

  function generate(opts) {
    opts = opts || {};
    var list = matching(opts.type);
    if (!list.length) throw new Error('Ingen oppgaver er lastet for denne typen.');
    return toTask(IPV6T.util.pick(opts.rng || Math.random, list), opts.rng);
  }

  function draw(opts) {
    opts = opts || {};
    var list = grade().shuffle(matching(opts.type), opts.rng);
    var n = opts.count == null ? list.length : opts.count;
    if (n > list.length) n = list.length;
    return list.slice(0, n).map(function (raw) { return toTask(raw, opts.rng); });
  }

  function install(teori, tasks) {
    if (!g.NGRUNN || !g.NGRUNN.yaml) throw new Error('YAML-leseren fra Nettverk grunnleggende er ikke lastet.');
    var split = g.NGRUNN.yaml.splitFrontmatter(teori);
    if (split.error) throw new Error(split.error);
    if (!Array.isArray(tasks)) throw new Error('oppgaver.json er ikke en liste.');
    meta = split.data || {};
    body = split.body || '';
    pool = tasks.slice();
    var mod = IPV6T.registry.get('ipv6-hvorfor');
    if (mod && meta.tittel) mod.title = meta.tittel;
    if (mod && meta.beskrivelse) mod.description = meta.beskrivelse;
    if (mod && meta.kode != null && meta.kode !== '') mod.code = String(meta.kode);
  }

  function contentVersion() {
    var doc = g.document;
    if (!doc) return '';
    var el = doc.querySelector('meta[name="ipv6-innhold-versjon"]');
    return el ? (el.getAttribute('content') || '') : '';
  }

  function load() {
    if (!g.fetch) return Promise.resolve(false);
    var q = contentVersion();
    var suffix = q ? ('?v=' + encodeURIComponent(q)) : '';
    var base = '../../content/nettverk/ipv6/ipv6-hvorfor/';
    return Promise.all([
      g.fetch(base + 'teori.md' + suffix).then(function (r) {
        if (!r.ok) throw new Error('teori.md (' + r.status + ')');
        return r.text();
      }),
      g.fetch(base + 'oppgaver.json' + suffix).then(function (r) {
        if (!r.ok) throw new Error('oppgaver.json (' + r.status + ')');
        return r.json();
      })
    ]).then(function (pair) {
      install(pair[0], pair[1]);
      return true;
    });
  }

  function theoryHtml() {
    if (!body) return '<p>Teorien er ikke lastet ennå.</p>';
    if (!g.NGRUNN || !g.NGRUNN.markdown) return '<p>Markdown er ikke lastet.</p>';
    var md = g.NGRUNN.markdown;
    var html = md.render(body);
    html = html.replace(/<table\b/g, '<div class="table-wrap"><table').replace(/<\/table>/g, '</table></div>');
    var kilder = meta && meta.kilder;
    if (Array.isArray(kilder) && kilder.length) {
      html += '<h2>Kilder</h2><ul class="kilder">';
      kilder.forEach(function (k) {
        if (!k || !k.url) return;
        html += '<li><a href="' + md.escapeHtml(k.url) + '" rel="noopener noreferrer">' + md.escapeHtml(k.tittel || k.url) + '</a></li>';
      });
      html += '</ul>';
    }
    return html;
  }

  IPV6T.registry.register({
    id: 'ipv6-hvorfor',
    code: '0',
    title: 'Hvorfor IPv6: historie og fremtid',
    description: 'Hvorfor IPv4 tok slutt, plasterløsningene, hva IPv6 løser, en kort tidslinje og status i dag.',
    status: 'active',
    levels: [],
    taskTypes: [
      { id: 'flervalg', label: 'Flervalg' },
      { id: 'tall', label: 'Tall' },
      { id: 'tekst', label: 'Tekst' }
    ],
    statsKey: 'ipv6t.hvorfor.stats.v1',
    generate: generate,
    draw: draw,
    theoryHtml: theoryHtml,
    load: load,
    ready: function () { return pool.length > 0; }
  });

  IPV6T.hvorfor = {
    install: install,
    load: load,
    ready: function () { return pool.length > 0; },
    count: function () { return pool.length; },
    tasks: function () { return pool.slice(); },
    taskById: function (id) {
      var raw = pool.filter(function (t) { return t.id === id; })[0];
      return raw ? toTask(raw) : null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
