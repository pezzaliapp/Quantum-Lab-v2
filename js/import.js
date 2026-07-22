/* import.js — file import (TXT / CSV / JSON) and human-readable format status.
   Reading is local only (FileReader); nothing is uploaded anywhere. */
(function (QL) {
  'use strict';

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('no file')); return; }
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('read error')); };
      reader.readAsText(file);
    });
  }

  /* Describe the current text for the password import status line.
     Returns { key, vars, ok, isRaw } where ok means usable as a password. */
  function describeForPassword(text) {
    if (!text || !text.trim()) return { key: 'fmtWaiting', ok: false, isRaw: false };
    var c = QL.parser.classify(text);
    if (c.kind === 'raw') {
      return { key: 'rawCount', vars: { n: c.count }, ok: true, isRaw: true, prefix: 'fmtRaw' };
    }
    if (c.kind === 'hist') {
      // Aggregated stats — analyzable as QRNG but NOT valid for a password.
      return { key: 'histAggregateWarn', ok: false, isRaw: false, prefix: histPrefix(c.n), warn: true };
    }
    return { key: 'fmtUnknown', ok: false, isRaw: false, warn: true };
  }

  function histPrefix(n) {
    if (n === 2) return 'fmtHist2';
    if (n === 3) return 'fmtHist3';
    return 'fmtHistN';
  }

  QL.import = {
    readFile: readFile,
    describeForPassword: describeForPassword,
    histPrefix: histPrefix
  };
})(window.QL = window.QL || {});
