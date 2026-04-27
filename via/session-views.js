/* ============================================================
   VIA — Session-Views (aus ehem. SESSION)
   ============================================================ */

// APP wird von via/app.js bereitgestellt (inkl. session-spezifische Felder)

const TEMPLATES = [
  { id: 'erstgespraech', icon: '👋', name: 'Erstgespräch', focus: 'Beziehungsaufbau, Anamnese, Ziele explorieren',
    ablauf: [
      { zeit: '0-5', was: 'Begrüßung, Setting erklären (Dauer, Schweigepflicht, Freiwilligkeit)' },
      { zeit: '5-15', was: 'Kennenlernen: offene Fragen, Stärken, Interessen ("Was magst du? Was kannst du gut?")' },
      { zeit: '15-30', was: 'Anliegen explorieren: "Was hat dich hierher gebracht?" (MI: offene Fragen)' },
      { zeit: '30-40', was: 'Erwartungen klären: "Was würde dir helfen? Was wünschst du dir von mir?"' },
      { zeit: '40-45', was: 'Zusammenfassung + nächste Schritte vereinbaren' },
      { zeit: '45-50', was: 'Check-out: "Wie war das heute für dich?" — SRS erheben' },
    ]},
  { id: 'regulaer', icon: '🎯', name: 'Reguläre Sitzung', focus: 'Aktuelles Thema bearbeiten, Skills üben',
    ablauf: [
      { zeit: '0-5', was: 'Check-in: Stimmung (1-10), ORS, "Was ist seit letztem Mal passiert?"' },
      { zeit: '5-10', was: 'Hausaufgabe besprechen, Brücke zur letzten Sitzung' },
      { zeit: '10-35', was: 'Hauptarbeit: Thema vertiefen, Material einsetzen, Skills üben' },
      { zeit: '35-43', was: 'Konsolidierung: "Was nimmst du heute mit? Was war wichtig?"' },
      { zeit: '43-47', was: 'Hausaufgabe vereinbaren, nächsten Termin' },
      { zeit: '47-50', was: 'Check-out: SRS erheben, "Wie war die Sitzung für dich?"' },
    ]},
  { id: 'krise', icon: '🚨', name: 'Krise', focus: 'Stabilisierung, Sicherheitsplan, C-SSRS',
    ablauf: [
      { zeit: '0-5', was: 'Sicherheit prüfen: "Bist du in Gefahr? Hast du dich verletzt?"' },
      { zeit: '5-15', was: 'Stabilisierung: Grounding, Atemübung, Co-Regulation, PVT-Check' },
      { zeit: '15-25', was: 'C-SSRS durchführen wenn Suizidalität vermutet' },
      { zeit: '25-35', was: 'Sicherheitsplan erstellen/aktualisieren (Stanley-Brown 6 Schritte)' },
      { zeit: '35-45', was: 'Means Restriction besprechen, Helfer informieren' },
      { zeit: '45-50', was: 'Nächster Kontakt vereinbaren (innerhalb 24-48h), Krisennummern mitgeben' },
    ]},
  { id: 'eltern', icon: '👨‍👩‍👧', name: 'Elterngespräch', focus: 'Eltern-Information, Kooperation stärken',
    ablauf: [
      { zeit: '0-5', was: 'Begrüßung, Rahmen setzen (was besprochen wird, was vertraulich bleibt)' },
      { zeit: '5-15', was: 'Eltern-Perspektive hören: "Wie erleben SIE die Situation zu Hause?"' },
      { zeit: '15-25', was: 'Fachliche Einordnung teilen (Stärken zuerst!), Screening-Ergebnisse erklären' },
      { zeit: '25-35', was: 'Gemeinsame Ziele: "Was wünschen SIE sich? Was wünscht sich Ihr Kind?"' },
      { zeit: '35-45', was: 'Konkreter Plan: wer macht was bis wann, Infomaterial mitgeben' },
      { zeit: '45-50', was: 'Zusammenfassung, nächster Termin, Fragen klären' },
    ]},
  { id: 'verlauf', icon: '📊', name: 'Verlaufs-Sitzung', focus: 'T2-Screening, Re-Assessment',
    ablauf: [
      { zeit: '0-5', was: 'Check-in: Stimmung, "Wie geht es dir insgesamt?"' },
      { zeit: '5-20', was: 'T2-Screening durchführen (gleiche Instrumente wie T1)' },
      { zeit: '20-30', was: 'Ergebnisse gemeinsam anschauen: T1 vs T2 Vergleich, was hat sich verändert?' },
      { zeit: '30-40', was: 'Roadmap-Review: Phase-Fortschritt, Ziele prüfen, Hypothesen aktualisieren' },
      { zeit: '40-47', was: 'Plan anpassen: neue Themen? Phase-Übergang? Stepped Care?' },
      { zeit: '47-50', was: 'Check-out: SRS, nächste Schritte' },
    ]},
  { id: 'abschluss', icon: '🚪', name: 'Abschluss', focus: 'Bilanz, T3, Übergabe',
    ablauf: [
      { zeit: '0-5', was: 'Rahmen: "Heute schauen wir zurück und nach vorne."' },
      { zeit: '5-15', was: 'T3-Screening durchführen (finale Verlaufsmessung)' },
      { zeit: '15-25', was: 'Bilanz: "Was hat sich verändert? Was hast du gelernt? Was war schwierig?"' },
      { zeit: '25-35', was: 'Ressourcen-Check: "Was hilft dir in Zukunft? Wer unterstützt dich?"' },
      { zeit: '35-45', was: 'Übergabe planen: Nachsorge, Kontaktmöglichkeit, Notfallplan' },
      { zeit: '45-50', was: 'Abschied: Wertschätzung aussprechen, Tür offenlassen' },
    ]},
];

