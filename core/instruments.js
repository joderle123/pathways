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
    kurzbeschreibung: '9-Item-Selbstauskunft für depressive Symptomatik bei Jugendlichen (11-17 J.). Item 9 erfasst Suizidgedanken (Critical Item).',
    quelle: 'Johnson, Harris, Spitzer & Williams (2002), J Adolesc Health 30: 196-204 · Cutoff-Validierung: Kroenke, Spitzer & Williams (2001) bei Cutoff ≥10: Sens. 88%, Spez. 88%.',
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
      let severity, severityLabel, label;
      if (total <= 4)        { severity='low';      severityLabel='minimal';  label='Keine bis minimale Depression'; }
      else if (total <= 9)   { severity='mod';      severityLabel='leicht';   label='Milde depressive Symptomatik'; }
      else if (total <= 14)  { severity='high';     severityLabel='mittel';   label='Moderate Depression — klinische Abklärung empfohlen (Sens. 88%, Spez. 88% bei Cutoff 10, Kroenke et al. 2001)'; }
      else if (total <= 19)  { severity='high';     severityLabel='schwer';   label='Mittelschwere bis schwere Depression'; }
      else                   { severity='critical'; severityLabel='kritisch'; label='Schwere Depression — psychiatrische Abklärung dringend'; }
      // Suizidgedanken (Item 9) eskalieren auf "kritisch" unabhängig vom Gesamtscore
      const flagSuicide = item9 >= 1;
      if (flagSuicide && severity !== 'critical') { severity='critical'; severityLabel='kritisch'; }
      return { score: total, max: 27, severity, severityLabel, label, flagSuicide, item9 };
    },
  },

  // ─── GAD-7 (Generalized Anxiety Disorder) ───────────────
  'gad-7': {
    acronym: 'GAD-7',
    titel: 'Generalisierte Angst (Screening)',
    icon: '😰',
    domain: 'angst',
    icd: ['F41.1', 'F40'],
    timeFrame: 'in den letzten 2 Wochen',
    kurzbeschreibung: '7-Item-Selbstauskunft zur Erfassung generalisierter Angstsymptome. Validiert für Adoleszente (Ghandour et al. 2018).',
    quelle: 'Spitzer, Kroenke, Williams & Löwe (2006), Arch Intern Med 166: 1092-1097 · Adoleszenten-Validierung: Ghandour, Sherman, Vladutiu et al. (2018) bei Cutoff ≥10: Sens. 89%, Spez. 82%.',
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
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      let severity, severityLabel, label;
      if (total <= 4)       { severity='low';      severityLabel='minimal';  label='Minimale Angst'; }
      else if (total <= 9)  { severity='mod';      severityLabel='leicht';   label='Leichte Angst'; }
      else if (total <= 14) { severity='high';     severityLabel='mittel';   label='Mittelschwere Angst — klinische Abklärung empfohlen (Sens. 89%, Spez. 82% bei Cutoff 10, Spitzer et al. 2006)'; }
      else if (total <= 17) { severity='high';     severityLabel='schwer';   label='Schwere Angst — strukturierte Diagnostik empfohlen'; }
      else                  { severity='critical'; severityLabel='kritisch'; label='Schwere Angst mit hoher Funktionseinschränkung — dringende Abklärung'; }
      return { score: total, max: 21, severity, severityLabel, label };
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
    kurzbeschreibung: '20-Item-Selbstauskunft zu DSM-5-PTBS-Symptomen, abgebildet auf Kriterien B (Wiedererleben) bis E (Arousal). Cutoff ≥33 deutet auf wahrscheinliche PTBS hin.',
    quelle: 'Weathers, Litz, Keane, Palmieri, Marx & Schnurr (2013), www.ptsd.va.gov · Validierung: Bovin et al. (2016) Psychol Assess 28: 1379-1391.',
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

      let severity, severityLabel, label;
      if (total < 20)        { severity='low';      severityLabel='minimal';  label='Unter klinischer Schwelle — keine relevanten PTBS-Symptome'; }
      else if (total < 33)   { severity='mod';      severityLabel='leicht';   label='Subklinische Belastung — Verlauf beobachten'; }
      else if (!dsmMet)      { severity='high';     severityLabel='mittel';   label=`Erhöhter Score (${total}) — DSM-5-Kriterien nicht vollständig erfüllt, Differentialdiagnostik empfohlen`; }
      else if (total < 50)   { severity='high';     severityLabel='schwer';   label=`PTBS wahrscheinlich — DSM-5-Kriterien B-E erfüllt (Score ${total}, Cutoff 33, Weathers et al. 2013)`; }
      else                   { severity='critical'; severityLabel='kritisch'; label=`Schwere PTBS-Symptomatik (Score ${total}) — strukturierte Trauma-Therapie indiziert; vor Exposition Stabilisierung sicherstellen`; }
      return { score: total, max: 80, severity, severityLabel, label, dsm5: { critB, critC, critD, critE, met: dsmMet } };
    },
  },

  // ─── SDQ Self-Report (Strengths & Difficulties) ──────────
  'sdq': {
    acronym: 'SDQ',
    titel: 'Stärken & Schwächen (Selbstauskunft)',
    icon: '💪',
    domain: 'verhalten',
    icd: ['F90', 'F91', 'F92'],
    timeFrame: 'in den letzten 6 Monaten',
    kurzbeschreibung: '25-Item-Verhaltensscreening mit 5 Subskalen: Emotionale Probleme, Verhaltensauffälligkeiten, Hyperaktivität, Peer-Probleme, Prosoziales Verhalten. Selbstauskunft ab 11 Jahren.',
    quelle: 'Goodman (1997), J Child Psychol Psychiatry 38: 581-586 · Deutsche Validierung: Klasen, Woerner, Wolke et al. (2000) Eur Child Adolesc Psychiatry 9: 271-276 · Normwerte: sdqinfo.org.',
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
      let severity, severityLabel, label;
      if (total <= 15)      { severity='low';      severityLabel='minimal';  label='Unauffällig — innerhalb des Normbereichs'; }
      else if (total <= 17) { severity='mod';      severityLabel='leicht';   label='Leicht erhöht — Grenzbereich (Goodman 1997, Selbstauskunft 11-17 J.)'; }
      else if (total <= 19) { severity='mod';      severityLabel='mittel';   label='Grenzwertig — vertiefte Diagnostik einzelner Subskalen'; }
      else if (total <= 29) { severity='high';     severityLabel='schwer';   label='Auffällig — klinisch relevante Verhaltensbelastung'; }
      else                  { severity='critical'; severityLabel='kritisch'; label='Stark auffällig — strukturierte Diagnostik aller Subskalen indiziert'; }

      const subCutoffs = {
        emotional: emotional <= 5 ? 'normal' : emotional <= 6 ? 'grenzwertig' : 'auffällig',
        conduct: conduct <= 3 ? 'normal' : conduct === 4 ? 'grenzwertig' : 'auffällig',
        hyperact: hyperact <= 5 ? 'normal' : hyperact === 6 ? 'grenzwertig' : 'auffällig',
        peer: peer <= 3 ? 'normal' : peer <= 5 ? 'grenzwertig' : 'auffällig',
        prosocial: prosocial >= 6 ? 'normal' : prosocial === 5 ? 'grenzwertig' : 'auffällig',
      };

      return {
        score: total, max: 40, severity, severityLabel, label,
        subscales: { emotional, conduct, hyperact, peer, prosocial },
        subCutoffs,
      };
    },
  },

  // ─── CRAFFT (Substanzkonsum-Screening, 12-21 J.) ─────────
  'crafft': {
    acronym: 'CRAFFT',
    titel: 'Substanzkonsum-Screening',
    icon: '🌿',
    domain: 'substanz',
    icd: ['F10', 'F12', 'F19'],
    timeFrame: 'im letzten Jahr',
    kurzbeschreibung: '6-Item-Screening für riskanten Alkohol- und Drogenkonsum bei Jugendlichen (12-21 J.). Akronym aus den Item-Anfangsbuchstaben: Car, Relax, Alone, Forget, Family/Friends, Trouble.',
    quelle: 'Knight, Sherritt, Shrier, Harris & Chang (2002), Arch Pediatr Adolesc Med 156: 607-614 · Cutoff ≥2: Sens. 76%, Spez. 94% für jede DSM-Substanzdiagnose.',
    intro: 'Hat folgendes auf dich zugetroffen — im letzten Jahr?',
    skala: { 0: 'Nein', 1: 'Ja' },
    items: [
      'Bist du jemals in einem Auto mitgefahren, das von jemandem (auch dir selbst) gefahren wurde, der/die high war oder Alkohol/Drogen konsumiert hatte? (C — Car)',
      'Konsumierst du Alkohol oder Drogen, um dich zu entspannen, dich besser zu fühlen oder dazuzugehören? (R — Relax)',
      'Konsumierst du Alkohol oder Drogen jemals, wenn du alleine bist? (A — Alone)',
      'Vergisst du jemals Dinge, die du getan hast, während du Alkohol oder Drogen konsumiert hast? (F — Forget / Blackout)',
      'Sagen Familie oder Freunde dir manchmal, du solltest weniger trinken oder weniger Drogen konsumieren? (F — Family/Friends)',
      'Bist du jemals in Schwierigkeiten geraten, während du Alkohol oder Drogen konsumiert hast? (T — Trouble)',
    ],
    cutoffs: {
      '0-1': 'Unauffällig — kein erhöhtes Risiko',
      '2': 'Positiver Screen — vertiefte Substanzanamnese',
      '3-4': 'Erhöhtes Risiko — strukturierte Intervention indiziert',
      '5-6': 'Hohes Risiko — substanzbezogene Störung wahrscheinlich',
    },
    eval(scores) {
      // CRAFFT: 6 dichotome Items (0/1), Cutoff ≥2 (Knight et al. 2002).
      // Item 4 (Forget = Blackout) und Item 1 (intoxiziertes Fahren) = Hochrisiko-Marker.
      const total = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
      const blackout = Number(scores[3] || 0) === 1;
      const carRisk  = Number(scores[0] || 0) === 1;
      let severity, severityLabel, label;
      if (total < 2)        { severity='low';      severityLabel='minimal';  label='Unauffällig — kein erhöhtes Risiko (Knight et al. 2002)'; }
      else if (total === 2) { severity='mod';      severityLabel='leicht';   label='Positiver Screen — vertiefte Substanzanamnese empfohlen (Sens. 76%, Spez. 94%)'; }
      else if (total <= 4)  { severity='high';     severityLabel='mittel';   label='Erhöhtes Risiko — strukturierte Intervention (z.B. Motivierende Gesprächsführung) indiziert'; }
      else                  { severity='critical'; severityLabel='kritisch'; label='Hohes Risiko — substanzbezogene Störung wahrscheinlich, sofortige Abklärung'; }
      // Hochrisiko-Marker eskalieren auf "schwer"
      if (blackout && severity === 'mod') { severity='high'; severityLabel='schwer'; label += ' · Blackout-Phänomen → Kontrollverlust'; }
      const flagHighRisk = carRisk || blackout;
      return { score: total, max: 6, severity, severityLabel, label, flagHighRisk, blackout, carRisk };
    },
  },

  // ─── SCARED (Anxiety Disorders, 41 Items) ────────────────
  'scared': {
    acronym: 'SCARED',
    titel: 'Childhood Anxiety Disorders (41 Items)',
    icon: '😨',
    domain: 'angst',
    icd: ['F40', 'F41', 'F93'],
    timeFrame: 'in den letzten 3 Monaten',
    kurzbeschreibung: '41-Item-Selbstauskunft mit 5 Subskalen: Panik/Somatisch, Generalisierte Angst, Trennungsangst, Soziale Phobie, Schulvermeidung. Cutoff Total ≥25 = klinisch relevant.',
    quelle: 'Birmaher, Khetarpal, Brent et al. (1997, 1999), J Am Acad Child Adolesc Psychiatry 36/38 · Deutsche Validierung: Essau, Muris & Ederer (2002) J Anxiety Disord 16: 645-654.',
    intro: 'Lies jede Aussage und entscheide, wie sehr sie auf dich zutrifft. Es geht um die letzten 3 Monate.',
    skala: { 0: 'Nicht oder fast nie', 1: 'Manchmal zutreffend', 2: 'Oft zutreffend' },
    items: [
      // 0  PA  Panic/Somatic
      'Wenn ich Angst habe, fällt es mir schwer zu atmen.',
      // 1  SC  School Avoidance
      'Ich bekomme Kopfschmerzen, wenn ich in der Schule bin.',
      // 2  SO  Social Phobia
      'Ich mag es nicht, mit Leuten zusammen zu sein, die ich nicht gut kenne.',
      // 3  SA  Separation Anxiety
      'Ich habe Angst, von zu Hause weg zu sein.',
      // 4  GAD
      'Ich mache mir Sorgen, dass mich andere nicht mögen.',
      // 5  PA
      'Wenn ich Angst habe, fühle ich mich, als würde ich gleich ohnmächtig.',
      // 6  GAD
      'Ich bin nervös.',
      // 7  SA
      'Ich gehe meinen Eltern fast überall hin nach.',
      // 8  PA
      'Andere Leute sagen mir, dass ich sehr ängstlich aussehe.',
      // 9  SO
      'Ich werde nervös bei fremden Leuten.',
      // 10 SC
      'Ich bekomme Bauchschmerzen in der Schule.',
      // 11 PA
      'Wenn ich Angst habe, fühle ich mich wie verrückt.',
      // 12 SA
      'Ich habe Angst, alleine zu schlafen.',
      // 13 GAD
      'Ich mache mir Sorgen, ob ich genauso gut sein kann wie andere Kinder.',
      // 14 PA
      'Wenn ich Angst habe, fühle ich, dass die Dinge nicht real sind.',
      // 15 SA
      'Ich habe Albträume, in denen meinen Eltern etwas Schlimmes passiert.',
      // 16 SC
      'Ich mache mir Sorgen, in die Schule zu gehen.',
      // 17 PA
      'Wenn ich Angst habe, schlägt mein Herz schnell.',
      // 18 PA
      'Ich zittere.',
      // 19 SA
      'Ich habe Albträume, in denen mir etwas Schlimmes passiert.',
      // 20 GAD
      'Ich mache mir Sorgen, ob alles gut wird.',
      // 21 PA
      'Wenn ich Angst habe, schwitze ich viel.',
      // 22 GAD
      'Ich bin sehr besorgt.',
      // 23 PA
      'Ich werde sehr ängstlich ohne ersichtlichen Grund.',
      // 24 SA
      'Ich habe Angst, alleine im Haus zu sein.',
      // 25 SO
      'Es ist schwer für mich, mit Leuten zu sprechen, die ich nicht gut kenne.',
      // 26 PA
      'Wenn ich Angst habe, habe ich das Gefühl zu ersticken.',
      // 27 GAD
      'Andere Leute sagen mir, dass ich mir zu viele Sorgen mache.',
      // 28 SA
      'Ich mag es nicht, von meiner Familie weg zu sein.',
      // 29 PA
      'Ich habe Angst, Panikattacken zu bekommen.',
      // 30 SA
      'Ich mache mir Sorgen, dass meinen Eltern etwas Schlimmes zustoßen könnte.',
      // 31 SO
      'Ich fühle mich schüchtern bei Leuten, die ich nicht kenne.',
      // 32 GAD
      'Ich mache mir Sorgen, was in der Zukunft passieren wird.',
      // 33 PA
      'Wenn ich Angst habe, fühle ich mich, als würde ich mich übergeben.',
      // 34 GAD
      'Ich mache mir Sorgen, wie gut ich Dinge mache.',
      // 35 SC
      'Ich habe Angst, in die Schule zu gehen.',
      // 36 GAD
      'Ich mache mir Sorgen über Dinge, die schon passiert sind.',
      // 37 PA
      'Wenn ich Angst habe, fühle ich mich schwindelig.',
      // 38 SO
      'Ich werde nervös, wenn ich mit anderen Kindern oder Erwachsenen zusammen bin und etwas tun muss, während sie zusehen (z.B. ein Gedicht aufsagen, eine Frage beantworten).',
      // 39 SO
      'Ich werde nervös, wenn ich auf Partys, Tanzveranstaltungen oder an Orte gehe, wo Leute sind, die ich nicht gut kenne.',
      // 40 SO
      'Ich bin schüchtern.',
    ],
    cutoffs: {
      '0-24': 'Unauffällig — keine klinisch relevante Angststörung',
      '25-29': 'Verdacht auf Angststörung — Subskalen prüfen',
      '30+': 'Wahrscheinliche Angststörung — strukturierte Diagnostik',
    },
    // Subskalen-Indizes nach Birmaher et al. (1999)
    subscaleMap: {
      panic:    [0, 5, 8, 11, 14, 17, 18, 21, 23, 26, 29, 33, 37], // 13 Items
      gad:      [4, 6, 13, 20, 22, 27, 32, 34, 36],                  //  9 Items
      sad:      [3, 7, 12, 15, 19, 24, 28, 30],                       //  8 Items
      social:   [2, 9, 25, 31, 38, 39, 40],                           //  7 Items
      school:   [1, 10, 16, 35],                                       //  4 Items
    },
    subscaleCutoffs: {
      panic:  7,  // Panic / Somatic
      gad:    9,  // GAD
      sad:    5,  // Separation Anxiety
      social: 8,  // Social Phobia
      school: 3,  // School Avoidance
    },
    eval(scores) {
      // SCARED-41: 41 Items × 0-2, Max 82. Birmaher et al. (1999).
      // Total Cutoff ≥25 = klinisch relevant; Subskalen mit eigenen Cutoffs.
      const get = i => Number(scores[i] || 0);
      const sumIdx = arr => arr.reduce((a, i) => a + get(i), 0);
      const map = INSTRUMENTS['scared'].subscaleMap;
      const subscales = {
        panic:  sumIdx(map.panic),
        gad:    sumIdx(map.gad),
        sad:    sumIdx(map.sad),
        social: sumIdx(map.social),
        school: sumIdx(map.school),
      };
      const total = subscales.panic + subscales.gad + subscales.sad + subscales.social + subscales.school;
      const cuts = INSTRUMENTS['scared'].subscaleCutoffs;
      const subCutoffs = {
        panic:  subscales.panic  >= cuts.panic  ? 'auffällig' : 'normal',
        gad:    subscales.gad    >= cuts.gad    ? 'auffällig' : 'normal',
        sad:    subscales.sad    >= cuts.sad    ? 'auffällig' : 'normal',
        social: subscales.social >= cuts.social ? 'auffällig' : 'normal',
        school: subscales.school >= cuts.school ? 'auffällig' : 'normal',
      };
      const auffaelligeSub = Object.values(subCutoffs).filter(x => x === 'auffällig').length;
      let severity, severityLabel, label;
      if (total < 25)       { severity='low';      severityLabel='minimal';  label='Unauffällig — keine klinisch relevante Angststörung (Cutoff ≥25, Birmaher et al. 1999)'; }
      else if (total < 30)  { severity='mod';      severityLabel='leicht';   label=`Verdacht auf Angststörung (Score ${total}) — Subskalen prüfen`; }
      else if (auffaelligeSub <= 1) { severity='high'; severityLabel='mittel'; label=`Wahrscheinliche Angststörung (Score ${total}, ${auffaelligeSub} Subskala auffällig)`; }
      else if (auffaelligeSub <= 2) { severity='high'; severityLabel='schwer'; label=`Mehrere Angst-Domänen betroffen (Score ${total}, ${auffaelligeSub} Subskalen auffällig) — strukturierte Diagnostik`; }
      else                  { severity='critical'; severityLabel='kritisch'; label=`Multiple Angststörungen wahrscheinlich (Score ${total}, ${auffaelligeSub} Subskalen auffällig) — strukturierte Behandlung indiziert`; }
      return { score: total, max: 82, severity, severityLabel, label, subscales, subCutoffs };
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
