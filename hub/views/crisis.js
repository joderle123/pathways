/* ============================================================
   HUB — Crisis View (integriert aus ehem. CRISIS-App)
   ============================================================ */

const CrisisView = (function () {
  let activeTab = 'cssrs';

  function setCrisisTab(name) {
    activeTab = name;
    document.querySelectorAll('.cr-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === name);
    });
    const crContent = document.getElementById('cr-content');
    if (!crContent) return;
    if (name === 'cssrs') CSSRS.render(APP.currentSchuelerId);
    else if (name === 'safety') SafetyPlan.render(APP.currentSchuelerId);
    else if (name === 'triage') Triage.render();
    else if (name === 'risiko') renderRisikoVerlauf();
  }

  function renderRisikoVerlauf() {
    const container = document.getElementById('cr-content');
    if (!APP.currentSchuelerId) {
      container.innerHTML = `
        <div class="cr-section">
          <h2>📊 Risiko-Verlauf</h2>
          <div class="cr-section-intro">Kein Klient gewählt. Wähle einen Klienten im Dashboard für den Risiko-Verlauf.</div>
        </div>`;
      return;
    }
    const eintraege = DB.getRisiko(APP.currentSchuelerId).sort((a, b) => a.datum.localeCompare(b.datum));
    const last30 = eintraege.slice(-30);
    if (!last30.length) {
      container.innerHTML = `
        <div class="cr-section">
          <h2>📊 Risiko-Verlauf</h2>
          <div class="cr-section-intro">Noch keine Risiko-Einträge für diesen Klienten.</div>
        </div>`;
      return;
    }

    const colorOf = werte => {
      const farben = Object.values(werte || {});
      if (farben.includes('rot')) return 'rot';
      if (farben.includes('gelb')) return 'gelb';
      if (farben.includes('gruen')) return 'gruen';
      return 'unbekannt';
    };
    const heightOf = farbe => farbe === 'rot' ? 100 : farbe === 'gelb' ? 60 : farbe === 'gruen' ? 30 : 10;

    const bars = last30.map(e => {
      const farbe = colorOf(e.werte);
      const h = heightOf(farbe);
      const datum = Utils.formatDate(e.datum, { short: true });
      return `<div class="cr-risk-bar" title="${e.datum}: ${farbe}">
        <div class="cr-risk-fill ${farbe}" style="height: ${h}%;"></div>
        <div class="cr-risk-label">${datum}</div>
      </div>`;
    }).join('');

    const counts = { rot: 0, gelb: 0, gruen: 0, unbekannt: 0 };
    eintraege.forEach(e => counts[colorOf(e.werte)]++);

    container.innerHTML = `
      <div class="cr-section">
        <h2>📊 Risiko-Verlauf — Klient ${APP.currentSchuelerId.slice(-4)}</h2>
        <div class="cr-section-intro">Verlauf der letzten 30 Risiko-Einträge.</div>
        <div class="cr-risk-chart">${bars}</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); margin-top: var(--space-4);">
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: #DC2626;">${counts.rot}</div><div style="font-size: 13px; color: var(--text-muted);">Rot</div></div>
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: #F59E0B;">${counts.gelb}</div><div style="font-size: 13px; color: var(--text-muted);">Gelb</div></div>
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: #10B981;">${counts.gruen}</div><div style="font-size: 13px; color: var(--text-muted);">Grün</div></div>
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: var(--text);">${eintraege.length}</div><div style="font-size: 13px; color: var(--text-muted);">Gesamt</div></div>
        </div>
        <h3 style="margin-top: var(--space-5);">Letzte 10 Einträge</h3>
        <div style="margin-top: var(--space-3);">
          ${eintraege.slice(-10).reverse().map(e => `
            <div style="display: flex; justify-content: space-between; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border);">
              <div><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin-right: 8px; background: ${colorOf(e.werte) === 'rot' ? '#DC2626' : colorOf(e.werte) === 'gelb' ? '#F59E0B' : '#10B981'};"></span>
                <strong>${Utils.formatDate(e.datum)}</strong>
                ${e.werte?.cssrs_severity ? ` · C-SSRS: ${e.werte.cssrs_severity}` : ''}
              </div>
              <div style="font-size: 13px; color: var(--text-muted);">
                ${Object.entries(e.werte || {}).filter(([k,v]) => typeof v === 'string').map(([k,v]) => `${k}: ${v}`).join(' · ')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  function render() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <!-- Hotlines -->
      <section class="cr-hotlines">
        <h2>📞 Sofort erreichbar — Luxembourg</h2>
        <div class="cr-hotline-grid">
          <a href="tel:113" class="cr-hotline cr-hotline-emergency">
            <div class="cr-hotline-num">113</div>
            <div class="cr-hotline-name">Polizei (Notruf)</div>
            <div class="cr-hotline-tag">akute Gefahr</div>
          </a>
          <a href="tel:112" class="cr-hotline cr-hotline-emergency">
            <div class="cr-hotline-num">112</div>
            <div class="cr-hotline-name">Rettungsdienst</div>
            <div class="cr-hotline-tag">medizinischer Notfall</div>
          </a>
          <a href="tel:454545" class="cr-hotline">
            <div class="cr-hotline-num">45 45 45</div>
            <div class="cr-hotline-name">SOS Détresse</div>
            <div class="cr-hotline-tag">24/7 anonym</div>
          </a>
          <a href="tel:116111" class="cr-hotline">
            <div class="cr-hotline-num">116 111</div>
            <div class="cr-hotline-name">Kanner-Jugendtelefon</div>
            <div class="cr-hotline-tag">Mo–Fr 11–23h</div>
          </a>
          <a href="tel:26822828" class="cr-hotline">
            <div class="cr-hotline-num">26 82 28 28</div>
            <div class="cr-hotline-name">CHNP Jugendpsychiatrie</div>
            <div class="cr-hotline-tag">Ettelbruck</div>
          </a>
        </div>
      </section>

      <!-- Sub-Tabs -->
      <div class="cr-tabs" style="padding: 0 var(--space-5);">
        <button class="cr-tab active" data-tab="cssrs" onclick="CrisisView.setTab('cssrs')">🔍 C-SSRS Suizid-Screening</button>
        <button class="cr-tab" data-tab="safety" onclick="CrisisView.setTab('safety')">🛡️ Sicherheitsplan</button>
        <button class="cr-tab" data-tab="triage" onclick="CrisisView.setTab('triage')">🌳 Triage-Baum</button>
        <button class="cr-tab" data-tab="risiko" onclick="CrisisView.setTab('risiko')">📊 Risiko-Verlauf</button>
      </div>

      <!-- Content target for tools -->
      <div id="cr-content" style="padding: var(--space-5); max-width: 1200px; margin: 0 auto;"></div>
    `;

    // Make setTab available globally for tool onclick handlers
    window.setTab = setCrisisTab;

    setCrisisTab(activeTab);
  }

  return { render, setTab: setCrisisTab };
})();
