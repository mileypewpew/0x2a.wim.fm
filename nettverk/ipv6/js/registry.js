/* Modulregister og felles hjelpefunksjoner for IPv6-treneren.
 * Fungerer både i nettleser (window.IPV6T) og i Node (globalThis.IPV6T). */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T = g.IPV6T || {};
  var modules = [];

  /* En modul ser slik ut:
   * {
   *   id: 'hex', code: '1', title: '...', description: '...',
   *   status: 'active' | 'soon',
   *   levels: ['lett','middels','vanskelig'],
   *   taskTypes: [{ id, label }],
   *   generate: function ({ level, type, rng }) -> Task,
   *   theoryHtml: function () -> string   (valgfri)
   * }
   * Task: { module, type, typeLabel, level, question, subject, inputKind,
   *         placeholder, answers: [string], answerDisplay,
   *         validate(input) -> bool, hint(input) -> string|null,
   *         explanation: { steps: [string], table?: { head: [], rows: [[]] } } }
   */
  IPV6T.registry = {
    register: function (m) {
      if (!m || !m.id || !m.title) throw new Error('Modul mangler id/title');
      if (modules.some(function (x) { return x.id === m.id; })) throw new Error('Modul finnes allerede: ' + m.id);
      if (m.status === 'active' && typeof m.generate !== 'function') throw new Error('Aktiv modul mangler generate(): ' + m.id);
      m.status = m.status || 'soon';
      modules.push(m);
      modules.sort(function (a, b) { return String(a.order || a.code).localeCompare(String(b.order || b.code), 'nb', { numeric: true }); });
      return m;
    },
    get: function (id) { return modules.filter(function (m) { return m.id === id; })[0] || null; },
    list: function () { return modules.slice(); },
    active: function () { return modules.filter(function (m) { return m.status === 'active'; }); }
  };

  IPV6T.LEVELS = [
    { id: 'lett', label: 'Lett' },
    { id: 'middels', label: 'Middels' },
    { id: 'vanskelig', label: 'Vanskelig' }
  ];

  var U = IPV6T.util = {
    randInt: function (rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); },
    pick: function (rng, arr) { return arr[Math.floor(rng() * arr.length)]; },
    weightedPick: function (rng, weights) {
      var keys = Object.keys(weights).filter(function (k) { return weights[k] > 0; });
      var total = keys.reduce(function (s, k) { return s + weights[k]; }, 0);
      var r = rng() * total;
      for (var i = 0; i < keys.length; i++) { r -= weights[keys[i]]; if (r < 0) return keys[i]; }
      return keys[keys.length - 1];
    },
    clean: function (s) { return String(s == null ? '' : s).replace(/[\s_]+/g, ''); },
    /* Tolker heks: store/små bokstaver, valgfri 0x, mellomrom ignoreres. Returnerer tall eller null. */
    parseHex: function (s) {
      var t = U.clean(s).toLowerCase().replace(/^0x/, '');
      if (!/^[0-9a-f]{1,12}$/.test(t)) return null;
      return parseInt(t, 16);
    },
    parseDec: function (s) {
      var t = U.clean(s);
      if (!/^\d{1,15}$/.test(t)) return null;
      return parseInt(t, 10);
    },
    /* Binær: mellomrom/understrek ignoreres, valgfri 0b. Returnerer {value, bits} eller null. */
    parseBin: function (s) {
      var t = U.clean(s).toLowerCase().replace(/^0b/, '');
      if (!/^[01]{1,48}$/.test(t)) return null;
      return { value: parseInt(t, 2), bits: t.length };
    },
    toHex: function (n, pad, upper) {
      var h = n.toString(16);
      while (pad && h.length < pad) h = '0' + h;
      return upper === false ? h : h.toUpperCase();
    },
    toBin: function (n, bits) {
      var b = n.toString(2);
      while (b.length < bits) b = '0' + b;
      return b;
    },
    groupBits: function (b) { // "11011011" -> "1101 1011" (grupper på 4 fra høyre)
      var out = [];
      for (var i = b.length; i > 0; i -= 4) out.unshift(b.slice(Math.max(0, i - 4), i));
      return out.join(' ');
    },
    nb: function (n) { return n.toLocaleString ? n.toLocaleString('nb-NO') : String(n); },
    escapeHtml: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
