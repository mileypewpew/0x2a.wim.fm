/* Modul 1: Heksadesimalt tallsystem */
(function (g) {
  'use strict';
  var IPV6T = g.IPV6T;
  var U = IPV6T.util;

  var TYPES = [
    { id: 'hex2dec', label: 'Heks → desimal' },
    { id: 'dec2hex', label: 'Desimal → heks' },
    { id: 'hex2bin', label: 'Heks → binær' },
    { id: 'bin2hex', label: 'Binær → heks' },
    { id: 'digit2nibble', label: 'Heks-siffer → nibble (4 bit)' },
    { id: 'nibble2digit', label: 'Nibble (4 bit) → heks-siffer' },
    { id: 'group2bin', label: 'IPv6-gruppe → binær (16 bit)' },
    { id: 'group2dec', label: 'IPv6-gruppe → desimal' },
    { id: 'facts', label: 'IPv6-fakta: bit, sifre og grupper' }
  ];
  var LABEL = {};
  TYPES.forEach(function (t) { LABEL[t.id] = t.label; });

  var CFG = {
    lett: {
      weights: { hex2dec: 3, dec2hex: 3, hex2bin: 2, bin2hex: 2, digit2nibble: 3, nibble2digit: 3, facts: 1, group2bin: 0, group2dec: 0 },
      hexDigits: [1, 2], decMax: 255, binBits: [4, 8], groupDigits: [1, 2]
    },
    middels: {
      weights: { hex2dec: 3, dec2hex: 3, hex2bin: 3, bin2hex: 3, digit2nibble: 1, nibble2digit: 1, facts: 2, group2bin: 2, group2dec: 1 },
      hexDigits: [2, 3], decMax: 4095, binBits: [6, 12], groupDigits: [2, 3]
    },
    vanskelig: {
      weights: { hex2dec: 2, dec2hex: 3, hex2bin: 2, bin2hex: 3, digit2nibble: 0, nibble2digit: 0, facts: 2, group2bin: 3, group2dec: 3 },
      hexDigits: [3, 4], decMax: 65535, binBits: [9, 16], groupDigits: [3, 4]
    }
  };

  // Kjente/typiske IPv6-grupper
  var GROUPS = ['2001', 'db8', 'fe80', 'ff02', 'ff00', 'fd00', 'fc00', 'ffff', '2002', '64', 'ff9b',
    '1', 'a', 'ff', 'abcd', 'cafe', 'beef', 'face', 'dead', '8000', '2a01', '2a02', '2620', 'fe8', '100', 'c0a8'];

  var DIGIT_NAMES = { 10: 'A', 11: 'B', 12: 'C', 13: 'D', 14: 'E', 15: 'F' };

  function randHexValue(rng, digits) {
    if (digits <= 1) return U.randInt(rng, 0, 15);
    return U.randInt(rng, Math.pow(16, digits - 1), Math.pow(16, digits) - 1);
  }
  function randDigit(rng) { // litt større sjanse for bokstaver
    return rng() < 0.6 ? U.randInt(rng, 10, 15) : U.randInt(rng, 0, 9);
  }
  function pickGroup(rng, cfg) {
    var lens = cfg.groupDigits;
    var cands = GROUPS.filter(function (gr) { return gr.length >= lens[0] && gr.length <= lens[1]; });
    if (cands.length && rng() < 0.6) return U.pick(rng, cands);
    return U.toHex(randHexValue(rng, U.randInt(rng, lens[0], lens[1])), 0, false);
  }
  function sup(k) { return String(k).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]; }).join(''); }
  function digitWord(v) { return v >= 10 ? DIGIT_NAMES[v] + ' = ' + v : String(v); }
  function nibbleSum(bits) { // "1011" -> "8 + 0 + 2 + 1"
    var w = [8, 4, 2, 1];
    return bits.split('').map(function (b, i) { return b === '1' ? String(w[i]) : '0'; }).join(' + ');
  }

  // ---------- validatorer ----------
  function hexValidator(value) { return function (inp) { return U.parseHex(inp) === value; }; }
  function decValidator(value) { return function (inp) { return U.parseDec(inp) === value; }; }
  function binValidator(value) { return function (inp) { var p = U.parseBin(inp); return !!p && p.value === value; }; }
  function binHint(value, bits) {
    return function (inp) {
      var p = U.parseBin(inp);
      if (p && p.value === value && p.bits < bits) {
        return 'Riktig verdi, men skriv gjerne alle ' + bits + ' bit med ledende nuller: ' + U.groupBits(U.toBin(value, bits));
      }
      return null;
    };
  }

  // ---------- forklaringer ----------
  function explainHex2Dec(hex, value) {
    var digits = hex.toUpperCase().split('');
    var n = digits.length;
    var steps = [];
    var rows = [];
    var terms = [], prods = [];
    if (n === 1) {
      var v1 = parseInt(digits[0], 16);
      steps.push('Ett heks-siffer har samme verdi som i tabellen 0–F: ' + digits[0] + ' = ' + v1 + '.');
      return { steps: steps };
    }
    var pv = [];
    for (var k = n - 1; k >= 0; k--) pv.push('16' + sup(k) + ' = ' + U.nb(Math.pow(16, k)));
    steps.push('Hvert siffer har en posisjonsverdi (fra venstre): ' + pv.join(', ') + '.');
    var letters = digits.filter(function (d) { return /[A-F]/.test(d); })
      .filter(function (d, i, a) { return a.indexOf(d) === i; })
      .map(function (d) { return d + ' = ' + parseInt(d, 16); });
    if (letters.length) steps.push('Bokstavene betyr: ' + letters.join(', ') + '.');
    digits.forEach(function (d, i) {
      var k = n - 1 - i, dv = parseInt(d, 16), p = Math.pow(16, k);
      terms.push(dv + '·' + U.nb(p));
      prods.push(U.nb(dv * p));
      rows.push([d, String(dv), '16' + sup(k) + ' = ' + U.nb(p), U.nb(dv * p)]);
    });
    steps.push('Gang og legg sammen: ' + terms.join(' + '));
    steps.push('= ' + prods.join(' + ') + ' = ' + U.nb(value));
    return { steps: steps, table: { head: ['Siffer', 'Verdi', 'Posisjon', 'Bidrag'], rows: rows } };
  }

  function explainDec2Hex(value) {
    var steps = [];
    if (value < 16) {
      steps.push(value + ' er mindre enn 16, så det blir ett heks-siffer: ' + (value >= 10 ? value + ' = ' + DIGIT_NAMES[value] : value) + '.');
      return { steps: steps };
    }
    steps.push('Del på 16 gjentatte ganger og skriv opp resten hver gang:');
    var q = value, rests = [], rows = [];
    while (q > 0) {
      var nq = Math.floor(q / 16), r = q % 16;
      steps.push(U.nb(q) + ' ÷ 16 = ' + U.nb(nq) + ', rest ' + r + (r >= 10 ? ' → ' + DIGIT_NAMES[r] : ''));
      rows.push([U.nb(q), U.nb(nq), String(r), U.toHex(r)]);
      rests.unshift(U.toHex(r));
      q = nq;
    }
    var hex = rests.join('');
    steps.push('Les restene nedenfra og opp: ' + hex + '.');
    var chk = hex.split('').map(function (d, i) { return parseInt(d, 16) + '·' + U.nb(Math.pow(16, hex.length - 1 - i)); }).join(' + ');
    steps.push('Kontroll: ' + chk + ' = ' + U.nb(value) + '.');
    return { steps: steps, table: { head: ['Tall', '÷ 16', 'Rest', 'Heks'], rows: rows } };
  }

  function explainHex2Bin(hex, bits) {
    var digits = hex.toUpperCase().split('');
    var steps = ['Hvert heks-siffer blir nøyaktig 4 bit. Bruk vektene 8-4-2-1:'];
    var rows = [], nibs = [];
    digits.forEach(function (d) {
      var v = parseInt(d, 16), nb = U.toBin(v, 4);
      nibs.push(nb);
      rows.push([d, String(v), nb]);
      steps.push(d + ' = ' + v + ' = ' + nibbleSum(nb) + ' → ' + nb);
    });
    var full = nibs.join('');
    if (bits && bits > full.length) {
      var pad = bits - full.length;
      steps.push('En IPv6-gruppe er alltid 16 bit, så vi fyller på med ' + pad + ' nuller foran (ledende nuller er utelatt i «' + hex + '»).');
      full = U.toBin(parseInt(hex, 16), bits);
    }
    steps.push('Sett sammen: ' + U.groupBits(full));
    return { steps: steps, table: { head: ['Heks', 'Desimal', 'Binær'], rows: rows } };
  }

  function explainBin2Hex(bitsStr, value) {
    var steps = [];
    var padded = bitsStr;
    while (padded.length % 4) padded = '0' + padded;
    steps.push('Del bitene i grupper på 4 fra høyre' + (padded.length !== bitsStr.length ? ', og fyll på med nuller foran: ' : ': ') + U.groupBits(padded));
    var rows = [], hex = '';
    for (var i = 0; i < padded.length; i += 4) {
      var nb = padded.slice(i, i + 4), v = parseInt(nb, 2), h = U.toHex(v);
      hex += h;
      rows.push([nb, nibbleSum(nb) + ' = ' + v, h]);
      steps.push(nb + ' = ' + nibbleSum(nb) + ' = ' + v + ' → ' + h);
    }
    var trimmed = hex.replace(/^0+(?=.)/, '');
    steps.push('Svar: ' + hex + (trimmed !== hex ? ' (ledende nuller kan droppes: ' + trimmed + ')' : '') + ' = ' + U.nb(value) + ' desimalt.');
    return { steps: steps, table: { head: ['Nibble', '8-4-2-1', 'Heks'], rows: rows } };
  }

  // ---------- fakta ----------
  function factTasks(level, rng) {
    var basic = [
      { q: 'Hvor mange bit representerer ett heks-siffer?', a: 4, kind: 'dec',
        ex: ['Ett heks-siffer har 16 mulige verdier (0–F).', '16 = 2⁴, så det trengs nøyaktig 4 bit (en nibble).'] },
      { q: 'Hvor mange ulike verdier kan ett heks-siffer ha?', a: 16, kind: 'dec',
        ex: ['Sifrene er 0–9 og A–F: 10 + 6 = 16 verdier.'] },
      { q: 'Hvor mange heks-sifre trengs for å skrive én byte (8 bit)?', a: 2, kind: 'dec',
        ex: ['Ett heks-siffer = 4 bit.', '8 bit ÷ 4 = 2 heks-sifre (f.eks. FF = 1111 1111).'] },
      { q: 'Hva er den største verdien ett heks-siffer kan ha, i desimal?', a: 15, kind: 'dec',
        ex: ['Største siffer er F.', 'F = 15 = 1111 binært = 8 + 4 + 2 + 1.'] }
    ];
    var mid = [
      { q: 'Hvor mange bit er det i én IPv6-gruppe (f.eks. «fe80»)?', a: 16, kind: 'dec',
        ex: ['En gruppe har 4 heks-sifre.', '4 sifre · 4 bit = 16 bit.'] },
      { q: 'Hvor mange heks-sifre er det i én fullt utskrevet IPv6-gruppe?', a: 4, kind: 'dec',
        ex: ['En gruppe er 16 bit, og ett heks-siffer er 4 bit.', '16 ÷ 4 = 4 heks-sifre (f.eks. 0db8).'] },
      { q: 'Hvor mange grupper har en IPv6-adresse?', a: 8, kind: 'dec',
        ex: ['128 bit ÷ 16 bit per gruppe = 8 grupper, adskilt med kolon.'] },
      { q: 'Hva er den største verdien én IPv6-gruppe kan ha, i heks?', a: 0xffff, kind: 'hex', disp: 'ffff',
        ex: ['En gruppe er 4 heks-sifre, og største siffer er f.', 'Største gruppe: ffff = 1111 1111 1111 1111.'] }
    ];
    var hard = [
      { q: 'Hvor mange bit er en IPv6-adresse?', a: 128, kind: 'dec',
        ex: ['8 grupper · 16 bit = 128 bit.'] },
      { q: 'Hvor mange heks-sifre har en fullt utskrevet IPv6-adresse?', a: 32, kind: 'dec',
        ex: ['128 bit ÷ 4 bit per siffer = 32 heks-sifre.', 'Det er 8 grupper · 4 sifre = 32.'] },
      { q: 'Hva er den største verdien én IPv6-gruppe kan ha, i desimal?', a: 65535, kind: 'dec',
        ex: ['ffff = 15·4096 + 15·256 + 15·16 + 15·1', '= 61 440 + 3 840 + 240 + 15 = 65 535 (= 2¹⁶ − 1).'] },
      { q: 'Hvor mange ulike verdier kan én 16-bits IPv6-gruppe ha?', a: 65536, kind: 'dec',
        ex: ['16 bit gir 2¹⁶ kombinasjoner = 65 536 (fra 0000 til ffff).'] },
      { q: 'Hvor mange bytes (oktetter) er en IPv6-adresse?', a: 16, kind: 'dec',
        ex: ['128 bit ÷ 8 bit per byte = 16 bytes.'] }
    ];
    // Genererte varianter
    var n = U.randInt(rng, 2, level === 'lett' ? 4 : 12);
    var gen = [
      { q: 'Hvor mange bit tilsvarer ' + n + ' heks-sifre?', a: n * 4, kind: 'dec',
        ex: ['Hvert heks-siffer = 4 bit.', n + ' · 4 = ' + (n * 4) + ' bit.'] },
      { q: 'Hvor mange heks-sifre trengs for ' + (n * 4) + ' bit?', a: n, kind: 'dec',
        ex: ['Hvert heks-siffer = 4 bit.', (n * 4) + ' ÷ 4 = ' + n + ' heks-sifre.'] }
    ];
    if (level === 'lett') return basic.concat(gen);
    if (level === 'middels') return basic.concat(mid, gen);
    return mid.concat(hard, gen);
  }

  // ---------- generatorer per oppgavetype ----------
  var GEN = {
    hex2dec: function (level, rng, cfg) {
      var value = randHexValue(rng, U.randInt(rng, cfg.hexDigits[0], cfg.hexDigits[1]));
      var hex = U.toHex(value);
      return {
        question: 'Gjør om fra heksadesimalt til desimalt:', subject: '0x' + hex, inputKind: 'dec',
        placeholder: 'Desimaltall', answers: [String(value)], answerDisplay: U.nb(value),
        validate: decValidator(value), explanation: explainHex2Dec(hex, value)
      };
    },
    dec2hex: function (level, rng, cfg) {
      var value = U.randInt(rng, level === 'lett' ? 0 : 16, cfg.decMax);
      if (level === 'vanskelig' && rng() < 0.7) value = U.randInt(rng, 4096, 65535);
      var hex = U.toHex(value);
      return {
        question: 'Gjør om fra desimalt til heksadesimalt:', subject: U.nb(value), inputKind: 'hex',
        placeholder: 'Heks, f.eks. 2F', answers: [hex], answerDisplay: hex,
        validate: hexValidator(value), explanation: explainDec2Hex(value)
      };
    },
    hex2bin: function (level, rng, cfg) {
      var d = U.randInt(rng, cfg.hexDigits[0], cfg.hexDigits[1]);
      var value = randHexValue(rng, d);
      var hex = U.toHex(value);
      var bits = hex.length * 4;
      var bin = U.toBin(value, bits);
      return {
        question: 'Gjør om til binært (4 bit per heks-siffer):', subject: '0x' + hex, inputKind: 'bin',
        placeholder: 'f.eks. 0010 1111', answers: [bin], answerDisplay: U.groupBits(bin),
        validate: binValidator(value), hint: binHint(value, bits), explanation: explainHex2Bin(hex)
      };
    },
    bin2hex: function (level, rng, cfg) {
      var L = U.randInt(rng, cfg.binBits[0], cfg.binBits[1]);
      if (level === 'lett') L = rng() < 0.5 ? 4 : 8;
      var value = U.randInt(rng, Math.pow(2, L - 1), Math.pow(2, L) - 1); // første bit = 1
      var bits = U.toBin(value, L);
      var shown = level === 'vanskelig' ? bits : U.groupBits(bits);
      var hex = U.toHex(value);
      return {
        question: 'Gjør om fra binært til heksadesimalt:', subject: shown, inputKind: 'hex',
        placeholder: 'Heks', answers: [hex], answerDisplay: hex,
        validate: hexValidator(value), explanation: explainBin2Hex(bits, value)
      };
    },
    digit2nibble: function (level, rng) {
      var v = randDigit(rng), d = U.toHex(v), nb = U.toBin(v, 4);
      return {
        question: 'Skriv heks-sifferet som en nibble (4 bit):', subject: d, inputKind: 'bin',
        placeholder: '4 bit, f.eks. 1010', answers: [nb], answerDisplay: nb,
        validate: binValidator(v), hint: binHint(v, 4),
        explanation: { steps: [d + ' = ' + v + ' desimalt.', 'Finn vektene 8-4-2-1 som summerer til ' + v + ': ' + nibbleSum(nb) + '.', 'Sett 1 der vekten brukes og 0 ellers: ' + nb + '.'] }
      };
    },
    nibble2digit: function (level, rng) {
      var v = randDigit(rng), d = U.toHex(v), nb = U.toBin(v, 4);
      return {
        question: 'Hvilket heks-siffer er denne nibblen?', subject: nb, inputKind: 'hex',
        placeholder: 'Ett siffer 0–F', answers: [d], answerDisplay: d,
        validate: hexValidator(v),
        explanation: { steps: ['Vektene er 8-4-2-1: ' + nb + ' = ' + nibbleSum(nb) + ' = ' + v + '.', v >= 10 ? v + ' skrives som ' + d + ' i heks.' : v + ' er under 10, så sifferet er ' + d + '.'] }
      };
    },
    group2bin: function (level, rng, cfg) {
      var grp = pickGroup(rng, cfg), value = parseInt(grp, 16), bin = U.toBin(value, 16);
      return {
        question: 'Skriv IPv6-gruppen i binært med alle 16 bit:', subject: grp, inputKind: 'bin',
        placeholder: '16 bit, f.eks. 1111 1110 1000 0000', answers: [bin], answerDisplay: U.groupBits(bin),
        validate: binValidator(value), hint: binHint(value, 16),
        explanation: explainHex2Bin(grp, 16)
      };
    },
    group2dec: function (level, rng, cfg) {
      var grp = pickGroup(rng, cfg), value = parseInt(grp, 16);
      var ex = explainHex2Dec(grp, value);
      ex.steps.unshift('En IPv6-gruppe er bare et heks-tall på opptil 4 sifre (16 bit).');
      return {
        question: 'Hvilken desimalverdi har IPv6-gruppen?', subject: grp, inputKind: 'dec',
        placeholder: 'Desimaltall', answers: [String(value)], answerDisplay: U.nb(value),
        validate: decValidator(value), explanation: ex
      };
    },
    facts: function (level, rng) {
      var f = U.pick(rng, factTasks(level, rng));
      var disp = f.disp || (f.kind === 'hex' ? U.toHex(f.a, 0, false) : U.nb(f.a));
      return {
        question: f.q, subject: '', inputKind: f.kind,
        placeholder: f.kind === 'hex' ? 'Heks' : 'Tall', answers: [f.kind === 'hex' ? U.toHex(f.a, 0, false) : String(f.a)],
        answerDisplay: disp, validate: f.kind === 'hex' ? hexValidator(f.a) : decValidator(f.a),
        explanation: { steps: f.ex.slice() }
      };
    }
  };

  function generate(opts) {
    opts = opts || {};
    var level = CFG[opts.level] ? opts.level : 'lett';
    var rng = opts.rng || Math.random;
    var cfg = CFG[level];
    var type = opts.type && GEN[opts.type] ? opts.type : U.weightedPick(rng, cfg.weights);
    var t = GEN[type](level, rng, cfg);
    t.module = 'hex';
    t.type = type;
    t.typeLabel = LABEL[type];
    t.level = level;
    t.key = type + '|' + t.question + '|' + t.subject;
    if (!t.hint) t.hint = function () { return null; };
    return t;
  }

  function theoryHtml() {
    var rows = '';
    for (var i = 0; i < 16; i++) {
      rows += '<tr><td><code>' + U.toHex(i) + '</code></td><td>' + i + '</td><td><code>' + U.toBin(i, 4) + '</code></td></tr>';
    }
    function mini(head, body) {
      return '<div class="table-wrap"><table class="mini-table"><thead><tr>' +
        head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
        body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    }
    return '' +
      '<h2>Heksadesimalt tallsystem</h2>' +
      '<p>Heksadesimalt (heks) er <strong>base 16</strong>. I kode skrives heks ofte med <code>0x</code> foran, f.eks. <code>0x2F</code>. ' +
      'Store og små bokstaver betyr det samme.</p>' +

      '<h3>1. Ett heks-siffer = 16 mulige verdier (0–15)</h3>' +
      '<p>Sifrene er <code>0</code>–<code>9</code> som vanlig, og så bokstaver for 10–15: ' +
      '<code>A</code> = 10, <code>B</code> = 11, <code>C</code> = 12, <code>D</code> = 13, <code>E</code> = 14, <code>F</code> = 15.<br>' +
      'Det er 16 ulike sifre, men det største er <strong>15</strong> (vi starter på 0). ' +
      'Ett siffer kan aldri være 16, akkurat som ett desimalsiffer aldri kan være 10.</p>' +

      '<h3>2. Plassverdier</h3>' +
      '<p>Hver plass er verdt 16 ganger mer enn plassen til høyre, altså potenser av 16. ' +
      'Det er samme idé som 1, 10, 100, 1000 i desimal.</p>' +
      mini(['Plass (fra høyre)', 'Heks', 'Desimal (til sammenligning)'], [
        ['1.', '16⁰ = 1', '10⁰ = 1'],
        ['2.', '16¹ = 16', '10¹ = 10'],
        ['3.', '16² = 256', '10² = 100'],
        ['4.', '16³ = 4096', '10³ = 1000']
      ]) +

      '<h3>3. Telle forbi F</h3>' +
      '<p>I desimal kommer 10 etter 9. I heks kommer <code>10</code> etter <code>F</code>. ' +
      'Det betyr <strong>én sekstener og null enere = 16</strong>.</p>' +
      mini(['Desimal', 'Heks'], [
        ['8', '<code>8</code>'], ['9', '<code>9</code>'], ['10', '<code>A</code>'], ['…', '…'],
        ['14', '<code>E</code>'], ['15', '<code>F</code>'], ['16', '<code>10</code>'], ['17', '<code>11</code>']
      ]) +
      '<ul class="examples">' +
      '<li><code>0x10</code> = 1·16 + 0·1 = <strong>16</strong></li>' +
      '<li><code>0x2F</code> = 2·16 + 15·1 = 32 + 15 = <strong>47</strong></li>' +
      '<li><code>0xFF</code> = 15·16 + 15·1 = 240 + 15 = <strong>255</strong></li>' +
      '<li><code>0x100</code> = 1·256 + 0·16 + 0·1 = <strong>256</strong></li>' +
      '</ul>' +

      '<div class="callout"><strong>Vanlig feil:</strong> 16 er <em>ikke</em> <code>0x8</code> (eller «2·8»). ' +
      'Plassverdiene er 1, 16, 256 … og ikke ganger 8. <code>0x8</code> er bare 8, og 16 skrives <code>0x10</code>.</div>' +

      '<h3>4. Desimal → heks</h3>' +
      '<p>Del på 16 og skriv opp resten. Gjenta med svaret til du får 0, og les restene <strong>nedenfra og opp</strong>.</p>' +
      mini(['Tall', '÷ 16', 'Rest'], [['16', '1', '0'], ['1', '0', '1']]) +
      '<p>Les nedenfra og opp: <strong>10</strong>. Altså 16 = <code>0x10</code>.</p>' +
      mini(['Tall', '÷ 16', 'Rest'], [['200', '12', '8'], ['12', '0', '12 = C']]) +
      '<p>Les nedenfra og opp: <strong>C8</strong>. Kontroll: 12·16 + 8 = 192 + 8 = 200.</p>' +

      '<h3>5. Hvor langt rekker sifrene?</h3>' +
      '<ul>' +
      '<li>1 siffer: <code>0</code>–<code>F</code> = 0–15 (4 bit)</li>' +
      '<li>2 sifre: <code>00</code>–<code>FF</code> = 0–255, altså én byte (8 bit)</li>' +
      '<li>4 sifre, én IPv6-gruppe: <code>0000</code>–<code>FFFF</code> = 0–65 535 (16 bit)</li>' +
      '</ul>' +

      '<h3>Hvorfor er ett heks-siffer nøyaktig 4 bit?</h3>' +
      '<p>Med 4 bit får du 2⁴ = 16 kombinasjoner (0000–1111), akkurat like mange som det finnes heks-sifre. ' +
      'Derfor kan du gjøre om mellom heks og binært ett siffer om gangen. ' +
      'En gruppe på 4 bit kalles en <strong>nibble</strong>, og vektene i den er <strong>8-4-2-1</strong>.</p>' +
      '<div class="table-wrap"><table class="theory-table"><thead><tr><th>Heks</th><th>Desimal</th><th>Binær</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +

      '<h3>Heks ↔ binær</h3>' +
      '<p>Bytt hvert heks-siffer med sin nibble: <code>db8</code> → <code>1101 1011 1000</code>. ' +
      'Fra binært: del i grupper på 4 fra høyre, fyll på med nuller foran, og les av hver gruppe.</p>' +

      '<h3>Koblingen til IPv6</h3>' +
      '<ul>' +
      '<li>En IPv6-adresse er <strong>128 bit</strong>.</li>' +
      '<li>128 bit ÷ 4 = <strong>32 heks-sifre</strong>.</li>' +
      '<li>Sifrene deles i <strong>8 grupper</strong> à 4 sifre (16 bit), adskilt med kolon.</li>' +
      '<li>Største verdi i en gruppe er <code>ffff</code> = 65 535.</li>' +
      '</ul>' +
      '<p>Eksempel: <code>2001:0db8:0000:0000:0000:0000:0000:0001</code>. Hvordan dette kan forkortes, kommer i modul 2.1.</p>';
  }

  IPV6T.registry.register({
    id: 'hex', code: '1', title: 'Heksadesimalt tallsystem', status: 'active',
    description: 'Heks, desimal og binært, nibbles og 16-bits IPv6-grupper.',
    levels: ['lett', 'middels', 'vanskelig'],
    taskTypes: TYPES,
    generate: generate,
    theoryHtml: theoryHtml,
    _internal: { CFG: CFG, GEN: GEN }
  });
})(typeof window !== 'undefined' ? window : globalThis);
