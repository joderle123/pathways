/* ============================================================
   CODEX — Parents Views (integriert aus ehem. PARENTS-App)
   ============================================================ */

const ParentsViews = (function () {
  const INFOBLAETTER = [
    { id: 'angst-eltern', icon: '😰', titel: 'Angst bei Kindern & Jugendlichen', datei: 'angst-eltern.html' },
    { id: 'depression-eltern', icon: '🌧️', titel: 'Depression erkennen', datei: 'depression-eltern.html' },
    { id: 'adhs-eltern', icon: '⚡', titel: 'ADHS im Alltag — Tipps', datei: 'adhs-eltern.html' },
    { id: 'trauma-eltern', icon: '🌪️', titel: 'Trauma — Ihr Kind unterstützen', datei: 'trauma-eltern.html' },
    { id: 'selbstverletzung-eltern', icon: '🩸', titel: 'Selbstverletzung verstehen', datei: 'selbstverletzung-eltern.html' },
    { id: 'suizidalitaet-eltern', icon: '🚨', titel: 'Warnsignale Suizidprävention', datei: 'suizidalitaet-eltern.html' },
    { id: 'cannabis-eltern', icon: '🌿', titel: 'Cannabis im Jugendalter', datei: 'cannabis-eltern.html' },
    { id: 'mobbing-eltern', icon: '🛡️', titel: 'Wenn Ihr Kind gemobbt wird', datei: 'mobbing-eltern.html' },
    { id: 'schulverweigerung-eltern', icon: '🏫', titel: 'Schulabsentismus', datei: 'schulverweigerung-eltern.html' },
    { id: 'essstoerung-eltern', icon: '🍽️', titel: 'Auffälliges Essverhalten', datei: 'essstoerung-eltern.html' },
    { id: 'medienkonsum-eltern', icon: '📱', titel: 'Bildschirmzeit & Social Media', datei: 'medienkonsum-eltern.html' },
    { id: 'wut-eltern', icon: '😡', titel: 'Wutausbrüche & Aggression', datei: 'wut-eltern.html' },
    { id: 'trauer-eltern', icon: '💔', titel: 'Trauer bei Kindern', datei: 'trauer-eltern.html' },
    { id: 'scheidung-eltern', icon: '💔', titel: 'Trennung & Scheidung', datei: 'scheidung-eltern.html' },
    { id: 'pubertaet-eltern', icon: '🌱', titel: 'Pubertät — Normal vs. Warnsignale', datei: 'pubertaet-eltern.html' },
  ];

  const LEITFAEDEN = [
    { id: 'loyalitaetskonflikt', icon: '⚖️', titel: 'Loyalitätskonflikt besprechen', beschreibung: 'Kind im Spannungsfeld zwischen Eltern und Institution' },
    { id: 'unterbringung', icon: '🏠', titel: 'Unterbringung erklären', beschreibung: 'Placement als Unterstützung kommunizieren' },
    { id: 'verdacht-misshandlung', icon: '⚠️', titel: 'Verdacht auf Misshandlung', beschreibung: 'Sensibles Thema mit Meldepflicht' },
    { id: 'substanzkonsum', icon: '🌿', titel: 'Substanzkonsum des Kindes', beschreibung: 'Gesundheitsbezogen statt schuldzuweisend' },
    { id: 'diagnose', icon: '🩺', titel: 'Psychische Diagnose mitteilen', beschreibung: 'Entstigmatisierung und Behandlungsoptionen' },
    { id: 'schulprobleme', icon: '🏫', titel: 'Schulische Probleme', beschreibung: 'Lösungsorientiert mit konkretem Aktionsplan' },
    { id: 'ueberweisung', icon: '🏥', titel: 'Überweisung empfehlen', beschreibung: 'Professionelle Hilfe normalisieren' },
    { id: 'krise', icon: '🚨', titel: 'Krise kommunizieren', beschreibung: 'Krisen als Teil des Prozesses einordnen' },
    { id: 'entlassung', icon: '🚪', titel: 'Beendigung besprechen', beschreibung: 'Übergang, Nachsorge und Abschied' },
    { id: 'kooperation', icon: '🤝', titel: 'Elterliche Kooperation einfordern', beschreibung: 'Widerstand verstehen und auflösen' },
  ];

  const WORKFLOWS = [
    {
      id: 'erstgespraech', icon: '👋', titel: 'Eltern-Erstgespräch',
      schritte: [
        { titel: 'Vorbereitung', beschreibung: 'Akte lesen, Gesprächsziel definieren, Dolmetscher? Raum reservieren.' },
        { titel: 'Begrüßung & Rahmen', beschreibung: 'Ruhige Atmosphäre, Getränke, Dauer kommunizieren, Schweigepflicht erklären.' },
        { titel: 'Eltern-Perspektive', beschreibung: 'Offene Fragen: "Wie erleben Sie die Situation?" Zuhören, nicht urteilen.' },
        { titel: 'Fachliche Einordnung', beschreibung: 'Beobachtungen teilen (Stärken zuerst!), Screening-Ergebnisse erklären.' },
        { titel: 'Gemeinsame Ziele', beschreibung: 'Was wünschen sich die Eltern? Was wünscht sich das Kind? Konsens finden.' },
        { titel: 'Nächste Schritte', beschreibung: 'Konkreter Plan, Termin für Folgegespräch, Infomaterial mitgeben.' },
      ],
    },
    {
      id: 'konflikt', icon: '⚡', titel: 'Konflikt-Gespräch mit Eltern',
      schritte: [
        { titel: 'Emotionale Vorbereitung', beschreibung: 'Eigene Trigger kennen. Was könnte mich provozieren? Gegenmaßnahme planen.' },
        { titel: 'Eröffnung neutral', beschreibung: '"Ich möchte mit Ihnen über X sprechen." Keine Vorwürfe, Ich-Botschaften.' },
        { titel: 'Eltern-Sicht hören', beschreibung: 'Auch wenn es schwer fällt: Erst verstehen, dann verstanden werden.' },
        { titel: 'Fachliche Position klar', beschreibung: 'Sachlich, konkret, ohne zu moralisieren. Evidenz nutzen, nicht Meinung.' },
        { titel: 'Gemeinsam Lösung', beschreibung: 'Was können beide Seiten tun? Konkreter Schritt, wer macht was bis wann.' },
        { titel: 'Deeskalation bei Eskalation', beschreibung: '"Ich merke, das Gespräch wird schwierig. Pause?" Nie den Raum im Ärger verlassen.' },
      ],
    },
    {
      id: 'kindswohl', icon: '⚠️', titel: 'Verdacht auf Kindeswohlgefährdung',
      schritte: [
        { titel: 'Beobachtungen dokumentieren', beschreibung: 'Datum, was genau, Zitate des Kindes. Keine Interpretation, nur Fakten.' },
        { titel: 'Kollegiale Beratung', beschreibung: 'Mit Vorgesetzter/Team besprechen. Nicht allein entscheiden.' },
        { titel: 'ONE konsultieren', beschreibung: 'Office National de l\'Enfance anrufen: 24 78 39 19. Anonyme Beratung möglich.' },
        { titel: 'Entscheidung: Meldung?', beschreibung: 'Bei akuter Gefahr: Meldepflicht (Art. 7 Loi Aide à l\'Enfance). Schweigepflicht weicht.' },
        { titel: 'Gespräch mit Eltern', beschreibung: 'Wenn möglich VOR Meldung informieren (außer bei Gefährdung des Kindes dadurch).' },
        { titel: 'Nachverfolgung', beschreibung: 'Dokumentation abschließen. Selbstfürsorge. Supervision nutzen.' },
      ],
    },
  ];

  function renderInfoblaetter(container) {
    container.innerHTML = `
      <div class="pa-section">
        <h2>📄 Eltern-Infoblätter (${INFOBLAETTER.length})</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">Psychoedukation für Eltern — druckbar, zum Mitgeben nach Gesprächen.</p>
        <div class="pa-grid">
          ${INFOBLAETTER.map(ib => `
            <a class="pa-card" href="../eltern-infoblaetter/${ib.datei}" target="_blank" style="text-decoration: none; color: inherit;">
              <div class="pa-card-icon">${ib.icon}</div>
              <div class="pa-card-title">${Utils.escapeHtml(ib.titel)}</div>
              <div class="pa-card-desc">Öffnen & drucken ↗</div>
            </a>
          `).join('')}
        </div>
      </div>`;
  }

  function renderLeitfaeden(container) {
    container.innerHTML = `
      <div class="pa-section">
        <h2>📋 Gesprächsleitfäden (${LEITFAEDEN.length})</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">Strukturierte Anleitungen für schwierige Elterngespräche.</p>
        <div class="pa-grid">
          ${LEITFAEDEN.map(lf => `
            <a class="pa-card" href="../eltern-infoblaetter/leitfaden-${lf.id}.html" target="_blank" style="text-decoration: none; color: inherit;">
              <div class="pa-card-icon">${lf.icon}</div>
              <div class="pa-card-title">${Utils.escapeHtml(lf.titel)}</div>
              <div class="pa-card-desc">${Utils.escapeHtml(lf.beschreibung)}</div>
            </a>
          `).join('')}
        </div>
      </div>`;
  }

  function renderWorkflows(container) {
    container.innerHTML = `
      <div class="pa-section">
        <h2>🔄 Elternarbeits-Workflows (${WORKFLOWS.length})</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">Schritt-für-Schritt-Anleitungen für komplexe Gesprächssituationen.</p>
        ${WORKFLOWS.map(wf => `
          <div style="margin-bottom: var(--space-5);">
            <h3>${wf.icon} ${Utils.escapeHtml(wf.titel)}</h3>
            ${wf.schritte.map((s, i) => `
              <div class="pa-workflow-step">
                <div class="pa-workflow-step-header">
                  <div class="pa-workflow-step-num">${i + 1}</div>
                  <div style="font-weight: var(--font-weight-semibold); font-size: 15px;">${Utils.escapeHtml(s.titel)}</div>
                </div>
                <div style="font-size: 14px; color: var(--text-secondary); line-height: var(--line-height-relaxed);">${Utils.escapeHtml(s.beschreibung)}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>`;
  }

  return { renderInfoblaetter, renderLeitfaeden, renderWorkflows };
})();
