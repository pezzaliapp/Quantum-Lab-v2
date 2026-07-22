/* password.js — password generation.
   Quantum path: consumes raw shot-by-shot bits with rejection sampling (no
   modulo bias) and never silently reuses bits. Device path: crypto CSPRNG,
   explicitly NOT presented as quantum. Nothing is stored automatically. */
(function (QL) {
  'use strict';

  var CHARSETS = {
    alnum: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ascii: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-.:?@_',
    ld: 'abcdefghijklmnopqrstuvwxyz0123456789'
  };

  function clampLen(len) {
    len = parseInt(len, 10);
    if (!Number.isFinite(len)) len = 16;
    return Math.max(8, Math.min(64, len));
  }

  // Rejection sampling: draw w-bit words, discard words >= alphabet size so
  // every character is uniform. Advance the cursor only — bits are used once.
  function fromBits(bits, chars, len) {
    var w = Math.ceil(Math.log2(chars.length));
    var out = '', i = 0;
    while (out.length < len) {
      if (i + w > bits.length) return null; // not enough entropy left
      var v = parseInt(bits.slice(i, i + w), 2);
      i += w;
      if (v < chars.length) out += chars[v]; // reject out-of-range words
    }
    return out;
  }

  // Theoretical entropy estimate = length * log2(alphabet size), in bits.
  function entropyBits(len, charsetKey) {
    return Math.round(len * Math.log2(CHARSETS[charsetKey].length));
  }

  /* Generate from raw quantum measurements.
     Returns { ok, password, entropy } or { error, vars }. */
  function generateQuantum(loose, charsetKey, rawLen) {
    var bits = (loose || []).join('');
    if (!bits) return { error: 'needRaw' };

    var ones = (bits.match(/1/g) || []).length;
    var frac = ones / bits.length;
    // Reject manifestly unbalanced sources (global 0/1 distribution check).
    if (frac < 0.35 || frac > 0.65) {
      return { error: 'unbalanced', vars: { frac: frac.toFixed(2) } };
    }

    var len = clampLen(rawLen);
    var chars = CHARSETS[charsetKey] || CHARSETS.alnum;
    var pw = fromBits(bits, chars, len);
    if (!pw) return { error: 'notEnough', vars: { n: bits.length } };

    return {
      ok: true, password: pw, length: len,
      source: 'quantum', entropy: entropyBits(len, charsetKey), bitsUsed: bits.length
    };
  }

  /* Generate with the device CSPRNG. Not a quantum source. */
  function generateDevice(charsetKey, rawLen) {
    var len = clampLen(rawLen);
    var chars = CHARSETS[charsetKey] || CHARSETS.alnum;
    var bytes = new Uint8Array(len * 12);
    crypto.getRandomValues(bytes);
    var bits = [];
    for (var i = 0; i < bytes.length; i++) bits.push(bytes[i].toString(2).padStart(8, '0'));
    var pw = fromBits(bits.join(''), chars, len);
    return {
      ok: true, password: pw, length: len,
      source: 'device', entropy: entropyBits(len, charsetKey)
    };
  }

  QL.password = {
    CHARSETS: CHARSETS,
    clampLen: clampLen,
    generateQuantum: generateQuantum,
    generateDevice: generateDevice,
    entropyBits: entropyBits
  };
})(window.QL = window.QL || {});
