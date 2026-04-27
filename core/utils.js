/* ============================================================
   Pathways Core — Utilities
   ============================================================
   Kleine Hilfsfunktionen, die alle Apps brauchen.
   Reines JavaScript — keine DOM-Bezüge.

   API:
     generateId()                    → "1r8jkl3x0h4"
     formatDate(iso, opts?)          → "16.04.2026"
     formatTime(iso)                 → "14:30"
     escapeHtml(str)                 → "&lt;b&gt;…"
     debounce(fn, ms)                → debounced fn
     deepClone(obj)                  → deep copy
     daysBetween(a, b)               → number
     truncate(str, n)                → "Hello…"
     uniqBy(arr, keyFn)              → deduped array
   ============================================================ */

/** Generates a chronologically-ordered, browser-friendly ID. */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/** Format an ISO date as DD.MM.YYYY (German default). */
function formatDate(iso, opts = {}) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  if (opts.short) return `${day}.${month}.`;
  if (opts.iso) return `${year}-${month}-${day}`;
  return `${day}.${month}.${year}`;
}

/** Format an ISO datetime as HH:MM. */
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Escape HTML special chars. */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Debounce a function: delay execution until `ms` of quiet. */
function debounce(fn, ms = 250) {
  let h;
  return function (...args) {
    clearTimeout(h);
    h = setTimeout(() => fn.apply(this, args), ms);
  };
}

/** Deep-clone an object via JSON. (Primitives, arrays, plain objects only.) */
function deepClone(obj) {
  return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
}

/** Days between two ISO dates (b - a). */
function daysBetween(a, b) {
  const da = new Date(a), db = new Date(b);
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

/** Truncate a string with ellipsis. */
function truncate(str, n = 80) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

/** Unique-by-key: keep first occurrence per key. */
function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  arr.forEach(item => {
    const k = keyFn(item);
    if (!seen.has(k)) { seen.add(k); out.push(item); }
  });
  return out;
}

const Utils = {
  generateId, formatDate, formatTime, escapeHtml,
  debounce, deepClone, daysBetween, truncate, uniqBy,
};

// CommonJS export (für Tools/Tests). Browser nutzt globale Funktionen + `Utils`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
