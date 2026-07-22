/* i18n.js — centralized bilingual system (IT/EN).
   Locale strings live in /locales/it.json and /locales/en.json and are
   fetched at startup. No text is hard-coded in the other modules. */
(function (QL) {
  'use strict';

  var SUPPORTED = ['it', 'en'];
  var STORE_KEY = 'ql-lang';
  var dict = { it: {}, en: {} };
  var listeners = [];

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    // First launch: Italian only when the browser language starts with "it",
    // English in every other case.
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.indexOf('it') === 0 ? 'it' : 'en';
  }

  var lang = detect();

  function persist() {
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
  }

  // Fetch both locale files. Kept side by side so switching never refetches.
  function load() {
    return Promise.all(SUPPORTED.map(function (code) {
      return fetch('locales/' + code + '.json', { cache: 'no-cache' })
        .then(function (r) {
          if (!r.ok) throw new Error('locale ' + code + ' HTTP ' + r.status);
          return r.json();
        })
        .then(function (json) { dict[code] = json; });
    }));
  }

  // Translate a key, interpolating {name} placeholders from vars.
  function t(key, vars) {
    var table = dict[lang] || {};
    var s = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, name) {
        return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : m;
      });
    }
    return s;
  }

  // Apply translations to all tagged static DOM nodes.
  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      var active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  // Notify dynamic renderers (results already on screen) so they re-render.
  function notify() {
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) {} });
  }

  function apply() { applyStatic(); notify(); }

  function setLang(next) {
    if (SUPPORTED.indexOf(next) === -1 || next === lang) return;
    lang = next;
    persist();
    apply(); // no page reload
  }

  QL.i18n = {
    load: load,
    t: t,
    apply: apply,
    setLang: setLang,
    getLang: function () { return lang; },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})(window.QL = window.QL || {});
