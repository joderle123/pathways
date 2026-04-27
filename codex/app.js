/* ============================================================
   Pathways CODEX — Wissensschmiede
   ============================================================
   Material-Mediathek + Eltern-Infoblätter + Leitfäden + Workflows.
   Volltext-Suche, Filter, Bookmarks, Material-Notizen.
   ============================================================ */

const STATE = {
  index: null,         // { version, materials: [...] }
  query: '',
  filters: { typ: new Set(), schwierigkeit: new Set() },
  sort: 'title',
  showOnlyBookmarks: false,
  bookmarks: new Set(),
  notes: {},           // { pfad: 'notiz' }
};

const KEYS = {
  BOOKMARKS: 'pw_library_bookmarks',
  NOTES: 'pw_library_notes',
  THEME: 'pw_app_codex_theme',
  THEME_LEGACY: 'pw_app_library_theme',
};

// ─── Storage ─────────────────────────────────────────────────
function loadBookmarks() {
  try { STATE.bookmarks = new Set(JSON.parse(localStorage.getItem(KEYS.BOOKMARKS) || '[]')); }
  catch { STATE.bookmarks = new Set(); }
}
function saveBookmarks() {
  localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify([...STATE.bookmarks]));
  document.getElementById('bookmark-count').textContent = STATE.bookmarks.size;
}
function loadNotes() {
  try { STATE.notes = JSON.parse(localStorage.getItem(KEYS.NOTES) || '{}'); }
  catch { STATE.notes = {}; }
}
function saveNotes() {
  localStorage.setItem(KEYS.NOTES, JSON.stringify(STATE.notes));
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `pw-toast pw-toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 200); }, 3000);
}

// ─── Theme ───────────────────────────────────────────────────
function applyTheme() {
  const theme = localStorage.getItem(KEYS.THEME) || localStorage.getItem(KEYS.THEME_LEGACY);
  if (theme === 'dark') document.body.classList.add('theme-dark');
}
function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  localStorage.setItem(KEYS.THEME, document.body.classList.contains('theme-dark') ? 'dark' : 'light');
}

// ─── Index laden ─────────────────────────────────────────────
async function loadIndex() {
  const res = await fetch('data/materials-index.json');
  if (!res.ok) throw new Error('Index nicht gefunden. Run: node tools/build-search-index.cjs');
  STATE.index = await res.json();
  console.log(`[CODEX] ${STATE.index.count} Materialien geladen`);
}

// ─── Suche & Filter ──────────────────────────────────────────
function search(materials, query) {
  if (!query) return materials;
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  return materials.filter(m => {
    const haystack = [
      m.titel, m.beschreibung, m.typ, m.label, ...(m.keywords || []), m.datei
    ].join(' ').toLowerCase();
    return tokens.every(t => haystack.includes(t));
  });
}

function filter(materials) {
  return materials.filter(m => {
    if (STATE.filters.typ.size && !STATE.filters.typ.has(m.typ)) return false;
    if (STATE.filters.schwierigkeit.size) {
      const s = m.schwierigkeit || 'standard';
      if (!STATE.filters.schwierigkeit.has(s)) return false;
    }
    if (STATE.showOnlyBookmarks && !STATE.bookmarks.has(m.pfad)) return false;
    return true;
  });
}

function sortMaterials(materials) {
  const arr = [...materials];
  if (STATE.sort === 'bookmarks') {
    arr.sort((a, b) => {
      const ba = STATE.bookmarks.has(a.pfad) ? 0 : 1;
      const bb = STATE.bookmarks.has(b.pfad) ? 0 : 1;
      return ba - bb || a.titel.localeCompare(b.titel);
    });
  } else if (STATE.sort === 'type') {
    arr.sort((a, b) => a.typ.localeCompare(b.typ) || a.titel.localeCompare(b.titel));
  } else {
    arr.sort((a, b) => a.titel.localeCompare(b.titel));
  }
  return arr;
}

function setSort(s) { STATE.sort = s; render(); }

// ─── Filter UI ───────────────────────────────────────────────
function buildFilterUI() {
  const typen = {};
  const schw = {};
  STATE.index.materials.forEach(m => {
    typen[m.typ] = (typen[m.typ] || 0) + 1;
    const s = m.schwierigkeit || 'standard';
    schw[s] = (schw[s] || 0) + 1;
  });

  const labels = {
    arbeitsblatt: '📝 Arbeitsblatt', therapie: '🧠 Therapie-Modul', fachkraft: '🎓 Fachkraft',
    eltern: '👨‍👩‍👧 Eltern', evaluation: '📊 Evaluation', tool: '🌳 Tool',
    fallbeispiel: '📖 Fallbeispiel', ueberweisung: '🏥 Überweisung', skills: '🛠️ Skills',
  };
  const schwLabels = {
    einfach: 'Einfach', mittel: 'Mittel', standard: 'Standard',
  };

  document.getElementById('filter-typ').innerHTML = Object.entries(typen)
    .sort((a, b) => b[1] - a[1])
    .map(([typ, count]) => `
      <label class="lib-filter-item">
        <input type="checkbox" data-filter-typ="${typ}" onchange="toggleFilter('typ','${typ}')">
        <span>${labels[typ] || typ}</span>
        <span class="lib-filter-count">${count}</span>
      </label>`).join('');

  document.getElementById('filter-schwierigkeit').innerHTML = ['einfach','mittel','standard']
    .filter(s => schw[s])
    .map(s => `
      <label class="lib-filter-item">
        <input type="checkbox" data-filter-schw="${s}" onchange="toggleFilter('schwierigkeit','${s}')">
        <span>${schwLabels[s]}</span>
        <span class="lib-filter-count">${schw[s] || 0}</span>
      </label>`).join('');
}

function toggleFilter(group, value) {
  if (STATE.filters[group].has(value)) STATE.filters[group].delete(value);
  else STATE.filters[group].add(value);
  render();
}

function clearFilters() {
  STATE.filters.typ.clear();
  STATE.filters.schwierigkeit.clear();
  STATE.showOnlyBookmarks = false;
  document.querySelectorAll('[data-filter-typ], [data-filter-schw]').forEach(el => el.checked = false);
  document.getElementById('lib-search').value = '';
  STATE.query = '';
  document.getElementById('bookmarks-toggle').classList.remove('active');
  render();
}

// ─── Bookmarks ───────────────────────────────────────────────
function toggleBookmark(pfad) {
  if (STATE.bookmarks.has(pfad)) STATE.bookmarks.delete(pfad);
  else STATE.bookmarks.add(pfad);
  saveBookmarks();
  render();
  Bridge.notify('library_bookmark_changed', { pfad, bookmarked: STATE.bookmarks.has(pfad) });
}

function toggleBookmarks() {
  STATE.showOnlyBookmarks = !STATE.showOnlyBookmarks;
  document.getElementById('bookmarks-toggle').classList.toggle('active', STATE.showOnlyBookmarks);
  render();
}

// ─── Detail Modal (Material-Notizen) ────────────────────────
function openDetail(pfad) {
  const m = STATE.index.materials.find(x => x.pfad === pfad);
  if (!m) return;
  const note = STATE.notes[pfad] || '';
  const isBookmarked = STATE.bookmarks.has(pfad);

  document.getElementById('detail-titel').textContent = m.titel;
  document.getElementById('detail-body').innerHTML = `
    <div style="margin-bottom: var(--space-4); display: flex; gap: var(--space-2); flex-wrap: wrap;">
      <span class="lib-tag">${m.icon} ${m.label}</span>
      ${m.schwierigkeit ? `<span class="lib-tag lib-tag-${m.schwierigkeit}">${m.schwierigkeit}</span>` : ''}
      <span class="lib-tag">${(m.bytes / 1024).toFixed(0)} KB</span>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">${Utils.escapeHtml(m.beschreibung)}</p>
    <div style="display: flex; gap: var(--space-2); margin-bottom: var(--space-4); flex-wrap: wrap;">
      ${(m.keywords || []).map(k => `<span class="lib-tag" style="font-size: 11px;">${Utils.escapeHtml(k)}</span>`).join('')}
    </div>
    <hr style="border: 0; border-top: 1px solid var(--border); margin: var(--space-4) 0;">
    <label style="display: block; font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2);">📝 Meine Notiz zu diesem Material</label>
    <textarea id="detail-note" rows="5" style="width: 100%;">${Utils.escapeHtml(note)}</textarea>
    <div class="pw-modal-actions">
      <button class="btn" onclick="toggleBookmark('${pfad}'); openDetail('${pfad}')">${isBookmarked ? '★ Bookmark entfernen' : '☆ Bookmark setzen'}</button>
      <button class="btn" onclick="saveDetailNote('${pfad}')">Notiz speichern</button>
      <a class="btn btn-primary" href="../${m.pfad}" target="_blank">Öffnen ↗</a>
    </div>
  `;
  document.getElementById('detail-modal').style.display = 'flex';
}

function closeDetail() {
  document.getElementById('detail-modal').style.display = 'none';
}

function saveDetailNote(pfad) {
  const txt = document.getElementById('detail-note').value;
  if (txt.trim()) STATE.notes[pfad] = txt;
  else delete STATE.notes[pfad];
  saveNotes();
  showToast('Notiz gespeichert', 'ok');
  closeDetail();
}

// ─── Render ─────────────────────────────────────────────────
function render() {
  const all = STATE.index.materials;
  const filtered = sortMaterials(filter(search(all, STATE.query)));
  const grid = document.getElementById('lib-grid');
  const empty = document.getElementById('lib-empty');
  const bar = document.getElementById('result-bar');

  // Result bar
  let info = `${filtered.length} von ${all.length} Materialien`;
  if (STATE.query) info += ` · Suche: "${STATE.query}"`;
  if (STATE.showOnlyBookmarks) info += ' · ⭐ nur Lesezeichen';
  if (STATE.filters.typ.size) info += ` · Typ: ${[...STATE.filters.typ].join(', ')}`;
  if (STATE.filters.schwierigkeit.size) info += ` · Schwierigkeit: ${[...STATE.filters.schwierigkeit].join(', ')}`;
  bar.textContent = info;

  if (!filtered.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = filtered.map(m => {
    const bm = STATE.bookmarks.has(m.pfad);
    const hasNote = STATE.notes[m.pfad];
    return `
      <div class="lib-card" data-typ="${m.typ}" data-schwierigkeit="${m.schwierigkeit || 'standard'}">
        <div class="lib-card-header">
          <span class="lib-icon">${m.icon}</span>
          <button class="lib-bookmark ${bm ? 'on' : ''}" onclick="toggleBookmark('${m.pfad}')" title="${bm ? 'Bookmark entfernen' : 'Bookmark setzen'}">${bm ? '★' : '☆'}</button>
        </div>
        <h3 class="lib-card-title">${Utils.escapeHtml(m.titel)}</h3>
        <p class="lib-card-desc">${Utils.escapeHtml(Utils.truncate(m.beschreibung, 140))}</p>
        <div class="lib-card-meta">
          <span class="lib-tag">${m.label}</span>
          ${m.schwierigkeit ? `<span class="lib-tag lib-tag-${m.schwierigkeit}">${m.schwierigkeit}</span>` : ''}
          ${hasNote ? `<span class="lib-tag" title="Du hast eine Notiz">📝</span>` : ''}
        </div>
        <div class="lib-card-actions">
          <button class="btn btn-sm" onclick="openDetail('${m.pfad}')">Details</button>
          <button class="btn btn-sm" onclick="addToSammlung('${m.pfad}','${Utils.escapeHtml(m.titel)}')" title="Zur Toolbox">🧰</button>
          <button class="btn btn-sm" onclick="rateMaterial('${m.pfad}',1)" title="Hilfreich 👍">👍 ${getMaterialRating(m.pfad)}</button>
          <a class="btn btn-sm btn-primary" href="../${m.pfad}" target="_blank">Öffnen ↗</a>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('lib-stats').innerHTML = `
    <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--border);">
      ⭐ ${STATE.bookmarks.size} Bookmark(s)<br>
      📝 ${Object.keys(STATE.notes).length} Notiz(en)<br>
      📦 ${all.length} Materialien gesamt
    </div>
  `;
}

