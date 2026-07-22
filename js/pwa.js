/* pwa.js — service worker registration, install button and update prompt.
   Uses a relative SW path so it works from any sub-folder. When a new version
   is waiting it shows a small, dismissible banner with an Update button. */
(function (QL) {
  'use strict';

  var t = function (k) { return QL.i18n.t(k); };

  function showUpdateBanner(worker) {
    if (document.getElementById('ql-update')) return;
    var bar = document.createElement('div');
    bar.id = 'ql-update';
    bar.className = 'update-bar';
    bar.setAttribute('role', 'status');

    var span = document.createElement('span');
    span.textContent = t('updateReady');

    var btn = document.createElement('button');
    btn.className = 'btn small';
    btn.textContent = t('updateNow');
    btn.onclick = function () {
      worker.postMessage({ type: 'SKIP_WAITING' });
    };

    bar.appendChild(span);
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  function initInstall() {
    var installBtn = document.getElementById('installBtn');
    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) {
      installBtn.addEventListener('click', function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.finally(function () {
          deferred = null;
          installBtn.hidden = true;
        });
      });
    }
    window.addEventListener('appinstalled', function () {
      if (installBtn) installBtn.hidden = true;
    });
  }

  function initSW() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('sw.js').then(function (reg) {
      // A worker already waiting (e.g. loaded before this tab).
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(reg.waiting);
      }
      reg.addEventListener('updatefound', function () {
        var incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener('statechange', function () {
          if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(incoming); // update available, not first install
          }
        });
      });
    }).catch(function () { /* offline / unsupported: silent */ });

    // Reload once the new worker takes control.
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  QL.pwa = {
    init: function () { initInstall(); initSW(); }
  };
})(window.QL = window.QL || {});
