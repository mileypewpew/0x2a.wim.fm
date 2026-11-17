/* Liten YAML-delmengde til frontmatter i teori.md.
 * Støtter siterte strenger, enkle verdier, lister ([a, b] og punktlister)
 * og lister av objekter. Ikke full YAML: ingen ankre, blokkskalarer eller tagger.
 * Virker i nettleser (window.LORAT) og i Node (globalThis.LORAT). */
(function (g) {
  'use strict';
  var LORAT = g.LORAT = g.LORAT || {};

  function YamlError(message) {
    this.name = 'YamlError';
    this.message = message;
  }
  YamlError.prototype = Object.create(Error.prototype);

  function matchKey(content) {
    var m = /^([A-Za-zÆØÅæøå_][\wÆØÅæøå-]*)\s*:\s*(.*)$/.exec(content);
    if (!m) return null;
    /* «https://…» er en URL, ikke nøkkelen https. */
    if (m[2].indexOf('//') === 0) return null;
    return { key: m[1], rest: m[2] };
  }

  function splitCommas(inner) {
    var parts = [];
    var cur = '';
    var quote = null;
    var depth = 0;
    var i;
    for (i = 0; i < inner.length; i++) {
      var c = inner.charAt(i);
      if (quote) {
        cur += c;
        if (c === '\\' && quote === '"') {
          if (i + 1 < inner.length) cur += inner.charAt(++i);
          continue;
        }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'") { quote = c; cur += c; continue; }
      if (c === '[' || c === '{') { depth++; cur += c; continue; }
      if (c === ']' || c === '}') { depth--; cur += c; continue; }
      if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (quote || depth !== 0) throw new YamlError('Uavsluttet liste eller tekst: ' + inner);
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function unquote(s) {
    var q = s.charAt(0);
    var out = '';
    var i;
    if ((q !== '"' && q !== "'") || s.charAt(s.length - 1) !== q) {
      throw new YamlError('Uavsluttet anførselstegn: ' + s);
    }
    for (i = 1; i < s.length - 1; i++) {
      var c = s.charAt(i);
      if (c === '\\' && q === '"') {
        var n = s.charAt(++i);
        if (n === 'n') out += '\n';
        else if (n === 't') out += '\t';
        else if (n === '"' || n === '\\' || n === '/') out += n;
        else out += n;
        continue;
      }
      if (c === q) throw new YamlError('Anførselstegn slutter for tidlig: ' + s);
      out += c;
    }
    return out;
  }

  function parseScalar(s) {
    s = String(s).trim();
    if (!s) return '';
    if (s.charAt(0) === '"' || s.charAt(0) === "'") return unquote(s);
    if (s.charAt(0) === '[') {
      if (s.charAt(s.length - 1) !== ']') throw new YamlError('Liste er ikke lukket: ' + s);
      var inner = s.slice(1, -1).trim();
      if (!inner) return [];
      return splitCommas(inner).map(parseScalar);
    }
    if (s.charAt(0) === '{') {
      if (s.charAt(s.length - 1) !== '}') throw new YamlError('Objekt er ikke lukket: ' + s);
      var body = s.slice(1, -1).trim();
      var obj = {};
      if (!body) return obj;
      splitCommas(body).forEach(function (part) {
        var km = matchKey(part.trim());
        if (!km) throw new YamlError('Forventet nøkkel i objekt: ' + part);
        obj[km.key] = km.rest === '' ? '' : parseScalar(km.rest);
      });
      return obj;
    }
    return s;
  }

  function parseYaml(text) {
    var lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);
    var i = 0;

    function peek() {
      while (i < lines.length) {
        var line = lines[i];
        if (line.trim() === '' || /^\s*#/.test(line)) { i++; continue; }
        return line;
      }
      return null;
    }
    function indentOf(line) {
      var m = /^ */.exec(line);
      return m ? m[0].length : 0;
    }
    function parseObject(minIndent) {
      var obj = {};
      while (true) {
        var line = peek();
        if (line == null) break;
        var at = indentOf(line);
        if (at < minIndent) break;
        if (at > minIndent) throw new YamlError('Uventet innrykk: ' + line.trim());
        var content = line.slice(at);
        if (content.charAt(0) === '-') break;
        var km = matchKey(content);
        if (!km) throw new YamlError('Forventet nøkkel: ' + line.trim());
        i++;
        if (km.rest !== '') obj[km.key] = parseScalar(km.rest);
        else {
          var next = peek();
          if (next == null || indentOf(next) <= at) obj[km.key] = '';
          else if (/^ *-/.test(next)) obj[km.key] = parseList(indentOf(next));
          else obj[km.key] = parseObject(indentOf(next));
        }
      }
      return obj;
    }
    function parseList(minIndent) {
      var arr = [];
      while (true) {
        var line = peek();
        if (line == null) break;
        var at = indentOf(line);
        if (at !== minIndent) break;
        var content = line.slice(at);
        if (content.charAt(0) !== '-') break;
        i++;
        var after = content.replace(/^-\s?/, '');
        if (after.trim() === '') {
          var next = peek();
          if (next && indentOf(next) > at) {
            if (/^ *-/.test(next)) arr.push(parseList(indentOf(next)));
            else arr.push(parseObject(indentOf(next)));
          } else arr.push('');
          continue;
        }
        var trimmed = after.trim();
        var first = trimmed.charAt(0);
        if (first === '"' || first === "'" || first === '[' || first === '{') {
          arr.push(parseScalar(trimmed));
          continue;
        }
        var km = matchKey(trimmed);
        if (km) {
          var item = {};
          item[km.key] = km.rest === '' ? '' : parseScalar(km.rest);
          while (true) {
            var n = peek();
            if (n == null || indentOf(n) <= at || /^ *-/.test(n)) break;
            var nc = n.slice(indentOf(n));
            var nm = matchKey(nc);
            if (!nm) throw new YamlError('Forventet felt: ' + n.trim());
            i++;
            if (nm.rest !== '') item[nm.key] = parseScalar(nm.rest);
            else {
              var nested = peek();
              if (nested && indentOf(nested) > indentOf(n) && /^ *-/.test(nested)) item[nm.key] = parseList(indentOf(nested));
              else if (nested && indentOf(nested) > indentOf(n)) item[nm.key] = parseObject(indentOf(nested));
              else item[nm.key] = '';
            }
          }
          arr.push(item);
        } else arr.push(trimmed);
      }
      return arr;
    }
    return parseObject(0);
  }

  function splitFrontmatter(text) {
    text = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    if (!/^---[ \t]*\r?\n/.test(text)) return { data: {}, body: text };
    var rest = text.replace(/^---[ \t]*\r?\n/, '');
    var end = rest.search(/\r?\n---[ \t]*(?:\r?\n|$)/);
    if (end < 0) return { error: 'Frontmatter mangler avsluttende ---.', data: {}, body: text };
    var fm = rest.slice(0, end);
    var body = rest.slice(end).replace(/^\r?\n---[ \t]*/, '').replace(/^(?:\r?\n)+/, '');
    try {
      return { data: parseYaml(fm), body: body };
    } catch (err) {
      return { error: err.message || String(err), data: {}, body: body };
    }
  }

  LORAT.yaml = { parse: parseYaml, splitFrontmatter: splitFrontmatter, parseScalar: parseScalar };
})(typeof window !== 'undefined' ? window : globalThis);
