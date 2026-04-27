/* ============================================================
   DIAGNOSE — Validated Screening Instruments
   ============================================================
   Standardisierte Instrumente mit Items, Antwort-Skalen, Cutoffs
   und Auswertungs-Logik.

   Quellen:
   - PHQ-A: Johnson et al. (2002) — Depression Adolescents
   - GAD-7: Spitzer et al. (2006) — Generalized Anxiety
   - PCL-5: Weathers et al. (2013) — PTBS DSM-5
   - SDQ:   Goodman (1997) — Strengths & Difficulties
   - SCOFF: Morgan et al. (1999) — Eating Disorders
   - ASRS:  WHO (2005) — Adult ADHD Self-Report (Adolescent-Adapted)

   Likert-Skala (0-3): 0=überhaupt nicht, 1=einzelne Tage,
   2=mehr als die Hälfte der Tage, 3=fast jeden Tag.
   ============================================================ */

const INSTRUMENTS = {

  // ─── PHQ-A (Patient Health Questionnaire — Adolescents) ──
  'phq-a': {
    acronym: 'PHQ-A',
    titel: 'Depression-Screening',
    icon: '🌧️',
    domain: 'depression',
    icd: ['F32', 'F33'],
    timeFrame: 'in den letzten 2 Wochen',
    skala: { 0: 'Überhaupt nicht', 1: 'Einzelne Tage', 2: 'Mehr als die Hälfte', 3: 'Fast jeden Tag' },
    items: [
      'Wenig Interesse oder Freude an deinen Aktivitäten?',
      'Niedergeschlagen, deprimiert oder hoffnungslos gefühlt?',
      'Probleme einzuschlafen, durchzuschlafen oder zu viel Schlaf?',
      'Müde gefühlt oder wenig Energie?',
      'Wenig Appetit oder Überessen?',
      'Schlechtes Selbstbild — gefühlt, dass du versagst, dich oder deine Familie enttäuscht hast?',
      'Probleme, dich zu konzentrieren (z.B. beim Lesen oder Lernen)?',
      'Bewegung oder Sprechen so verlangsamt, dass es andere bemerkt haben? Oder umgekehrt — viel zappeliger als normal?',
      'Gedanken, dass du tot wärest besser dran, oder dir auf irgendeine Weise wehzutun? (Critical Item — bei ja: C-SSRS)',
    ],
    cutoffs: {
      '0-4': 'Keine bis minimale Depression',
      '5-9': 'Leichte Depression',
      '10-14': 'Mittelschwere Depression',
      '15-19': 'Mittelschwere bis schwere Depression',
      '20-27': 'Schwere Depression',
    },
    eval(scores) {
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      const item9 = Number(scores[8] || 0); // Index 8 = Item 9 (Suizid)
      let severity, label;
      if (total <= 4) { severity = 'low'; label = 'Keine bis minimale Depression'; }
      else if (total <= 9) { severity = 'mod'; label = 'Leichte Depression'; }
      else if (total <= 14) { severity = 'mod'; label = 'Mittelschwere Depression'; }
      else if (total <= 19) { severity = 'high'; label = 'Mittelschwere bis schwere Depression'; }
      else { severity = 'critical'; label = 'Schwere Depression'; }
      const flagSuicide = item9 >= 1;
      return { score: total, max: 27, severity, label, flagSuicide };
    },
  },

  // ─── GAD-7 (Generalized Anxiety Disorder) ───────────────
  'gad-7': {
    acronym: 'GAD-7',
    titel: 'Angststörungs-Screening',
    icon: '😰',
    domain: 'angst',
    icd: ['F41.1', 'F40'],
    timeFrame: 'in den letzten 2 Wochen',
    skala: { 0: 'Überhaupt nicht', 1: 'Einzelne Tage', 2: 'Mehr als die Hälfte', 3: 'Fast jeden Tag' },
    items: [
      'Nervös, ängstlich oder angespannt gefühlt?',
      'Konntest deine Sorgen nicht stoppen oder kontrollieren?',
      'Übermäßige Sorgen über verschiedene Dinge?',
      'Schwierigkeiten, dich zu entspannen?',
      'So unruhig, dass es schwer war stillzusitzen?',
      'Leicht reizbar oder verärgert?',
      'Angst, dass etwas Schreckliches passieren könnte?',
    ],
    cutoffs: {
      '0-4': 'Keine bis minimale Angst',
      '5-9': 'Leichte Angst',
      '10-14': 'Mittelschwere Angst',
      '15-21': 'Schwere Angst',
    },
    eval(scores) {
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      let severity, label;
      if (total <= 4) { severity = 'low'; label = 'Minimale Angst'; }
      else if (total <= 9) { severity = 'mod'; label = 'Leichte Angst'; }
      else if (total <= 14) { severity = 'mod'; label = 'Mittelschwere Angst'; }
      else { severity = 'high'; label = 'Schwere Angst'; }
      return { score: total, max: 21, severity, label };
    },
  },

  // ─── PCL-5 (PTSD Checklist for DSM-5) — Kurzform ─────────
  'pcl-5': {
    acronym: 'PCL-5',
    titel: 'Trauma / PTBS-Screening',
    icon: '🌪️',
    domain: 'trauma',
    icd: ['F43.1'],
    timeFrame: 'im letzten Monat',
    intro: 'Vor dem Screening: Beziehe dich auf das schlimmste belastende Ereignis. Wie häufig haben dich folgende Probleme im letzten Monat belastet?',
    skala: { 0: 'Überhaupt nicht', 1: 'Ein wenig', 2: 'Mäßig', 3: 'Ziemlich', 4: 'Extrem' },
    items: [
      'Belastende Erinnerungen an das Ereignis?',
      'Belastende Träume vom Ereignis?',
      'Plötzliches Gefühl, das Ereignis erneut zu erleben?',
      'Sehr verärgert sein, wenn du an das Ereignis erinnert wirst?',
      'Starke körperliche Reaktionen bei Erinnerung (Herzrasen, Schwitzen)?',
      'Erinnerungen, Gedanken, Gefühle vermeiden?',
      'Erinnernde Dinge vermeiden (Personen, Orte, Aktivitäten)?',
      'Schwierigkeiten, sich an wichtige Teile zu erinnern?',
      'Negative Überzeugungen über sich, andere, die Welt?',
      'Selbstbeschuldigung für das Ereignis?',
      'Negative Gefühle (Angst, Wut, Schuld, Scham)?',
      'Verlust des Interesses an Aktivitäten?',
      'Distanzierung / Entfremdung von anderen?',
      'Schwierigkeiten, positive Gefühle zu erleben?',
      'Reizbarkeit oder Wut?',
      'Riskantes Verhalten?',
      'Übertriebene Wachsamkeit?',
      'Schreckhaftigkeit?',
      'Konzentrationsprobleme?',
      'Schlafstörungen?',
    ],
    cutoffs: {
      '0-32': 'PTBS unwahrscheinlich',
      '33-79': 'PTBS-Verdacht — Diagnostik empfohlen',
    },
    eval(scores) {
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      let severity, label;
      if (total < 33) { severity = 'low'; label = 'Unter Schwelle — PTBS unwahrscheinlich'; }
      else if (total < 50) { severity = 'mod'; label = 'PTBS-Verdacht — strukturierte Diagnostik'; }
      else { severity = 'high'; label = 'Hohe PTBS-Wahrscheinlichkeit'; }
      return { score: total, max: 80, severity, label };
    },
  },

  // ─── SDQ Self-Report (Strengths & Difficulties) ──────────
  'sdq': {
    acronym: 'SDQ',
    titel: 'Stärken &amp; Schwächen (Selbstauskunft)',
    icon: '💪',
    domain: 'verhalten',
    icd: ['F90', 'F91', 'F92'],
    timeFrame: 'in den letzten 6 Monaten',
    intro: 'Wie sehr trifft die Aussage auf dich zu?',
    skala: { 0: 'Trifft nicht zu', 1: 'Teilweise zutreffend', 2: 'Eindeutig zutreffend' },
    items: [
      'Ich versuche, lieb zu Anderen zu sein. Ihre Gefühle sind mir wichtig.', // prosocial
      'Ich bin oft unruhig. Ich kann nicht lange stillsitzen.',                  // hyperactivity
      'Ich habe oft Kopfschmerzen oder Bauchschmerzen.',                          // emotional
      'Ich teile gerne mit Anderen.',                                              // prosocial
      'Ich werde leicht wütend. Ich bekomme oft Wutanfälle.',                     // conduct
      'Ich bin meistens für mich allein. Ich beschäftige mich lieber alleine.',  // peer
      'Ich tue meistens das, was man mir sagt.',                                   // conduct (R)
      'Ich mache mir oft Sorgen.',                                                 // emotional
      'Ich helfe Anderen, wenn sie verletzt sind oder traurig.',                  // prosocial
      'Ich zappele oder winde mich häufig.',                                       // hyperactivity
      'Ich habe einen guten Freund / eine gute Freundin.',                         // peer (R)
      'Ich gerate oft in Streit. Ich kann andere zwingen, das zu tun, was ich will.', // conduct
      'Ich bin oft unglücklich oder niedergeschlagen.',                             // emotional
      'Im Allgemeinen mögen mich Andere in meinem Alter.',                          // peer (R)
      'Ich werde leicht abgelenkt. Ich finde es schwierig, mich zu konzentrieren.', // hyperactivity
      'Ich bin nervös in neuen Situationen.',                                        // emotional
      'Ich bin nett zu jüngeren Kindern.',                                            // prosocial
      'Andere werfen mir oft vor, dass ich lüge oder schummle.',                     // conduct
      'Andere Kinder ärgern oder schikanieren mich.',                                 // peer
      'Ich biete Anderen oft meine Hilfe an.',                                        // prosocial
      'Ich denke nach, bevor ich handle.',                                            // hyperactivity (R)
      'Ich nehme Dinge, die mir nicht gehören.',                                     // conduct
      'Ich komme besser mit Erwachsenen aus als mit Gleichaltrigen.',                 // peer
      'Ich habe viele Ängste und fürchte mich leicht.',                               // emotional
      'Ich mache eine Aufgabe zu Ende. Ich kann mich gut konzentrieren.',             // hyperactivity (R)
    ],
    cutoffs: {
      'total': 'Total = Emot+Conduct+Hyperact+Peer (max 40)',
    },
    eval(scores) {
      // Subskalen (vereinfacht)
      const reverse = i => 2 - (Number(scores[i]) || 0);
      const get = i => Number(scores[i]) || 0;
      const emotional = get(2) + get(7) + get(12) + get(15) + get(23);
      const conduct = get(4) + reverse(6) + get(11) + get(17) + get(21);
      const hyperact = get(1) + get(9) + get(14) + reverse(20) + reverse(24);
      const peer = get(5) + reverse(10) + reverse(13) + get(18) + get(22);
      const prosocial = get(0) + get(3) + get(8) + get(16) + get(19);
      const total = emotional + conduct + hyperact + peer;

      let severity, label;
      if (total <= 14) { severity = 'low'; label = 'Unauffällig'; }
      else if (total <= 17) { severity = 'mod'; label = 'Grenzwertig'; }
      else { severity = 'high'; label = 'Auffällig'; }

      return {
        score: total, max: 40, severity, label,
        subscales: { emotional, conduct, hyperact, peer, prosocial },
      };
    },
  },

  // ─── SCOFF (Eating Disorders) ────────────────────────────
  'scoff': {
    acronym: 'SCOFF',
    titel: 'Essstörungs-Screening',
    icon: '🍽️',
    domain: 'essstoerung',
    icd: ['F50'],
    timeFrame: 'derzeit',
    skala: { 0: 'Nein', 1: 'Ja' },
    items: [
      'Übergibst du dich oder fühlst dich unwohl voll, weil du dich gestopft fühlst?',           // S - Sick
      'Hast du das Gefühl, die Kontrolle über dein Essen verloren zu haben?',                      // C - Control
      'Hast du im letzten Vierteljahr mehr als 6 kg abgenommen?',                                   // O - One stone
      'Glaubst du, du seist zu fett, obwohl andere dich für zu dünn halten?',                       // F - Fat
      'Würdest du sagen, dass Essen einen großen Teil deines Lebens ausmacht?',                     // F - Food
    ],
    cutoffs: {
      '0-1': 'Unauffällig',
      '2-5': 'Verdacht auf Essstörung — vertiefte Diagnostik',
    },
    eval(scores) {
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      let severity, label;
      if (total < 2) { severity = 'low'; label = 'Unauffällig'; }
      else { severity = 'high'; label = 'Verdacht — vertiefte Diagnostik empfohlen'; }
      return { score: total, max: 5, severity, label };
    },
  },

  // ─── ASRS (Adult ADHD, Adolescent-Adapted) ─────────────
  'asrs': {
    acronym: 'ASRS',
    titel: 'ADHS-Screening (6-Item Kurzform)',
    icon: '⚡',
    domain: 'adhs',
    icd: ['F90'],
    timeFrame: 'in den letzten 6 Monaten',
    skala: { 0: 'Nie', 1: 'Selten', 2: 'Manchmal', 3: 'Oft', 4: 'Sehr oft' },
    items: [
      'Probleme, dich auf Aufgaben zu konzentrieren, sobald der spannende Teil vorbei ist?',
      'Schwierigkeiten, ein Projekt zu organisieren, das Struktur erfordert?',
      'Vergisst du Termine oder Verpflichtungen?',
      'Vermeidest oder verschiebst du Aufgaben, die viel Nachdenken erfordern?',
      'Fühlst du dich oft zappelig oder unruhig, als müsstest du dich bewegen?',
      'Bist du übermäßig aktiv oder gezwungen, Dinge zu tun, als wärst du angetrieben?',
    ],
    cutoffs: {
      '0-3': 'ADHS unwahrscheinlich (vereinfacht)',
      '4-24': 'ADHS-Verdacht — vertiefte Diagnostik',
    },
    eval(scores) {
      // Vereinfacht: Items mit Score ≥ 3 zählen als positiv. ASRS-Original hat item-spezifische Cutoffs.
      const positive = Object.values(scores).filter(v => Number(v) >= 3).length;
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      let severity, label;
      if (positive < 4) { severity = 'low'; label = 'Unter Schwelle — ADHS unwahrscheinlich'; }
      else if (positive < 5) { severity = 'mod'; label = 'Hinweise auf ADHS — vertiefte Diagnostik'; }
      else { severity = 'high'; label = 'Hohe ADHS-Wahrscheinlichkeit'; }
      return { score: total, max: 24, severity, label, positive };
    },
  },
};

const INSTRUMENT_LIST = Object.entries(INSTRUMENTS).map(([id, def]) => ({ id, ...def }));
