/* Markdown for teoriteksten.
 * Matte ($…$ og $$…$$) tas ut før marked kjører, så _ og \ ikke blir ødelagt.
 * Et avsnitt som bare inneholder ett inline-uttrykk, vises som display-formel.
 * HTML fra marked vaskes. KaTeX settes inn etterpå (trust er av). */
(function (g) {
  'use strict';
  var NGRUNN = g.NGRUNN = g.NGRUNN || {};

  var ALLOW = {
    P: 1, BR: 1, HR: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
    UL: 1, OL: 1, LI: 1, STRONG: 1, EM: 1, DEL: 1, SUP: 1, SUB: 1,
    CODE: 1, PRE: 1, BLOCKQUOTE: 1, A: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TH: 1, TD: 1
  };
  var DROP = {
    SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1,
    FORM: 1, INPUT: 1, BUTTON: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1,
    IMG: 1, SVG: 1, MATH: 1, VIDEO: 1, AUDIO: 1, SOURCE: 1, CANVAS: 1
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Trekker ut kode først, så matte, og legger koden tilbake før Markdown. */
  function shieldMath(md) {
    var codes = [];
    var math = [];
    var s = String(md == null ? '' : md);
    s = s.replace(/```[\s\S]*?```/g, function (block) {
      var i = codes.length;
      codes.push(block);
      return 'LORACODE' + i + 'END';
    });
    s = s.replace(/`[^`\n]*`/g, function (block) {
      var i = codes.length;
      codes.push(block);
      return 'LORACODE' + i + 'END';
    });
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, function (_, tex) {
      var i = math.length;
      math.push({ display: true, tex: tex.trim() });
      return 'LORAMATH' + i + 'END';
    });
    s = s.replace(/(^|[^\\$])\$(?!\$)([^\s$](?:[^$\n]*?[^\s$])?)\$/g, function (_, pre, tex) {
      if (!tex || /^\s|\s$/.test(tex)) return pre + '$' + tex + '$';
      var i = math.length;
      math.push({ display: false, tex: tex.trim() });
      return pre + 'LORAMATH' + i + 'END';
    });
    s = s.replace(/LORACODE(\d+)END/g, function (_, i) { return codes[+i]; });
    return { md: s, math: math };
  }

  function safeUrl(href) {
    if (href == null) return null;
    var raw = String(href).trim();
    if (!raw || raw.length > 4000) return null;
    if (/[\u0000-\u001F\u007F]/.test(raw)) return null;
    if (/^(javascript|data|vbscript|file):/i.test(raw)) return null;
    if (raw.charAt(0) === '#' || raw.charAt(0) === '/' || raw.indexOf('./') === 0 || raw.indexOf('../') === 0) return raw;
    try {
      var u = new URL(raw, 'https://example.invalid');
      if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') return raw;
    } catch (e) { /* ugyldig */ }
    return null;
  }

  function copyAttrs(node, el) {
    var tag = node.tagName;
    if (tag === 'A') {
      var href = safeUrl(node.getAttribute('href'));
      if (href) {
        el.setAttribute('href', href);
        if (/^https?:/i.test(href)) el.setAttribute('rel', 'noopener noreferrer');
      }
      return;
    }
    if (tag === 'CODE' || tag === 'PRE') {
      var cls = node.getAttribute('class') || '';
      if (/^language-[A-Za-z0-9_+-]+$/.test(cls)) el.setAttribute('class', cls);
      return;
    }
    if (tag === 'TD' || tag === 'TH') {
      var span = node.getAttribute('colspan');
      if (span && /^[1-9]\d?$/.test(span)) el.setAttribute('colspan', span);
      span = node.getAttribute('rowspan');
      if (span && /^[1-9]\d?$/.test(span)) el.setAttribute('rowspan', span);
      var align = (node.getAttribute('align') || '').toLowerCase();
      if (align === 'left' || align === 'center' || align === 'right') el.setAttribute('align', align);
      if (tag === 'TH') {
        var scope = (node.getAttribute('scope') || '').toLowerCase();
        if (scope === 'col' || scope === 'row' || scope === 'colgroup' || scope === 'rowgroup') el.setAttribute('scope', scope);
      }
      return;
    }
    if (tag === 'OL') {
      var start = node.getAttribute('start');
      if (start && /^[1-9]\d{0,3}$/.test(start)) el.setAttribute('start', start);
    }
  }

  function sanitize(html) {
    var doc = new DOMParser().parseFromString(String(html), 'text/html');
    var out = doc.createElement('div');
    function walk(node, parent) {
      if (node.nodeType === 3) {
        parent.appendChild(doc.createTextNode(node.textContent));
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.tagName;
      if (DROP[tag]) return;
      var target = parent;
      if (ALLOW[tag]) {
        var el = doc.createElement(tag.toLowerCase());
        copyAttrs(node, el);
        if (tag === 'TABLE') {
          var wrap = doc.createElement('div');
          wrap.setAttribute('class', 'table-wrap');
          parent.appendChild(wrap);
          wrap.appendChild(el);
        } else parent.appendChild(el);
        target = el;
      }
      var child = node.firstChild;
      while (child) {
        var next = child.nextSibling;
        walk(child, target);
        child = next;
      }
    }
    var bodyChild = doc.body.firstChild;
    while (bodyChild) {
      var nextBody = bodyChild.nextSibling;
      walk(bodyChild, out);
      bodyChild = nextBody;
    }
    return out.innerHTML;
  }

  function renderKatex(tex, display) {
    if (!g.katex || typeof g.katex.renderToString !== 'function') {
      return '<span class="katex-missing">' + escapeHtml(tex) + '</span>';
    }
    try {
      return g.katex.renderToString(tex, {
        displayMode: !!display,
        throwOnError: false,
        trust: false,
        strict: 'ignore',
        output: 'htmlAndMathml'
      });
    } catch (err) {
      return '<span class="katex-error">' + escapeHtml(tex) + '</span>';
    }
  }

  function render(md) {
    if (!g.marked || typeof g.marked.parse !== 'function') {
      throw new Error('Markdown-biblioteket marked er ikke lastet.');
    }
    var shielded = shieldMath(md);
    var raw = g.marked.parse(shielded.md, { async: false, gfm: true });
    if (typeof raw !== 'string') throw new Error('Markdown ble ikke til tekst.');
    var html = sanitize(raw);
    html = html.replace(/<p>\s*LORAMATH(\d+)END\s*<\/p>/g, function (_, n) {
      var item = shielded.math[+n];
      return item ? renderKatex(item.tex, true) : '';
    });
    html = html.replace(/LORAMATH(\d+)END/g, function (_, n) {
      var item = shielded.math[+n];
      return item ? renderKatex(item.tex, item.display) : '';
    });
    return html;
  }

  NGRUNN.markdown = { render: render, shieldMath: shieldMath, sanitize: sanitize, escapeHtml: escapeHtml };
})(typeof window !== 'undefined' ? window : globalThis);
