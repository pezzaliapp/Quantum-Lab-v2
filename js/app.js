/* app.js — wiring layer. Connects the DOM to the modules, manages the
   password/experiment/analyze flows, and re-renders dynamic results when the
   language changes (no page reload). */
(function (QL) {
  'use strict';

  var i18n = QL.i18n, parser = QL.parser, analyses = QL.analyses,
      pw = QL.password, imp = QL.import, router = QL.router;
  var t = function () { return i18n.t.apply(null, arguments); };
  var $ = function (id) { return document.getElementById(id); };

  // Language-independent state so a language switch re-renders in place.
  var state = { bell: null, ghz: null, mermin: null, qrng: null, pwResult: null, detect: null, exp: 'bell' };

  // ---- small utilities --------------------------------------------------
  var toastEl, toastTimer;
  function toast(text) {
    if (!toastEl) toastEl = $('toast');
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); resolve();
      } catch (e) { reject(e); }
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- navigation -------------------------------------------------------
  function wireNav() {
    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { router.go(b.getAttribute('data-go')); });
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { i18n.setLang(b.getAttribute('data-lang')); });
    });
  }

  // ---- experiments tabs -------------------------------------------------
  var EXP = ['bell', 'ghz', 'mermin', 'qrng'];
  function selectExp(name) {
    if (EXP.indexOf(name) === -1) name = 'bell';
    state.exp = name;
    document.querySelectorAll('[data-exp-card]').forEach(function (card) {
      card.classList.toggle('active', card.getAttribute('data-exp-card') === name);
    });
    document.querySelectorAll('[data-exp]').forEach(function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-exp') === name ? 'true' : 'false');
    });
    EXP.forEach(function (n) {
      var panel = $('exp-' + n);
      var on = n === name;
      panel.classList.toggle('active', on);
      panel.hidden = !on;
    });
  }
  function wireExperiments() {
    document.querySelectorAll('[data-exp]').forEach(function (b) {
      b.addEventListener('click', function () {
        selectExp(b.getAttribute('data-exp'));
        $('exp-' + state.exp).scrollIntoView({ block: 'start' });
        var h = $('exp-' + state.exp).querySelector('.panel-title');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      });
    });
  }

  // ---- circuit copy / download -----------------------------------------
  function wireCircuit() {
    var circuit = $('circuit').textContent;
    $('copyCircuit').addEventListener('click', function () {
      copyText(circuit).then(function () { toast(t('copied')); })
        .catch(function () { toast(t('copyFailed')); });
    });
    $('downloadCircuit').addEventListener('click', function () {
      var blob = new Blob([circuit], { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'quantum-lab-qrng.cq';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast(t('downloaded'));
    });
  }

  // ---- password flow ----------------------------------------------------
  function updateImportStatus() {
    var el = $('pwImportStatus');
    var d = imp.describeForPassword($('pwBits').value);
    var text = t(d.key, d.vars);
    if (d.prefix) text = t(d.prefix) + ' — ' + text;
    el.textContent = text;
    el.className = 'status' + (d.warn ? ' warn' : (d.ok ? ' good' : ''));
  }

  function renderPwResult() {
    var out = $('pwOut');
    var r = state.pwResult;
    if (!r) { out.innerHTML = ''; return; }
    if (r.error) {
      out.innerHTML = '<div class="message bad" role="status">' + t(r.error, r.vars) + '</div>';
      return;
    }
    var sourceText = r.source === 'quantum' ? t('sourceQuantum') : t('sourceDevice');
    out.innerHTML =
      '<div class="pw-card">' +
        '<div class="pw-code" id="pwCode">' + escapeHtml(r.password) + '</div>' +
        '<dl class="pw-meta">' +
          '<div><dt>' + t('sourceQuantumLabel') + '</dt><dd>' + sourceText + '</dd></div>' +
          '<div><dt>' + t('pwLengthLabel') + '</dt><dd>' + r.length + '</dd></div>' +
          '<div><dt>' + t('pwEntropyLabel') + '</dt><dd>' + t('pwEntropyValue', { bits: r.entropy }) + '</dd></div>' +
        '</dl>' +
        '<div class="row">' +
          '<button class="btn small" id="pwCopy">' + t('pwCopy') + '</button>' +
          '<button class="ghost small" id="pwClear">' + t('pwClear') + '</button>' +
        '</div>' +
        '<p class="status subtle">' + t('pwNotStored') + '</p>' +
      '</div>';
    $('pwCopy').addEventListener('click', function () {
      copyText(r.password).then(function () { $('pwCopy').textContent = t('pwCopied'); })
        .catch(function () { toast(t('copyFailed')); });
    });
    $('pwClear').addEventListener('click', function () {
      state.pwResult = null; renderPwResult(); toast(t('pwCleared'));
    });
  }

  function wirePassword() {
    $('pwBits').addEventListener('input', updateImportStatus);
    $('pwFile').addEventListener('change', function () {
      var f = $('pwFile').files[0];
      if (!f) return;
      imp.readFile(f).then(function (text) {
        $('pwBits').value = text; updateImportStatus(); toast(t('fileLoaded'));
      }).catch(function () { toast(t('fileError')); });
    });
    $('genQuantum').addEventListener('click', function () {
      var c = parser.classify($('pwBits').value);
      if (c.kind === 'hist') { state.pwResult = { error: 'histAggregateWarn' }; renderPwResult(); return; }
      if (c.kind !== 'raw') { state.pwResult = { error: 'needRaw' }; renderPwResult(); return; }
      state.pwResult = pw.generateQuantum(c.loose, $('pwCharset').value, $('pwLen').value);
      renderPwResult();
    });
    $('genSecure').addEventListener('click', function () {
      state.pwResult = pw.generateDevice($('pwCharset').value, $('pwLen').value);
      renderPwResult();
    });
  }

  // ---- experiment analyses ---------------------------------------------
  function wireAnalyses() {
    $('runBell').addEventListener('click', function () {
      state.bell = analyses.computeBell(['b00', 'b01', 'b10', 'b11'].map(function (id) { return $(id).value; }));
      $('bellOut').innerHTML = analyses.renderBell(state.bell);
    });
    $('runGhz').addEventListener('click', function () {
      state.ghz = analyses.computeGhz($('ghzZ').value);
      $('ghzOut').innerHTML = analyses.renderGhz(state.ghz);
    });
    $('runMermin').addEventListener('click', function () {
      var ids = ['mXXX', 'mXYY', 'mYXY', 'mYYX'];
      // Empty fields → friendly guidance, never a technical error.
      if (ids.some(function (id) { return !$(id).value.trim(); })) {
        state.mermin = { error: 'merminHint' };
        $('merminOut').innerHTML = '<div class="message warn" role="status">' + t('merminHint') + '</div>';
        return;
      }
      state.mermin = analyses.computeMermin(ids.map(function (id) { return $(id).value; }));
      $('merminOut').innerHTML = analyses.renderMermin(state.mermin);
    });
    $('runRng').addEventListener('click', function () {
      state.qrng = analyses.computeQrng($('rngH').value);
      $('rngOut').innerHTML = analyses.renderQrng(state.qrng);
    });
  }

  // ---- analyze / detect -------------------------------------------------
  function destButton(key, id) {
    return '<button class="ghost small dest" data-dest="' + id + '">' + t(key) + '</button>';
  }
  function renderDetect() {
    var out = $('detectOut');
    var d = state.detect;
    if (!d) { out.innerHTML = ''; return; }
    var text = d.text;
    var c = d.classification;
    if (c.kind === 'unknown') {
      out.innerHTML = '<div class="message bad" role="status">' + t('fmtUnknown') + '</div>';
      return;
    }

    var titleKey, headKey, buttons = '';
    if (c.kind === 'raw') {
      headKey = 'fmtRaw'; titleKey = 'detectRawTitle';
      var sub = '<p class="status">' + t('rawCount', { n: c.count }) + '</p>';
      buttons = destButton('toPassword', 'password') + destButton('toFreq', 'qrng');
      out.innerHTML = detectShell(headKey, titleKey, text, sub, buttons);
    } else {
      // histogram
      var n = c.n;
      headKey = imp.histPrefix(n);
      if (n === 2) { titleKey = 'detectHist2Title'; buttons = destButton('toQRNG', 'qrng') + destButton('toBell', 'bell'); }
      else if (n === 3) { titleKey = 'detectHist3Title'; buttons = destButton('toGHZ', 'ghz') + destButton('toMermin', 'mermin') + destButton('toQRNG', 'qrng'); }
      else { titleKey = null; buttons = destButton('toQRNG', 'qrng'); }
      var head = n === 2 ? t('fmtHist2') : n === 3 ? t('fmtHist3') : t('fmtHistN', { n: n });
      var title = titleKey ? t(titleKey) : t('detectHistNTitle', { n: n });
      var sub = '<p class="status">' + t('histCount', { n: c.hist.distinct }) + '</p>';
      out.innerHTML = detectShellRaw(head, title, text, sub, buttons);
    }
    wireDestinations(c);
  }
  function detectShell(headKey, titleKey, text, sub, buttons) {
    return detectShellRaw(t(headKey), t(titleKey), text, sub, buttons);
  }
  function detectShellRaw(head, title, text, sub, buttons) {
    var preview = escapeHtml(text.split(/\r?\n/).slice(0, 8).join('\n'));
    return '<div class="detect-card">' +
      '<div class="message good" role="status"><strong>' + head + '</strong> · ' + title + '</div>' +
      sub +
      '<p class="field-label">' + t('previewLabel') + '</p><pre class="preview">' + preview + '</pre>' +
      '<p class="field-label">' + t('chooseDestination') + '</p>' +
      '<div class="row wrap">' + buttons + '</div>' +
      '<div id="destExtra"></div>' +
      '</div>';
  }
  function wireDestinations(c) {
    document.querySelectorAll('#detectOut .dest').forEach(function (b) {
      b.addEventListener('click', function () { handleDestination(b.getAttribute('data-dest'), c); });
    });
  }
  function handleDestination(dest, c) {
    var text = state.detect.text;
    if (dest === 'password') {
      $('pwBits').value = (c.loose || []).join('\n');
      router.go('password'); updateImportStatus();
      return;
    }
    if (dest === 'qrng') {
      $('rngH').value = text; goExp('qrng'); $('runRng').click(); return;
    }
    if (dest === 'ghz') {
      $('ghzZ').value = text; goExp('ghz'); $('runGhz').click(); return;
    }
    if (dest === 'bell') { pickSlot('bell'); return; }
    if (dest === 'mermin') { pickSlot('mermin'); return; }
  }
  function pickSlot(kind) {
    var slots = kind === 'bell'
      ? [['b00', '00'], ['b01', '01'], ['b10', '10'], ['b11', '11']]
      : [['mXXX', 'XXX'], ['mXYY', 'XYY'], ['mYXY', 'YXY'], ['mYYX', 'YYX']];
    var html = '<p class="field-label">' + t('bellSlotPrompt') + '</p><div class="row wrap">';
    slots.forEach(function (s) { html += '<button class="ghost small slot" data-slot="' + s[0] + '">' + s[1] + '</button>'; });
    html += '</div>';
    $('destExtra').innerHTML = html;
    document.querySelectorAll('#destExtra .slot').forEach(function (b) {
      b.addEventListener('click', function () {
        $(b.getAttribute('data-slot')).value = state.detect.text;
        goExp(kind);
      });
    });
  }
  function goExp(name) {
    router.go('experiments');
    selectExp(name);
    setTimeout(function () { $('exp-' + name).scrollIntoView({ block: 'start' }); }, 60);
  }
  function wireDetect() {
    $('anFile').addEventListener('change', function () {
      var f = $('anFile').files[0];
      if (!f) return;
      imp.readFile(f).then(function (text) {
        $('anText').value = text; toast(t('fileLoaded'));
      }).catch(function () { toast(t('fileError')); });
    });
    $('detectData').addEventListener('click', function () {
      var text = $('anText').value;
      state.detect = { text: text, classification: parser.classify(text) };
      renderDetect();
    });
  }

  // ---- re-render everything on language change --------------------------
  function rerenderDynamic() {
    if (state.bell) $('bellOut').innerHTML = analyses.renderBell(state.bell);
    if (state.ghz) $('ghzOut').innerHTML = analyses.renderGhz(state.ghz);
    if (state.mermin) {
      $('merminOut').innerHTML = state.mermin.error === 'merminHint'
        ? '<div class="message warn" role="status">' + t('merminHint') + '</div>'
        : analyses.renderMermin(state.mermin);
    }
    if (state.qrng) $('rngOut').innerHTML = analyses.renderQrng(state.qrng);
    renderPwResult();
    renderDetect();
    updateImportStatus();
  }

  // ---- boot -------------------------------------------------------------
  function boot() {
    wireNav();
    wireExperiments();
    wireCircuit();
    wirePassword();
    wireAnalyses();
    wireDetect();
    selectExp('bell');
    i18n.onChange(rerenderDynamic);
    router.init(function (route) {
      if (route === 'experiments') selectExp(state.exp);
    });
    QL.pwa.init();
    updateImportStatus();
  }

  i18n.load().then(function () {
    i18n.apply();
    boot();
  }).catch(function (err) {
    // Locales must be served over HTTP (open with a local server, not file://).
    document.body.insertAdjacentHTML('afterbegin',
      '<p style="padding:16px;color:#ffc1d6;font-family:monospace">Could not load locale files. Serve the app over HTTP (e.g. python3 -m http.server). ' + escapeHtml(String(err && err.message || err)) + '</p>');
  });
})(window.QL = window.QL || {});