// ─── Bridge Integration ─────────────────────────────────────
Bridge.subscribe('library_recommend', e => {
  // Andere App empfiehlt Material via Schlüsselwort
  if (e.suche) {
    document.getElementById('lib-search').value = e.suche;
    STATE.query = e.suche;
    render();
    showToast(`Empfehlung von ${e.from}: "${e.suche}"`, 'info');
  }
});

// ─── Bootstrap ──────────────────────────────────────────────
async function init() {
  applyTheme();
  loadBookmarks();
  loadNotes();
  document.getElementById('bookmark-count').textContent = STATE.bookmarks.size;

  try {
    await loadIndex();
  } catch (e) {
    document.getElementById('lib-grid').innerHTML = `
      <div class="pw-empty">
        <div class="pw-empty-icon">⚠️</div>
        <h2>Index fehlt</h2>
        <p>Bitte einmalig im Projekt-Root ausführen:</p>
        <pre style="background: var(--bg-subtle); padding: 12px; border-radius: 8px;">node tools/build-search-index.cjs</pre>
      </div>`;
    return;
  }

  buildFilterUI();
  render();

  // Live search
  const searchInput = document.getElementById('lib-search');
  searchInput.addEventListener('input', Utils.debounce(e => {
    STATE.query = e.target.value;
    render();
  }, 200));

  // Deep-Link via URL: ?suche=trauma&typ=arbeitsblatt
  const params = Bridge.parseQuery();
  if (params.suche) {
    searchInput.value = params.suche;
    STATE.query = params.suche;
  }
  if (params.typ) {
    STATE.filters.typ.add(params.typ);
    const cb = document.querySelector(`[data-filter-typ="${params.typ}"]`);
    if (cb) cb.checked = true;
  }
  if (params.schwierigkeit) {
    STATE.filters.schwierigkeit.add(params.schwierigkeit);
    const cb = document.querySelector(`[data-filter-schw="${params.schwierigkeit}"]`);
    if (cb) cb.checked = true;
  }
  if (params.suche || params.typ || params.schwierigkeit) render();

  // Section param: ?section=infoblaetter
  if (params.section) setSection(params.section);

  console.log('[CODEX] Ready.');
}

