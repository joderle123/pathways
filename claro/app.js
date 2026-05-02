/* ============================================================
   Pathways CLARO — App
   ============================================================
   Routing zwischen 6 Tabs, Screening-Wizard, Bridge-Integration.
   ============================================================ */

const APP = {
  schuelerId: null,
  activeTab: 'overview',
  currentInstrument: null,
  scores: {},  // { itemIdx: 0..4 }
};

const KEYS = { THEME: 'pw_app_claro_theme', THEME_LEGACY: 'pw_app_diagnose_theme' };

// ─── Theme + Toast ────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `pw-toast pw-toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 200); }, 3000);
}
function applyTheme() {
  const theme = localStorage.getItem(KEYS.THEME) || localStorage.getItem(KEYS.THEME_LEGACY);
  if (theme === 'dark') document.body.classList.add('theme-dark');
}
function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  localStorage.setItem(KEYS.THEME, document.body.classList.contains('theme-dark') ? 'dark' : 'light');
}

// ─── TAB 1: TRIAGE — 5 Fragen → Instrumenten-Empfehlung ──────
// Mapping (Spec):
//   Stimmung→PHQ-A · Angst→GAD-7+SCARED · Trauma→PCL-5
//   Verhalten→SDQ · Substanzen→CRAFFT · Konzentration→ASRS · Beziehungen→SDQ-Peer
// SCARED + CRAFFT sind noch nicht in INSTRUMENTS implementiert (Tab 2).
const TRIAGE_FRAGEN = [
  {
    id: 'bereich',
    typ: 'single',
    frage: 'Welcher Bereich macht aktuell die größten Sorgen?',
    optionen: [
      { id: 'stimmung',      label: '🌧️ Stimmung',          instruments: ['phq-a'],          reason: 'Stimmungsproblematik im Vordergrund' },
      { id: 'angst',         label: '😰 Angst',             instruments: ['gad-7', 'scared'], reason: 'Angst-Symptomatik im Vordergrund' },
      { id: 'verhalten',     label: '⚡ Verhalten',         instruments: ['sdq'],            reason: 'Externalisierende Auffälligkeiten (Conduct/Hyperaktiv)' },
      { id: 'konzentration', label: '🎯 Konzentration',     instruments: ['asrs'],           reason: 'Aufmerksamkeits-/Konzentrationsprobleme' },
      { id: 'trauma',        label: '🌪️ Trauma',            instruments: ['pcl-5'],          reason: 'Trauma als Hauptthema (DSM-5 Kriterium A prüfen)' },
      { id: 'beziehungen',   label: '🤝 Beziehungen',       instruments: ['sdq'],            reason: 'Beziehungsproblematik (SDQ Peer-Subskala)' },
    ],
  },
  {
    id: 'dauer',
    typ: 'single',
    frage: 'Wie lange bestehen die Beschwerden?',
    optionen: [
      { id: 'akut',      label: '< 2 Wochen',     hinweis: 'Akut — F43.2 Anpassungsreaktion möglich. Re-Eval in 2 Wochen.' },
      { id: 'subakut',   label: '2–8 Wochen',     hinweis: 'Subakut — klinisch relevant, Screening indiziert.' },
      { id: 'mittel',    label: '2–6 Monate',     hinweis: 'Persistierend — vollständige Diagnostik empfohlen.' },
      { id: 'chronisch', label: '> 6 Monate',     hinweis: 'Chronisch — konsolidierte Störung möglich, längere Behandlungsdauer einplanen.' },
    ],
  },
  {
    id: 'beeintraechtigung',
    typ: 'slider',
    frage: 'Wie stark ist die Beeinträchtigung im Alltag (Schule · Familie · Peers)?',
    min: 0, max: 10, defaultValue: 5,
    skalaText: ['keine', 'minimal', 'mild', 'mild', 'mittel', 'mittel', 'mittel', 'stark', 'stark', 'sehr stark', 'extrem'],
  },
  {
    id: 'risiken',
    typ: 'multi',
    frage: 'Akute Risiken vorhanden? (Mehrfachauswahl)',
    optionen: [
      { id: 'suizid',     label: '☠️ Suizidgedanken',           crisis: true, instruments: ['phq-a'],          reason: 'Suizidalität — PHQ-A Item-9 + C-SSRS verpflichtend' },
      { id: 'svv',        label: '🩸 Selbstverletzung',         crisis: true, instruments: ['phq-a'],          reason: 'Selbstverletzendes Verhalten (NSSI / Suizid-Risiko abklären)' },
      { id: 'substanzen', label: '🌿 Substanzmissbrauch',                     instruments: ['crafft'],         reason: 'Riskanter Substanzkonsum (CRAFFT validiert für 12-21 J.)' },
      { id: 'gewalt',     label: '👊 Gewalt (gegen sich/andere)',             instruments: ['sdq', 'pcl-5'],   reason: 'Gewalt-Exposition / -Ausübung (Conduct + PTBS prüfen)' },
      { id: 'keine',      label: '✓ Keine akuten Risiken',     exclusive: true },
    ],
  },
  {
    id: 'kontext',
    typ: 'multi',
    frage: 'Welcher Kontext liegt vor? (Mehrfachauswahl)',
    optionen: [
      { id: 'schule',      label: '🏫 Schule' },
      { id: 'familie',     label: '👨‍👩‍👧 Familie' },
      { id: 'peers',       label: '👥 Peers',        instruments: ['sdq'],   reason: 'Peer-Konflikte (SDQ Peer-Probleme)' },
      { id: 'verlust',     label: '🕊️ Verlust',      instruments: ['pcl-5'], reason: 'Verlust-Erfahrung — PTBS-/Trauerreaktion abgrenzen' },
      { id: 'trauma',      label: '🌪️ Trauma',       instruments: ['pcl-5'], reason: 'Trauma-Kontext angegeben' },
      { id: 'uebergaenge', label: '🔄 Übergänge' },
    ],
  },
];

// ─── Triage-State (in Memory, persistiert pro Klient via localStorage) ──
const TRIAGE_KEY = 'pw_claro_triage';
let triageState = {
  bereich: null,
  dauer: null,
  beeintraechtigung: null,
  risiken: new Set(),
  kontext: new Set(),
};
let triageLoadedForKlient = undefined;

function loadTriageForKlient(schuelerId) {
  if (!schuelerId) return null;
  try {
    const all = JSON.parse(localStorage.getItem(TRIAGE_KEY) || '{}');
    return all[schuelerId] || null;
  } catch { return null; }
}

function ensureTriageLoaded() {
  if (triageLoadedForKlient === APP.schuelerId) return;
  triageLoadedForKlient = APP.schuelerId;
  const saved = loadTriageForKlient(APP.schuelerId);
  triageState = {
    bereich: saved?.bereich || null,
    dauer: saved?.dauer || null,
    beeintraechtigung: (saved && saved.beeintraechtigung != null) ? saved.beeintraechtigung : null,
    risiken: new Set(saved?.risiken || []),
    kontext: new Set(saved?.kontext || []),
  };
}

