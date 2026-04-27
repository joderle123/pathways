/* ============================================================
   Pathways SESSION — Sitzungs-Tool
   ============================================================
   Pre/Live/Post-Modi, ORS/SRS/PVT-Tracking, SOAP-Doku.
   ============================================================ */

const APP = {
  schuelerId: null,
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

const TEMPLATES = [
  { id: 'erstgespraech', icon: '👋', name: 'Erstgespräch', focus: 'Beziehungsaufbau, Anamnese, Ziele explorieren' },
  { id: 'regulaer',      icon: '🎯', name: 'Reguläre Sitzung', focus: 'Aktuelles Thema bearbeiten, Skills üben' },
  { id: 'krise',         icon: '🚨', name: 'Krise', focus: 'Stabilisierung, Sicherheitsplan, C-SSRS' },
  { id: 'eltern',        icon: '👨‍👩‍👧', name: 'Elterngespräch', focus: 'Eltern-Information, Konflikt klären' },
  { id: 'verlauf',       icon: '📊', name: 'Verlaufs-Sitzung', focus: 'T2-Screening, Re-Assessment' },
  { id: 'abschluss',     icon: '🚪', name: 'Abschluss', focus: 'Bilanz, T3, Übergabe' },
];

const EREIGNISSE = ['Streit zu Hause', 'Schulproblem', 'Positives Erlebnis', 'Krise', 'Trennung', 'Erfolg', 'Konflikt mit Freunden'];

// ─── Toast / Theme ────────────────────────────────────────────
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
  localStorage.setItem('pw_app_session_theme', document.body.classList.contains('theme-dark') ? 'dark' : 'light');
}
function applyTheme() {
  if (localStorage.getItem('pw_app_session_theme') === 'dark') document.body.classList.add('theme-dark');
}

// ─── Timer ────────────────────────────────────────────────────
function startTimer() {
  APP.sessionStart = Date.now();
  document.getElementById('se-timer').style.display = 'block';
  if (APP.timerInterval) clearInterval(APP.timerInterval);
  APP.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - APP.sessionStart) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    document.getElementById('se-timer-text').textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    // Warnung bei 10 Min vor Ende (40 Min)
    if (min === 40 && sec === 0) showToast('⏰ Noch 10 Minuten — Konsolidierung beginnen', 'info');
    if (min === 50 && sec === 0) showToast('⏰ Sitzungsende erreicht', 'info');
  }, 1000);
}
function stopTimer() {
  clearInterval(APP.timerInterval);
  APP.timerInterval = null;
}

// ─── Mode Routing ─────────────────────────────────────────────
function setMode(name) {
  APP.mode = name;
  document.querySelectorAll('.se-mode').forEach(el => el.classList.toggle('active', el.dataset.mode === name));
  if (name === 'pre') renderPre();
  else if (name === 'live') renderLive();
  else if (name === 'post') renderPost();
  else if (name === 'history') renderHistory();
}

