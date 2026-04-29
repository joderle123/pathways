/* ============================================================
   CRISIS — Triage-Baum
   ============================================================
   Strukturierter Entscheidungsbaum für akute Krisen-Situationen.
   Hilft Fachkraft, im Stress die richtige Eskalation zu wählen.

   Baum-Logik basierend auf SAFE-T-Protocol (SAMHSA 2009).
   ============================================================ */

const Triage = (function () {
  // ─── Entscheidungsbaum-Knoten ──────────────────────────────
  const TREE = {
    start: {
      question: 'Welche akute Situation liegt vor?',
      options: [
        { label: '⚠️ Suizid-Äußerung / -Versuch', next: 'suizid_1' },
        { label: '🩸 Selbstverletzung',           next: 'sv_1' },
        { label: '😡 Aggression / Gewalt',         next: 'gewalt_1' },
        { label: '😨 Panikattacke / Dissoziation', next: 'panik_1' },
        { label: '🏃 Weglaufen / Kontaktabbruch',  next: 'weglauf_1' },
        { label: '🚔 Verdacht auf Kindeswohl-Gefährdung', next: 'kwg_1' },
      ],
    },

    // ─── SUIZID-Pfad ────────────────────────────────────────
    suizid_1: {
      question: 'Aktuelle Selbstgefährdung?',
      options: [
        { label: 'JA — Mittel verfügbar oder Versuch im Gange', next: 'suizid_akut' },
        { label: 'JA — Konkrete Pläne, aber kein Zugriff auf Mittel', next: 'suizid_hoch' },
        { label: 'NEIN — Gedanken ohne Plan oder Zeitpunkt', next: 'suizid_mittel' },
      ],
    },
    suizid_akut: {
      outcome: '🚨 SOFORT-MASSNAHMEN',
      actions: [
        '<strong>Person nicht allein lassen</strong>',
        'Sofort 112 (Rettung) oder 113 (Polizei) anrufen',
        'CHNP Jugendpsychiatrie verständigen: 26 82 28 28',
        'Eltern/Bezugspersonen informieren (gesetzlich erforderlich bei akuter Selbstgefährdung)',
        'Nach Stabilisierung: Sicherheitsplan erstellen',
      ],
    },
    suizid_hoch: {
      outcome: '⚠️ HOCH — Innerhalb 24 Stunden',
      actions: [
        'C-SSRS durchführen (siehe Tab C-SSRS)',
        '<strong>Sicherheitsplan jetzt gemeinsam erstellen</strong>',
        'Means Restriction: gefährliche Mittel aus Reichweite (mit Eltern absprechen)',
        'Eltern/Bezugspersonen informieren',
        'Termin bei SSM oder CHNP innerhalb 7 Tagen',
        'Krisennummer mitgeben: SOS Détresse 45 45 45',
      ],
    },
    suizid_mittel: {
      outcome: '🟡 MITTEL — Nahe Begleitung',
      actions: [
        'C-SSRS dokumentieren',
        'Schutzfaktoren stärken (Beziehungen, Sinn, Hoffnung)',
        'Krisenplan vereinbaren (was tun, wenn Gedanken stärker werden)',
        'Krisennummer: SOS 45 45 45 — aufschreiben',
        'Wöchentliche Begleitung intensivieren',
        'Re-Screening in 1 Woche',
      ],
    },

    // ─── SELBSTVERLETZUNG-Pfad ──────────────────────────────
    sv_1: {
      question: 'Schwere der Verletzung?',
      options: [
        { label: 'Stark blutend / tiefe Wunde / Atemnot', next: 'sv_akut' },
        { label: 'Oberflächlich — kein medizinischer Notfall', next: 'sv_mittel' },
        { label: 'Person berichtet Selbstverletzung (nicht aktuell)', next: 'sv_anamnese' },
      ],
    },
    sv_akut: {
      outcome: '🚨 SOFORT-MASSNAHMEN',
      actions: [
        '112 (Rettung) anrufen',
        'Erste Hilfe leisten (Druckverband bei starker Blutung)',
        'Person nicht allein lassen',
        'Eltern parallel informieren',
        'Nach medizinischer Versorgung: Suizidalität abklären (C-SSRS)',
      ],
    },
    sv_mittel: {
      outcome: '⚠️ Heute behandeln',
      actions: [
        'Wunde versorgen (Erste-Hilfe-Set, Verband)',
        'C-SSRS durchführen — Selbstverletzung kann mit Suizidgedanken einhergehen',
        'Funktion der Selbstverletzung verstehen (Spannungsabbau? Bestrafung? Hilferuf?)',
        'Sicherheitsplan: Was hilft stattdessen? (Eiswürfel, kalte Dusche, intensive Bewegung)',
        'Eltern informieren',
      ],
    },
    sv_anamnese: {
      outcome: '🟡 Anamnestisch dokumentieren',
      actions: [
        'Detailliert dokumentieren: Häufigkeit, Methode, Auslöser, Funktion',
        'C-SSRS (auch ohne aktuelle Selbstverletzung)',
        'Alternative Skills aufbauen (DBT-Skills: Eiswürfel, Sport, Atmung)',
        'Re-Evaluation in 2 Wochen',
      ],
    },

    // ─── GEWALT-Pfad ────────────────────────────────────────
    gewalt_1: {
      question: 'Aktuelle Eskalation?',
      options: [
        { label: 'Person ist akut aggressiv, andere in Gefahr', next: 'gewalt_akut' },
        { label: 'Aufgeregt, drohend, aber kontrolliert', next: 'gewalt_mittel' },
        { label: 'Bericht über vergangene Gewalt', next: 'gewalt_anamnese' },
      ],
    },
    gewalt_akut: {
      outcome: '🚨 SOFORT-MASSNAHMEN',
      actions: [
        'Eigene Sicherheit zuerst — Distanz halten, Fluchtweg sichern',
        '113 (Polizei) anrufen',
        'Andere Personen aus dem Raum',
        'Ruhig sprechen, nicht provozieren',
        'Nach Beruhigung: Hintergründe klären (Drogen? Auslöser? Trauma-Trigger?)',
      ],
    },
    gewalt_mittel: {
      outcome: '⚠️ Deeskalation',
      actions: [
        'Sicherer Abstand, ruhiger Ton',
        'Gefühle benennen: "Ich sehe, du bist sehr wütend"',
        'Pause anbieten (Raum verlassen, kalte Luft)',
        'Auslöser identifizieren',
        'Bei Wiederholung: Anti-Gewalt-Programm (ALUPSE) erwägen',
      ],
    },
    gewalt_anamnese: {
      outcome: '🟡 Risiko-Profil erstellen',
      actions: [
        'Trigger-Analyse: Wann wird die Person gewalttätig?',
        'Hintergründe: ADHS? Trauma? Substanzkonsum?',
        'Coping-Skills aufbauen (Wut-Skills, Time-out)',
        'Eltern-Schule für Wut-Management einbeziehen',
      ],
    },

    // ─── PANIK-Pfad ─────────────────────────────────────────
    panik_1: {
      question: 'Aktueller Zustand?',
      options: [
        { label: 'Hyperventilation, kann nicht sprechen', next: 'panik_akut' },
        { label: 'Erstarrt, dissoziativ, nicht ansprechbar', next: 'panik_diss' },
        { label: 'Aufgeregt, aber kommunikationsfähig', next: 'panik_mittel' },
      ],
    },
    panik_akut: {
      outcome: '⚠️ Akute Beruhigung',
      actions: [
        'Eigene Ruhe ausstrahlen',
        'Atmung führen: "Atme mit mir — 4 Sekunden ein, 6 aus"',
        'Box-Breathing oder 4-7-8',
        'Erinnern: "Es ist eine Panikattacke. Sie geht vorbei."',
        'Wenn nicht abklingt nach 30 Min: Hausarzt / Notaufnahme',
      ],
    },
    panik_diss: {
      outcome: '⚠️ Grounding-Intervention',
      actions: [
        '5-4-3-2-1: 5 Dinge sehen, 4 hören, 3 fühlen, 2 riechen, 1 schmecken',
        'Kalter Reiz: Eiswürfel in die Hand, kaltes Wasser ins Gesicht',
        'Orientierung: "Wir sind in [Ort]. Heute ist [Datum]. Du bist sicher."',
        'Wenn länger als 1h: psychiatrische Abklärung (CHNP)',
      ],
    },
    panik_mittel: {
      outcome: '🟢 Beruhigung & Plan',
      actions: [
        'Atemübung gemeinsam machen',
        'Auslöser identifizieren',
        'Sicherer-Ort-Übung',
        'Krisenplan für nächstes Mal erstellen (Tab Sicherheitsplan)',
      ],
    },

    // ─── WEGLAUFEN-Pfad ─────────────────────────────────────
    weglauf_1: {
      question: 'Aktueller Status?',
      options: [
        { label: 'Person ist verschwunden, unbekannter Ort', next: 'weglauf_akut' },
        { label: 'Hat angekündigt zu gehen, noch da', next: 'weglauf_droht' },
        { label: 'Wiederholtes Muster (mehr als 2x)', next: 'weglauf_muster' },
      ],
    },
    weglauf_akut: {
      outcome: '🚨 Suchaktion',
      actions: [
        'Eltern sofort informieren',
        'Bei Minderjährigen UND akuter Gefahr: 113 (Polizei) — Vermisstenanzeige',
        'Übliche Orte abfragen (Freunde, Großeltern, Lieblingsplatz)',
        'Sozialarbeiter / ONE informieren bei Pflegekind',
        'Bei Rückkehr: Gespräch über Auslöser, kein Bestrafen',
      ],
    },
    weglauf_droht: {
      outcome: '⚠️ Deeskalation',
      actions: [
        'Person ernst nehmen — nicht zurückhalten',
        '"Ich sehe, du willst weg. Was ist gerade zu viel?"',
        'Angebot: "Lass uns 10 Min reden, dann entscheidest du"',
        'Auslöser klären (Streit? Trigger?)',
        'Kompromiss: kurzer Spaziergang gemeinsam',
      ],
    },
    weglauf_muster: {
      outcome: '🟡 Systemische Analyse',
      actions: [
        'Funktion verstehen: Flucht vor Konflikt? Aufmerksamkeit? Re-enactment?',
        'Familien-Gespräch / Hilfeplan-Konferenz',
        'Bindungsmuster prüfen (Anamnese, ACE-Score)',
        'Bei Pflegekind: Bezugspersonen-Wechsel?',
        'Stationäre Aufnahme als letzte Option erwägen',
      ],
    },

    // ─── KINDESWOHL-Pfad ────────────────────────────────────
    kwg_1: {
      question: 'Welche Gefährdung?',
      options: [
        { label: 'Akute körperliche / sexuelle Gewalt', next: 'kwg_akut' },
        { label: 'Vernachlässigung, emotionale Gewalt', next: 'kwg_mittel' },
        { label: 'Verdacht ohne klare Beweise', next: 'kwg_verdacht' },
      ],
    },
    kwg_akut: {
      outcome: '🚨 Meldepflicht aktivieren',
      actions: [
        '<strong>Bei akuter Gefahr: 113 (Polizei) anrufen</strong>',
        'ONE (Office National de l\'Enfance) informieren: 24 78 39 19',
        'Detailliert dokumentieren (Datum, Beobachtung, Aussage wörtlich)',
        'Eigene Schweigepflicht ist überschreibbar bei Kindeswohl',
        'Rücksprache mit Vorgesetzter / Schutzperson',
      ],
    },
    kwg_mittel: {
      outcome: '⚠️ Strukturiertes Vorgehen',
      actions: [
        'Beobachtungen detailliert dokumentieren',
        'Gespräch mit Vorgesetzter / kollegialer Beratung',
        'ONE konsultieren (anonym möglich): 24 78 39 19',
        'Hilfeplan-Konferenz einberufen',
        'Eltern: differenzierte Gespräche je nach Situation',
      ],
    },
    kwg_verdacht: {
      outcome: '🟡 Verdacht abklären',
      actions: [
        'Weitere Beobachtungen sammeln (über mehrere Wochen)',
        'Mit Kollegen / Schutzperson besprechen',
        'Anonyme Beratung bei ALUPSE: 36 04 35',
        'Keine voreiligen Schlüsse — aber wachsam bleiben',
      ],
    },
  };

  let current = 'start';
  const history = [];

  function go(nodeId) {
    history.push(current);
    current = nodeId;
    render();
  }

  function back() {
    if (history.length > 0) {
      current = history.pop();
      render();
    }
  }

  function reset() {
    current = 'start';
    history.length = 0;
    render();
  }

  function render() {
    const container = document.getElementById('cr-content');
    const node = TREE[current];

    if (node.outcome) {
      // Outcome node
      container.innerHTML = `
        <div class="cr-section">
          <h2>🌳 Triage-Baum — Empfehlung</h2>
          <div class="tg-node outcome">
            <h3 style="color: var(--danger-dark); margin-bottom: var(--space-3);">${node.outcome}</h3>
            <ul style="text-align: left; padding-left: var(--space-4); line-height: var(--line-height-relaxed); font-size: 16px;">
              ${node.actions.map(a => `<li style="margin-bottom: var(--space-2);">${a}</li>`).join('')}
            </ul>
          </div>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: center; margin-top: var(--space-4);">
            <button class="btn btn-lg" onclick="Triage.back()">← Zurück</button>
            <button class="btn btn-lg" onclick="Triage.reset()">🔄 Neu starten</button>
            <button class="btn btn-lg" onclick="setTab('safety')">→ Sicherheitsplan</button>
          </div>
        </div>
      `;
      return;
    }

    // Question node
    container.innerHTML = `
      <div class="cr-section">
        <h2>🌳 Triage-Baum</h2>
        <div class="cr-section-intro">
          Strukturierter Entscheidungspfad bei akuten Krisen.
          Jede Antwort führt zu konkreten Handlungsempfehlungen.
        </div>
        <div class="tg-node">${Utils.escapeHtml(node.question)}</div>
        <div class="tg-options">
          ${node.options.map(opt => `
            <button class="btn btn-lg" onclick="Triage.go('${opt.next}')">${opt.label}</button>
          `).join('')}
        </div>
        ${history.length > 0 ? `<div class="tg-back" style="text-align: center;"><button class="btn" onclick="Triage.back()">← Zurück</button></div>` : ''}
      </div>
    `;
  }

  return { render, go, back, reset };
})();