// ─── Material-Bewertung (Manifest: Effektivität als Daten) ──
const RATING_KEY = 'pw_codex_ratings';
function getRatings() { try { return JSON.parse(localStorage.getItem(RATING_KEY) || '{}'); } catch { return {}; } }
function saveRatings(r) { localStorage.setItem(RATING_KEY, JSON.stringify(r)); }
function getMaterialRating(pfad) { return getRatings()[pfad] || 0; }
function rateMaterial(pfad, delta) {
  const r = getRatings();
  r[pfad] = (r[pfad] || 0) + delta;
  saveRatings(r);
  showToast('Bewertung gespeichert', 'ok');
  render();
}

// ─── Sammlungen / Persönliche Toolbox (Manifest: "Meine 10 besten") ──
const SAMMLUNG_KEY = 'pw_codex_sammlungen';

function getSammlungen() {
  try { return JSON.parse(localStorage.getItem(SAMMLUNG_KEY) || '[]'); }
  catch { return []; }
}
function saveSammlungen(s) { localStorage.setItem(SAMMLUNG_KEY, JSON.stringify(s)); }

function addToSammlung(pfad, titel) {
  const s = getSammlungen();
  if (s.find(x => x.pfad === pfad)) { showToast('Bereits in Sammlung', 'info'); return; }
  s.push({ pfad, titel, addedAt: new Date().toISOString() });
  saveSammlungen(s);
  showToast(`"${titel}" zur Sammlung hinzugefügt`, 'ok');
}