// ─── PRE-SESSION ─────────────────────────────────────────────
function renderPre() {
  const container = document.getElementById('se-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="se-section"><h2>📋 Pre-Session</h2><p>Kein Klient gewählt.</p></div>`;
    return;
  }

  const s = DB.getSchuelerById(APP.schuelerId);
  const notizen = DB.getNotizen(APP.schuelerId);
  const lastSession = notizen.filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))[0];
  const rm = DB.getRoadmap(APP.schuelerId);
  const aktivePhase = rm?.phasen?.find(p => p.status === 'aktiv');
  const risiko = DB.getRisiko(APP.schuelerId).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))[0];
  const risikoColor = risiko ? Object.values(risiko.werte || {}).find(v => ['rot','gelb','gruen'].includes(v)) : null;

  container.innerHTML = `
    ${risikoColor === 'rot' ? `
      <div class="se-risk-banner">
        🚨 AKTUELLES RISIKO ROT — siehe Krisen-Tools im HUB.
        <a href="../hub/?schueler=${APP.schuelerId}&view=crisis" target="_blank" style="color: #7F1D1D; text-decoration: underline; margin-left: 8px;">→ Sicherheitsplan öffnen</a>
      </div>
    ` : ''}

    <div class="se-section">
      <h2>📋 Vorbereitung — ${Utils.escapeHtml(`${s?.vorname || ''} ${s?.nachname || ''}`.trim())}</h2>

      ${lastSession ? `
        <h3>Letzte Sitzung — ${Utils.formatDate(lastSession.datum)}</h3>
        <div style="background: var(--bg-subtle); padding: var(--space-3); border-radius: var(--radius-sm); margin-bottom: var(--space-3);">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Thema: ${Utils.escapeHtml(lastSession.themaId || 'kein Thema')}</div>
          <div style="font-size: 14px; line-height: var(--line-height-relaxed); white-space: pre-wrap;">${Utils.escapeHtml(Utils.truncate((lastSession.inhalt || JSON.stringify(lastSession.soap || '')), 400))}</div>
        </div>
      ` : `<p style="color: var(--text-muted);">Erste Sitzung — keine Vorgeschichte verfügbar.</p>`}

      ${aktivePhase ? `
        <h3>Aktuelle Phase</h3>
        <div style="padding: var(--space-3); background: linear-gradient(135deg, #ECFDF5, #D1FAE5); border-left: 4px solid var(--color-app-roadmap); border-radius: var(--radius-sm); margin-bottom: var(--space-3);">
          <strong>Phase ${aktivePhase.nr}</strong> — seit ${aktivePhase.startDatum ? Utils.formatDate(aktivePhase.startDatum) : '?'}
          ${aktivePhase.notizen ? `<div style="margin-top: 4px; font-size: 13px;">${Utils.escapeHtml(Utils.truncate(aktivePhase.notizen, 200))}</div>` : ''}
        </div>
      ` : ''}

      <h3>Sitzungs-Vorlage wählen</h3>
      <div class="se-templates">
        ${TEMPLATES.map(t => `
          <div class="se-template" onclick="startSession('${t.id}')">
            <div class="se-template-icon">${t.icon}</div>
            <div class="se-template-name">${t.name}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${Utils.escapeHtml(t.focus)}</div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <a class="btn" href="../claro/?schueler=${APP.schuelerId}" target="_blank">🔍 CLARO</a>
        <a class="btn" href="../library/?suche=${encodeURIComponent(aktivePhase?.themen?.[0] || '')}" target="_blank">📚 Material</a>
        <a class="btn" href="../roadmap/?schueler=${APP.schuelerId}" target="_blank">🗺️ Roadmap</a>
      </div>
    </div>
  `;
}

function startSession(typ) {
  APP.draft.typ = typ;
  startTimer();
  setMode('live');
}

// ─── LIVE-SESSION ─────────────────────────────────────────────
function renderLive() {
  const container = document.getElementById('se-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="se-section"><p>Kein Klient gewählt.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="se-section">
      <h2>🎯 Live-Sitzung</h2>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); margin-bottom: var(--space-4);">
        <div class="se-slider-block">
          <div class="se-slider-label">😊 Stimmung am Anfang</div>
          <div class="se-slider-track">
            <input type="range" min="1" max="10" value="${APP.draft.stimmung_start}" oninput="APP.draft.stimmung_start=this.value; updateLiveSlider('stimmung-start', this.value)">
            <span class="se-slider-value" id="stimmung-start">${APP.draft.stimmung_start}</span>
          </div>
        </div>
        <div class="se-slider-block">
          <div class="se-slider-label">🌐 PVT-Status (Polyvagal)</div>
          <div class="se-pvt">
            <div class="se-pvt-opt ${APP.draft.pvt_start === 'safe' ? 'selected' : ''}" data-state="safe" onclick="setPvtStart('safe')">
              <div class="se-pvt-emoji">😌</div><div class="se-pvt-name">Safe</div>
            </div>
            <div class="se-pvt-opt ${APP.draft.pvt_start === 'activated' ? 'selected' : ''}" data-state="activated" onclick="setPvtStart('activated')">
              <div class="se-pvt-emoji">⚡</div><div class="se-pvt-name">Activated</div>
            </div>
            <div class="se-pvt-opt ${APP.draft.pvt_start === 'frozen' ? 'selected' : ''}" data-state="frozen" onclick="setPvtStart('frozen')">
              <div class="se-pvt-emoji">🧊</div><div class="se-pvt-name">Frozen</div>
            </div>
          </div>
        </div>
      </div>

      <h3>Quick Notes (Live während der Sitzung)</h3>
      <div class="se-quicknotes">
        <textarea id="quicknotes" placeholder="Notizen tippen während der Sitzung… wird automatisch in SOAP übernommen.">${Utils.escapeHtml(APP.draft.quicknotes)}</textarea>
      </div>

      <h3>Externe Ereignisse markieren</h3>
      <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
        ${EREIGNISSE.map(ev => `
          <button class="btn" style="padding: 6px 12px; font-size: 13px; ${APP.draft.ereignisse.includes(ev) ? 'background: var(--color-app-session); color: #fff;' : ''}" onclick="toggleEreignis('${Utils.escapeHtml(ev).replace(/'/g, "\\'")}')">
            ${APP.draft.ereignisse.includes(ev) ? '✓ ' : '+ '}${Utils.escapeHtml(ev)}
          </button>
        `).join('')}
      </div>

      <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
        <button class="btn btn-primary" onclick="setMode('post')">→ Sitzung beenden, zu Post-Session</button>
        <a class="btn" href="../library/" target="_blank">📚 Material öffnen</a>
        <a class="btn" href="../hub/?schueler=${APP.schuelerId}&view=crisis" target="_blank">🚨 Crisis-Tools</a>
      </div>
    </div>
  `;

  // Live-Listener für quicknotes
  document.getElementById('quicknotes').addEventListener('input', e => {
    APP.draft.quicknotes = e.target.value;
  });
}