const EREIGNISSE = [
  'Streit zu Hause', 'Schulproblem', 'Positives Erlebnis', 'Krise',
  'Trennung / Verlust', 'Erfolg / Fortschritt', 'Konflikt mit Peers',
  'Medikationsänderung', 'Hospitalisierung', 'Umzug / Schulwechsel',
  'Sorgerechtsentscheidung', 'Trauma-Disclosure', 'Selbstverletzung',
  'Substanzkonsum', 'Neues Hobby / Ressource',
];

// showToast, toggleTheme, applyTheme bereitgestellt von via/app.js

// ─── Timer ────────────────────────────────────────────────────
function startTimer() {
  APP.sessionStart = Date.now();
  document.getElementById('via-timer').style.display = 'block';
  if (APP.timerInterval) clearInterval(APP.timerInterval);
  APP.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - APP.sessionStart) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    document.getElementById('via-timer-text').textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    const timerEl = document.getElementById('via-timer');
    if (min >= 45) {
      timerEl.style.background = 'rgba(220,38,38,0.3)';
      if (min === 45 && sec === 0) showToast('⏰ 5 Minuten — Check-out beginnen!', 'error');
    } else if (min >= 40) {
      timerEl.style.background = 'rgba(245,158,11,0.3)';
      if (min === 40 && sec === 0) showToast('⏰ 10 Minuten — Konsolidierung beginnen', 'info');
    }
    if (min === 50 && sec === 0) showToast('⏰ Sitzungsende (50 Min)', 'error');
  }, 1000);
}
function stopTimer() {
  clearInterval(APP.timerInterval);
  APP.timerInterval = null;
}

// ─── Mode Routing ─────────────────────────────────────────────
function setSessionMode(name) {
  APP.mode = name;
  document.querySelectorAll('.se-mode').forEach(el => el.classList.toggle('active', el.dataset.mode === name));
  if (name === 'pre') renderPre();
  else if (name === 'live') renderLive();
  else if (name === 'post') renderPost();
  else if (name === 'history') renderHistory();
}

