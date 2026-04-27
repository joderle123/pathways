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

// ─── Tab Routing ──────────────────────────────────────────────
function setTab(name) {
  APP.activeTab = name;
  document.querySelectorAll('.dg-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  if (name === 'overview') renderOverview();
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
      ` : `<div class="pw-empty"><p>Noch kein Screening durchgeführt.</p></div>`}
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
          ${result.flagSuicide ? `<div style="margin-top: var(--space-3); padding: var(--space-3); background: rgba(220,38,38,0.18); border-radius: var(--radius-sm); border: 2px solid #DC2626; font-weight: 600;">⚠️ Suizidgedanken angegeben — bitte C-SSRS in CRISIS durchführen</div>` : ''}
          ${result.subscales ? `<div style="margin-top: var(--space-3); font-size: 13px;"><strong>Subskalen:</strong> Emotional ${result.subscales.emotional} · Conduct ${result.subscales.conduct} · Hyperaktiv ${result.subscales.hyperact} · Peer ${result.subscales.peer} · Prosozial ${result.subscales.prosocial}</div>` : ''}
          <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap;">
            ${APP.schuelerId ? `<button class="btn btn-primary" onclick="saveScreening()">💾 Im Klient-Profil speichern</button>` : ''}
            ${result.flagSuicide ? `<a class="btn" href="../crisis/?schueler=${APP.schuelerId}&trigger=cssrs" target="_blank">→ C-SSRS in CRISIS</a>` : ''}
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
  showToast('Screening gespeichert', 'ok');
  setTab('overview');
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
      ${hyps.length === 0
        ? `<div class="pw-empty"><div class="pw-empty-icon">🤷</div><p>Keine Hypothesen — führe Screenings durch und ergänze die Anamnese.</p></div>`
        : hyps.map(h => `
          <div class="dg-hypothesis">
            <div class="dg-hypothesis-title">${Utils.escapeHtml(h.titel)} ${h.icd ? `<span style="font-size: 12px; color: var(--text-muted);">[${h.icd}]</span>` : ''}</div>
            <div class="dg-hypothesis-evidence">${h.rationale}</div>
            ${h.themen ? `<div class="dg-hypothesis-rationale"><strong>Themen-Empfehlungen:</strong> ${h.themen.join(' · ')}</div>` : ''}
          </div>
        `).join('')
      }
      ${hyps.length ? `
        <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
          <button class="btn btn-primary" onclick="setTab('5p')">→ In 5P-Fallformulierung übernehmen</button>
          <a class="btn" href="../library/?suche=${hyps[0]?.themen?.[0] || ''}" target="_blank">→ Materialien in LIBRARY</a>
          <a class="btn" href="../roadmap/?schueler=${APP.schuelerId}" target="_blank">→ Roadmap planen</a>
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
            ${points.length >= 2 ? `
              <div style="font-size: 13px; color: var(--text-secondary); margin-top: var(--space-2);">
                Δ (T1→T${points.length}): <strong style="color: ${points.at(-1).score < points[0].score ? '#10B981' : '#DC2626'};">
                  ${points.at(-1).score - points[0].score >= 0 ? '+' : ''}${points.at(-1).score - points[0].score}
                </strong>
                ${points.at(-1).score < points[0].score ? '↓ Verbesserung' : (points.at(-1).score > points[0].score ? '↑ Verschlechterung' : '→ stabil')}
              </div>
            ` : ''}
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