function updateLiveSlider(id, val) {
  document.getElementById(id).textContent = val;
}

function setPvtStart(state) {
  APP.draft.pvt_start = state;
  renderLive();
}

function toggleEreignis(ev) {
  const idx = APP.draft.ereignisse.indexOf(ev);
  if (idx >= 0) APP.draft.ereignisse.splice(idx, 1);
  else APP.draft.ereignisse.push(ev);
  renderLive();
}

// ─── POST-SESSION ─────────────────────────────────────────────
function renderPost() {
  const container = document.getElementById('se-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="se-section"><p>Kein Klient gewählt.</p></div>`;
    return;
  }
  stopTimer();

  // Auto-Fill SOAP aus QuickNotes
  if (!APP.draft.soap.S && APP.draft.quicknotes) {
    APP.draft.soap.O = APP.draft.quicknotes;
  }

  container.innerHTML = `
    <div class="se-section">
      <h2>📊 Post-Session — Dokumentation &amp; Outcome</h2>

      <h3>SOAP-Notiz</h3>
      <div class="se-soap-grid">
        <div class="se-soap-card">
          <div class="se-soap-card-title">S — Subjektiv (was Klient berichtet)</div>
          <textarea oninput="APP.draft.soap.S=this.value">${Utils.escapeHtml(APP.draft.soap.S || '')}</textarea>
        </div>
        <div class="se-soap-card">
          <div class="se-soap-card-title">O — Objektiv (was ich beobachte)</div>
          <textarea oninput="APP.draft.soap.O=this.value">${Utils.escapeHtml(APP.draft.soap.O || '')}</textarea>
        </div>
        <div class="se-soap-card">
          <div class="se-soap-card-title">A — Assessment (Einschätzung)</div>
          <textarea oninput="APP.draft.soap.A=this.value">${Utils.escapeHtml(APP.draft.soap.A || '')}</textarea>
        </div>
        <div class="se-soap-card">
          <div class="se-soap-card-title">P — Plan (nächste Schritte)</div>
          <textarea oninput="APP.draft.soap.P=this.value">${Utils.escapeHtml(APP.draft.soap.P || '')}</textarea>
        </div>
      </div>

      <h3 style="margin-top: var(--space-5);">😊 Stimmung am Ende der Sitzung</h3>
      <div class="se-slider-block">
        <div class="se-slider-track">
          <input type="range" min="1" max="10" value="${APP.draft.stimmung_end}" oninput="APP.draft.stimmung_end=this.value; updateLiveSlider('stimmung-end-val', this.value)">
          <span class="se-slider-value" id="stimmung-end-val">${APP.draft.stimmung_end}</span>
        </div>
      </div>

      <h3>🌐 PVT-Status am Ende</h3>
      <div class="se-pvt">
        <div class="se-pvt-opt ${APP.draft.pvt_end === 'safe' ? 'selected' : ''}" data-state="safe" onclick="setPvtEnd('safe')">
          <div class="se-pvt-emoji">😌</div><div class="se-pvt-name">Safe</div>
        </div>
        <div class="se-pvt-opt ${APP.draft.pvt_end === 'activated' ? 'selected' : ''}" data-state="activated" onclick="setPvtEnd('activated')">
          <div class="se-pvt-emoji">⚡</div><div class="se-pvt-name">Activated</div>
        </div>
        <div class="se-pvt-opt ${APP.draft.pvt_end === 'frozen' ? 'selected' : ''}" data-state="frozen" onclick="setPvtEnd('frozen')">
          <div class="se-pvt-emoji">🧊</div><div class="se-pvt-name">Frozen</div>
        </div>
      </div>

      <h3 style="margin-top: var(--space-5);">📊 ORS — Outcome Rating Scale</h3>
      <p style="font-size: 13px; color: var(--text-muted);">Wie geht es dir in den letzten 7 Tagen? (Miller & Duncan)</p>
      ${[
        ['individual', 'Individuell (persönliches Wohlbefinden)'],
        ['interpersonal', 'Interpersonell (Beziehungen)'],
        ['social', 'Sozial (Arbeit, Schule)'],
        ['overall', 'Gesamt'],
      ].map(([key, label]) => `
        <div class="se-slider-block">
          <div class="se-slider-label">${label}</div>
          <div class="se-slider-track">
            <input type="range" min="0" max="10" step="0.5" value="${APP.draft.ors[key]}" oninput="APP.draft.ors.${key}=parseFloat(this.value); updateLiveSlider('ors-${key}', parseFloat(this.value).toFixed(1))">
            <span class="se-slider-value" id="ors-${key}">${parseFloat(APP.draft.ors[key]).toFixed(1)}</span>
          </div>
        </div>
      `).join('')}

      <h3 style="margin-top: var(--space-5);">📊 SRS — Session Rating Scale</h3>
      <p style="font-size: 13px; color: var(--text-muted);">Wie war diese Sitzung für dich?</p>
      ${[
        ['relationship', 'Beziehung (gehört, verstanden, respektiert)'],
        ['goals', 'Ziele &amp; Themen (haben wir an wichtigen Themen gearbeitet?)'],
        ['approach', 'Methode (passt der Ansatz zu mir?)'],
        ['overall', 'Insgesamt'],
      ].map(([key, label]) => `
        <div class="se-slider-block">
          <div class="se-slider-label">${label}</div>
          <div class="se-slider-track">
            <input type="range" min="0" max="10" step="0.5" value="${APP.draft.srs[key]}" oninput="APP.draft.srs.${key}=parseFloat(this.value); updateLiveSlider('srs-${key}', parseFloat(this.value).toFixed(1))">
            <span class="se-slider-value" id="srs-${key}">${parseFloat(APP.draft.srs[key]).toFixed(1)}</span>
          </div>
        </div>
      `).join('')}

      <div style="margin-top: var(--space-5); display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="saveSession()">💾 Sitzung speichern</button>
        <button class="btn" onclick="setMode('live')">← Zurück zu Live</button>
      </div>
    </div>
  `;
}