// ─── PRE-SESSION ─────────────────────────────────────────────
function renderPre() {
  const container = document.getElementById('via-content');
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

    ${(() => {
      const screenings = DB.getScreenings(APP.schuelerId).filter(x => x.abgeschlossen).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
      if (screenings.length > 0) {
        const tage = Utils.daysBetween(screenings[0].datum, new Date().toISOString());
        if (tage >= 28) {
          return `<div style="padding: var(--space-3); background: #DBEAFE; border: 1px solid #3B82F6; border-radius: var(--radius-sm); margin-bottom: var(--space-3); font-size: 14px;">
            🔍 <strong>Re-Screening empfohlen</strong> — letztes Screening vor ${tage} Tagen (T${screenings.length + 1}).
            <a href="../claro/?schueler=${APP.schuelerId}&action=neu_screening" target="_blank" style="margin-left: 8px;">→ CLARO öffnen</a>
          </div>`;
        }
      } else {
        return `<div style="padding: var(--space-3); background: #FEF3C7; border: 1px solid #F59E0B; border-radius: var(--radius-sm); margin-bottom: var(--space-3); font-size: 14px;">
          🔍 <strong>Noch kein Screening</strong> — Baseline-Assessment (T1) vor der Begleitung empfohlen.
          <a href="../claro/?schueler=${APP.schuelerId}&action=neu_screening" target="_blank" style="margin-left: 8px;">→ CLARO öffnen</a>
        </div>`;
      }
      return '';
    })()}

    <div class="se-section">
      <h2>📋 Vorbereitung — ${Utils.escapeHtml(`${s?.vorname || ''} ${s?.nachname || ''}`.trim())}</h2>

      ${lastSession ? `
        <h3>Letzte Sitzung — ${Utils.formatDate(lastSession.datum)}</h3>
        <div style="background: var(--bg-subtle); padding: var(--space-3); border-radius: var(--radius-sm); margin-bottom: var(--space-3);">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Thema: ${Utils.escapeHtml(lastSession.themaId || 'kein Thema')}</div>
          <div style="font-size: 14px; line-height: var(--line-height-relaxed); white-space: pre-wrap;">${Utils.escapeHtml(Utils.truncate((lastSession.inhalt || JSON.stringify(lastSession.soap || '')), 400))}</div>
        </div>
        ${lastSession?.soap?.hausaufgabe ? `
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: var(--space-3); border-radius: var(--radius-sm); margin-bottom: var(--space-3);">
            <strong>📝 Letzte Hausaufgabe:</strong> ${Utils.escapeHtml(lastSession.soap.hausaufgabe)}
            <label style="display: flex; gap: var(--space-2); align-items: center; margin-top: var(--space-2); font-size: 13px; cursor: pointer;">
              <input type="checkbox" ${APP.draft.hausaufgabe_erledigt ? 'checked' : ''} onchange="APP.draft.hausaufgabe_erledigt=this.checked;"> Wurde besprochen / erledigt
            </label>
          </div>
        ` : ''}
      ` : `<p style="color: var(--text-muted);">Erste Sitzung — keine Vorgeschichte verfügbar.</p>`}

      ${aktivePhase ? `
        <h3>Aktuelle Phase</h3>
        <div style="padding: var(--space-3); background: linear-gradient(135deg, #ECFDF5, #D1FAE5); border-left: 4px solid var(--color-app-roadmap); border-radius: var(--radius-sm); margin-bottom: var(--space-3);">
          <strong>Phase ${aktivePhase.nr}</strong> — seit ${aktivePhase.startDatum ? Utils.formatDate(aktivePhase.startDatum) : '?'}
          ${aktivePhase.notizen ? `<div style="margin-top: 4px; font-size: 13px;">${Utils.escapeHtml(Utils.truncate(aktivePhase.notizen, 200))}</div>` : ''}
        </div>
      ` : ''}

      ${(() => {
        const helfer = DB.getHelfer(APP.schuelerId);
        const mitUpdate = helfer.filter(h => h.letzterKontakt && Utils.daysBetween(h.letzterKontakt, new Date().toISOString()) <= 14 && h.notiz);
        const brauchtUpdate = helfer.filter(h => !h.letzterKontakt || Utils.daysBetween(h.letzterKontakt, new Date().toISOString()) > 30);
        if (!helfer.length) return '';
        return `
          <h3>Helfer-Netzwerk Kurzübersicht</h3>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-3);">
            ${mitUpdate.map(h => `
              <div style="padding: var(--space-2) var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 13px; border-left: 3px solid #10B981;">
                <strong>${Utils.escapeHtml(h.name)}</strong> (${Utils.escapeHtml(h.rolle || '')})<br>
                <span style="color: var(--text-muted);">${Utils.escapeHtml(Utils.truncate(h.notiz, 60))}</span>
              </div>
            `).join('')}
            ${brauchtUpdate.length ? `
              <div style="padding: var(--space-2) var(--space-3); background: #FEF3C7; border-radius: var(--radius-sm); font-size: 13px; border-left: 3px solid #F59E0B;">
                ⚠️ ${brauchtUpdate.length} Kontakt(e) brauchen Update: ${brauchtUpdate.slice(0, 2).map(h => Utils.escapeHtml(h.name)).join(', ')}
              </div>
            ` : ''}
          </div>
        `;
      })()}

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
        <a class="btn" href="../codex/?suche=${encodeURIComponent(aktivePhase?.themen?.[0] || '')}" target="_blank">📚 Material</a>
        <a class="btn" href="../roadmap/?schueler=${APP.schuelerId}" target="_blank">🗺️ Roadmap</a>
      </div>
    </div>
  `;
}

function startSession(typ) {
  APP.draft.typ = typ;
  startTimer();
  setSessionMode('live');
}

// ─── LIVE-SESSION ─────────────────────────────────────────────
function renderLive() {
  const container = document.getElementById('via-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="se-section"><p>Kein Klient gewählt.</p></div>`;
    return;
  }

  const template = TEMPLATES.find(t => t.id === APP.draft.typ);

  container.innerHTML = `
    <div class="se-section">
      <h2>🎯 Live-Sitzung ${template ? `— ${template.name}` : ''}</h2>

      ${template?.ablauf ? `
        <details style="margin-bottom: var(--space-4);">
          <summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: var(--color-app-via);">📋 Ablauf-Empfehlung anzeigen (${template.name})</summary>
          <div style="margin-top: var(--space-2); display: grid; gap: 2px;">
            ${template.ablauf.map(a => `
              <div style="display: grid; grid-template-columns: 60px 1fr; font-size: 13px; padding: var(--space-1) var(--space-2); background: var(--bg-subtle); border-radius: var(--radius-sm);">
                <span style="font-weight: 600; color: var(--color-app-via);">${a.zeit}'</span>
                <span>${Utils.escapeHtml(a.was)}</span>
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}

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

      <div style="margin-bottom: var(--space-4);">
        <div class="se-slider-label">🌐 PVT-Mitte (Polyvagal — Zwischencheck)</div>
        <div class="se-pvt">
          <div class="se-pvt-opt ${APP.draft.pvt_mid === 'safe' ? 'selected' : ''}" onclick="APP.draft.pvt_mid='safe'; renderLive();">
            <div class="se-pvt-emoji">😌</div><div class="se-pvt-name">Safe</div>
          </div>
          <div class="se-pvt-opt ${APP.draft.pvt_mid === 'activated' ? 'selected' : ''}" onclick="APP.draft.pvt_mid='activated'; renderLive();">
            <div class="se-pvt-emoji">⚡</div><div class="se-pvt-name">Activated</div>
          </div>
          <div class="se-pvt-opt ${APP.draft.pvt_mid === 'frozen' ? 'selected' : ''}" onclick="APP.draft.pvt_mid='frozen'; renderLive();">
            <div class="se-pvt-emoji">🧊</div><div class="se-pvt-name">Frozen</div>
          </div>
        </div>
        ${APP.draft.pvt_mid === 'frozen' ? `
          <div style="font-size: 13px; color: #DC2626; margin-top: var(--space-2); padding: var(--space-3); background: #FEE2E2; border-radius: var(--radius-sm); border-left: 3px solid #DC2626;">
            <strong>🧊 Dorsal-vagaler Shutdown (Porges 2011)</strong><br>
            Klient ist "nicht da" — Dissoziation oder Erstarrung. Kognitive Arbeit ist jetzt sinnlos.<br><br>
            <strong>Interventions-Leiter:</strong><br>
            1. <strong>Orientierung:</strong> "${APP.draft.thema ? '' : ''} Du bist hier bei mir, im Raum. Heute ist [Datum]. Du bist sicher."<br>
            2. <strong>Sensorischer Reiz:</strong> Kaltes Wasser, Eiswürfel in die Hand, starker Geruch (Pfefferminz)<br>
            3. <strong>5-4-3-2-1 Grounding:</strong> 5 Dinge sehen, 4 hören, 3 fühlen, 2 riechen, 1 schmecken<br>
            4. <strong>Co-Regulation:</strong> Langsame, tiefe Stimme. Eigene Ruhe ausstrahlen. Nicht anfassen ohne Erlaubnis.<br>
            5. <strong>Wenn >15 Min:</strong> Sitzung beenden, Safe-Begleitung organisieren, ggf. psychiatrische Abklärung
          </div>
        ` : ''}
        ${APP.draft.pvt_mid === 'activated' ? `
          <div style="font-size: 13px; color: #92400E; margin-top: var(--space-2); padding: var(--space-3); background: #FEF3C7; border-radius: var(--radius-sm); border-left: 3px solid #F59E0B;">
            <strong>⚡ Sympathikus-Aktivierung (Fight/Flight)</strong><br>
            Klient ist aufgeregt, ängstlich, gereizt. Präfrontaler Kortex eingeschränkt.<br><br>
            <strong>Interventions-Leiter:</strong><br>
            1. <strong>Verlangsamung:</strong> Eigenes Sprechtempo reduzieren, Pausen machen<br>
            2. <strong>Atemübung:</strong> 4-7-8 Atmung (4 ein, 7 halten, 8 aus) oder Box-Breathing (4-4-4-4)<br>
            3. <strong>Bilateral:</strong> Abwechselnd links/rechts tippen (Knie, Schultern) — Butterfly-Hug<br>
            4. <strong>Körper-Fokus:</strong> "Wo im Körper spürst du die Anspannung? Lass uns da hinschauen."<br>
            5. <strong>Wenn stabil:</strong> Zurück zu leichtem Thema, dann graduell zum Arbeitsthema
          </div>
        ` : ''}
      </div>

      <div style="margin-bottom: var(--space-4); display: flex; gap: var(--space-2);">
        <a class="btn" href="../codex/?suche=${encodeURIComponent(APP.draft.thema || '')}" target="_blank">📚 Material aus CODEX öffnen</a>
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
        <button class="btn btn-primary" onclick="setSessionMode('post')">→ Sitzung beenden, zu Post-Session</button>
        <a class="btn" href="../codex/" target="_blank">📚 Material öffnen</a>
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
  const container = document.getElementById('via-content');
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

      <h3>SOAP-Notiz (klinischer Standard)</h3>
      <div class="se-soap-grid">
        <div class="se-soap-card">
          <div class="se-soap-card-title">S — Subjektiv</div>
          <div class="se-soap-hint">Was berichtet der Klient? Hauptbeschwerde, Stimmung in eigenen Worten, Veränderungen seit letzter Sitzung.</div>
          <textarea oninput="APP.draft.soap.S=this.value" placeholder="'Mir geht es diese Woche besser, aber in der Schule...'">${Utils.escapeHtml(APP.draft.soap.S || '')}</textarea>
        </div>
        <div class="se-soap-card">
          <div class="se-soap-card-title">O — Objektiv (Beobachtung + MSE)</div>
          <div class="se-soap-hint">Verhalten, Affekt, Blickkontakt, Sprache, Psychomotorik, Kooperationsbereitschaft.</div>
          <textarea oninput="APP.draft.soap.O=this.value" placeholder="Kooperativ, Blickkontakt hergestellt, Affekt kongruent, Psychomotorik unauffällig...">${Utils.escapeHtml(APP.draft.soap.O || '')}</textarea>
        </div>
        <div class="se-soap-card">
          <div class="se-soap-card-title">A — Assessment</div>
          <div class="se-soap-hint">Klinische Einschätzung, Hypothesen-Update, Risikobewertung.</div>
          <textarea oninput="APP.draft.soap.A=this.value" placeholder="Depressive Symptomatik leicht verbessert. Allianz stabil. Kein akutes Risiko...">${Utils.escapeHtml(APP.draft.soap.A || '')}</textarea>
        </div>
        <div class="se-soap-card">
          <div class="se-soap-card-title">P — Plan</div>
          <div class="se-soap-hint">Nächste Schritte, Interventionen geplant, Terminplanung, Überweisungen.</div>
          <textarea oninput="APP.draft.soap.P=this.value" placeholder="Nächste Sitzung: Emotionsregulation vertiefen. Material: Notfallkoffer...">${Utils.escapeHtml(APP.draft.soap.P || '')}</textarea>
        </div>
      </div>

      <h3 style="margin-top: var(--space-4);">🛡️ Risiko-Assessment</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Suizidalität</label>
          <select onchange="APP.draft.soap.risiko_suizid=this.value" style="width: 100%; padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm);">
            <option value="kein" ${(APP.draft.soap.risiko_suizid || 'kein') === 'kein' ? 'selected' : ''}>Kein Hinweis</option>
            <option value="passiv" ${APP.draft.soap.risiko_suizid === 'passiv' ? 'selected' : ''}>Passive Todesgedanken</option>
            <option value="aktiv" ${APP.draft.soap.risiko_suizid === 'aktiv' ? 'selected' : ''}>Aktive Suizidgedanken → C-SSRS!</option>
            <option value="plan" ${APP.draft.soap.risiko_suizid === 'plan' ? 'selected' : ''}>Plan/Absicht → SOFORT ESKALIEREN</option>
          </select>
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Selbstverletzung</label>
          <select onchange="APP.draft.soap.risiko_sv=this.value" style="width: 100%; padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm);">
            <option value="kein" ${(APP.draft.soap.risiko_sv || 'kein') === 'kein' ? 'selected' : ''}>Kein Hinweis</option>
            <option value="vergangenheit" ${APP.draft.soap.risiko_sv === 'vergangenheit' ? 'selected' : ''}>In Vergangenheit, aktuell nicht</option>
            <option value="aktuell" ${APP.draft.soap.risiko_sv === 'aktuell' ? 'selected' : ''}>Aktuell aktiv</option>
          </select>
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Fremdgefährdung</label>
          <select onchange="APP.draft.soap.risiko_fremd=this.value" style="width: 100%; padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm);">
            <option value="kein" ${(APP.draft.soap.risiko_fremd || 'kein') === 'kein' ? 'selected' : ''}>Kein Hinweis</option>
            <option value="verbal" ${APP.draft.soap.risiko_fremd === 'verbal' ? 'selected' : ''}>Verbale Drohungen</option>
            <option value="akut" ${APP.draft.soap.risiko_fremd === 'akut' ? 'selected' : ''}>Akute Gefährdung → Meldepflicht</option>
          </select>
        </div>
      </div>

      <h3 style="margin-top: var(--space-4);">💊 Intervention & Medikation</h3>
      <div class="se-soap-grid">
        <div class="se-soap-card">
          <div class="se-soap-card-title">Intervention heute</div>
          <div class="se-soap-hint">Welche Methode/Technik? (z.B. DBT Skills, KVT Gedankenprotokoll, Exposition, MI)</div>
          <textarea oninput="APP.draft.soap.intervention=this.value" placeholder="DBT Emotionsregulation: Notfallkoffer besprochen + geübt...">${Utils.escapeHtml(APP.draft.soap.intervention || '')}</textarea>
        </div>
        <div class="se-soap-card">
          <div class="se-soap-card-title">Medikations-Check</div>
          <div class="se-soap-hint">Medikamenten-Compliance? Nebenwirkungen? Dosisänderung?</div>
          <textarea oninput="APP.draft.soap.medikation=this.value" placeholder="Fluoxetin 20mg seit 3 Wochen, keine NW berichtet...">${Utils.escapeHtml(APP.draft.soap.medikation || '')}</textarea>
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

      <h3 style="margin-top: var(--space-5);">📝 Hausaufgabe / Nächster Schritt</h3>
      <textarea id="post-hausaufgabe" rows="2" placeholder="Was soll der Klient bis zur nächsten Sitzung tun?"
        style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit;">${Utils.escapeHtml(APP.draft.hausaufgabe || '')}</textarea>

      ${APP.draft.pvt_start || APP.draft.pvt_mid || APP.draft.pvt_end ? `
        <h3 style="margin-top: var(--space-4);">🌐 PVT-Verlauf in dieser Sitzung</h3>
        <div style="display: flex; gap: var(--space-4); font-size: 14px; padding: var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm);">
          <span>Anfang: <strong>${APP.draft.pvt_start || '—'}</strong></span>
          <span>→</span>
          <span>Mitte: <strong>${APP.draft.pvt_mid || '—'}</strong></span>
          <span>→</span>
          <span>Ende: <strong>${APP.draft.pvt_end || '—'}</strong></span>
        </div>
      ` : ''}

      <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="saveSession()">💾 Sitzung speichern</button>
        <button class="btn" onclick="setSessionMode('live')">← Zurück zu Live</button>
      </div>
    </div>
  `;
}

function setPvtEnd(state) {
  APP.draft.pvt_end = state;
  renderPost();
}

function saveSession() {
  // ORS/SRS: Summe der 4 VAS (0-10), Range 0-40. Cutoff 25 (Miller & Duncan 2003)
  const orsTotal = APP.draft.ors.individual + APP.draft.ors.interpersonal + APP.draft.ors.social + APP.draft.ors.overall;
  const srsTotal = APP.draft.srs.relationship + APP.draft.srs.goals + APP.draft.srs.approach + APP.draft.srs.overall;

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
      pvt_mid: APP.draft.pvt_mid,
      pvt_end: APP.draft.pvt_end,
      hausaufgabe: document.getElementById('post-hausaufgabe')?.value || APP.draft.hausaufgabe || '',
      ors: APP.draft.ors,
      srs: APP.draft.srs,
      ors_total: orsTotal,
      srs_total: srsTotal,
      ereignisse: APP.draft.ereignisse,
      risiko_suizid: APP.draft.soap.risiko_suizid || 'kein',
      risiko_sv: APP.draft.soap.risiko_sv || 'kein',
      risiko_fremd: APP.draft.soap.risiko_fremd || 'kein',
      intervention: APP.draft.soap.intervention || '',
      medikation: APP.draft.soap.medikation || '',
      dauer_min: APP.sessionStart ? Math.floor((Date.now() - APP.sessionStart) / 60000) : null,
    },
  });

  // Wohlbefinden auto-tracking
  DB.addWohlbefinden(APP.schuelerId, orsTotal, '');

  // Risiko-Flagging nach ORS-Cutoff (Miller & Duncan 2003: 25/40 = klinische Schwelle)
  if (orsTotal < 25) {
    const severity = orsTotal < 15 ? 'gelb' : 'gruen';
    DB.addRisiko(APP.schuelerId, { sicherheit: severity, source: 'ors-low', value: orsTotal });
    if (orsTotal < 15) {
      Bridge.notify('crisis_alert', { schuelerId: APP.schuelerId, severity: 'low', source: 'ors' });
    }
  }

  // SRS-Ruptur sofort flaggen wenn < 25 (nicht erst nach 3 Sitzungen)
  if (srsTotal < 25) {
    showToast(`⚠️ SRS ${srsTotal.toFixed(0)}/40 — Allianz-Ruptur möglich. Ansprechen!`, 'error');
  }

  // Risiko-Eskalation bei Suizidalität in SOAP
  const risikoSuizid = APP.draft.soap.risiko_suizid;
  if (risikoSuizid === 'aktiv' || risikoSuizid === 'plan') {
    DB.addRisiko(APP.schuelerId, { sicherheit: 'rot', source: 'soap-suizid', level: risikoSuizid });
    Bridge.notify('crisis_alert', { schuelerId: APP.schuelerId, severity: risikoSuizid === 'plan' ? 'critical' : 'high', source: 'session-soap' });
    showToast('⚠️ Suizidalität dokumentiert — Risiko-Eintrag erstellt, Krisen-Alert gesendet.', 'error');
  }

  // Auto-Aufgabe aus Plan-Feld
  const planText = APP.draft.soap.P?.trim();
  if (planText && planText.length > 5) {
    DB.addAufgabe({
      titel: planText.length > 80 ? planText.slice(0, 77) + '...' : planText,
      prioritaet: 'normal',
      faelligkeit: '',
      erledigt: false,
    });
  }

  // Auto-Termin-Vorschlag wenn Hausaufgabe gesetzt
  const ha = document.getElementById('post-hausaufgabe')?.value?.trim();
  if (ha) {
    const naechsteWoche = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    DB.createTermin({ datum: naechsteWoche, uhrzeit: '', titel: `Follow-up: ${ha.slice(0, 40)}`, typ: 'sitzung', schuelerId: APP.schuelerId });
  }

  Bridge.notify('session_completed', { schuelerId: APP.schuelerId, ors: orsTotal, srs: srsTotal });
  showToast('Sitzung gespeichert. Aufgabe + Termin aus Plan erstellt.', 'ok');

  // Reset draft
  APP.draft = {
    quicknotes: '', soap: { S: '', O: '', A: '', P: '' },
    ors: { individual: 8, interpersonal: 8, social: 8, overall: 8 },
    srs: { relationship: 8, goals: 8, approach: 8, overall: 8 },
    pvt_start: null, pvt_end: null,
    stimmung_start: 5, stimmung_end: 5,
    thema: '', materialien: [], ereignisse: [], typ: 'regulaer',
  };
  setSessionMode('history');
}

