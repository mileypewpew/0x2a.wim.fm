/* Felles laster for statiske IPv6-moduler (samme spor som modul 0).
 * Retting, YAML og markdown kommer fra Nettverk grunnleggende.
 *
 * Kanonisk form (RFC 5952) er streng: det finnes ikke et eget felt i dataene.
 * En oppgave er streng når spørsmålet sier «kanonisk» eller «forkortes etter RFC 5952»,
 * og hvert svar er en adresse, et prefiks eller ett hextet (ikke en setning).
 * Da sammenlignes teksten eksakt etter trim av endene. Den vanlige tekstregelen
 * (uten hensyn til store bokstaver, sammenslåtte mellomrom) brukes ikke, og svaret
 * foldes ikke ut eller normaliseres. */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T;
  var TYPE_LABEL = { flervalg: 'Flervalg', tall: 'Tall', tekst: 'Tekst' };

  function grade() {
    if (!g.NGRUNN || !g.NGRUNN.grade) throw new Error('Rettingen fra Nettverk grunnleggende er ikke lastet.');
    return g.NGRUNN.grade;
  }

  function addressShaped(s) {
    if (typeof s !== 'string' || !s || /\s/.test(s)) return false;
    if (s.indexOf(':') >= 0) return /^[0-9a-f:]+(?:\/\d{1,3})?$/i.test(s);
    return /^[0-9a-f]{1,4}$/i.test(s);
  }

  function isCanonicalTask(raw) {
    var q = String(raw && raw['spørsmål'] || '');
    if (!/kanonisk/i.test(q) && !/forkortes etter RFC\s*5952/i.test(q)) return false;
    return !!(raw.svar && raw.svar.length && raw.svar.every(addressShaped));
  }

  function strictCheck(raw, input) {
    var given = String(input == null ? '' : input).replace(/^\s+|\s+$/g, '');
    if (!given) return false;
    return raw.svar.some(function (s) { return given === s; });
  }

  function parseGroups(side) {
    if (side === '') return [];
    var parts = side.split(':');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (!/^[0-9a-f]{1,4}$/i.test(parts[i])) return null;
      out.push(parseInt(parts[i], 16));
    }
    return out;
  }

  /* Returnerer den kanoniske skrivemåten, eller null hvis strengen ikke er en adresse. */
  function canonicalAddress(input) {
    var s = String(input == null ? '' : input);
    if (!s || /[A-F]/.test(s) || /\s/.test(s)) return null;
    var prefix = null;
    var slash = s.indexOf('/');
    if (slash >= 0) {
      prefix = s.slice(slash + 1);
      s = s.slice(0, slash);
      if (!/^\d{1,3}$/.test(prefix)) return null;
      var n = Number(prefix);
      if (n > 128) return null;
      prefix = String(n);
    }
    if (s.indexOf(':::') >= 0) return null;
    var halves = s.split('::');
    if (halves.length > 2) return null;
    var left = parseGroups(halves[0]);
    if (!left) return null;
    var right = [];
    if (halves.length === 2) {
      right = parseGroups(halves[1]);
      if (!right) return null;
      if (left.length + right.length > 6) return null;
    } else if (left.length !== 8) return null;
    var missing = 8 - left.length - right.length;
    var nums = left.concat(new Array(missing).fill(0), right);
    if (nums.length !== 8 || nums.some(function (x) { return x < 0 || x > 0xffff; })) return null;
    var bestStart = -1, bestLen = 0, i = 0;
    while (i < 8) {
      if (nums[i] !== 0) { i++; continue; }
      var j = i;
      while (j < 8 && nums[j] === 0) j++;
      if (j - i > bestLen) { bestLen = j - i; bestStart = i; }
      i = j;
    }
    function hex(v) { return v.toString(16); }
    var out;
    if (bestLen >= 2) {
      out = nums.slice(0, bestStart).map(hex).join(':') + '::' + nums.slice(bestStart + bestLen).map(hex).join(':');
    } else out = nums.map(hex).join(':');
    if (prefix != null) out += '/' + prefix;
    return out;
  }

  function isRfc5952(s) {
    if (typeof s !== 'string' || !s || /\s/.test(s)) return false;
    if (s.indexOf(':') < 0 && s.indexOf('/') < 0) return /^[0-9a-f]{1,4}$/.test(s) && !/^0[0-9a-f]/.test(s);
    return canonicalAddress(s) === s;
  }

  function contentVersion() {
    var doc = g.document;
    if (!doc) return '';
    var el = doc.querySelector('meta[name="ipv6-innhold-versjon"]');
    return el ? (el.getAttribute('content') || '') : '';
  }

  function defineStaticModule(row) {
    var pool = [];
    var body = '';
    var meta = null;

    function toTask(raw, rng) {
      var strict = isCanonicalTask(raw);
      var choices = raw.type === 'flervalg' ? grade().shuffle(raw.alternativer, rng) : null;
      return {
        module: row.jsId,
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
        canonical: strict,
        validate: function (input) { return strict ? strictCheck(raw, input) : grade().check(raw, input); },
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
      var mod = IPV6T.registry.get(row.jsId);
      if (mod && meta.tittel) mod.title = meta.tittel;
      if (mod && meta.beskrivelse) mod.description = meta.beskrivelse;
      if (mod && meta.kode != null && meta.kode !== '') mod.code = String(meta.kode);
    }

    function load() {
      if (!g.fetch) return Promise.resolve(false);
      var q = contentVersion();
      var suffix = q ? ('?v=' + encodeURIComponent(q)) : '';
      var base = '../../content/nettverk/ipv6/' + row.contentId + '/';
      return Promise.all([
        g.fetch(base + 'teori.md' + suffix).then(function (r) {
          if (!r.ok) throw new Error(row.contentId + '/teori.md (' + r.status + ')');
          return r.text();
        }),
        g.fetch(base + 'oppgaver.json' + suffix).then(function (r) {
          if (!r.ok) throw new Error(row.contentId + '/oppgaver.json (' + r.status + ')');
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
      id: row.jsId,
      code: row.kode,
      order: row.order || row.kode,
      title: row.title,
      description: row.description || '',
      status: 'active',
      levels: [],
      taskTypes: [
        { id: 'flervalg', label: 'Flervalg' },
        { id: 'tall', label: 'Tall' },
        { id: 'tekst', label: 'Tekst' }
      ],
      statsKey: row.statsKey,
      contentId: row.contentId,
      generate: generate,
      draw: draw,
      theoryHtml: theoryHtml,
      load: load,
      ready: function () { return pool.length > 0; }
    });

    var api = {
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
    IPV6T.staticModules = IPV6T.staticModules || {};
    IPV6T.staticModules[row.jsId] = api;
    if (row.jsId === 'ipv6-hvorfor') IPV6T.hvorfor = api;
    return api;
  }

  IPV6T.defineStaticModule = defineStaticModule;
  IPV6T.canonical = {
    isTask: isCanonicalTask,
    check: strictCheck,
    isRfc5952: isRfc5952,
    canonicalAddress: canonicalAddress
  };

  (IPV6T.MODULE_MAP || []).forEach(function (row) {
    if (row && row.status === 'active') defineStaticModule(row);
  });
})(typeof window !== 'undefined' ? window : globalThis);
