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

// ─── 5 Triage-Fragen (Manifest: adaptive Diagnostik) ────────
const TRIAGE_FRAGEN = [
  { id: 'stimmung', frage: 'Wie ist die Stimmung des Klienten aktuell?', optionen: [
    { label: 'Unauffällig', domaenen: [] },
    { label: 'Gedrückt / traurig', domaenen: ['phq-a'] },
    { label: 'Ängstlich / angespannt', domaenen: ['gad-7'] },
    { label: 'Gereizt / aggressiv', domaenen: ['sdq'] },
  ]},
  { id: 'stimmung_dauer', frage: 'Seit wann?', bedingung: () => triageAntworten.stimmung >= 1,
    optionen: [
      { label: '< 2 Wochen (situativ)', domaenen: [], hinweis: 'Möglicherweise Anpassungsreaktion' },
      { label: '2-4 Wochen', domaenen: [], hinweis: 'Klinisch relevant' },
      { label: '> 1 Monat (anhaltend)', domaenen: ['phq-a', 'gad-7'], hinweis: 'Chronifizierung möglich' },
    ]},
  { id: 'trauma', frage: 'Gibt es Hinweise auf belastende Erlebnisse (Gewalt, Verlust, Unfall)?', optionen: [
    { label: 'Nein / unklar', domaenen: [] },
    { label: 'Ja — aktive Symptome (Flashbacks, Alpträume, Vermeidung)', domaenen: ['pcl-5'] },
    { label: 'Ja — aber aktuell stabil', domaenen: [] },
  ]},
  { id: 'trauma_typ', frage: 'Welche Art?', bedingung: () => triageAntworten.trauma >= 1,
    optionen: [
      { label: 'Einmaliges Ereignis (Unfall, Tod, Überfall)', domaenen: ['pcl-5'], hinweis: 'Typ-I Trauma → Exposition nach Stabilisierung' },
      { label: 'Wiederholte / langfristige Belastung (Missbrauch, Gewalt zu Hause)', domaenen: ['pcl-5'], hinweis: 'Mögliche KPTBS → Stabilisierung priorisieren' },
    ]},
  { id: 'verhalten', frage: 'Fallen externalisierende Verhaltensweisen auf?', optionen: [
    { label: 'Nein', domaenen: [] },
    { label: 'Konzentration / Unruhe / Zappeligkeit', domaenen: ['asrs'] },
    { label: 'Regelverstöße / Aggression / Lügen', domaenen: ['sdq'] },
    { label: 'Beides (Konzentration + Verhalten)', domaenen: ['asrs', 'sdq'] },
  ]},
  { id: 'schule', frage: 'Gibt es Schulprobleme?', optionen: [
    { label: 'Nein', domaenen: [] },
    { label: 'Absentismus (fehlt häufig)', domaenen: ['gad-7'], hinweis: 'Schulphobie vs. Schulverweigerung abklären' },
    { label: 'Leistungseinbruch', domaenen: ['phq-a'], hinweis: 'Depression? Konzentration? Familiärer Stress?' },
    { label: 'Mobbing', domaenen: ['gad-7', 'sdq'], hinweis: 'Soziale Angst + Conduct prüfen' },
  ]},
  { id: 'essen', frage: 'Gibt es Auffälligkeiten beim Essverhalten?', optionen: [
    { label: 'Nein', domaenen: [] },
    { label: 'Ja — Gewichtsverlust / restriktiv', domaenen: ['scoff'] },
    { label: 'Ja — Essattacken / Erbrechen', domaenen: ['scoff'] },
  ]},
  { id: 'suizid', frage: 'Wurden Suizidgedanken oder Selbstverletzung geäußert?', optionen: [
    { label: 'Nein', domaenen: [] },
    { label: 'Ja — aktuell', domaenen: ['phq-a'], crisis: true },
    { label: 'Ja — in der Vergangenheit', domaenen: ['phq-a'] },
  ]},
];

let triageAntworten = {};

function setTriageAntwort(frageId, optIdx) {
  triageAntworten[frageId] = optIdx;
  renderTriage();
}

function getTriageEmpfehlungen() {
  const empfohlen = new Set();
  let crisisFlag = false;
  TRIAGE_FRAGEN.forEach(f => {
    const idx = triageAntworten[f.id];
    if (idx !== undefined) {
      const opt = f.optionen[idx];
      opt.domaenen.forEach(d => empfohlen.add(d));
      if (opt.crisis) crisisFlag = true;
    }
  });
  const sichtbare = TRIAGE_FRAGEN.filter(f => !f.bedingung || f.bedingung());
  const alleBeantwortet = sichtbare.every(f => triageAntworten[f.id] !== undefined);
  return { empfohlen: [...empfohlen], crisisFlag, alleBeantwortet };
}