function setPvtEnd(state) {
  APP.draft.pvt_end = state;
  renderPost();
}

function saveSession() {
  const orsTotal = (APP.draft.ors.individual + APP.draft.ors.interpersonal + APP.draft.ors.social + APP.draft.ors.overall) / 4;
  const srsTotal = (APP.draft.srs.relationship + APP.draft.srs.goals + APP.draft.srs.approach + APP.draft.srs.overall) / 4;

  const notiz = DB.createNotiz({
    schuelerId: APP.schuelerId,
    datum: new Date().toISOString().split('T')[0],
    inhalt: `S: ${APP.draft.soap.S}\nO: ${APP.draft.soap.O}\nA: ${APP.draft.soap.A}\nP: ${APP.draft.soap.P}`,
    kategorie: 'session',
    themaId: APP.draft.thema || null,
    soap: {
      ...APP.draft.soap,
      typ: APP.draft.typ,
      stimmung_start: APP.draft.stimmung_start,
      stimmung_end: APP.draft.stimmung_end,
      pvt_start: APP.draft.pvt_start,
      pvt_end: APP.draft.pvt_end,
      ors: APP.draft.ors,
      srs: APP.draft.srs,
      ors_total: orsTotal,
      srs_total: srsTotal,
      ereignisse: APP.draft.ereignisse,
      dauer_min: APP.sessionStart ? Math.floor((Date.now() - APP.sessionStart) / 60000) : null,
    },
  });

  // Wohlbefinden auto-tracking
  DB.addWohlbefinden(APP.schuelerId, orsTotal, '');

  // Risiko, falls ORS sehr niedrig
  if (orsTotal < 3) {
    DB.addRisiko(APP.schuelerId, { sicherheit: 'gelb', source: 'ors-low', value: orsTotal });
    Bridge.notify('crisis_alert', { schuelerId: APP.schuelerId, severity: 'low', source: 'ors' });
  }

  Bridge.notify('session_completed', { schuelerId: APP.schuelerId, ors: orsTotal, srs: srsTotal });
  showToast('Sitzung gespeichert + Wohlbefinden aktualisiert', 'ok');

  // Reset draft
  APP.draft = {
    quicknotes: '', soap: { S: '', O: '', A: '', P: '' },
    ors: { individual: 8, interpersonal: 8, social: 8, overall: 8 },
    srs: { relationship: 8, goals: 8, approach: 8, overall: 8 },
    pvt_start: null, pvt_end: null,
    stimmung_start: 5, stimmung_end: 5,
    thema: '', materialien: [], ereignisse: [], typ: 'regulaer',
  };
  setMode('history');
}

