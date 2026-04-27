/* ============================================================
   CRISIS — Stanley-Brown Safety Plan
   ============================================================
   6-Schritte-Sicherheitsplan (Stanley & Brown 2012).
   Goldstandard der Suizidprävention. Druckbar als Wallet-Karte.

   Persistierung: pw_safety_plans (lokal pro Schüler).
   ============================================================ */

const SafetyPlan = (function () {
  const STORAGE_KEY = 'pw_safety_plans';

  // ─── 6 Schritte (Stanley & Brown 2012) ─────────────────────
  const STEPS = [
    {
      id: 1,
      title: 'Warnsignale',
      icon: '🚨',
      hint: 'Was sind die ersten Anzeichen, dass eine Krise kommt? Gedanken, Gefühle, Stimmung, Verhalten oder Situationen, die mich in Gefahr bringen.',
      placeholder: 'z.B.\n- Ich kann nicht schlafen\n- Ich denke ständig an früher\n- Ich trinke Alkohol\n- Ich fühle mich völlig allein',
    },
    {
      id: 2,
      title: 'Eigene Coping-Strategien',
      icon: '💪',
      hint: 'Was kann ich allein tun, um mich abzulenken oder zu beruhigen? (ohne andere Menschen)',
      placeholder: 'z.B.\n- Spazieren gehen, joggen\n- Lieblingsmusik hören\n- Heißes Bad / kalte Dusche\n- Tagebuch schreiben\n- 5-4-3-2-1 Grounding',
    },
    {
      id: 3,
      title: 'Soziale Ablenkung',
      icon: '👥',
      hint: 'Welche Menschen oder Orte können mich von Krisengedanken ablenken — auch ohne dass ich darüber sprechen muss?',
      placeholder: 'z.B.\n- Schwester anrufen\n- Skatepark / Fußballplatz\n- Café in der Innenstadt\n- Bibliothek\n- Verein / Hobby-Gruppe',
    },
    {
      id: 4,
      title: 'Vertrauenspersonen kontaktieren',
      icon: '🤝',
      hint: 'Wem kann ich anvertrauen, dass es mir gerade schlecht geht? Name + Telefon. Zwei Personen sind besser als eine.',
      placeholder: 'z.B.\n- Mama: 0123 456 789\n- Bester Freund Tom: 0987 654 321\n- Tante Lisa: 0555 111 222',
    },
    {
      id: 5,
      title: 'Profis erreichen',
      icon: '🏥',
      hint: 'Wenn die Krise groß wird: Wo finde ich professionelle Hilfe?',
      placeholder: 'z.B.\n- SOS Détresse (24/7): 45 45 45\n- Kanner-Jugendtelefon: 116 111\n- Hausarzt: ___\n- Bei akuter Gefahr: 112 oder 113',
    },
    {
      id: 6,
      title: 'Umgebung sichern (Means Restriction)',
      icon: '🔒',
      hint: 'Welche gefährlichen Mittel kann ich aus meiner Reichweite entfernen? (Medikamente, Waffen, Klingen…). Wer hilft mir dabei?',
      placeholder: 'z.B.\n- Tabletten zur Mama bringen\n- Klingen in den Werkkasten in den Keller\n- Alkohol nicht mehr im Zimmer\n- Diese Schritte gemeinsam mit ___',
    },
  ];

  let state = {
    schuelerId: null,
    plan: STEPS.reduce((acc, s) => ({ ...acc, [s.id]: '' }), {}),
    lastSaved: null,
  };

  // ─── Storage ────────────────────────────────────────────────
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveAll(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  function loadFor(schuelerId) {
    const all = loadAll();
    if (schuelerId && all[schuelerId]) {
      state.plan = { ...state.plan, ...all[schuelerId].plan };
      state.lastSaved = all[schuelerId].lastSaved;
    } else {
      state.plan = STEPS.reduce((acc, s) => ({ ...acc, [s.id]: '' }), {});
      state.lastSaved = null;
    }
  }

  function save() {
    if (!state.schuelerId) {
      showToast('Kein Klient gewählt — Plan kann nicht gespeichert werden', 'info');
      return;
    }
    // Read current values from textareas
    STEPS.forEach(s => {
      const ta = document.getElementById(`sp-step-${s.id}`);
      if (ta) state.plan[s.id] = ta.value;
    });
    const all = loadAll();
    all[state.schuelerId] = {
      plan: state.plan,
      lastSaved: new Date().toISOString(),
    };
    saveAll(all);
    state.lastSaved = all[state.schuelerId].lastSaved;
    showToast('Sicherheitsplan gespeichert', 'ok');
    Bridge.notify('safety_plan_saved', { schuelerId: state.schuelerId });
    render();
  }

  function clear() {
    if (!confirm('Gesamten Plan löschen?')) return;
    state.plan = STEPS.reduce((acc, s) => ({ ...acc, [s.id]: '' }), {});
    if (state.schuelerId) {
      const all = loadAll();
      delete all[state.schuelerId];
      saveAll(all);
      state.lastSaved = null;
    }
    render();
  }

  function printPlan() {
    window.print();
  }

  function exportText() {
    const lines = [
      'PATHWAYS — SICHERHEITSPLAN',
      '═══════════════════════════════════',
      state.lastSaved ? `Erstellt: ${Utils.formatDate(state.lastSaved)}` : '',
      '',
    ];
    STEPS.forEach(s => {
      lines.push(`${s.icon}  ${s.id}. ${s.title}`);
      lines.push('───────────────────────────────────');
      lines.push(state.plan[s.id] || '(leer)');
      lines.push('');
    });
    lines.push('NOTFALL-NUMMERN');
    lines.push('═══════════════════════════════════');
    lines.push('🚨 Polizei: 113   |   Rettung: 112');
    lines.push('☎  SOS Détresse 24/7: 45 45 45');
    lines.push('☎  Kanner-Jugendtelefon: 116 111');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sicherheitsplan-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Render ────────────────────────────────────────────────
  function render(schuelerId) {
    if (schuelerId !== undefined) {
      state.schuelerId = schuelerId;
      loadFor(schuelerId);
    }
    const container = document.getElementById('cr-content');
    container.innerHTML = `
      <div class="cr-section">
        <h2>🛡️ Sicherheitsplan</h2>
        <div class="cr-section-intro">
          <strong>Stanley-Brown Safety Plan</strong> (2012) — der Goldstandard der Suizidprävention.
          Den Plan <strong>gemeinsam</strong> mit dem Jugendlichen ausfüllen, nicht für ihn.
          Eine Kopie sollte er/sie immer dabei haben (Smartphone-Foto oder gedruckt).
          ${state.lastSaved ? `<br><br><strong>Zuletzt gespeichert:</strong> ${Utils.formatDate(state.lastSaved)}` : ''}
        </div>

        ${STEPS.map(s => `
          <div class="sp-step">
            <div class="sp-step-header">
              <div class="sp-step-num">${s.id}</div>
              <div>
                <div class="sp-step-title">${s.icon} ${Utils.escapeHtml(s.title)}</div>
              </div>
            </div>
            <div class="sp-step-hint">${Utils.escapeHtml(s.hint)}</div>
            <textarea id="sp-step-${s.id}" placeholder="${Utils.escapeHtml(s.placeholder)}">${Utils.escapeHtml(state.plan[s.id] || '')}</textarea>
          </div>
        `).join('')}

        <div class="sp-actions">
          <button class="btn btn-danger btn-lg" onclick="SafetyPlan.save()">💾 Plan speichern</button>
          <button class="btn btn-lg" onclick="SafetyPlan.printPlan()">🖨️ Drucken (Wallet-Karte)</button>
          <button class="btn btn-lg" onclick="SafetyPlan.exportText()">📄 Als Text exportieren</button>
          <button class="btn btn-lg" onclick="SafetyPlan.clear()">🗑️ Plan löschen</button>
          ${state.schuelerId
            ? `<div style="font-size: 13px; color: var(--text-muted); align-self: center;">→ Plan ist mit Klient ${state.schuelerId.slice(-4)} verknüpft</div>`
            : `<div style="font-size: 13px; color: var(--accent); align-self: center;">⚠️ Kein Klient gewählt — Plan wird nicht persistiert</div>`}
        </div>
      </div>
    `;
  }

  return { render, save, clear, printPlan, exportText };
})();
