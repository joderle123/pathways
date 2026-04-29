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

  /** Reusable modal form builder. Returns a Promise that resolves with form data or null on cancel. */
  modalForm({ title, fields, submitLabel = 'Speichern', cancelLabel = 'Abbrechen' }) {
    return new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.className = 'pw-modal';
      backdrop.style.display = 'flex';

      const fieldHtml = fields.map(f => {
        const id = `mf-${f.id}`;
        const req = f.required ? 'required' : '';
        const val = escapeHtml(f.value || '');
        if (f.type === 'textarea') {
          return `<label class="pw-mf-label">${escapeHtml(f.label)}${f.required ? ' *' : ''}
            <textarea id="${id}" rows="${f.rows || 3}" placeholder="${escapeHtml(f.placeholder || '')}" ${req}>${val}</textarea>
          </label>`;
        }
        if (f.type === 'select') {
          return `<label class="pw-mf-label">${escapeHtml(f.label)}
            <select id="${id}">${f.options.map(o => `<option value="${o.value}" ${o.value === f.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>
          </label>`;
        }
        if (f.type === 'checkbox') {
          return `<label class="pw-mf-check"><input type="checkbox" id="${id}" ${f.value ? 'checked' : ''}> ${escapeHtml(f.label)}</label>`;
        }
        return `<label class="pw-mf-label">${escapeHtml(f.label)}${f.required ? ' *' : ''}
          <input id="${id}" type="${f.type || 'text'}" value="${val}" placeholder="${escapeHtml(f.placeholder || '')}" ${req}>
        </label>`;
      }).join('');

      backdrop.innerHTML = `
        <div class="pw-modal-backdrop"></div>
        <div class="pw-modal-content" style="max-width: 560px;">
          <header class="pw-modal-header">
            <h2>${escapeHtml(title)}</h2>
            <button class="pw-btn-icon pw-mf-close">✕</button>
          </header>
          <form class="pw-mf-form">
            ${fieldHtml}
            <div class="pw-modal-actions">
              <button type="button" class="btn pw-mf-cancel">${escapeHtml(cancelLabel)}</button>
              <button type="submit" class="btn btn-primary">${escapeHtml(submitLabel)}</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(backdrop);

      const close = (result) => { backdrop.remove(); resolve(result); };
      backdrop.querySelector('.pw-modal-backdrop').onclick = () => close(null);
      backdrop.querySelector('.pw-mf-close').onclick = () => close(null);
      backdrop.querySelector('.pw-mf-cancel').onclick = () => close(null);
      backdrop.querySelector('.pw-mf-form').onsubmit = e => {
        e.preventDefault();
        const data = {};
        fields.forEach(f => {
          const el = document.getElementById(`mf-${f.id}`);
          if (f.type === 'checkbox') data[f.id] = el.checked;
          else data[f.id] = el.value;
        });
        close(data);
      };

      const firstInput = backdrop.querySelector('input, textarea, select');
      if (firstInput) setTimeout(() => firstInput.focus(), 50);

      backdrop.addEventListener('keydown', e => { if (e.key === 'Escape') close(null); });
    });
  },

  /** Show a toast notification. Requires #toast-container in the DOM. */
  toast(message, type = 'info') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `pw-toast pw-toast-${type}`;
    t.textContent = message;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 200); }, 3500);
  },

  /** Safe fetch with error handling. Returns null on failure. */
  async safeFetch(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`[safeFetch] ${url}:`, e);
      return null;
    }
  },

  today() { return new Date().toISOString().split('T')[0]; },
};

// CommonJS export (für Tools/Tests). Browser nutzt globale Funktionen + `Utils`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
