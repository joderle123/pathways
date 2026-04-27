/* ============================================================
   Pathways CRISIS — App Bootstrap
   ============================================================
   Routing zwischen 4 Tools, Klient-Kontext, Bridge-Integration.
   ============================================================ */

const APP = {
  schuelerId: null,
  activeTab: 'cssrs',
};

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `pw-toast pw-toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 200); }, 3500);
}

// ─── Tab Routing ──────────────────────────────────────────────
function setTab(name) {
  APP.activeTab = name;
  document.querySelectorAll('.cr-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  if (name === 'cssrs') CSSRS.render(APP.schuelerId);
  else if (name === 'safety') SafetyPlan.render(APP.schuelerId);
  else if (name === 'triage') Triage.render();
  else if (name === 'risiko') renderRisikoVerlauf();
}

// ─── Tab: Risiko-Verlauf (Bar-Chart über Zeit) ───────────────
function renderRisikoVerlauf() {
  const container = document.getElementById('cr-content');

  if (!APP.schuelerId) {
    container.innerHTML = `
      <div class="cr-section">
        <h2>📊 Risiko-Verlauf</h2>
        <div class="cr-section-intro">
          Kein Klient gewählt. Öffne diese App via Klient-Karte (CASE) für den Risiko-Verlauf.
        </div>
      </div>
    `;
    return;
  }

  const eintraege = DB.getRisiko(APP.schuelerId).sort((a, b) => a.datum.localeCompare(b.datum));
  const last30 = eintraege.slice(-30);

  if (!last30.length) {
    container.innerHTML = `
      <div class="cr-section">
        <h2>📊 Risiko-Verlauf</h2>
        <div class="cr-section-intro">
          Noch keine Risiko-Einträge für diesen Klienten.
          Erstelle einen via C-SSRS oder direkt aus dem Profil.
        </div>
      </div>
    `;
    return;
  }

  const colorOf = werte => {
    const farben = Object.values(werte || {});
    if (farben.includes('rot')) return 'rot';
    if (farben.includes('gelb')) return 'gelb';
    if (farben.includes('gruen')) return 'gruen';
    return 'unbekannt';
  };

  const heightOf = farbe => {
    if (farbe === 'rot') return 100;
    if (farbe === 'gelb') return 60;
    if (farbe === 'gruen') return 30;
    return 10;
  };

  const bars = last30.map(e => {
    const farbe = colorOf(e.werte);
    const h = heightOf(farbe);
    const datum = Utils.formatDate(e.datum, { short: true });
    return `
      <div class="cr-risk-bar" title="${e.datum}: ${farbe}">
        <div class="cr-risk-fill ${farbe}" style="height: ${h}%;"></div>
        <div class="cr-risk-label">${datum}</div>
      </div>
    `;
  }).join('');

  // Zähle pro Farbe
  const counts = { rot: 0, gelb: 0, gruen: 0, unbekannt: 0 };
  eintraege.forEach(e => counts[colorOf(e.werte)]++);

  container.innerHTML = `
    <div class="cr-section">
      <h2>📊 Risiko-Verlauf — Klient ${APP.schuelerId.slice(-4)}</h2>
      <div class="cr-section-intro">
        Verlauf der letzten 30 Risiko-Einträge. Hohe Balken = Rot, mittlere = Gelb, niedrige = Grün.
      </div>

      <div class="cr-risk-chart">${bars}</div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); margin-top: var(--space-4);">
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #DC2626;">${counts.rot}</div>
          <div style="font-size: 13px; color: var(--text-muted);">Rote Einträge</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #F59E0B;">${counts.gelb}</div>
          <div style="font-size: 13px; color: var(--text-muted);">Gelbe Einträge</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #10B981;">${counts.gruen}</div>
          <div style="font-size: 13px; color: var(--text-muted);">Grüne Einträge</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: var(--text);">${eintraege.length}</div>
          <div style="font-size: 13px; color: var(--text-muted);">Gesamt</div>
        </div>
      </div>

      <h3 style="margin-top: var(--space-5);">Letzte 10 Einträge</h3>
      <div style="margin-top: var(--space-3);">
        ${eintraege.slice(-10).reverse().map(e => `
          <div style="display: flex; justify-content: space-between; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border);">
            <div>
              <span class="pw-stat-dot ${colorOf(e.werte)}" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin-right: 8px;"></span>
              <strong>${Utils.formatDate(e.datum)}</strong>
              ${e.werte?.cssrs_severity ? ` · C-SSRS: ${e.werte.cssrs_severity}` : ''}
            </div>
            <div style="font-size: 13px; color: var(--text-muted);">
              ${Object.entries(e.werte || {}).filter(([k,v]) => typeof v === 'string').map(([k,v]) => `${k}: ${v}`).join(' · ')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── Klient-Kontext anzeigen ─────────────────────────────────
function updateContext() {
  const el = document.getElementById('cr-context');
  if (!APP.schuelerId) {
    el.textContent = '— ohne Klient —';
    return;
  }
  const s = DB.getSchuelerById(APP.schuelerId);
  if (s) {
    const name = `${s.vorname || ''} ${s.nachname || ''}`.trim() || '?';
    el.textContent = `👤 ${name}`;
  } else {
    el.textContent = `👤 Klient ${APP.schuelerId.slice(-4)} (nicht gefunden)`;
  }
}

// ─── Bridge ───────────────────────────────────────────────────
Bridge.subscribe('crisis_alert', e => {
  if (e.from === 'crisis') return; // eigene Events ignorieren
  showToast(`⚠️ Crisis-Alert von ${e.from}: ${e.severity || ''}`, 'info');
});

// ─── Bootstrap ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Deep-Link-Parameter
  const params = Bridge.parseQuery();
  if (params.schueler) APP.schuelerId = params.schueler;
  if (params.trigger === 'cssrs') APP.activeTab = 'cssrs';
  if (params.trigger === 'safety') APP.activeTab = 'safety';
  if (params.trigger === 'triage') APP.activeTab = 'triage';

  updateContext();
  setTab(APP.activeTab);

  console.log('[CRISIS] Ready. Schueler:', APP.schuelerId || 'none');
});
