/* ============================================================
   Pathways VIA — Orchestrator (Plan + Sitzung)
   ============================================================ */

const APP = {
  schuelerId: null,
  currentMode: 'plan',
  // Plan-spezifisch (aus Roadmap)
  activeTab: 'phasen',
  phasen: null,
  currentPhase: 0,
  // Sitzung-spezifisch (aus Session)
  mode: 'pre',
  sessionStart: null,
  timerInterval: null,
  draft: {
    quicknotes: '',
    soap: { S: '', O: '', A: '', P: '' },
    ors: { individual: 8, interpersonal: 8, social: 8, overall: 8 },
    srs: { relationship: 8, goals: 8, approach: 8, overall: 8 },
    pvt_start: null,
    pvt_end: null,
    stimmung_start: 5,
    stimmung_end: 5,
    thema: '',
    materialien: [],
    ereignisse: [],
    typ: 'regulaer',
  },
};

const KEYS = {
  THEME: 'pw_app_via_theme',
  THEME_LEGACY_RM: 'pw_app_roadmap_theme',
  THEME_LEGACY_SE: 'pw_app_session_theme',
};

function showToast(m, t = 'info') {
  const c = document.getElementById('toast-container');
  const e = document.createElement('div');
  e.className = `pw-toast pw-toast-${t}`;
  e.textContent = m;
  c.appendChild(e);
  requestAnimationFrame(() => e.classList.add('show'));
  setTimeout(() => { e.classList.remove('show'); setTimeout(() => e.remove(), 200); }, 3000);
}

function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  const dark = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  localStorage.setItem(KEYS.THEME, dark);
}

function applyTheme() {
  const theme = localStorage.getItem(KEYS.THEME)
    || localStorage.getItem(KEYS.THEME_LEGACY_RM)
    || localStorage.getItem(KEYS.THEME_LEGACY_SE);
  if (theme === 'dark') document.body.classList.add('theme-dark');
}

function openCrisis() {
  if (APP.schuelerId) Bridge.openApp('hub', { schueler: APP.schuelerId, view: 'crisis' });
  else Bridge.openApp('hub', { view: 'crisis' });
}

function updateContext() {
  const el = document.getElementById('via-context');
  if (!el) return;
  if (!APP.schuelerId) { el.textContent = '— ohne Klient —'; return; }
  const s = DB.getSchuelerById(APP.schuelerId);
  el.textContent = s ? `👤 ${(s.vorname || '') + ' ' + (s.nachname || '')}`.trim() : '👤 ?';
}

// ─── Mode-Wechsler (Plan ↔ Sitzung) ─────────────────────────
function setMode(name) {
  APP.currentMode = name;
  document.querySelectorAll('.via-mode').forEach(el => {
    el.classList.toggle('active', el.dataset.mode === name);
  });
  renderSubTabs();
  if (name === 'plan') {
    setPlanTab(APP.activeTab || 'phasen');
  } else {
    setSessionMode(APP.mode || 'pre');
  }
}

function renderSubTabs() {
  const tabsEl = document.getElementById('via-tabs');
  if (APP.currentMode === 'plan') {
    tabsEl.innerHTML = `
      <button class="via-sub-tab active" data-tab="phasen" onclick="setPlanTab('phasen')">🎯 7-Phasen-Roadmap</button>
      <button class="via-sub-tab" data-tab="ziele" onclick="setPlanTab('ziele')">🎲 SMART-Ziele</button>
      <button class="via-sub-tab" data-tab="staerken" onclick="setPlanTab('staerken')">💪 Stärken-Profil</button>
      <button class="via-sub-tab" data-tab="report" onclick="setPlanTab('report')">📄 Förderplan</button>
    `;
  } else {
    tabsEl.innerHTML = `
      <button class="via-sub-tab active" data-mode="pre" onclick="setSessionMode('pre')">📋 Pre-Session</button>
      <button class="via-sub-tab" data-mode="live" onclick="setSessionMode('live')">🎯 Live-Session</button>
      <button class="via-sub-tab" data-mode="post" onclick="setSessionMode('post')">📊 Post-Session</button>
      <button class="via-sub-tab" data-mode="history" onclick="setSessionMode('history')">📚 Historie</button>
    `;
  }
}

// ─── Bridge ──────────────────────────────────────────────────
Bridge.subscribe('screening_completed', e => {
  if (APP.schuelerId === e.schuelerId) {
    showToast('Screening abgeschlossen — Plan prüfen', 'info');
  }
});

Bridge.subscribe('roadmap_updated', e => {
  if (APP.currentMode === 'sitzung' && APP.schuelerId === e.schuelerId) {
    showToast('Roadmap aktualisiert', 'info');
  }
});

// ─── Bootstrap ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  await loadPhasen();

  const params = Bridge.parseQuery();
  if (params.schueler) APP.schuelerId = params.schueler;
  if (params.thema) APP.draft.thema = params.thema;

  updateContext();

  if (params.mode === 'sitzung') {
    setMode('sitzung');
    if (params.phase) setSessionMode(params.phase);
  } else if (params.tab) {
    setMode('plan');
    setPlanTab(params.tab);
  } else {
    setMode(params.mode || 'plan');
  }

  console.log('[VIA] Ready. Mode:', APP.currentMode);
});
