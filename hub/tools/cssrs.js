/* ============================================================
   CRISIS — C-SSRS (Columbia Suicide Severity Rating Scale)
   ============================================================
   Validiertes Suizid-Risiko-Screening (Posner et al. 2011).
   5 Kernfragen + Verhaltens-Items. Liefert Schweregrad und
   empfiehlt Maßnahmen.

   Quelle: cssrs.columbia.edu (Self-Report, Recent Screen Version)
   ============================================================ */

const CSSRS = (function () {
  // ─── 5 Kernfragen ──────────────────────────────────────────
  const ITEMS = [
    {
      id: 1, crit: 1,
      title: 'Lebensüberdruss / Wunsch zu sterben',
      question: 'Hast du im letzten Monat gewünscht, du wärst tot oder könntest einschlafen und nicht wieder aufwachen?',
    },
    {
      id: 2, crit: 2,
      title: 'Unspezifische Suizidgedanken',
      question: 'Hast du im letzten Monat tatsächlich daran gedacht, dir das Leben zu nehmen?',
    },
    {
      id: 3, crit: 3,
      title: 'Suizidgedanken mit Methode',
      question: 'Hast du darüber nachgedacht, wie du es tun würdest?',
      followUp: 'Wenn ja: Hattest du eine bestimmte Methode im Kopf?',
    },
    {
      id: 4, crit: 4,
      title: 'Suizidale Absicht (ohne konkreten Plan)',
      question: 'Hattest du diese Gedanken und in gewisser Weise die Absicht, sie umzusetzen?',
    },
    {
      id: 5, crit: 5,
      title: 'Suizidplan & Absicht',
      question: 'Hast du im letzten Monat schon angefangen, ein Detail-Plan auszuarbeiten oder vorzubereiten? Hattest du die Absicht, diesen Plan auszuführen?',
    },
  ];

  // ─── Zusatz-Items: Verhalten ───────────────────────────────
  const BEHAVIOR_ITEMS = [
    {
      id: 'b1',
      question: 'Hast du je etwas getan, etwas vorbereitet oder begonnen, um dein Leben zu beenden? (auch Vergangenheit)',
    },
    {
      id: 'b2',
      question: 'War das in den letzten 3 Monaten?',
    },
  ];

  // ─── Auswertung ────────────────────────────────────────────
  function evaluate(answers) {
    // answers = { 1: 'ja'|'nein', 2: ..., b1: ..., b2: ... }
    const yes = (id) => answers[id] === 'ja';
    const highest = [5, 4, 3, 2, 1].find(n => yes(n)) || 0;
    const recentBehavior = yes('b1') && yes('b2');
    const lifetimeBehavior = yes('b1') && !yes('b2');

    let severity, label, recommendation, color, escalation;

    if (highest >= 4 || recentBehavior) {
      severity = 'critical';
      color = '#991B1B';
      label = '🚨 KRITISCH — Akute Suizidgefahr';
      recommendation = `<strong>Sofortige psychiatrische Beurteilung erforderlich.</strong>
        <ul>
          <li>Sicherheitsplan jetzt mit dem/der Jugendlichen erstellen (siehe Tab Sicherheitsplan)</li>
          <li>Erreichbarkeit gefährlicher Mittel reduzieren (Means Restriction)</li>
          <li>Erwachsene Bezugsperson informieren (DSGVO: Selbstgefährdung erlaubt Bruch der Schweigepflicht)</li>
          <li><strong>Überweisung an CHNP Jugendpsychiatrie (26 82 28 28) oder CHL Pädiatrie</strong></li>
          <li>Bei akuter Gefahr: 112 oder Polizei 113</li>
          <li>Niemals allein lassen, bis Sicherheit gewährleistet</li>
        </ul>`;
      escalation = true;
    } else if (highest === 3 || lifetimeBehavior) {
      severity = 'high';
      color = '#DC2626';
      label = '⚠️ HOCH — Erhöhtes Suizidrisiko';
      recommendation = `<strong>Innerhalb 24h Folgegespräch + Sicherheitsplan.</strong>
        <ul>
          <li>Sicherheitsplan erstellen (siehe Tab Sicherheitsplan)</li>
          <li>Eltern/Bezugspersonen informieren (gemeinsam mit dem Jugendlichen, wenn möglich)</li>
          <li>Wöchentliche Begleitung intensivieren</li>
          <li>Verweis an SSM oder ambulante Therapie erwägen</li>
          <li>Krisennummer aufschreiben &amp; mitgeben: SOS 45 45 45</li>
        </ul>`;
      escalation = true;
    } else if (highest === 2) {
      severity = 'mod';
      color = '#F59E0B';
      label = '🟡 MITTEL — Suizidgedanken, kein Plan';
      recommendation = `<strong>Nächster Termin innerhalb 1 Woche.</strong>
        <ul>
          <li>Suizidgedanken offen ansprechen (Mythos: Ansprechen schadet — falsch, das Gegenteil!)</li>
          <li>Schutzfaktoren stärken (Beziehungen, Sinn, Hobbys)</li>
          <li>Krisenplan für den Notfall vereinbaren</li>
          <li>Krisennummer aufschreiben: SOS 45 45 45</li>
          <li>Bei Verschlechterung sofort eskalieren</li>
        </ul>`;
      escalation = false;
    } else if (highest === 1) {
      severity = 'mod';
      color = '#FBBF24';
      label = '🟡 NIEDRIG — Lebensüberdruss';
      recommendation = `<strong>Aufmerksam beobachten, regelmäßige Begleitung.</strong>
        <ul>
          <li>Gespräch über Belastungen führen, ohne zu drängen</li>
          <li>Schutzfaktoren stärken (Beziehung, Stärken, Hoffnung)</li>
          <li>Verlauf dokumentieren (Tab Risiko-Verlauf)</li>
          <li>Re-Screening bei Verschlechterung der Stimmung</li>
        </ul>`;
      escalation = false;
    } else {
      severity = 'low';
      color = '#10B981';
      label = '✅ KEIN AKUTES RISIKO';
      recommendation = `Aktuell keine Suizidgedanken angegeben. Trotzdem:
        <ul>
          <li>Wachsamkeit beibehalten, besonders bei depressiven Phasen</li>
          <li>Schutzfaktoren weiter stärken</li>
          <li>Bei Verschlechterung Re-Screening durchführen</li>
        </ul>`;
      escalation = false;
    }

    return { severity, label, recommendation, color, highest, recentBehavior, lifetimeBehavior, escalation };
  }

  // ─── State ─────────────────────────────────────────────────
  let state = { answers: {}, schuelerId: null };

  function reset() { state = { answers: {}, schuelerId: state.schuelerId }; }

  function setAnswer(id, val) {
    state.answers[id] = val;
    render();
  }

  function save() {
    const result = evaluate(state.answers);
    if (state.schuelerId) {
      // Persist as Risiko-Eintrag
      DB.addRisiko(state.schuelerId, {
        sicherheit: result.severity === 'critical' || result.severity === 'high' ? 'rot'
                   : result.severity === 'mod' ? 'gelb' : 'gruen',
        cssrs_severity: result.severity,
        cssrs_highest: result.highest,
        cssrs_answers: state.answers,
      });
      Bridge.notify('crisis_alert', {
        schuelerId: state.schuelerId,
        severity: result.severity,
        source: 'cssrs',
      });
      showToast('C-SSRS gespeichert. Risiko-Verlauf aktualisiert.', 'ok');
    } else {
      showToast('C-SSRS ausgewertet (nicht gespeichert: kein Klient gewählt)', 'info');
    }
  }

  function render(schuelerId) {
    if (schuelerId !== undefined) state.schuelerId = schuelerId;
    const container = document.getElementById('cr-content');
    const a = state.answers;
    const allAnswered = ITEMS.every(it => a[it.id]) && BEHAVIOR_ITEMS.every(it => a[it.id]);
    const result = allAnswered ? evaluate(a) : null;

    container.innerHTML = `
      <div class="cr-section">
        <h2>🔍 C-SSRS — Suizid-Risiko-Screening</h2>
        <div class="cr-section-intro">
          Das <strong>Columbia Suicide Severity Rating Scale</strong> (Posner et al. 2011) ist ein validiertes Tool
          zur Risikoeinschätzung. Stelle die Fragen <strong>direkt und ruhig</strong> — Untersuchungen zeigen, dass
          das Ansprechen das Risiko nicht erhöht, sondern senkt (Dazzi et al. 2014).
        </div>

        ${ITEMS.map(it => `
          <div class="cssrs-item crit-${it.crit} ${a[it.id] === 'ja' ? 'checked' : ''}">
            <div class="cssrs-num">Frage ${it.id}</div>
            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 4px;">${Utils.escapeHtml(it.title)}</div>
            <div class="cssrs-question">${Utils.escapeHtml(it.question)}</div>
            ${it.followUp ? `<div style="font-size: 13px; color: var(--text-muted); font-style: italic;">${Utils.escapeHtml(it.followUp)}</div>` : ''}
            <div class="cssrs-yesno">
              <button class="btn btn-lg ${a[it.id] === 'ja' ? 'selected' : ''}" data-val="ja" onclick="CSSRS.setAnswer(${it.id},'ja')">Ja</button>
              <button class="btn btn-lg ${a[it.id] === 'nein' ? 'selected' : ''}" data-val="nein" onclick="CSSRS.setAnswer(${it.id},'nein')">Nein</button>
            </div>
          </div>
        `).join('')}

        <h3 style="margin-top: var(--space-5);">Verhaltens-Anamnese</h3>
        ${BEHAVIOR_ITEMS.map(it => `
          <div class="cssrs-item ${a[it.id] === 'ja' ? 'checked' : ''}">
            <div class="cssrs-question">${Utils.escapeHtml(it.question)}</div>
            <div class="cssrs-yesno">
              <button class="btn btn-lg ${a[it.id] === 'ja' ? 'selected' : ''}" data-val="ja" onclick="CSSRS.setAnswer('${it.id}','ja')">Ja</button>
              <button class="btn btn-lg ${a[it.id] === 'nein' ? 'selected' : ''}" data-val="nein" onclick="CSSRS.setAnswer('${it.id}','nein')">Nein</button>
            </div>
          </div>
        `).join('')}

        ${result ? `
          <div class="cssrs-result severity-${result.severity}">
            <h3>${result.label}</h3>
            <div style="margin-top: var(--space-3);">${result.recommendation}</div>
            <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2); flex-wrap: wrap;">
              ${state.schuelerId
                ? `<button class="btn btn-danger btn-lg" onclick="CSSRS.save()">💾 Im Risiko-Verlauf speichern</button>`
                : `<div style="font-size: 13px; color: var(--text-muted);">Kein Klient gewählt — Auswertung wird nicht gespeichert.</div>`}
              ${result.escalation
                ? `<button class="btn btn-lg" onclick="setTab('safety')">→ Sicherheitsplan jetzt erstellen</button>`
                : ''}
              <button class="btn btn-lg" onclick="CSSRS.reset(); CSSRS.render()">🔄 Neu starten</button>
            </div>
          </div>
        ` : `
          <div style="margin-top: var(--space-4); color: var(--text-muted); font-size: 14px;">
            Beantworte alle ${ITEMS.length + BEHAVIOR_ITEMS.length} Fragen für die Auswertung.
            Beantwortet: ${Object.keys(a).length}/${ITEMS.length + BEHAVIOR_ITEMS.length}
          </div>
        `}
      </div>
    `;
  }

  return { render, setAnswer, reset, save, evaluate };
})();