function removeFromSammlung(pfad) {
  saveSammlungen(getSammlungen().filter(x => x.pfad !== pfad));
  renderSammlungen(document.getElementById('parents-content'));
}

function renderSammlungen(container) {
  const sammlung = getSammlungen();
  container.innerHTML = `
    <div class="pa-section">
      <h2>🧰 Persönliche Toolbox (${sammlung.length})</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        Deine kuratierte Sammlung — die Materialien, die du am häufigsten brauchst.
      </p>
      ${sammlung.length === 0
        ? `<div style="text-align: center; padding: var(--space-8); color: var(--text-muted);">
            <div style="font-size: 48px; margin-bottom: var(--space-3);">🧰</div>
            <p>Noch leer. Nutze ⭐ bei Materialien, um sie hier zu sammeln.</p>
          </div>`
        : `<div class="pa-grid">
            ${sammlung.map(m => `
              <div class="pa-card">
                <div class="pa-card-title">${Utils.escapeHtml(m.titel || m.pfad)}</div>
                <div class="pa-card-desc">Hinzugefügt ${Utils.formatDate(m.addedAt, { short: true })}</div>
                <div style="margin-top: var(--space-2); display: flex; gap: var(--space-2);">
                  <a class="btn" href="../${m.pfad}" target="_blank" style="flex: 1; text-align: center;">Öffnen ↗</a>
                  <button class="btn" onclick="removeFromSammlung('${Utils.escapeHtml(m.pfad)}')" style="color: var(--danger);">✕</button>
                </div>
              </div>
            `).join('')}
          </div>`
      }
    </div>
  `;
}

