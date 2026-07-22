/* analyses.js — Bell/CHSH, GHZ, Mermin and QRNG.
   Computation is language-independent and returns plain numbers; rendering is
   split out so a language switch re-renders results without recomputing.
   Wording stays deliberately prudent (no automatic "certified" claims). */
(function (QL) {
  'use strict';

  var t = function () { return QL.i18n.t.apply(null, arguments); };
  var parseHist = function (x) { return QL.parser.parseHist(x); };

  // ---- shared render helpers -------------------------------------------
  function fmt(x, d) { return Number(x).toFixed(d == null ? 3 : d); }
  function pg(rows, bits) {
    for (var i = 0; i < rows.length; i++) if (rows[i].bits === bits) return rows[i].p;
    return 0;
  }
  function stat(label, value) {
    return '<div class="stat"><small>' + label + '</small><strong>' + value + '</strong></div>';
  }
  function msg(kind, text) { return '<div class="message ' + kind + '" role="status">' + text + '</div>'; }
  function err(text) { return msg('bad', text); }

  // ---- Bell · CHSH ------------------------------------------------------
  function computeBell(texts) {
    var hists = texts.map(parseHist);
    if (hists.some(function (h) { return !h; })) return { error: 'invalidData' };
    if (hists.some(function (h) { return h.n !== 2; })) return { error: 'not2bit' };
    // E = P(00) + P(11) - P(01) - P(10) for each basis setting.
    var E = hists.map(function (h) {
      return pg(h.rows, '00') + pg(h.rows, '11') - pg(h.rows, '01') - pg(h.rows, '10');
    });
    // All four sign conventions of the CHSH combination; S = max |combination|.
    var combos = [
      E[0] + E[1] + E[2] - E[3],
      E[0] + E[1] - E[2] + E[3],
      E[0] - E[1] + E[2] + E[3],
      -E[0] + E[1] + E[2] + E[3]
    ];
    var S = Math.max.apply(null, combos.map(Math.abs));
    return { S: S, E: E, violation: S > 2 };
  }
  function renderBell(r) {
    if (r.error) return err(t(r.error));
    var stats = stat('S', fmt(r.S)) +
      r.E.map(function (v, i) { return stat('E' + (i + 1), fmt(v)); }).join('');
    return '<h3 class="result-title">' + t('bellResultTitle') + '</h3>' +
      '<div class="statgrid">' + stats + '</div>' +
      '<p class="bound">' + t('bellSExplain') + '</p>' +
      msg(r.violation ? 'good' : 'warn', r.violation ? t('bellViolation') : t('bellClassical'));
  }

  // ---- GHZ (ZZZ population) --------------------------------------------
  function computeGhz(text) {
    var h = parseHist(text);
    if (!h) return { error: 'invalidData' };
    if (h.n !== 3) return { error: 'not3bit' };
    var p000 = pg(h.rows, '000');
    var p111 = pg(h.rows, '111');
    var pop = p000 + p111;
    return { p000: p000, p111: p111, pop: pop, leak: 1 - pop, strong: pop > 0.8 };
  }
  function renderGhz(r) {
    if (r.error) return err(t(r.error));
    var stats = stat('P(000)', fmt(r.p000)) + stat('P(111)', fmt(r.p111)) +
      stat(t('ghzPopLabel'), fmt(r.pop)) + stat(t('ghzLeakLabel'), fmt(r.leak));
    return '<h3 class="result-title">' + t('ghzResultTitle') + '</h3>' +
      '<div class="statgrid">' + stats + '</div>' +
      msg(r.strong ? 'good' : 'warn', r.strong ? t('ghzStrong') : t('ghzWeak'));
  }

  // ---- Mermin -----------------------------------------------------------
  function parity(rows) {
    return rows.reduce(function (s, r) {
      var ones = (r.bits.match(/1/g) || []).length;
      return s + ((ones % 2) ? -r.p : r.p);
    }, 0);
  }
  function computeMermin(texts) {
    // Empty fields → guidance, not a technical error (handled by caller).
    var hists = texts.map(parseHist);
    if (hists.some(function (h) { return !h; })) return { error: 'needFourHists' };
    if (hists.some(function (h) { return h.n !== 3; })) return { error: 'not3bit' };
    var v = hists.map(function (h) { return parity(h.rows); });
    // Mermin operator M = <XXX> - <XYY> - <YXY> - <YYX>.
    var M = Math.abs(v[0] - v[1] - v[2] - v[3]);
    return { M: M, v: v, violation: M > 2 };
  }
  function renderMermin(r) {
    if (r.error) return err(t(r.error));
    var labels = ['XXX', 'XYY', 'YXY', 'YYX'];
    var stats = stat('M', fmt(r.M)) +
      r.v.map(function (x, i) { return stat('⟨' + labels[i] + '⟩', fmt(x)); }).join('');
    return '<h3 class="result-title">' + t('merminResultTitle') + '</h3>' +
      '<div class="statgrid">' + stats + '</div>' +
      '<p class="bound">' + t('merminExplain') + '</p>' +
      msg(r.violation ? 'good' : 'warn', r.violation ? t('merminViolation') : t('merminClassical'));
  }

  // ---- QRNG -------------------------------------------------------------
  function computeQrng(text) {
    var h = parseHist(text);
    if (!h) return { error: 'invalidData' };
    var H = 0, pmax = 0;
    var ones = new Array(h.n).fill(0);
    h.rows.forEach(function (r) {
      if (r.p > 0) H -= r.p * Math.log2(r.p);
      if (r.p > pmax) pmax = r.p;
      for (var i = 0; i < r.bits.length; i++) if (r.bits[i] === '1') ones[i] += r.p;
    });
    var bias = Math.max.apply(null, ones.map(function (x) { return Math.abs(x - 0.5); }));
    var minH = -Math.log2(pmax);
    // Descriptive pass: near-uniform per-bit balance and high entropy.
    var pass = bias < 0.05 && H > h.n - 0.5;
    return { n: h.n, distinct: h.distinct, space: Math.pow(2, h.n), H: H, minH: minH, bias: bias, pass: pass };
  }
  function renderQrng(r) {
    if (r.error) return err(t(r.error));
    var unit = t('qrngUnit');
    var stats =
      stat(t('qrngOutcomes'), r.distinct + '/' + r.space) +
      stat(t('qrngShannon'), fmt(r.H, 2) + ' ' + unit) +
      stat(t('qrngMinH'), fmt(r.minH, 2) + ' ' + unit) +
      stat(t('qrngBias'), fmt(r.bias, 3));
    return '<h3 class="result-title">' + t('qrngResultTitle') + '</h3>' +
      '<div class="statgrid">' + stats + '</div>' +
      msg(r.pass ? 'good' : 'warn', r.pass ? t('qrngPass') : t('qrngWeak'));
  }

  QL.analyses = {
    computeBell: computeBell, renderBell: renderBell,
    computeGhz: computeGhz, renderGhz: renderGhz,
    computeMermin: computeMermin, renderMermin: renderMermin,
    computeQrng: computeQrng, renderQrng: renderQrng
  };
})(window.QL = window.QL || {});
