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
      '5-9': 'Milde depressive Symptomatik',
      '10-14': 'Moderate Depression — klinische Abklärung empfohlen',
      '15-19': 'Mittelschwere bis schwere Depression',
      '20-26': 'Schwere Depression — dringende Abklärung',
    },
    eval(scores) {
      // PHQ-A: 9 Items × 0-3, Max = 27. Cutoffs nach Johnson et al. (2002), Kroenke et al.
      // Item 9 (Suizidgedanken) = Critical Item → immer C-SSRS bei ≥1
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      const item9 = Number(scores[8] || 0);
      let severity, label;
      if (total <= 4) { severity = 'low'; label = 'Keine bis minimale Depression'; }
      else if (total <= 9) { severity = 'mod'; label = 'Milde depressive Symptomatik'; }
      else if (total <= 14) { severity = 'high'; label = 'Moderate Depression — klinische Abklärung empfohlen (Sensitivität 88%, Spezifität 88% bei Cutoff 10, Kroenke et al. 2001)'; }
      else if (total <= 19) { severity = 'high'; label = 'Mittelschwere bis schwere Depression'; }
      else { severity = 'critical'; label = 'Schwere Depression — psychiatrische Abklärung dringend'; }
      const flagSuicide = item9 >= 1;
      return { score: total, max: 27, severity, label, flagSuicide, item9 };
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
      // GAD-7: 7 Items × 0-3, Max 21. Spitzer et al. (2006). Cutoff ≥10 für GAD-Diagnose.
      // Adoleszenten-Validierung: Ghandour et al. (2018) empfiehlt Cutoff ≥11, aber ≥10 akzeptiert.
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      let severity, label;
      if (total <= 4) { severity = 'low'; label = 'Minimale Angst'; }
      else if (total <= 9) { severity = 'mod'; label = 'Leichte Angst'; }
      else if (total <= 14) { severity = 'high'; label = 'Mittelschwere Angst — klinische Abklärung empfohlen (Sens. 89%, Spez. 82% bei Cutoff 10, Spitzer et al.)'; }
      else { severity = 'critical'; label = 'Schwere Angst — dringende Abklärung'; }
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
    intro: 'Denke an ein belastendes Ereignis in deinem Leben. Wie häufig haben dich folgende Probleme im letzten Monat belastet?',
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
      // PCL-5: 20 Items × 0-4, Max 80. Cutoff 33 (Weathers et al. 2013).
      // DSM-5-Kriterien-Prüfung: Item ≥2 = "klinisch relevant" pro Kriterium.
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      const s = i => Number(scores[i] || 0);
      const critB = [0,1,2,3,4].filter(i => s(i) >= 2).length >= 1;
      const critC = [5,6].filter(i => s(i) >= 2).length >= 1;
      const critD = [7,8,9,10,11,12,13].filter(i => s(i) >= 2).length >= 2;
      const critE = [14,15,16,17,18,19].filter(i => s(i) >= 2).length >= 2;
      const dsmMet = critB && critC && critD && critE;

      let severity, label;
      if (total < 33) { severity = 'low'; label = 'Unter klinischer Schwelle (Score < 33)'; }
      else if (dsmMet) { severity = 'high'; label = `PTBS wahrscheinlich — DSM-5-Kriterien B-E erfüllt (Score ${total}, Cutoff 33, Weathers et al. 2013)`; }
      else { severity = 'mod'; label = `Erhöhter Score (${total}), aber DSM-5-Kriterien nicht vollständig erfüllt — Differentialdiagnostik empfohlen`; }
      return { score: total, max: 80, severity, label, dsm5: { critB, critC, critD, critE, met: dsmMet } };
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

      // SDQ Total Difficulties: Goodman (1997), sdqinfo.org Normwerte Selbstauskunft 11-17J
      // 0-15 normal, 16-19 grenzwertig, 20-40 auffällig (Selbstauskunft-Normen)
      // Subskalen-Cutoffs: Emotional 0-5/6/7-10, Conduct 0-3/4/5-10, Hyper 0-5/6/7-10, Peer 0-3/4-5/6-10
      let severity, label;
      if (total <= 15) { severity = 'low'; label = 'Unauffällig'; }
      else if (total <= 19) { severity = 'mod'; label = 'Grenzwertig'; }
      else { severity = 'high'; label = 'Auffällig'; }

      const subCutoffs = {
        emotional: emotional <= 5 ? 'normal' : emotional <= 6 ? 'grenzwertig' : 'auffällig',
        conduct: conduct <= 3 ? 'normal' : conduct === 4 ? 'grenzwertig' : 'auffällig',
        hyperact: hyperact <= 5 ? 'normal' : hyperact === 6 ? 'grenzwertig' : 'auffällig',
        peer: peer <= 3 ? 'normal' : peer <= 5 ? 'grenzwertig' : 'auffällig',
        prosocial: prosocial >= 6 ? 'normal' : prosocial === 5 ? 'grenzwertig' : 'auffällig',
      };

      return {
        score: total, max: 40, severity, label,
        subscales: { emotional, conduct, hyperact, peer, prosocial },
        subCutoffs,
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
      // ASRS v1.1 Part A (Kessler et al. 2005): Item-spezifische Schwellen
      // Items 1,2,4,5,6: ≥3 ("Oft") = positiv. Item 3: ≥2 ("Manchmal") = positiv.
      const itemThresholds = [3, 3, 2, 3, 3, 3];
      const positive = Object.keys(scores)
        .map(idx => Number(scores[idx]) >= itemThresholds[Number(idx)])
        .filter(Boolean).length;
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      let severity, label;
      if (positive < 4) { severity = 'low'; label = 'Unter Schwelle — ADHS unwahrscheinlich'; }
      else if (positive === 4) { severity = 'mod'; label = 'ADHS-Verdacht — vertiefte Diagnostik empfohlen (4/6 positiv, Kessler et al. 2005)'; }
      else { severity = 'high'; label = 'Hohe ADHS-Wahrscheinlichkeit (5-6/6 positiv)'; }
      return { score: total, max: 24, severity, label, positive };
    },
  },
};

const INSTRUMENT_LIST = Object.entries(INSTRUMENTS).map(([id, def]) => ({ id, ...def }));
