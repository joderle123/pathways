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
    pvt_mid: null,
    pvt_end: null,
    hausaufgabe: '',
    hausaufgabe_erledigt: false,
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

// ─── Heute-Ansicht (Manifest: "eine einzige Empfehlung") ─────
function renderHeute() {
  const container = document.getElementById('via-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="via-section"><h2>🛤️ VIA — Heute</h2><p>Kein Klient gewählt. <a href="../hub/">→ HUB</a></p></div>`;
    return;
  }

  const s = DB.getSchuelerById(APP.schuelerId);
  const name = s ? `${s.vorname || ''} ${s.nachname || ''}`.trim() : 'Klient';
  const roadmap = DB.getRoadmap(APP.schuelerId);
  const aktivePhase = roadmap?.phasen?.find(p => p.status === 'aktiv');
  const sitzungen = DB.getNotizen(APP.schuelerId).filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const sitzungsNr = sitzungen.length + 1;

  // Treatment-Response-Loop: SRS-Trend
  const letzte3SRS = sitzungen.slice(0, 3).map(n => n.soap?.srs_total).filter(v => v !== undefined);
  let srsWarnung = null;
  if (letzte3SRS.length === 3 && letzte3SRS[0] < 25 && letzte3SRS[1] < 25 && letzte3SRS[2] < 25) {
    srsWarnung = 'Die letzten 3 Sitzungen hatten SRS unter 25. Mögliche Gründe: Allianz-Erosion, falsches Tempo, äußerer Stressor.';
  } else if (letzte3SRS.length >= 2 && letzte3SRS[0] < letzte3SRS[1]) {
    srsWarnung = `SRS zuletzt gesunken (${letzte3SRS[0]?.toFixed(1)} ← ${letzte3SRS[1]?.toFixed(1)}). Sitzungsbewertung ansprechen?`;
  }

  // Stepped Care: kein Fortschritt nach 6 Sitzungen?
  let steppedCare = null;
  if (sitzungen.length >= 6) {
    const erste3ORS = sitzungen.slice(-3).map(n => n.soap?.ors_total).filter(v => v !== undefined);
    const letzte3ORS = sitzungen.slice(0, 3).map(n => n.soap?.ors_total).filter(v => v !== undefined);
    if (erste3ORS.length && letzte3ORS.length) {
      const avgFirst = erste3ORS.reduce((a, b) => a + b, 0) / erste3ORS.length;
      const avgLast = letzte3ORS.reduce((a, b) => a + b, 0) / letzte3ORS.length;
      if (avgLast <= avgFirst + 2) {
        steppedCare = 'Nach 6+ Sitzungen kein signifikanter ORS-Fortschritt. Erwäge: Co-Therapie, Überweisung KJP, Medikation als Ergänzung, Setting-Wechsel.';
      }
    }
  }

  // Phase-Dauer-Warnung
  let phasenWarnung = null;
  if (aktivePhase?.beginn) {
    const wochen = Math.floor((Date.now() - new Date(aktivePhase.beginn).getTime()) / (7 * 86400000));
    if (wochen > 12) {
      phasenWarnung = `Phase ${aktivePhase.nr} läuft seit ${wochen} Wochen ohne Übergang. Mögliche Gründe: Allianz-Erosion, falsche Hypothese, äußerer Stressor.`;
    }
  }

  // Themen aus Roadmap
  const thema = aktivePhase?.themen?.[0] || APP.draft.thema || '';

  container.innerHTML = `
    <div class="via-heute">
      <div class="via-heute-header">
        <h2>🛤️ Heute für ${Utils.escapeHtml(name)}</h2>
        <div style="font-size: 13px; color: var(--text-muted);">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>

      <div class="via-heute-empfehlung">
        <div class="via-heute-empfehlung-title">Empfehlung</div>
        <p>Sitzung ${sitzungsNr}${aktivePhase ? `, Phase ${aktivePhase.nr} läuft seit ${aktivePhase.beginn ? Math.floor((Date.now() - new Date(aktivePhase.beginn).getTime()) / (7 * 86400000)) : '?'} Wochen` : ''}.
        ${thema ? `Vorschlag: Thema "<strong>${Utils.escapeHtml(thema)}</strong>" vertiefen.` : 'Kein spezifisches Thema gesetzt.'}
        </p>
        <div style="margin-top: var(--space-3); display: flex; gap: var(--space-2); flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="setMode('sitzung'); setSessionMode('live');">→ Sitzung starten</button>
          <button class="btn" onclick="setMode('plan'); setPlanTab('phasen');">🗺️ Plan anschauen</button>
          <a class="btn" href="../codex/?suche=${encodeURIComponent(thema)}" target="_blank">📚 Material suchen</a>
        </div>
      </div>

      ${srsWarnung ? `
        <div class="via-heute-warnung via-warnung-srs">
          <strong>📉 SRS-Trend</strong><br>${Utils.escapeHtml(srsWarnung)}
          <div style="margin-top: var(--space-2);">
            <button class="btn" onclick="setMode('sitzung'); setSessionMode('history');">→ Sitzungs-Historie anschauen</button>
          </div>
        </div>
      ` : ''}

      ${steppedCare ? `
        <div class="via-heute-warnung via-warnung-stepped">
          <strong>⚡ Stepped Care</strong><br>${Utils.escapeHtml(steppedCare)}
        </div>
      ` : ''}

      ${phasenWarnung ? `
        <div class="via-heute-warnung via-warnung-phase">
          <strong>⏰ Phasen-Stagnation</strong><br>${Utils.escapeHtml(phasenWarnung)}
        </div>
      ` : ''}

      <div class="via-heute-snapshot">
        <h3>Snapshot</h3>
        <div class="via-snapshot-grid">
          <div class="via-snapshot-card">
            <div class="via-snapshot-label">Sitzungen</div>
            <div class="via-snapshot-value">${sitzungen.length}</div>
          </div>
          <div class="via-snapshot-card">
            <div class="via-snapshot-label">Phase</div>
            <div class="via-snapshot-value">${aktivePhase ? aktivePhase.nr : '—'}</div>
          </div>
          <div class="via-snapshot-card">
            <div class="via-snapshot-label">Letzter ORS</div>
            <div class="via-snapshot-value">${sitzungen[0]?.soap?.ors_total?.toFixed(1) || '—'}</div>
          </div>
          <div class="via-snapshot-card">
            <div class="via-snapshot-label">Letzter SRS</div>
            <div class="via-snapshot-value">${sitzungen[0]?.soap?.srs_total?.toFixed(1) || '—'}</div>
          </div>
        </div>

        ${sitzungen.length >= 2 ? `
          <h3 style="margin-top: var(--space-4);">ORS/SRS Trend</h3>
          <div style="display: flex; gap: var(--space-2); align-items: flex-end; height: 60px; padding: var(--space-2); background: var(--bg-subtle); border-radius: var(--radius-sm);">
            ${sitzungen.slice(0, 5).reverse().map(n => {
              const ors = n.soap?.ors_total;
              const srs = n.soap?.srs_total;
              return ors !== undefined ? `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                  <div style="width: 100%; display: flex; gap: 2px; align-items: flex-end; height: 40px;">
                    <div style="flex: 1; background: var(--color-app-via); border-radius: 2px 2px 0 0; height: ${Math.max(4, ors * 4)}px;" title="ORS ${ors?.toFixed(1)}"></div>
                    ${srs !== undefined ? `<div style="flex: 1; background: #8B5CF6; border-radius: 2px 2px 0 0; height: ${Math.max(4, srs * 4)}px;" title="SRS ${srs?.toFixed(1)}"></div>` : ''}
                  </div>
                  <div style="font-size: 10px; color: var(--text-muted);">${Utils.formatDate(n.datum, { short: true })}</div>
                </div>
              ` : '';
            }).join('')}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: flex; gap: var(--space-3);">
            <span><span style="display: inline-block; width: 10px; height: 10px; background: var(--color-app-via); border-radius: 2px;"></span> ORS</span>
            <span><span style="display: inline-block; width: 10px; height: 10px; background: #8B5CF6; border-radius: 2px;"></span> SRS</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ─── Mode-Wechsler (Plan ↔ Sitzung) ─────────────────────────
function setMode(name) {
  APP.currentMode = name;
  document.querySelectorAll('.via-mode').forEach(el => {
    el.classList.toggle('active', el.dataset.mode === name);
  });
  renderSubTabs();
  if (name === 'heute') {
    renderHeute();
  } else if (name === 'plan') {
    setPlanTab(APP.activeTab || 'phasen');
  } else {
    setSessionMode(APP.mode || 'pre');
  }
}

function renderSubTabs() {
  const tabsEl = document.getElementById('via-tabs');
  if (APP.currentMode === 'heute') {
    tabsEl.innerHTML = '';
    return;
  }
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
    setMode(params.mode || 'heute');
  }

  console.log('[VIA] Ready. Mode:', APP.currentMode);
});