function setTriageSingle(frageId, optId) {
  triageState[frageId] = optId;
  renderTriage();
}

function toggleTriageMulti(frageId, optId) {
  const f = TRIAGE_FRAGEN.find(x => x.id === frageId);
  const opt = f.optionen.find(o => o.id === optId);
  const set = triageState[frageId];
  if (opt.exclusive) {
    // "Keine"-Option: clear all, toggle this one alone
    if (set.has(optId)) set.delete(optId);
    else { set.clear(); set.add(optId); }
  } else {
    // Normale Option: entferne ggf. exclusive-Optionen, toggle this
    f.optionen.forEach(o => { if (o.exclusive) set.delete(o.id); });
    if (set.has(optId)) set.delete(optId);
    else set.add(optId);
  }
  renderTriage();
}

function onTriageSliderInput(val) {
  triageState.beeintraechtigung = Number(val);
  const display = document.getElementById('dg-triage-slider-display');
  if (display) {
    const f = TRIAGE_FRAGEN.find(x => x.id === 'beeintraechtigung');
    display.textContent = `${val}/10 · ${f.skalaText[val] || ''}`;
  }
  // Live-Update der Empfehlungs-Box ohne Slider-Refresh
  const result = document.getElementById('dg-triage-result-zone');
  if (result) result.innerHTML = renderTriageResult();
}

function resetTriage() {
  triageState = { bereich: null, dauer: null, beeintraechtigung: null, risiken: new Set(), kontext: new Set() };
  renderTriage();
}

