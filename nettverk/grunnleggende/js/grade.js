/* Retting av oppgaver for Nettverk grunnleggende. Ren logikk, uten DOM.
 * Kopi av ai/lora/js/grade.js. LoRA-filen er ikke endret.
 * tall: mellomrom og understrek fjernes på samme måte som IPV6T.util.clean,
 * og komma godtas som desimaltegn. */
(function (g) {
  'use strict';
  var NGRUNN = g.NGRUNN = g.NGRUNN || {};

  function clean(s) {
    return String(s == null ? '' : s).replace(/[\s_]+/g, '');
  }

  function normText(s) {
    return String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toLocaleLowerCase('nb');
  }

  function parseUserTall(s) {
    var t = clean(s).replace(/,/g, '.');
    if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(t)) return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
  }

  /* Forfattersvar skal være en streng med punktum som desimaltegn. */
  function parseAuthorTall(s) {
    var t = String(s == null ? '' : s).trim();
    if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(t)) return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
  }

  function withinTolerance(actual, expected, tol) {
    var diff = Math.abs(actual - expected);
    if (diff <= tol) return true;
    /* 0,40 og 0,39 med toleranse 0,01 er like i titallsystemet, men ikke alltid i binær flyt.
     * Et slingringsmonn på 1e-9 gjør at et svar nøyaktig på grensen ikke faller utenfor. */
    var slack = 1e-9 * Math.max(1, tol, diff);
    return diff <= tol + slack;
  }

  function check(task, given) {
    if (!task || !task.svar || !task.svar.length) return false;
    if (task.type === 'tekst' || task.type === 'flervalg') {
      var gnorm = normText(given);
      if (!gnorm) return false;
      return task.svar.some(function (s) { return normText(s) === gnorm; });
    }
    if (task.type === 'tall') {
      var n = parseUserTall(given);
      if (n == null) return false;
      var tol = task.toleranse;
      if (typeof tol !== 'number' || !isFinite(tol) || tol <= 0) tol = 0;
      return task.svar.some(function (s) {
        var expected = parseAuthorTall(s);
        if (expected == null) return false;
        if (tol === 0) return n === expected;
        return withinTolerance(n, expected, tol);
      });
    }
    return false;
  }

  function shuffle(list, rng) {
    var a = (list || []).slice();
    var rand = rng || Math.random;
    var i, j, tmp;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(rand() * (i + 1));
      tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  NGRUNN.grade = {
    clean: clean,
    normText: normText,
    parseUserTall: parseUserTall,
    parseAuthorTall: parseAuthorTall,
    check: check,
    shuffle: shuffle
  };
})(typeof window !== 'undefined' ? window : globalThis);