// ─── HISTORY ─────────────────────────────────────────────────
function renderHistory() {
  const container = document.getElementById('via-content');
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
        : notizen.map(n => {
            const pvt = [n.soap?.pvt_start, n.soap?.pvt_mid, n.soap?.pvt_end].filter(Boolean);
            const pvtEmoji = { safe: '😌', activated: '⚡', frozen: '🧊' };
            const ors = n.soap?.ors;
            const srs = n.soap?.srs;
            return `
              <details class="se-history-detail">
                <summary class="se-history-row">
                  <div class="se-history-date">${Utils.formatDate(n.datum)}</div>
                  <div>
                    <strong>${Utils.escapeHtml(n.soap?.typ || 'Sitzung')}</strong>
                    ${n.soap?.ereignisse?.length ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">${n.soap.ereignisse.slice(0, 2).join(' · ')}</span>` : ''}
                  </div>
                  <div style="font-size: 13px;">ORS: <strong>${n.soap?.ors_total?.toFixed(1) || '—'}</strong></div>
                  <div style="font-size: 13px;">SRS: <strong>${n.soap?.srs_total?.toFixed(1) || '—'}</strong></div>
                  <div>${n.soap?.dauer_min ? n.soap.dauer_min + ' min' : ''}</div>
                </summary>
                <div style="padding: var(--space-3); background: var(--bg-subtle); border-radius: 0 0 var(--radius-sm) var(--radius-sm); font-size: 13px;">
                  ${ors ? `<div style="margin-bottom: var(--space-2);"><strong>ORS-Subskalen:</strong> Individuell ${ors.individual} · Beziehung ${ors.interpersonal} · Sozial ${ors.social} · Gesamt ${ors.overall}</div>` : ''}
                  ${srs ? `<div style="margin-bottom: var(--space-2);"><strong>SRS-Subskalen:</strong> Beziehung ${srs.relationship} · Ziele ${srs.goals} · Ansatz ${srs.approach} · Gesamt ${srs.overall}</div>` : ''}
                  ${pvt.length ? `<div style="margin-bottom: var(--space-2);"><strong>PVT-Verlauf:</strong> ${pvt.map(p => pvtEmoji[p] || p).join(' → ')}</div>` : ''}
                  ${n.soap?.stimmung_start !== undefined ? `<div style="margin-bottom: var(--space-2);"><strong>Stimmung:</strong> ${n.soap.stimmung_start} → ${n.soap.stimmung_end || '?'}</div>` : ''}
                  ${n.soap?.hausaufgabe ? `<div style="margin-bottom: var(--space-2);"><strong>Hausaufgabe:</strong> ${Utils.escapeHtml(n.soap.hausaufgabe)}</div>` : ''}
                  ${n.soap?.intervention ? `<div style="margin-bottom: var(--space-2);"><strong>Intervention:</strong> ${Utils.escapeHtml(n.soap.intervention)}</div>` : ''}
                  ${n.soap?.medikation ? `<div style="margin-bottom: var(--space-2);"><strong>Medikation:</strong> ${Utils.escapeHtml(n.soap.medikation)}</div>` : ''}
                  ${n.soap?.risiko_suizid && n.soap.risiko_suizid !== 'kein' ? `<div style="margin-bottom: var(--space-2); color: #DC2626;"><strong>Risiko:</strong> Suizid: ${n.soap.risiko_suizid}${n.soap.risiko_sv && n.soap.risiko_sv !== 'kein' ? ' · SV: ' + n.soap.risiko_sv : ''}${n.soap.risiko_fremd && n.soap.risiko_fremd !== 'kein' ? ' · Fremd: ' + n.soap.risiko_fremd : ''}</div>` : ''}
                  ${n.soap?.O ? `<div><strong>Beobachtung:</strong> ${Utils.escapeHtml(Utils.truncate(n.soap.O, 200))}</div>` : ''}
                </div>
              </details>
            `;
          }).join('')
      }
    </div>
  `;
}

// openCrisis, updateContext, Bootstrap werden von via/app.js bereitgestellt