// ─── HISTORY ─────────────────────────────────────────────────
function renderHistory() {
  const container = document.getElementById('se-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="se-section"><p>Kein Klient gewählt.</p></div>`;
    return;
  }

  const notizen = DB.getNotizen(APP.schuelerId)
    .filter(n => n.kategorie === 'session')
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

  // ORS-Trend (letzte 8)
  const trend = notizen.slice(0, 8).reverse()
    .filter(n => n.soap?.ors_total !== undefined)
    .map(n => ({ date: n.datum, ors: n.soap.ors_total, srs: n.soap.srs_total }));

  container.innerHTML = `
    <div class="se-section">
      <h2>📚 Sitzungs-Historie</h2>

      ${trend.length >= 2 ? `
        <h3>ORS-Trend (letzte ${trend.length} Sitzungen)</h3>
        <div class="se-trend">
          ${trend.map(t => `
            <div class="se-trend-bar" style="height: ${t.ors * 10}%;" title="${Utils.formatDate(t.date)}: ORS ${t.ors.toFixed(1)}"></div>
          `).join('')}
        </div>
        <div style="margin-top: var(--space-2); font-size: 13px; color: var(--text-secondary);">
          Δ ORS (erste→letzte): <strong style="color: ${trend.at(-1).ors > trend[0].ors ? '#10B981' : '#DC2626'};">${(trend.at(-1).ors - trend[0].ors).toFixed(1)}</strong>
          ${trend.at(-1).ors > trend[0].ors ? '↑ Verbesserung' : (trend.at(-1).ors < trend[0].ors ? '↓ Verschlechterung' : '→ stabil')}
        </div>
      ` : ''}

      <h3 style="margin-top: var(--space-4);">Alle Sitzungen (${notizen.length})</h3>
      ${notizen.length === 0
        ? `<div class="pw-empty"><div class="pw-empty-icon">📝</div><p>Noch keine Sitzung dokumentiert.</p></div>`
        : notizen.map(n => `
            <div class="se-history-row">
              <div class="se-history-date">${Utils.formatDate(n.datum)}</div>
              <div>
                <strong>${Utils.escapeHtml(n.soap?.typ || 'Sitzung')}</strong>
                ${n.soap?.ereignisse?.length ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">${n.soap.ereignisse.slice(0, 2).join(' · ')}</span>` : ''}
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${Utils.escapeHtml(Utils.truncate(n.soap?.O || n.inhalt || '', 100))}</div>
              </div>
              <div style="font-size: 13px;">ORS: <strong>${n.soap?.ors_total?.toFixed(1) || '—'}</strong></div>
              <div style="font-size: 13px;">SRS: <strong>${n.soap?.srs_total?.toFixed(1) || '—'}</strong></div>
              <div>${n.soap?.dauer_min ? n.soap.dauer_min + ' min' : ''}</div>
            </div>
          `).join('')
      }
    </div>
  `;
}

// ─── Bridge ──────────────────────────────────────────────────
function openCrisis() {
  if (APP.schuelerId) Bridge.openApp('hub', { schueler: APP.schuelerId, view: 'crisis' });
  else Bridge.openApp('hub', { view: 'crisis' });
}

function updateContext() {
  const el = document.getElementById('se-context');
  if (!APP.schuelerId) { el.textContent = '— ohne Klient —'; return; }
  const s = DB.getSchuelerById(APP.schuelerId);
  el.textContent = s ? `👤 ${(s.vorname || '') + ' ' + (s.nachname || '')}`.trim() : '👤 ?';
}

// ─── Bootstrap ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  const params = Bridge.parseQuery();
  if (params.schueler) APP.schuelerId = params.schueler;
  if (params.thema) APP.draft.thema = params.thema;
  updateContext();
  setMode('pre');
});