function renderTriage() {
  const container = document.getElementById('dg-content');
  const { empfohlen, crisisFlag, alleBeantwortet } = getTriageEmpfehlungen();
  const beantwortet = Object.keys(triageAntworten).length;

  container.innerHTML = `
    <div class="dg-section">
      <h2>🎯 Triage — 5 Fragen in 3 Minuten</h2>
      <div class="dg-section-intro">
        Beantworte 5 kurze Fragen. CLARO berechnet dann, welche Screening-Instrumente
        wirklich nötig sind — und überspringt den Rest. <strong>Nur die richtigen Fragen, nie alle.</strong>
      </div>

      <div class="dg-triage-progress">${beantwortet}/${TRIAGE_FRAGEN.filter(f => !f.bedingung || f.bedingung()).length} beantwortet</div>

      ${TRIAGE_FRAGEN.filter(f => !f.bedingung || f.bedingung()).map((f, fi) => {
        const gewaehlt = triageAntworten[f.id];
        const gewaehlteOpt = gewaehlt !== undefined ? f.optionen[gewaehlt] : null;
        return `
          <div class="dg-triage-frage ${gewaehlt !== undefined ? 'answered' : ''}">
            <div class="dg-triage-num">${fi + 1}</div>
            <div class="dg-triage-text">${Utils.escapeHtml(f.frage)}</div>
            <div class="dg-triage-opts">
              ${f.optionen.map((opt, oi) => `
                <button class="dg-triage-opt ${gewaehlt === oi ? 'selected' : ''}"
                        onclick="setTriageAntwort('${f.id}', ${oi})">
                  ${Utils.escapeHtml(opt.label)}
                </button>
              `).join('')}
            </div>
            ${gewaehlteOpt?.hinweis ? `<div style="font-size: 12px; color: var(--color-app-claro); font-style: italic; margin-top: 4px;">💡 ${Utils.escapeHtml(gewaehlteOpt.hinweis)}</div>` : ''}
          </div>
        `;
      }).join('')}

      ${alleBeantwortet ? `
        <div class="dg-triage-result">
          <h3>Empfohlene Screening-Instrumente</h3>
          ${crisisFlag ? `<div class="dg-triage-crisis">⚠️ Suizidalität angegeben — <a href="../hub/?schueler=${APP.schuelerId}&view=crisis">C-SSRS im HUB durchführen</a></div>` : ''}
          ${empfohlen.length > 0 ? `
            <div class="dg-triage-empfohlen">
              ${empfohlen.map(instId => {
                const inst = INSTRUMENTS[instId];
                return inst ? `<button class="btn btn-primary" onclick="startScreening('${instId}')" style="margin: 4px;">
                  ${inst.icon} ${inst.acronym} — ${inst.titel}
                </button>` : '';
              }).join('')}
            </div>
            <div style="margin-top: var(--space-3); font-size: 13px; color: var(--text-muted);">
              ${INSTRUMENT_LIST.length - empfohlen.length} Instrumente übersprungen — nicht indiziert.
            </div>
          ` : `<p style="color: var(--text-muted);">Keine spezifischen Instrumente empfohlen. Allgemeines SDQ-Screening erwägen.</p>
              <button class="btn" onclick="startScreening('sdq')" style="margin-top: var(--space-2);">📋 SDQ starten</button>`}
          <div style="margin-top: var(--space-4);">
            <button class="btn" onclick="triageAntworten={}; renderTriage();">🔄 Triage zurücksetzen</button>
          </div>
        </div>
      ` : ''}
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
      <div class="dg-section">
        <h2>📋 Übersicht</h2>
        <p>Kein Klient gewählt. Öffne Klient via HUB: <a href="../hub/">→ HUB</a></p>
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
function renderScreeningList() {
  const container = document.getElementById('dg-content');
  container.innerHTML = `
    <div class="dg-section">
      <h2>🔍 Screening-Instrumente</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        ${INSTRUMENT_LIST.length} validierte Instrumente verfügbar. Wähle eines, um zu starten.
      </p>
      <div class="dg-instrument-grid">
        ${INSTRUMENT_LIST.map(inst => `
          <div class="dg-instrument" onclick="startScreening('${inst.id}')">
            <div class="dg-instrument-header">
              <span style="font-size: 24px;">${inst.icon}</span>
              <span class="dg-instrument-acronym">${inst.acronym}</span>
            </div>
            <div class="dg-instrument-title">${Utils.escapeHtml(inst.titel)}</div>
            <div class="dg-instrument-desc">${inst.items.length} Items · ${inst.timeFrame || ''}</div>
            <div class="dg-instrument-meta">
              <span>ICD: ${inst.icd.join(', ')}</span>
              <span>~${Math.ceil(inst.items.length * 0.5)} min</span>
            </div>
          </div>
        `).join('')}
      </div>
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

      ${inst.items.map((q, i) => `
        <div class="dg-item">
          <div class="dg-item-num">Item ${i + 1}</div>
          <div class="dg-item-text">${Utils.escapeHtml(q)}</div>
          <div class="dg-item-opts">
            ${Object.entries(inst.skala).map(([val, label]) => `
              <button class="dg-item-opt ${APP.scores[i] == val ? 'selected' : ''}" onclick="setItemScore(${i}, ${val})">
                <span class="dg-item-opt-val">${val}</span>
                <span>${Utils.escapeHtml(label)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}

      ${result ? `
        <div class="dg-result severity-${result.severity}">
          <div style="text-align: center; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-2);">Auswertung</div>
          <div class="dg-score-display">${result.score} / ${result.max}</div>
          <h3 style="text-align: center;">${result.label}</h3>
          ${result.flagSuicide ? `<div style="margin-top: var(--space-3); padding: var(--space-3); background: rgba(220,38,38,0.18); border-radius: var(--radius-sm); border: 2px solid #DC2626; font-weight: 600;">⚠️ Suizidgedanken angegeben — C-SSRS im HUB durchführen. Ansprechen erhöht Risiko NICHT (Dazzi et al. 2014).</div>` : ''}
          ${result.dsm5 ? `
            <div style="margin-top: var(--space-3); padding: var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm);">
              <strong>DSM-5 Kriterien-Prüfung (Weathers et al. 2013):</strong>
              <div style="display: flex; gap: var(--space-3); margin-top: var(--space-2); font-size: 13px;">
                <span>${result.dsm5.critB ? '✅' : '❌'} Kriterium B (Wiedererleben)</span>
                <span>${result.dsm5.critC ? '✅' : '❌'} Kriterium C (Vermeidung)</span>
                <span>${result.dsm5.critD ? '✅' : '❌'} Kriterium D (Neg. Kognition)</span>
                <span>${result.dsm5.critE ? '✅' : '❌'} Kriterium E (Arousal)</span>
              </div>
              <div style="margin-top: var(--space-2); font-size: 13px; font-weight: 600; color: ${result.dsm5.met ? '#DC2626' : '#F59E0B'};">
                ${result.dsm5.met ? 'Alle 4 DSM-5-Kriterien erfüllt → PTBS wahrscheinlich' : 'Nicht alle Kriterien erfüllt → Differentialdiagnostik empfohlen'}
              </div>
            </div>
          ` : ''}
          ${result.subscales ? `
            <div style="margin-top: var(--space-3);">
              <strong style="font-size: 14px;">SDQ-Subskalen (Goodman 1997, Normwerte Selbstauskunft 11-17J):</strong>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-2); margin-top: var(--space-2);">
                ${[
                  ['Emotional', result.subscales.emotional, result.subCutoffs?.emotional],
                  ['Conduct', result.subscales.conduct, result.subCutoffs?.conduct],
                  ['Hyperaktiv', result.subscales.hyperact, result.subCutoffs?.hyperact],
                  ['Peer', result.subscales.peer, result.subCutoffs?.peer],
                  ['Prosozial', result.subscales.prosocial, result.subCutoffs?.prosocial],
                ].map(([label, val, cutoff]) => {
                  const farbe = cutoff === 'auffällig' ? '#DC2626' : cutoff === 'grenzwertig' ? '#F59E0B' : '#10B981';
                  return \`<div style="padding: var(--space-2); background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid \${farbe};">
                    <div style="font-size: 12px; color: var(--text-muted);">\${label}</div>
                    <div style="font-size: 18px; font-weight: 700; color: \${farbe};">\${val}</div>
                    <div style="font-size: 11px; color: \${farbe};">\${cutoff || ''}</div>
                  </div>\`;
                }).join('')}
              </div>
            </div>
          ` : ''}
          <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap;">
            ${APP.schuelerId ? `<button class="btn btn-primary" onclick="saveScreening()">💾 Im Klient-Profil speichern</button>` : ''}
            ${result.flagSuicide ? `<a class="btn" href="../hub/?schueler=${APP.schuelerId}&view=crisis" target="_blank">→ C-SSRS im HUB</a>` : ''}
            <button class="btn" onclick="startScreening('${APP.currentInstrument.id}')">🔄 Neu</button>
          </div>
        </div>
      ` : `
        <div style="text-align: center; color: var(--text-muted); margin-top: var(--space-4);">
          ${Object.keys(APP.scores).length} / ${inst.items.length} beantwortet
        </div>
      `}
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
