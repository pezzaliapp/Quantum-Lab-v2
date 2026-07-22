/* parser.js — tolerant parsing of measurement data.
   Preserves the proven v2.0 engine: JSON objects, loose bit strings, and
   "label value" / "value label" pairs, with comma or dot decimals. */
(function (QL) {
  'use strict';

  // Split input into raw bit strings (loose) and {bits, val} pairs.
  function tokenize(text) {
    text = (text || '').trim();
    if (!text) return { pairs: [], loose: [] };

    // JSON object: { "00": 12, "11": 0.4, ... }
    if (text[0] === '{') {
      try {
        var o = JSON.parse(text);
        var jp = [];
        for (var k in o) {
          if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
          var b = String(k).replace(/[^01]/g, '');
          var v = Number(o[k]);
          if (b && Number.isFinite(v)) jp.push({ bits: b, val: v });
        }
        if (jp.length) return { pairs: jp, loose: [] };
      } catch (e) { /* fall through to line parsing */ }
    }

    var lines = text.split(/\r?\n/);
    var pairs = [];
    var loose = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      // A bare bit string (shot-by-shot raw measurement).
      if (/^[01]+$/.test(line)) { loose.push(line); continue; }
      // CSV / whitespace "label , value" or "value , label".
      var m = line.match(/([01]+)[^0-9.\-]*(-?\d+(?:[.,]\d+)?)/) ||
              line.match(/(-?\d+(?:[.,]\d+)?)[^01]*([01]+)/);
      if (m) {
        var firstIsBits = /^[01]+$/.test(m[1]);
        var bits = firstIsBits ? m[1] : m[2];
        var valStr = (firstIsBits ? m[2] : m[1]).replace(',', '.');
        var val = Number(valStr);
        if (Number.isFinite(val)) pairs.push({ bits: bits, val: val });
      }
    }
    return { pairs: pairs, loose: loose };
  }

  // Build a normalized histogram from any parseable text.
  function parseHist(text) {
    var tk = tokenize(text);
    var pairs = tk.pairs;
    // Raw bit strings can also be aggregated into a histogram (frequencies).
    if (!pairs.length && tk.loose.length) {
      pairs = tk.loose.map(function (b) { return { bits: b, val: 1 }; });
    }
    if (!pairs.length) return null;

    var map = {};
    var n = 0;
    pairs.forEach(function (p) {
      map[p.bits] = (map[p.bits] || 0) + p.val;
      if (p.bits.length > n) n = p.bits.length;
    });
    var sum = 0;
    Object.keys(map).forEach(function (k) { sum += map[k]; });
    if (!(sum > 0)) return null;

    var rows = Object.keys(map).map(function (bits) {
      return { bits: bits.padStart(n, '0'), p: map[bits] / sum };
    });
    return { n: n, rows: rows, distinct: rows.length };
  }

  /* Classify pasted/imported data for the Analyze view.
     kind: 'raw' | 'hist' | 'unknown'; for hist we also report bit width. */
  function classify(text) {
    var tk = tokenize(text);
    if (tk.loose.length && !tk.pairs.length) {
      // Pure list of bit strings → raw shot-by-shot measurements.
      return { kind: 'raw', count: tk.loose.length, loose: tk.loose };
    }
    var h = parseHist(text);
    if (h) return { kind: 'hist', n: h.n, hist: h };
    return { kind: 'unknown' };
  }

  QL.parser = { tokenize: tokenize, parseHist: parseHist, classify: classify };
})(window.QL = window.QL || {});
