/* router.js — hash-based navigation (#password, #experiments, #analyze, #learn).
   Restores the section on reload, supports the browser Back button, and moves
   focus to the active section heading for keyboard and screen-reader users. */
(function (QL) {
  'use strict';

  var ROUTES = ['home', 'password', 'experiments', 'analyze', 'learn'];
  var DEFAULT = 'home';
  var current = null;
  var afterRoute = null;

  function routeFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return ROUTES.indexOf(h) !== -1 ? h : DEFAULT;
  }

  function show(route, focus) {
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.remove('active');
    });
    var el = document.getElementById('view-' + route);
    if (!el) { route = DEFAULT; el = document.getElementById('view-' + DEFAULT); }
    el.classList.add('active');
    current = route;

    // Scroll to top (respecting reduced-motion via CSS scroll-behavior).
    window.scrollTo(0, 0);

    if (focus) {
      var heading = el.querySelector('h1');
      var target = heading || el;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    if (typeof afterRoute === 'function') afterRoute(route);
  }

  function go(route) {
    if (ROUTES.indexOf(route) === -1) route = DEFAULT;
    if (route === DEFAULT) {
      // Keep the URL clean on home.
      if (location.hash) { location.hash = ''; }
      else { show(DEFAULT, true); }
    } else if (('#' + route) === location.hash) {
      show(route, true); // same hash: no hashchange event, show directly
    } else {
      location.hash = '#' + route; // triggers hashchange
    }
  }

  function init(cb) {
    afterRoute = cb;
    window.addEventListener('hashchange', function () { show(routeFromHash(), true); });
    show(routeFromHash(), false); // initial render without stealing focus
  }

  QL.router = { init: init, go: go, current: function () { return current; }, routes: ROUTES };
})(window.QL = window.QL || {});
