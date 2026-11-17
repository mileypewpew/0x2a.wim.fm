/* Enkle SVG-diagrammer uten biblioteker. */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T = g.IPV6T || {};
  var NS = 'http://www.w3.org/2000/svg';
  function el(doc, name, attrs, text) {
    var e = doc.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function frame(doc, w, h, label) {
    var svg = el(doc, 'svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'chart', role: 'img', 'aria-label': label });
    return svg;
  }
  /* points: [{ label, value (0-100) }] */
  function line(doc, points, label) {
    var W = 600, H = 220, L = 36, R = 12, T = 12, B = 28;
    var svg = frame(doc, W, H, label);
    var iw = W - L - R, ih = H - T - B;
    [0, 25, 50, 75, 100].forEach(function (p) {
      var y = T + ih - ih * p / 100;
      svg.appendChild(el(doc, 'line', { x1: L, x2: W - R, y1: y, y2: y, class: 'grid' }));
      svg.appendChild(el(doc, 'text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'axis' }, p + '%'));
    });
    if (!points.length) return svg;
    var step = points.length > 1 ? iw / (points.length - 1) : 0;
    var coords = points.map(function (pt, i) {
      return [L + (points.length > 1 ? i * step : iw / 2), T + ih - ih * pt.value / 100];
    });
    svg.appendChild(el(doc, 'polyline', { points: coords.map(function (c) { return c[0].toFixed(1) + ',' + c[1].toFixed(1); }).join(' '), class: 'line' }));
    coords.forEach(function (c, i) {
      var dot = el(doc, 'circle', { cx: c[0].toFixed(1), cy: c[1].toFixed(1), r: 4, class: 'dot' });
      dot.appendChild(el(doc, 'title', {}, points[i].label + ': ' + points[i].value + ' %'));
      svg.appendChild(dot);
    });
    svg.appendChild(el(doc, 'text', { x: L, y: H - 8, class: 'axis' }, points[0].label));
    if (points.length > 1) svg.appendChild(el(doc, 'text', { x: W - R, y: H - 8, 'text-anchor': 'end', class: 'axis' }, points[points.length - 1].label));
    return svg;
  }
  /* bars: [{ label, value (0-100), note }] horisontale søyler */
  function bars(doc, items, label) {
    var rowH = 30, W = 600, LBL = 230, R = 56;
    var H = Math.max(rowH, items.length * rowH) + 8;
    var svg = frame(doc, W, H, label);
    var iw = W - LBL - R;
    items.forEach(function (it, i) {
      var y = 4 + i * rowH;
      svg.appendChild(el(doc, 'text', { x: LBL - 8, y: y + 19, 'text-anchor': 'end', class: 'axis lbl' }, it.label));
      svg.appendChild(el(doc, 'rect', { x: LBL, y: y + 5, width: iw, height: 18, rx: 4, class: 'bar-bg' }));
      var w = Math.max(0, iw * (it.value || 0) / 100);
      var cls = it.value == null ? 'bar none' : it.value >= 80 ? 'bar good' : it.value >= 50 ? 'bar mid' : 'bar bad';
      var r = el(doc, 'rect', { x: LBL, y: y + 5, width: w.toFixed(1), height: 18, rx: 4, class: cls });
      if (it.note) r.appendChild(el(doc, 'title', {}, it.note));
      svg.appendChild(r);
      svg.appendChild(el(doc, 'text', { x: W - R + 8, y: y + 19, class: 'axis' }, it.value == null ? '–' : it.value + ' %'));
    });
    return svg;
  }
  IPV6T.charts = { line: line, bars: bars };
})(typeof window !== 'undefined' ? window : globalThis);