// ─── Therapie-Sequenzen (Manifest: erprobte Pfade durch Material) ──
const SEQUENZEN = [
  {
    id: 'stabilisierung', titel: 'Stabilisierungs-Sequenz',
    icon: '🧘', dauer: '4 Sitzungen',
    beschreibung: 'Erprobter Pfad für Klienten in akuter Belastung. Vor jeder Trauma-Arbeit.',
    materialien: [
      'arbeitsblaetter/sicherer-ort.html',
      'arbeitsblaetter/atemuebung-4-7-8.html',
      'arbeitsblaetter/5-4-3-2-1-grounding.html',
      'arbeitsblaetter/koerperwahrnehmung.html',
    ],
  },
  {
    id: 'emotionsreg', titel: 'Emotionsregulation (DBT-basiert)',
    icon: '🎭', dauer: '6 Sitzungen',
    beschreibung: 'Skills-Aufbau für Klienten mit Impulskontroll-Problemen oder Selbstverletzung.',
    materialien: [
      'arbeitsblaetter/gefuehle-benennen.html',
      'arbeitsblaetter/stresstoleranz-eis.html',
      'arbeitsblaetter/pro-contra-liste.html',
      'arbeitsblaetter/notfallkoffer.html',
      'arbeitsblaetter/achtsamkeit-rosine.html',
      'arbeitsblaetter/skills-kette.html',
    ],
  },
  {
    id: 'depression', titel: 'Verhaltensaktivierung bei Depression',
    icon: '☀️', dauer: '4 Sitzungen',
    beschreibung: 'Aufbau positiver Aktivitäten. Für Klienten mit Antriebslosigkeit.',
    materialien: [
      'arbeitsblaetter/aktivitaeten-liste.html',
      'arbeitsblaetter/wochenplan.html',
      'arbeitsblaetter/freude-tagebuch.html',
      'arbeitsblaetter/kleine-schritte.html',
    ],
  },
];

function renderSequenzen(container) {
  container.innerHTML = `
    <div class="pa-section">
      <h2>🔗 Therapie-Sequenzen (${SEQUENZEN.length})</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        Erprobte Materialabfolgen — "nicht nur ein Arbeitsblatt, sondern ein Weg."
      </p>
      ${SEQUENZEN.map(seq => `
        <div style="margin-bottom: var(--space-5); background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-4);">
          <div style="display: flex; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
            <span style="font-size: 28px;">${seq.icon}</span>
            <div>
              <div style="font-weight: var(--font-weight-bold); font-size: 16px;">${Utils.escapeHtml(seq.titel)}</div>
              <div style="font-size: 13px; color: var(--text-muted);">${seq.dauer} · ${seq.materialien.length} Materialien</div>
            </div>
          </div>
          <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: var(--space-3);">${Utils.escapeHtml(seq.beschreibung)}</p>
          <ol style="padding-left: var(--space-4); font-size: 14px; line-height: var(--line-height-relaxed);">
            ${seq.materialien.map((pfad, i) => {
              const m = STATE.index?.materials?.find(x => x.pfad === pfad);
              const titel = m ? m.titel : pfad.split('/').pop().replace('.html', '');
              return `<li style="margin-bottom: var(--space-1);">
                <a href="../${pfad}" target="_blank" style="color: var(--text); text-decoration: underline;">${Utils.escapeHtml(titel)}</a>
              </li>`;
            }).join('')}
          </ol>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Section Switcher (Material ↔ Eltern-Tabs ↔ Toolbox ↔ Sequenzen) ──
let currentSection = 'materialien';

function setSection(name) {
  currentSection = name;
  document.querySelectorAll('.codex-section-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.section === name);
  });

  const filters = document.getElementById('filters');
  const libMain = document.querySelector('.lib-main');
  const parentsContent = document.getElementById('parents-content');
  const searchWrap = document.querySelector('.lib-search-wrap');

  if (name === 'materialien') {
    if (filters) filters.style.display = '';
    if (libMain) libMain.style.display = '';
    if (parentsContent) parentsContent.style.display = 'none';
    if (searchWrap) searchWrap.style.display = '';
  } else {
    if (filters) filters.style.display = 'none';
    if (libMain) libMain.style.display = 'none';
    if (parentsContent) parentsContent.style.display = '';
    if (searchWrap) searchWrap.style.display = 'none';

    if (name === 'infoblaetter') ParentsViews.renderInfoblaetter(parentsContent);
    else if (name === 'leitfaeden') ParentsViews.renderLeitfaeden(parentsContent);
    else if (name === 'workflows') ParentsViews.renderWorkflows(parentsContent);
    else if (name === 'sammlungen') renderSammlungen(parentsContent);
    else if (name === 'sequenzen') renderSequenzen(parentsContent);
  }
}

window.addEventListener('DOMContentLoaded', init);