// ─── Empfehlungs-Engine (Score = Anzahl Trigger pro Instrument) ──
function getTriageRecommendations() {
  const recommendations = {}; // { id: { reasons: Set, score: n } }
  const crisisReasons = [];

  function addRec(instId, reason) {
    if (!recommendations[instId]) recommendations[instId] = { reasons: new Set(), score: 0 };
    recommendations[instId].reasons.add(reason);
    recommendations[instId].score++;
  }

  // Q1 bereich
  const f1 = TRIAGE_FRAGEN[0];
  if (triageState.bereich) {
    const opt = f1.optionen.find(o => o.id === triageState.bereich);
    (opt?.instruments || []).forEach(i => addRec(i, opt.reason));
  }

  // Q4 risiken
  const f4 = TRIAGE_FRAGEN[3];
  triageState.risiken.forEach(rid => {
    const opt = f4.optionen.find(o => o.id === rid);
    if (opt?.crisis) crisisReasons.push(opt.label);
    (opt?.instruments || []).forEach(i => addRec(i, opt.reason));
  });

  // Q5 kontext
  const f5 = TRIAGE_FRAGEN[4];
  triageState.kontext.forEach(kid => {
    const opt = f5.optionen.find(o => o.id === kid);
    (opt?.instruments || []).forEach(i => addRec(i, opt.reason));
  });

  const sorted = Object.entries(recommendations)
    .map(([id, v]) => ({ id, reasons: [...v.reasons], score: v.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const sichtbareFragenBeantwortet =
    triageState.bereich !== null
    && triageState.dauer !== null
    && triageState.beeintraechtigung !== null
    && triageState.risiken.size > 0
    && triageState.kontext.size > 0;

  return { sorted, crisisReasons, alleBeantwortet: sichtbareFragenBeantwortet };
}

// ─── Instrument-Info (Fallback für noch nicht implementierte) ──
const TRIAGE_INSTRUMENT_FALLBACK = {
  'scared': { acronym: 'SCARED', titel: 'Childhood Anxiety Disorders (41 Items)', icon: '😨' },
  'crafft': { acronym: 'CRAFFT', titel: 'Substanzkonsum-Screening (6 Items)',     icon: '🌿' },
};
function getInstrumentInfo(id) {
  return INSTRUMENTS[id] || TRIAGE_INSTRUMENT_FALLBACK[id] || { acronym: id, titel: id, icon: '📋' };
}
function isInstrumentAvailable(id) {
  return !!INSTRUMENTS[id] && typeof INSTRUMENTS[id].eval === 'function';
}

// ─── Triage speichern ───────────────────────────────────────
function saveTriage() {
  if (!APP.schuelerId) { showToast('Kein Klient gewählt — bitte erst aus dem HUB öffnen.', 'info'); return; }
  const rec = getTriageRecommendations();
  const data = {
    bereich: triageState.bereich,
    dauer: triageState.dauer,
    beeintraechtigung: triageState.beeintraechtigung,
    risiken: [...triageState.risiken],
    kontext: [...triageState.kontext],
    recommendations: rec.sorted.map(r => r.id),
    crisisReasons: rec.crisisReasons,
    datum: new Date().toISOString(),
  };
  try {
    const all = JSON.parse(localStorage.getItem(TRIAGE_KEY) || '{}');
    all[APP.schuelerId] = data;
    localStorage.setItem(TRIAGE_KEY, JSON.stringify(all));
  } catch (e) {
    showToast('Speichern fehlgeschlagen', 'info');
    return;
  }

  if (rec.crisisReasons.length) {
    DB.addRisiko(APP.schuelerId, {
      sicherheit: 'rot',
      source: 'claro-triage',
      crisis: rec.crisisReasons,
    });
    Bridge.notify('crisis_alert', { schuelerId: APP.schuelerId, severity: 'high', source: 'triage' });
  }
  Bridge.notify('triage_completed', {
    schuelerId: APP.schuelerId,
    recommendations: data.recommendations,
    crisis: rec.crisisReasons.length > 0,
  });
  showToast('Triage gespeichert', 'ok');
  renderTriage();
}

function renderTriageResult() {
  const { sorted, crisisReasons, alleBeantwortet } = getTriageRecommendations();
  if (!alleBeantwortet) {
    const offen = [
      triageState.bereich === null && 'Bereich',
      triageState.dauer === null && 'Dauer',
      triageState.beeintraechtigung === null && 'Beeinträchtigung',
      triageState.risiken.size === 0 && 'Risiken',
      triageState.kontext.size === 0 && 'Kontext',
    ].filter(Boolean);
    return `<div class="dg-triage-pending">
      Noch offen: ${offen.map(t => Utils.escapeHtml(t)).join(' · ')}
    </div>`;
  }

  const dauerOpt = TRIAGE_FRAGEN[1].optionen.find(o => o.id === triageState.dauer);
  const sliderText = TRIAGE_FRAGEN[2].skalaText[triageState.beeintraechtigung] || '';
  const beeintraechtigungHigh = triageState.beeintraechtigung >= 7;

  return `
    <div class="dg-triage-result">
      <h3>📋 Empfohlene Screening-Instrumente</h3>

      ${crisisReasons.length ? `
        <div class="dg-triage-crisis">
          <div style="font-weight:700; font-size:15px; margin-bottom:4px;">⚠️ Akutes Risiko erkannt</div>
          <div style="margin-bottom:8px;">${crisisReasons.map(r => Utils.escapeHtml(r)).join(' · ')}</div>
          <div style="font-size:13px;">
            <strong>C-SSRS-Trigger:</strong> Columbia-Suicide-Severity-Rating-Scale durchführen.
            ${APP.schuelerId
              ? `<a href="../hub/?schueler=${APP.schuelerId}&view=crisis" class="btn" style="margin-left:8px;">→ C-SSRS im HUB</a>`
              : ''}
          </div>
        </div>
      ` : ''}

      <div style="font-size:13px; color: var(--text-muted); margin: var(--space-2) 0 var(--space-3);">
        Dauer: <strong>${Utils.escapeHtml(dauerOpt?.label || '—')}</strong> ·
        Beeinträchtigung: <strong>${triageState.beeintraechtigung}/10 (${Utils.escapeHtml(sliderText)})</strong>
        ${beeintraechtigungHigh ? ' · <span style="color:#DC2626; font-weight:600;">starke Funktionseinschränkung</span>' : ''}
      </div>
      ${dauerOpt?.hinweis ? `<div class="dg-triage-hinweis">💡 ${Utils.escapeHtml(dauerOpt.hinweis)}</div>` : ''}

      ${sorted.length === 0 ? `
        <p style="color: var(--text-muted); margin: var(--space-3) 0;">
          Kein spezifisches Instrument indiziert. Allgemeines SDQ-Screening als Übersicht erwägen.
        </p>
        <button class="btn" onclick="startScreening('sdq')">📋 SDQ starten</button>
      ` : `
        <div class="dg-triage-rec-list">
          ${sorted.map(rec => {
            const inst = getInstrumentInfo(rec.id);
            const verfuegbar = isInstrumentAvailable(rec.id);
            return `
              <div class="dg-triage-rec ${verfuegbar ? '' : 'unavailable'}">
                <div class="dg-triage-rec-head">
                  <div class="dg-triage-rec-acronym">${inst.icon || '📋'} ${Utils.escapeHtml(inst.acronym)}</div>
                  <div class="dg-triage-rec-score">${rec.score}× Trigger</div>
                </div>
                <div class="dg-triage-rec-titel">${Utils.escapeHtml(inst.titel)}</div>
                <ul class="dg-triage-rec-reasons">
                  ${rec.reasons.map(r => `<li>${Utils.escapeHtml(r)}</li>`).join('')}
                </ul>
                ${verfuegbar
                  ? `<button class="btn btn-primary" onclick="startScreening('${rec.id}')">→ ${Utils.escapeHtml(inst.acronym)} starten</button>`
                  : `<button class="btn" disabled title="Wird in einer späteren Iteration ergänzt">→ ${Utils.escapeHtml(inst.acronym)} (noch nicht verfügbar)</button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      `}

      <div style="margin-top: var(--space-4); display:flex; gap:var(--space-2); flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="saveTriage()" ${APP.schuelerId ? '' : 'disabled title="Kein Klient gewählt"'}>💾 Triage speichern</button>
        <button class="btn" onclick="resetTriage()">🔄 Triage zurücksetzen</button>
      </div>
    </div>
  `;
}

function renderTriage() {
  ensureTriageLoaded();
  const container = document.getElementById('dg-content');
  const beantwortet = [
    triageState.bereich !== null,
    triageState.dauer !== null,
    triageState.beeintraechtigung !== null,
    triageState.risiken.size > 0,
    triageState.kontext.size > 0,
  ].filter(Boolean).length;

  const saved = loadTriageForKlient(APP.schuelerId);
  const sliderF = TRIAGE_FRAGEN[2];
  const sliderVal = triageState.beeintraechtigung ?? sliderF.defaultValue;
  const sliderTextNow = sliderF.skalaText[sliderVal] || '';

  container.innerHTML = `
    <div class="dg-section">
      <h2>🎯 Triage — 5 Fragen in 3 Minuten</h2>
      <div class="dg-section-intro">
        Beantworte 5 kurze Fragen. CLARO berechnet, welche Screening-Instrumente
        wirklich nötig sind — und überspringt den Rest.
        ${saved
          ? `<div style="margin-top:6px; font-size:12px; color:var(--text-muted);">Zuletzt gespeichert: ${Utils.formatDate(saved.datum)}</div>`
          : ''}
      </div>

      <div class="dg-triage-progress">${beantwortet}/5 beantwortet</div>

      <!-- Q1: Bereich (single) -->
      <div class="dg-triage-frage ${triageState.bereich !== null ? 'answered' : ''}">
        <div class="dg-triage-num">1</div>
        <div class="dg-triage-text">${Utils.escapeHtml(TRIAGE_FRAGEN[0].frage)}</div>
        <div class="dg-triage-opts">
          ${TRIAGE_FRAGEN[0].optionen.map(o => `
            <button class="dg-triage-opt ${triageState.bereich === o.id ? 'selected' : ''}"
                    onclick="setTriageSingle('bereich', '${o.id}')">${Utils.escapeHtml(o.label)}</button>
          `).join('')}
        </div>
      </div>

      <!-- Q2: Dauer (single) -->
      <div class="dg-triage-frage ${triageState.dauer !== null ? 'answered' : ''}">
        <div class="dg-triage-num">2</div>
        <div class="dg-triage-text">${Utils.escapeHtml(TRIAGE_FRAGEN[1].frage)}</div>
        <div class="dg-triage-opts">
          ${TRIAGE_FRAGEN[1].optionen.map(o => `
            <button class="dg-triage-opt ${triageState.dauer === o.id ? 'selected' : ''}"
                    onclick="setTriageSingle('dauer', '${o.id}')">${Utils.escapeHtml(o.label)}</button>
          `).join('')}
        </div>
        ${triageState.dauer ? (() => {
          const opt = TRIAGE_FRAGEN[1].optionen.find(x => x.id === triageState.dauer);
          return opt?.hinweis ? `<div class="dg-triage-hinweis">💡 ${Utils.escapeHtml(opt.hinweis)}</div>` : '';
        })() : ''}
      </div>

      <!-- Q3: Beeinträchtigung (slider) -->
      <div class="dg-triage-frage ${triageState.beeintraechtigung !== null ? 'answered' : ''}">
        <div class="dg-triage-num">3</div>
        <div class="dg-triage-text">${Utils.escapeHtml(sliderF.frage)}</div>
        <div class="dg-triage-slider-row">
          <span class="dg-triage-slider-bound">0 keine</span>
          <input type="range" class="dg-triage-slider" id="dg-triage-slider-input"
                 min="0" max="10" value="${sliderVal}"
                 oninput="onTriageSliderInput(this.value)">
          <span class="dg-triage-slider-bound">10 extrem</span>
        </div>
        <div class="dg-triage-slider-display" id="dg-triage-slider-display">${sliderVal}/10 · ${Utils.escapeHtml(sliderTextNow)}</div>
        ${triageState.beeintraechtigung === null
          ? `<button class="btn btn-sm" style="margin-top:8px;" onclick="onTriageSliderInput(${sliderVal})">Wert übernehmen</button>`
          : ''}
      </div>

      <!-- Q4: Risiken (multi) -->
      <div class="dg-triage-frage ${triageState.risiken.size > 0 ? 'answered' : ''}">
        <div class="dg-triage-num">4</div>
        <div class="dg-triage-text">${Utils.escapeHtml(TRIAGE_FRAGEN[3].frage)}</div>
        <div class="dg-triage-opts">
          ${TRIAGE_FRAGEN[3].optionen.map(o => `
            <button class="dg-triage-opt dg-triage-multi ${triageState.risiken.has(o.id) ? 'selected' : ''} ${o.crisis ? 'crisis' : ''}"
                    onclick="toggleTriageMulti('risiken', '${o.id}')">
              <span class="dg-triage-multi-mark">${triageState.risiken.has(o.id) ? '✓' : '○'}</span>
              ${Utils.escapeHtml(o.label)}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Q5: Kontext (multi) -->
      <div class="dg-triage-frage ${triageState.kontext.size > 0 ? 'answered' : ''}">
        <div class="dg-triage-num">5</div>
        <div class="dg-triage-text">${Utils.escapeHtml(TRIAGE_FRAGEN[4].frage)}</div>
        <div class="dg-triage-opts">
          ${TRIAGE_FRAGEN[4].optionen.map(o => `
            <button class="dg-triage-opt dg-triage-multi ${triageState.kontext.has(o.id) ? 'selected' : ''}"
                    onclick="toggleTriageMulti('kontext', '${o.id}')">
              <span class="dg-triage-multi-mark">${triageState.kontext.has(o.id) ? '✓' : '○'}</span>
              ${Utils.escapeHtml(o.label)}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Empfehlungs-Block -->
      <div id="dg-triage-result-zone">${renderTriageResult()}</div>
    </div>
  `;
}

// ─── Live-Hypothesen-Panel (am Bildschirmrand) ──────────────
function updateHypPanel() {
  const panel = document.getElementById('dg-hyp-panel');
  if (!panel || !APP.schuelerId) { if (panel) panel.style.display = 'none'; return; }

  const hyps = Hypotheses.generate(APP.schuelerId);
  if (hyps.length === 0) { panel.style.display = 'none'; return; }

  panel.style.display = '';
  panel.innerHTML = `
    <div class="dg-hyp-panel-title">🧠 Live-Hypothesen</div>
    ${hyps.map(h => {
      const konfidenz = h.konfidenz || Math.min(95, 50 + (h.evidence?.length || 1) * 15);
      const farbe = konfidenz >= 70 ? '#DC2626' : konfidenz >= 50 ? '#F59E0B' : '#10B981';
      return `
        <div class="dg-hyp-mini">
          <div class="dg-hyp-mini-title">${Utils.escapeHtml(h.titel)}</div>
          <div class="dg-hyp-mini-bar"><div style="width: ${konfidenz}%; background: ${farbe};"></div></div>
          <div class="dg-hyp-mini-meta">${konfidenz}% · ${h.icd || ''}</div>
          ${h.sequenzierung ? `<div class="dg-hyp-mini-seq">${Utils.escapeHtml(h.sequenzierung)}</div>` : ''}
        </div>
      `;
    }).join('')}
  `;
}

// ─── Tab Routing ──────────────────────────────────────────────
function setTab(name) {
  APP.activeTab = name;
  document.querySelectorAll('.dg-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });

  const showPanel = (name === 'screening' || name === 'triage') && APP.schuelerId;
  const panel = document.getElementById('dg-hyp-panel');
  if (panel) panel.style.display = showPanel ? '' : 'none';
  if (showPanel) updateHypPanel();

  if (name === 'overview') renderOverview();
  else if (name === 'triage') renderTriage();
  else if (name === 'screening') renderScreeningList();
  else if (name === 'hypothesen') renderHypothesen();
  else if (name === '5p') {
    if (APP.schuelerId) FivePModel.load(APP.schuelerId);
    FivePModel.render();
  }
  else if (name === 'icd') ICDMapper.render();
  else if (name === 'verlauf') renderVerlauf();
}

// ─── Tab: Übersicht ──────────────────────────────────────────
function renderOverview() {
  const container = document.getElementById('dg-content');
  if (!APP.schuelerId) {
    container.innerHTML = `
      <div style="max-width: 680px; margin: 3rem auto; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 1.5rem;">🔍</div>
        <h2 style="font-family: var(--font-serif, Georgia); font-size: 2rem; font-weight: 400; letter-spacing: -0.03em; margin-bottom: 1rem; color: #0a0a14;">
          Willkommen in <em style="color: #c64f3d;">CLARO</em>
        </h2>
        <p style="font-size: 1.0625rem; color: rgba(10,10,20,0.55); line-height: 1.7; max-width: 48ch; margin: 0 auto 2.5rem; font-weight: 300;">
          Adaptive Diagnostik für die Jugendhilfe. Starte mit einem Klienten aus dem HUB — oder wähle direkt ein Screening-Instrument.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; text-align: left; margin-bottom: 2rem;">
          <a href="../hub/" style="text-decoration: none; padding: 1.25rem; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);"
             onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'">
            <div style="font-size: 24px; margin-bottom: 0.5rem;">🏠</div>
            <div style="font-family: var(--font-serif, Georgia); font-weight: 500; font-size: 1rem; color: #0a0a14;">Klient wählen</div>
            <div style="font-size: 0.8125rem; color: rgba(10,10,20,0.45); margin-top: 0.25rem;">Im HUB einen Klienten öffnen</div>
          </a>
          <div style="padding: 1.25rem; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);"
               onclick="setTab('triage')"
               onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'">
            <div style="font-size: 24px; margin-bottom: 0.5rem;">🎯</div>
            <div style="font-family: var(--font-serif, Georgia); font-weight: 500; font-size: 1rem; color: #0a0a14;">Triage starten</div>
            <div style="font-size: 0.8125rem; color: rgba(10,10,20,0.45); margin-top: 0.25rem;">5 Fragen, 3 Minuten</div>
          </div>
          <div style="padding: 1.25rem; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);"
               onclick="setTab('screening')"
               onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'" onmouseout="this.style.transform='';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'">
            <div style="font-size: 24px; margin-bottom: 0.5rem;">📋</div>
            <div style="font-family: var(--font-serif, Georgia); font-weight: 500; font-size: 1rem; color: #0a0a14;">Direkt screenen</div>
            <div style="font-size: 0.8125rem; color: rgba(10,10,20,0.45); margin-top: 0.25rem;">PHQ-A, GAD-7, PCL-5, SDQ</div>
          </div>
        </div>

        <div style="font-family: var(--font-mono, monospace); font-size: 0.6875rem; color: rgba(10,10,20,0.3); letter-spacing: 0.08em; text-transform: uppercase;">
          6 validierte Instrumente · 18 Hypothesen-Regeln · ICD-11
        </div>
      </div>
    `;
    return;
  }

  const s = DB.getSchuelerById(APP.schuelerId);
  const screenings = DB.getScreenings(APP.schuelerId).filter(x => x.abgeschlossen)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const ff = DB.getFallformulierung(APP.schuelerId);

  const aceCount = (s?.anamnese || []).filter(id => id.startsWith('ace_')).length;

  container.innerHTML = `
    <div class="dg-section">
      <h2>📋 Diagnostik-Übersicht: ${Utils.escapeHtml(`${s?.vorname || ''} ${s?.nachname || ''}`.trim() || 'Klient')}</h2>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3); margin-top: var(--space-4);">
        <div class="dg-instrument" style="cursor: default;">
          <div class="dg-instrument-acronym">ACE</div>
          <div class="dg-score-display" style="color: ${aceCount >= 4 ? 'var(--danger)' : 'var(--text)'};">${aceCount}/10</div>
          <div style="font-size: 13px; color: var(--text-muted);">Adverse Childhood Experiences</div>
        </div>
        <div class="dg-instrument" style="cursor: default;">
          <div class="dg-instrument-acronym">SCR</div>
          <div class="dg-score-display">${screenings.length}</div>
          <div style="font-size: 13px; color: var(--text-muted);">Screenings abgeschlossen</div>
        </div>
        <div class="dg-instrument" style="cursor: default;">
          <div class="dg-instrument-acronym">5P</div>
          <div class="dg-score-display">${ff ? '✓' : '–'}</div>
          <div style="font-size: 13px; color: var(--text-muted);">Fallformulierung</div>
        </div>
      </div>

      <div style="margin-top: var(--space-5); display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="setTab('screening')">+ Neues Screening</button>
        <button class="btn" onclick="setTab('hypothesen')">🧠 Hypothesen anzeigen</button>
        <button class="btn" onclick="setTab('5p')">📐 5P-Fallformulierung</button>
      </div>

      ${screenings.length ? `
        <h3 style="margin-top: var(--space-5);">Letzte Screenings</h3>
        ${screenings.slice(0, 5).map(s => `
          <div class="dg-hypothesis">
            <div style="display: flex; justify-content: space-between;">
              <div class="dg-hypothesis-title">${Utils.formatDate(s.datum)}</div>
              <div style="font-size: 13px; color: var(--text-muted);">${Object.keys(s.scores || {}).length} Instrumente</div>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: var(--space-2);">
              ${Object.entries(s.scores || {}).map(([id, val]) => {
                const inst = INSTRUMENTS[id];
                return `<span style="display: inline-block; padding: 2px 8px; background: var(--bg-subtle); border-radius: var(--radius-full); margin-right: 4px; font-size: 12px;">${inst ? inst.acronym : id}: ${val.score}</span>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      ` : `<div style="padding: var(--space-5); background: var(--bg-subtle); border-radius: var(--radius); text-align: center;">
          <div style="font-size: 32px; margin-bottom: var(--space-2);">🎯</div>
          <h3>Noch kein Screening</h3>
          <p style="color: var(--text-secondary); margin: var(--space-2) 0 var(--space-3);">
            Starte mit den <strong>5 Triage-Fragen</strong> (3 Minuten) — CLARO empfiehlt dann die richtigen Instrumente.
          </p>
          <button class="btn btn-primary" onclick="setTab('triage')">🎯 Triage starten</button>
        </div>`}

      ${(() => {
        const hyps = Hypotheses.generate(APP.schuelerId);
        if (!hyps.length) return '';
        return `
          <h3 style="margin-top: var(--space-5);">🧠 Aktuelle Hypothesen (${hyps.length})</h3>
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${hyps.slice(0, 4).map(h => {
              const farbe = h.konfidenz >= 70 ? '#DC2626' : h.konfidenz >= 50 ? '#F59E0B' : '#10B981';
              return `<div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid ${farbe}; cursor: pointer;" onclick="setTab('hypothesen')">
                <span style="font-size: 14px;">
                  ${h.status ? `<span style="font-size: 10px; padding: 1px 6px; border-radius: 4px; background: ${h.status === 'BESTÄTIGT' ? '#D1FAE5' : h.status === 'VORLÄUFIG' ? '#FEF3C7' : '#DBEAFE'}; margin-right: 4px;">${h.status}</span>` : ''}
                  ${Utils.escapeHtml(h.titel)}
                </span>
                <span style="font-size: 13px; font-weight: 700; color: ${farbe};">${h.konfidenz}%</span>
              </div>`;
            }).join('')}
          </div>
          ${hyps.length > 4 ? `<div style="font-size: 13px; color: var(--text-muted); margin-top: var(--space-2); cursor: pointer;" onclick="setTab('hypothesen')">+ ${hyps.length - 4} weitere →</div>` : ''}
        `;
      })()}
    </div>
  `;
}

// ─── Tab: Screening (Liste oder Wizard) ──────────────────────
// Hauptinstrumente in der von Tab 2 spezifizierten Reihenfolge
const PRIMARY_INSTRUMENTS = ['phq-a', 'gad-7', 'pcl-5', 'sdq', 'crafft', 'scared'];

function renderInstrumentCard(inst) {
  return `
    <div class="dg-instrument" onclick="startScreening('${inst.id}')">
      <div class="dg-instrument-header">
        <span style="font-size: 24px;">${inst.icon}</span>
        <span class="dg-instrument-acronym">${inst.acronym}</span>
      </div>
      <div class="dg-instrument-title">${Utils.escapeHtml(inst.titel)}</div>
      ${inst.kurzbeschreibung
        ? `<div class="dg-instrument-desc">${Utils.escapeHtml(inst.kurzbeschreibung)}</div>`
        : `<div class="dg-instrument-desc">${inst.items.length} Items · ${Utils.escapeHtml(inst.timeFrame || '')}</div>`}
      <div class="dg-instrument-meta">
        <span>📋 ${inst.items.length} Items</span>
        <span>⏱️ ~${Math.ceil(inst.items.length * 0.4)} min</span>
        <span>ICD: ${inst.icd.join(', ')}</span>
      </div>
      ${inst.quelle ? `<div class="dg-instrument-quelle">📚 ${Utils.escapeHtml(inst.quelle)}</div>` : ''}
    </div>
  `;
}

function renderScreeningList() {
  const container = document.getElementById('dg-content');
  const primary = PRIMARY_INSTRUMENTS
    .map(id => INSTRUMENT_LIST.find(i => i.id === id))
    .filter(Boolean);
  const extras = INSTRUMENT_LIST.filter(i => !PRIMARY_INSTRUMENTS.includes(i.id));

  container.innerHTML = `
    <div class="dg-section">
      <h2>🔍 Screening-Instrumente</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        ${primary.length} validierte Hauptinstrumente${extras.length ? ` · ${extras.length} weitere` : ''}.
        Klick auf eine Karte startet den Screening-Wizard.
      </p>
      <div class="dg-instrument-grid">
        ${primary.map(renderInstrumentCard).join('')}
      </div>
      ${extras.length ? `
        <h3 style="margin-top: var(--space-5);">Weitere Instrumente</h3>
        <div class="dg-instrument-grid">
          ${extras.map(renderInstrumentCard).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function startScreening(instrumentId) {
  APP.currentInstrument = INSTRUMENTS[instrumentId];
  if (!APP.currentInstrument) return;
  APP.currentInstrument.id = instrumentId;
  APP.scores = {};
  renderScreeningWizard();
}

function setItemScore(idx, val) {
  APP.scores[idx] = val;
  renderScreeningWizard();
}

function renderScreeningWizard() {
  const inst = APP.currentInstrument;
  const allAnswered = inst.items.every((_, i) => APP.scores[i] !== undefined);
  const result = allAnswered ? inst.eval(APP.scores) : null;

  const container = document.getElementById('dg-content');
  container.innerHTML = `
    <button class="btn" onclick="setTab('screening')" style="margin-bottom: var(--space-3);">← Zurück zur Liste</button>
    <div class="dg-section">
      <div style="display: flex; gap: var(--space-3); align-items: center; margin-bottom: var(--space-3);">
        <div style="font-size: 32px;">${inst.icon}</div>
        <div>
          <h2 style="margin: 0;">${inst.acronym} — ${Utils.escapeHtml(inst.titel)}</h2>
          <div style="color: var(--text-muted); font-size: 14px;">${inst.timeFrame || ''} · ${inst.items.length} Items</div>
        </div>
      </div>

      ${inst.intro ? `<div style="background: var(--info-50); border-left: 4px solid var(--info); padding: var(--space-3); margin-bottom: var(--space-4); font-size: 14px;">${Utils.escapeHtml(inst.intro)}</div>` : ''}

      <div class="dg-progress" style="margin-bottom: var(--space-4);">
        <div class="dg-progress-fill" style="width: ${Object.keys(APP.scores).length / inst.items.length * 100}%;"></div>
      </div>

      ${inst.items.map((q, i) => {
        const isCritical = q.includes('Critical Item') || q.includes('tot wärest');
        const isPositiveCritical = isCritical && APP.scores[i] >= 1;
        return `
        <div class="dg-item" style="${isPositiveCritical ? 'border: 2px solid #DC2626; background: #FEE2E2;' : ''}${isCritical ? 'border-left: 4px solid #DC2626;' : ''}">
          <div class="dg-item-num" style="${isCritical ? 'color: #DC2626;' : ''}">Item ${i + 1}${isCritical ? ' ⚠️' : ''}</div>
          <div class="dg-item-text">${Utils.escapeHtml(q)}</div>
          ${isPositiveCritical ? '<div style="font-size: 12px; color: #DC2626; font-weight: 700; margin-bottom: 4px;">⚠️ KRITISCHES ITEM POSITIV — C-SSRS durchführen</div>' : ''}
          <div class="dg-item-opts">
            ${Object.entries(inst.skala).map(([val, label]) => `
              <button class="dg-item-opt ${APP.scores[i] == val ? 'selected' : ''}" onclick="setItemScore(${i}, ${val})">
                <span class="dg-item-opt-val">${val}</span>
                <span>${Utils.escapeHtml(label)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `}).join('')}

      ${result ? renderScreeningResult(result, inst) : `
        <div style="text-align: center; color: var(--text-muted); margin-top: var(--space-4);">
          ${Object.keys(APP.scores).length} / ${inst.items.length} beantwortet
        </div>
      `}
    </div>
  `;
}

// ─── Wizard-Result-Renderer (Severity-Badge, Subscales, Flags) ──
const SEVERITY_LABEL_DE = {
  minimal: 'Minimal', leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer', kritisch: 'Kritisch',
};

function renderSeverityBadge(result) {
  const key = result.severityLabel || ({
    low: 'minimal', mod: 'leicht', high: 'schwer', critical: 'kritisch',
  })[result.severity] || 'minimal';
  return `<span class="dg-severity-badge dg-sev-${key}">${SEVERITY_LABEL_DE[key] || key}</span>`;
}

function renderSubscalesBlock(instId, result) {
  let title, rows;
  if (instId === 'sdq') {
    title = 'SDQ-Subskalen (Goodman 1997, Normwerte Selbstauskunft 11-17J)';
    rows = [
      ['Emotional',  result.subscales.emotional, result.subCutoffs?.emotional],
      ['Conduct',    result.subscales.conduct,   result.subCutoffs?.conduct],
      ['Hyperaktiv', result.subscales.hyperact,  result.subCutoffs?.hyperact],
      ['Peer',       result.subscales.peer,      result.subCutoffs?.peer],
      ['Prosozial',  result.subscales.prosocial, result.subCutoffs?.prosocial],
    ];
  } else if (instId === 'scared') {
    title = 'SCARED-Subskalen (Birmaher et al. 1999, Cutoffs: Panik≥7 · GAD≥9 · SAD≥5 · SoPh≥8 · Schule≥3)';
    rows = [
      ['Panik / Somatisch', result.subscales.panic,  result.subCutoffs?.panic],
      ['GAD',                result.subscales.gad,    result.subCutoffs?.gad],
      ['Trennungsangst',    result.subscales.sad,    result.subCutoffs?.sad],
      ['Soziale Phobie',    result.subscales.social, result.subCutoffs?.social],
      ['Schulvermeidung',   result.subscales.school, result.subCutoffs?.school],
    ];
  } else {
    return '';
  }
  return `
    <div class="dg-result-detail">
      <strong>${Utils.escapeHtml(title)}:</strong>
      <div class="dg-subscale-grid">
        ${rows.map(([label, val, cutoff]) => {
          const farbe = cutoff === 'auffällig' ? '#DC2626' : cutoff === 'grenzwertig' ? '#F59E0B' : '#10B981';
          return `
            <div class="dg-subscale" style="border-left-color:${farbe};">
              <div class="dg-subscale-label">${Utils.escapeHtml(label)}</div>
              <div class="dg-subscale-val" style="color:${farbe};">${val}</div>
              <div class="dg-subscale-cutoff" style="color:${farbe};">${Utils.escapeHtml(cutoff || '')}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderScreeningResult(result, inst) {
  const isCritical = result.severity === 'critical';
  const showCSSRS = isCritical || result.flagSuicide;
  return `
    <div class="dg-result severity-${result.severity}">
      <div class="dg-result-header">
        <div class="dg-result-eyebrow">Auswertung</div>
        ${renderSeverityBadge(result)}
      </div>
      <div class="dg-score-display">${result.score} / ${result.max}</div>
      <h3 class="dg-result-text">${Utils.escapeHtml(result.label)}</h3>

      ${showCSSRS ? `
        <div class="dg-result-alert">
          <div class="dg-result-alert-title">⚠️ ${result.flagSuicide ? 'Suizidalität geflaggt' : 'Kritischer Wert'}</div>
          <p>Strukturierte Risiko-Abklärung indiziert. C-SSRS (Columbia-Suicide-Severity-Rating-Scale) durchführen.
          ${result.flagSuicide ? ' Direktes Ansprechen erhöht das Risiko NICHT (Dazzi et al. 2014).' : ''}</p>
          ${APP.schuelerId
            ? `<a class="btn btn-primary" href="../hub/?schueler=${APP.schuelerId}&view=crisis" target="_blank">→ C-SSRS im HUB starten</a>`
            : `<span style="font-size:12px; color:var(--text-muted);">Klient aus HUB öffnen, um C-SSRS zu starten.</span>`}
        </div>
      ` : ''}

      ${result.flagHighRisk ? `
        <div class="dg-result-detail" style="border-left:3px solid #DC2626;">
          <strong>Hochrisiko-Marker (CRAFFT):</strong>
          <ul style="margin: var(--space-2) 0 0; padding-left: var(--space-4); font-size: 13px;">
            ${result.carRisk  ? '<li>🚗 Mitfahrt mit intoxiziertem Fahrer (Item 1 / C)</li>' : ''}
            ${result.blackout ? '<li>💭 Blackout während Konsum (Item 4 / F — Kontrollverlust)</li>' : ''}
          </ul>
        </div>
      ` : ''}

      ${result.dsm5 ? `
        <div class="dg-result-detail">
          <strong>DSM-5 Kriterien-Prüfung (Weathers et al. 2013):</strong>
          <div class="dg-dsm5-grid">
            <span>${result.dsm5.critB ? '✅' : '❌'} Kriterium B (Wiedererleben)</span>
            <span>${result.dsm5.critC ? '✅' : '❌'} Kriterium C (Vermeidung)</span>
            <span>${result.dsm5.critD ? '✅' : '❌'} Kriterium D (Neg. Kognition)</span>
            <span>${result.dsm5.critE ? '✅' : '❌'} Kriterium E (Arousal)</span>
          </div>
          <div class="dg-dsm5-summary" style="color:${result.dsm5.met ? '#DC2626' : '#F59E0B'};">
            ${result.dsm5.met ? 'Alle 4 DSM-5-Kriterien erfüllt → PTBS wahrscheinlich' : 'Nicht alle Kriterien erfüllt → Differentialdiagnostik empfohlen'}
          </div>
        </div>
      ` : ''}

      ${result.subscales ? renderSubscalesBlock(inst.id, result) : ''}

      ${inst.quelle ? `<div class="dg-result-quelle">📚 ${Utils.escapeHtml(inst.quelle)}</div>` : ''}

      <div class="dg-result-actions">
        ${APP.schuelerId ? `<button class="btn btn-primary" onclick="saveScreening()">💾 Im Klient-Profil speichern</button>` : ''}
        <button class="btn" onclick="startScreening('${inst.id}')">🔄 Neu starten</button>
        <button class="btn" onclick="setTab('screening')">← Zurück zur Liste</button>
      </div>
    </div>
  `;
}

function saveScreening() {
  if (!APP.schuelerId) { showToast('Kein Klient gewählt', 'info'); return; }
  const inst = APP.currentInstrument;
  const result = inst.eval(APP.scores);
  result.item9 = APP.scores[8] || 0; // PHQ-A

  // Hole oder erstelle Screening-Eintrag für heute
  const heute = new Date().toISOString().split('T')[0];
  const all = DB.getScreenings(APP.schuelerId);
  let entry = all.find(e => e.datum?.startsWith(heute));
  if (!entry) {
    entry = DB.createScreening(APP.schuelerId);
  }

  entry.scores = entry.scores || {};
  entry.scores[inst.id] = result;
  entry.antworten = entry.antworten || {};
  entry.antworten[inst.id] = APP.scores;
  entry.abgeschlossen = true;
  entry.severity = entry.severity || result.severity;
  if (result.severity === 'critical' || result.severity === 'high') entry.severity = result.severity;

  DB.saveScreening(entry);

  // Risiko-Eintrag bei kritischen Werten
  if (result.flagSuicide) {
    DB.addRisiko(APP.schuelerId, { sicherheit: 'rot', source: 'phq-a-item9', score: result.score });
    Bridge.notify('crisis_alert', { schuelerId: APP.schuelerId, severity: 'high', source: inst.id });
  }

  Bridge.notify('screening_completed', { schuelerId: APP.schuelerId, instrumentId: inst.id, score: result.score });

  // Auto-5P: Fallformulierung im Hintergrund aktualisieren (Manifest-Feature)
  if (APP.schuelerId && FivePModel.autoPopulate) {
    const changed = FivePModel.autoPopulate(APP.schuelerId);
    if (changed) showToast('Screening gespeichert + 5P automatisch aktualisiert', 'ok');
    else showToast('Screening gespeichert', 'ok');
  } else {
    showToast('Screening gespeichert', 'ok');
  }
  updateHypPanel();
  setTab('overview');
}

// ─── Differentialdiagnose-Rad (Manifest: visuell) ────────────
function renderDiffRad(hyps) {
  const top = hyps.slice(0, 6);
  const n = top.length;
  const cx = 140, cy = 140, r = 110;
  const farben = ['#DC2626', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  const segments = top.map((h, i) => {
    const startAngle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const konfR = r * (h.konfidenz || 50) / 100;
    const x1 = cx + konfR * Math.cos(startAngle);
    const y1 = cy + konfR * Math.sin(startAngle);
    const x2 = cx + konfR * Math.cos(endAngle);
    const y2 = cy + konfR * Math.sin(endAngle);
    const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = r + 20;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const anchor = lx > cx ? 'start' : 'end';

    return `
      <path d="M${cx},${cy} L${x1},${y1} A${konfR},${konfR} 0 ${largeArc},1 ${x2},${y2} Z"
            fill="${farben[i]}30" stroke="${farben[i]}" stroke-width="2"/>
      <text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="${farben[i]}" font-size="11" font-weight="600"
            dominant-baseline="middle">${Utils.escapeHtml(h.titel.split('(')[0].trim().slice(0, 20))} ${h.konfidenz || 50}%</text>
    `;
  }).join('');

  return `
    <div class="dg-diff-rad">
      <h3>🔄 Differentialdiagnose-Rad</h3>
      <div style="text-align: center; margin: var(--space-3) 0;">
        <svg width="340" height="340" viewBox="0 0 340 340">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4"/>
          <circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="none" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,4"/>
          ${segments}
          <circle cx="${cx}" cy="${cy}" r="4" fill="var(--text)"/>
        </svg>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); text-align: center;">
        Radius = Konfidenz. Größere Segmente = wahrscheinlichere Hypothesen.
      </div>
    </div>
  `;
}

// ─── Tab: Hypothesen ─────────────────────────────────────────
function renderHypothesen() {
  const container = document.getElementById('dg-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="dg-section"><h2>🧠 Hypothesen</h2><p>Kein Klient gewählt.</p></div>`;
    return;
  }
  const hyps = Hypotheses.generate(APP.schuelerId);
  container.innerHTML = `
    <div class="dg-section">
      <h2>🧠 Klinische Hypothesen</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        Auto-generiert aus Screenings, Anamnese und ACE-Score. Regelbasierte Engine mit Begründung.
      </p>
      ${hyps.length >= 2 ? renderDiffRad(hyps) : ''}

      ${hyps.length === 0
        ? `<div class="pw-empty"><div class="pw-empty-icon">🤷</div><p>Keine Hypothesen — führe Screenings durch und ergänze die Anamnese.</p></div>`
        : hyps.map(h => {
            const konfidenz = h.konfidenz || 50;
            const farbe = konfidenz >= 70 ? '#DC2626' : konfidenz >= 50 ? '#F59E0B' : '#10B981';
            return `
              <div class="dg-hypothesis">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="dg-hypothesis-title">
                    ${h.status ? `<span class="dg-hyp-status dg-hyp-status-${(h.status || '').toLowerCase()}">${h.status}</span> ` : ''}
                    ${Utils.escapeHtml(h.titel)} ${h.icd ? `<span style="font-size: 12px; color: var(--text-muted);">[${h.icd}]</span>` : ''}
                  </div>
                  <div class="dg-konfidenz" style="color: ${farbe}; font-weight: var(--font-weight-bold);">
                    ${konfidenz}%
                    <div class="dg-konfidenz-bar"><div style="width:${konfidenz}%;background:${farbe};height:100%;border-radius:4px;"></div></div>
                  </div>
                </div>
                <div class="dg-hypothesis-evidence">${h.rationale}</div>
                ${h.sequenzierung ? `<div class="dg-hypothesis-seq">⚡ ${Utils.escapeHtml(h.sequenzierung)}</div>` : ''}
                ${h.themen ? `<div class="dg-hypothesis-rationale"><strong>Themen-Empfehlungen:</strong> ${h.themen.join(' · ')}</div>` : ''}
              </div>
            `;
          }).join('')
      }
      ${hyps.length ? `
        <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
          <button class="btn btn-primary" onclick="setTab('5p')">→ In 5P-Fallformulierung übernehmen</button>
          <a class="btn" href="../codex/?suche=${hyps[0]?.themen?.[0] || ''}" target="_blank">→ Materialien in CODEX</a>
          <a class="btn" href="../via/?schueler=${APP.schuelerId}" target="_blank">→ Plan in VIA</a>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── Tab: Verlauf (T1/T2/T3) ─────────────────────────────────
function renderVerlauf() {
  const container = document.getElementById('dg-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="dg-section"><h2>📈 Verlauf</h2><p>Kein Klient gewählt.</p></div>`;
    return;
  }
  const screenings = DB.getScreenings(APP.schuelerId)
    .filter(x => x.abgeschlossen)
    .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));

  if (screenings.length === 0) {
    container.innerHTML = `<div class="dg-section"><h2>📈 Verlauf</h2><p>Noch keine abgeschlossenen Screenings.</p></div>`;
    return;
  }

  // Pro Instrument: Verlaufsserie aufbauen
  const series = {};
  screenings.forEach(scr => {
    Object.entries(scr.scores || {}).forEach(([instId, val]) => {
      if (!series[instId]) series[instId] = [];
      series[instId].push({ datum: scr.datum, score: val.score, max: val.max });
    });
  });

  container.innerHTML = `
    <div class="dg-section">
      <h2>📈 Verlauf — ${screenings.length} Messzeitpunkt(e)</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        Zeitlicher Verlauf der Screening-Scores. Sinkende Scores = Verbesserung.
      </p>
      ${Object.entries(series).map(([instId, points]) => {
        const inst = INSTRUMENTS[instId];
        if (!inst) return '';
        const maxBar = Math.max(...points.map(p => p.score));
        return `
          <div style="margin-bottom: var(--space-4);">
            <h3>${inst.icon} ${inst.acronym} — ${inst.titel}</h3>
            <div class="dg-verlauf-chart">
              ${points.map((p, i) => `
                <div class="dg-verlauf-col">
                  <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px;">${p.score}</div>
                  <div class="dg-verlauf-bar" style="height: ${p.score / p.max * 100}%;" title="T${i+1}: ${p.score}/${p.max}"></div>
                  <div class="dg-verlauf-label">T${i+1}<br>${Utils.formatDate(p.datum, { short: true })}</div>
                </div>
              `).join('')}
            </div>
            ${points.length >= 2 ? (() => {
              const delta = points.at(-1).score - points[0].score;
              // RCI nach Jacobson & Truax (1991): RCI = (X2-X1) / Sdiff
              // Sdiff = sqrt(2 * SE²), SE = SD * sqrt(1-r)
              // Vereinfachte SE-Werte aus Validierungsstudien:
              const seMap = { 'phq-a': 3.5, 'gad-7': 2.5, 'pcl-5': 8.0, 'sdq': 4.0, 'asrs': 3.0, 'scoff': 0.8 };
              const se = seMap[instId] || 3.0;
              const sdiff = Math.sqrt(2 * se * se);
              const rci = Math.abs(delta) / sdiff;
              const significant = rci >= 1.96;
              const improved = delta < 0 && significant;
              const deteriorated = delta > 0 && significant;

              return `
                <div style="font-size: 13px; margin-top: var(--space-2); padding: var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid ${improved ? '#10B981' : deteriorated ? '#DC2626' : '#F59E0B'};">
                  <div>
                    <strong>Δ T1→T${points.length}:</strong> ${delta >= 0 ? '+' : ''}${delta}
                    · <strong>RCI: ${rci.toFixed(2)}</strong>
                    ${significant ? ' (p < .05)' : ' (n.s.)'}
                  </div>
                  <div style="margin-top: 4px; color: ${improved ? '#059669' : deteriorated ? '#DC2626' : '#92400E'}; font-weight: 600;">
                    ${improved ? '✅ Reliable Improvement — klinisch signifikante Verbesserung (Jacobson & Truax 1991)' :
                      deteriorated ? '⚠️ Reliable Deterioration — klinisch signifikante Verschlechterung' :
                      '→ Veränderung innerhalb der Messfehler-Schwelle (nicht signifikant)'}
                  </div>
                </div>
              `;
            })() : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── Klient-Kontext ──────────────────────────────────────────
function updateContext() {
  const el = document.getElementById('dg-context');
  if (!APP.schuelerId) { el.textContent = '— ohne Klient —'; return; }
  const s = DB.getSchuelerById(APP.schuelerId);
  if (s) el.textContent = `👤 ${(s.vorname || '') + ' ' + (s.nachname || '')}`.trim();
  else el.textContent = `👤 Klient ${APP.schuelerId.slice(-4)}`;
}

// ─── Bridge ──────────────────────────────────────────────────
Bridge.subscribe('schueler_updated', e => {
  if (e.schuelerId === APP.schuelerId) {
    if (APP.activeTab === 'overview') renderOverview();
  }
});

// ─── Bootstrap ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  const params = Bridge.parseQuery();
  if (params.schueler) APP.schuelerId = params.schueler;
  updateContext();
  if (params.action === 'neu_screening') setTab('screening');
  else setTab('overview');
});
