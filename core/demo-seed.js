/* ============================================================
   Pathways Core — Demo-Seed
   ============================================================
   Erstellt einen realistischen Demo-Klienten mit allen Datenebenen,
   damit die App beim ersten Öffnen nicht leer ist.
   Wird nur 1× ausgeführt (Flag: pw_demo_seeded).
   ============================================================ */

const DemoSeed = {
  SEED_FLAG: 'pw_demo_seeded',

  isSeeded() {
    return localStorage.getItem(this.SEED_FLAG) === 'true';
  },

  seed() {
    if (this.isSeeded()) return false;

    const sid = 'demo_lena_' + Date.now().toString(36);
    const heute = new Date().toISOString().split('T')[0];
    const vor = (tage) => new Date(Date.now() - tage * 86400000).toISOString().split('T')[0];

    // ─── 1. Klient anlegen ──────────────────────────────────
    const lena = DB.createSchueler({
      vorname: 'Lena',
      nachname: 'Demo',
      geburtsdatum: '2012-03-15',
      klasse: '7C',
      eintrittsdatum: vor(90),
      risiko: 'mittel',
      allgemeineNotizen: 'Demo-Klientin. 14 Jahre, internalisierendes Muster mit Trauma-Hintergrund. Lebt bei Mutter (alleinerziehend). Schulabsentismus seit 3 Monaten.',
      anamnese: [
        'ace_emotional_neglect', 'ace_parent_separation', 'ace_domestic_violence',
        'fam_alleinerziehend', 'fam_migration',
        'schul_absentismus', 'schul_phobie',
        'schlaf_einschlaf', 'schlaf_alptraeume',
        'bind_ambivalent',
      ],
      diagnosen: [
        { icd: 'F32.1', label: 'Mittelgradige depressive Episode', diagnostiziertAm: vor(60) },
        { icd: 'F93.0', label: 'Emotionale Störung mit Trennungsangst', diagnostiziertAm: vor(45) },
      ],
      medikation: [],
      sorgerecht: 'Alleiniges Sorgerecht Mutter',
      schweigepflichtStatus: 'standard',
    });

    // ─── 2. Helfer-Netzwerk ─────────────────────────────────
    const helferIds = [];
    [
      { name: 'Maria Silva', rolle: 'Mutter', kategorie: 'familie', beziehung: 'eng', telefon: '621 123 456', letzterKontakt: vor(5), informiert: true, notiz: 'Kooperativ, besorgt. Spricht wenig Deutsch, Gespräche auf Portugiesisch.' },
      { name: 'Mme Dupont', rolle: 'Klassenlehrerin', kategorie: 'schule', beziehung: 'neutral', telefon: '', institution: 'Lycée Michel Rodange', letzterKontakt: vor(21), informiert: true, notiz: 'Berichtet: Lena meldet sich nicht mehr, sitzt allein.' },
      { name: 'Dr. Kneip', rolle: 'Kinderarzt', kategorie: 'medizin', beziehung: 'neutral', telefon: '26 33 44 55', institution: 'Cabinet Kneip', letzterKontakt: vor(45), informiert: false },
      { name: 'Mme Weber', rolle: 'SCAS-Beraterin', kategorie: 'sozial', beziehung: 'eng', telefon: '247 83 100', institution: 'SCAS', letzterKontakt: vor(10), informiert: true, notiz: 'Regelmäßiger Austausch. Plant Hausbesuch.' },
    ].forEach(h => {
      DB.addHelfer({ schuelerId: lena.id, ...h });
    });

    // ─── 3. Screening T1 (vor 8 Wochen) ────────────────────
    const screening1 = DB.createScreening(lena.id);
    screening1.datum = vor(56);
    screening1.abgeschlossen = true;
    screening1.scores = {
      'phq-a': { score: 16, max: 27, severity: 'high', label: 'Mittelschwere bis schwere Depression', flagSuicide: false, item9: 0 },
      'gad-7': { score: 12, max: 21, severity: 'high', label: 'Mittelschwere Angst' },
      'pcl-5': { score: 38, max: 80, severity: 'high', label: 'PTBS-Verdacht', dsm5: { critB: true, critC: true, critD: true, critE: false, met: false } },
    };
    DB.saveScreening(screening1);

    // ─── 4. Screening T2 (vor 2 Wochen) ────────────────────
    const screening2 = DB.createScreening(lena.id);
    screening2.datum = vor(14);
    screening2.abgeschlossen = true;
    screening2.scores = {
      'phq-a': { score: 12, max: 27, severity: 'high', label: 'Moderate Depression', flagSuicide: false, item9: 0 },
      'gad-7': { score: 9, max: 21, severity: 'mod', label: 'Leichte Angst' },
      'pcl-5': { score: 31, max: 80, severity: 'low', label: 'Unter klinischer Schwelle' },
    };
    DB.saveScreening(screening2);

    // ─── 5. Risiko-Einträge ─────────────────────────────────
    DB.addRisiko(lena.id, { sicherheit: 'gelb', source: 'screening-t1', cssrs_severity: null, datum: vor(56) });
    DB.addRisiko(lena.id, { sicherheit: 'gruen', source: 'screening-t2', datum: vor(14) });

    // ─── 6. Roadmap ─────────────────────────────────────────
    const rm = DB.createRoadmap(lena.id);
    rm.phasen[0].status = 'abgeschlossen';
    rm.phasen[0].startDatum = vor(84);
    rm.phasen[0].endDatum = vor(70);
    rm.phasen[0].notizen = 'Beziehungsaufbau gelungen. Lena öffnet sich langsam.';
    rm.phasen[1].status = 'abgeschlossen';
    rm.phasen[1].startDatum = vor(70);
    rm.phasen[1].endDatum = vor(56);
    rm.phasen[1].notizen = 'T1-Screening abgeschlossen. Hypothesen: Depression + Trennungsangst.';
    rm.phasen[2].status = 'abgeschlossen';
    rm.phasen[2].startDatum = vor(56);
    rm.phasen[2].endDatum = vor(35);
    rm.phasen[3].status = 'aktiv';
    rm.phasen[3].startDatum = vor(35);
    rm.phasen[3].beginn = vor(35);
    rm.phasen[3].themen = ['emotionsregulation', 'schulpraesenz'];
    rm.phasen[3].ziele = [
      { id: 'z1', titel: '3× pro Woche morgens zur Schule gehen', beschreibung: 'Graduierte Exposition: erst 1 Stunde, dann halber Tag, dann ganzer Tag', status: 'offen', terminiert: '', erstellt: vor(30) },
      { id: 'z2', titel: 'Notfallkoffer mit 5 Strategien füllen', beschreibung: 'DBT-Skills: TIPP, Atemübung, Musik, Spaziergang, Bezugsperson anrufen', status: 'erreicht', erstellt: vor(28) },
    ];
    DB.saveRoadmap(rm);

    // ─── 7. Sitzungen (6 Stück) ─────────────────────────────
    const sitzungsDaten = [
      { datum: vor(77), typ: 'erstgespraech', S: 'Lena sagt wenig. Schaut auf den Boden.', O: 'Vermeidender Blickkontakt, leise Stimme, kooperativ aber verschlossen.', A: 'Erster Kontakt. Bindungsaufbau priorisiert.', P: 'Nächste Woche: Stärken-Exploration', ors: 18, srs: 28, pvt_start: 'frozen', pvt_end: 'activated', stimmung_start: 3, stimmung_end: 4 },
      { datum: vor(63), typ: 'regulaer', S: '"Die Schule ist schlimm. Alle schauen mich an."', O: 'Mehr Blickkontakt. Erzählt von Mobbing-Erfahrung.', A: 'Soziale Angst + Scham. Trauma-Hintergrund bestätigt sich.', P: 'Stabilisierungsübungen einführen. PCL-5 durchführen.', ors: 20, srs: 30, pvt_start: 'activated', pvt_end: 'safe', stimmung_start: 4, stimmung_end: 5 },
      { datum: vor(49), typ: 'regulaer', S: '"Ich habe die Atemübung probiert. Hat ein bisschen geholfen."', O: 'Deutlich offener. Lacht einmal kurz.', A: 'Stabilisierung greift. Allianz gut.', P: 'Notfallkoffer aufbauen. Schulpräsenz thematisieren.', ors: 23, srs: 33, pvt_start: 'safe', pvt_end: 'safe', stimmung_start: 5, stimmung_end: 6, hausaufgabe: 'Notfallkoffer: 3 Strategien aufschreiben' },
      { datum: vor(35), typ: 'regulaer', S: '"Ich war einmal in der Schule diese Woche. Nur 2 Stunden."', O: 'Stolz sichtbar. PVT stabil safe.', A: 'Exposition begonnen. Kleine Schritte funktionieren.', P: 'Nächste Woche: 2× Schule, halber Tag.', ors: 26, srs: 34, pvt_start: 'safe', pvt_end: 'safe', stimmung_start: 5, stimmung_end: 7, hausaufgabe: 'Dienstag + Donnerstag zur Schule, bis 12 Uhr' },
      { datum: vor(21), typ: 'regulaer', S: '"Donnerstag war gut. Dienstag war schwer, Mathe."', O: 'Differenziert, reflektiert. Gute Selbstwahrnehmung.', A: 'ORS steigt, Schulpräsenz nimmt zu. Mathe als Trigger identifiziert.', P: 'Mathe-Angst bearbeiten (KVT Gedankenprotokoll). T2-Screening.', ors: 28, srs: 35, pvt_start: 'safe', pvt_end: 'safe', stimmung_start: 6, stimmung_end: 7, hausaufgabe: 'Gedankenprotokoll: 1× wenn Mathe-Angst kommt' },
      { datum: vor(7), typ: 'regulaer', S: '"Ich war 3× in der Schule. In Mathe hatte ich Panik, aber ich bin geblieben."', O: 'Emotional bewegt beim Erzählen, aber reguliert sich. Blickkontakt durchgehend.', A: 'Deutlicher Fortschritt. ORS über klinischer Schwelle. Allianz stark.', P: 'Weiter graduierte Exposition. Gedankenprotokoll vertiefen. Elterngespräch planen.', ors: 30, srs: 36, pvt_start: 'safe', pvt_end: 'safe', stimmung_start: 7, stimmung_end: 8, hausaufgabe: '4× Schule nächste Woche, ganzer Tag Dienstag versuchen' },
    ];

    sitzungsDaten.forEach(sz => {
      // Realistische VAS-Subskalen (0-10), Summe = ors_total
      const orsSpread = (total) => {
        const base = total / 4;
        return { individual: Math.min(10, Math.max(0, base - 0.5)), interpersonal: Math.min(10, Math.max(0, base + 0.3)), social: Math.min(10, Math.max(0, base - 1)), overall: Math.min(10, Math.max(0, base + 1.2)) };
      };
      const srsSpread = (total) => {
        const base = total / 4;
        return { relationship: Math.min(10, Math.max(0, base + 0.5)), goals: Math.min(10, Math.max(0, base - 0.3)), approach: Math.min(10, Math.max(0, base + 0.2)), overall: Math.min(10, Math.max(0, base - 0.4)) };
      };

      DB.createNotiz({
        schuelerId: lena.id,
        datum: sz.datum,
        inhalt: `S: ${sz.S}\nO: ${sz.O}\nA: ${sz.A}\nP: ${sz.P}`,
        kategorie: 'session',
        soap: {
          S: sz.S, O: sz.O, A: sz.A, P: sz.P,
          typ: sz.typ,
          ors_total: sz.ors,
          srs_total: sz.srs,
          ors: orsSpread(sz.ors),
          srs: srsSpread(sz.srs),
          pvt_start: sz.pvt_start,
          pvt_end: sz.pvt_end,
          stimmung_start: sz.stimmung_start,
          stimmung_end: sz.stimmung_end,
          hausaufgabe: sz.hausaufgabe || '',
          ereignisse: [],
        },
      });
    });

    // ─── 8. Wohlbefinden ────────────────────────────────────
    sitzungsDaten.forEach(sz => {
      DB.addWohlbefinden(lena.id, sz.ors, '');
    });

    // ─── 9. Kontakte ────────────────────────────────────────
    DB.addKontakt({ schuelerId: lena.id, datum: vor(60), kontaktperson: 'Maria Silva', art: 'telefon', inhalt: 'Erstgespräch vereinbart. Mutter besorgt aber kooperativ.', folgeaktion: 'Einverständniserklärung mitbringen' });
    DB.addKontakt({ schuelerId: lena.id, datum: vor(21), kontaktperson: 'Mme Dupont', art: 'email', inhalt: 'Schulpräsenz-Update: Lena war 2× da. Lehrerin berichtet positiv.', folgeaktion: 'In 2 Wochen erneut nachfragen' });
    DB.addKontakt({ schuelerId: lena.id, datum: vor(10), kontaktperson: 'Mme Weber', art: 'meeting', inhalt: 'SCAS-Fallbesprechung. Gemeinsame Strategie: graduierte Schulrückkehr.', folgeaktion: 'Hausbesuch durch SCAS in KW 20' });

    // ─── 10. Konferenz ──────────────────────────────────────
    DB.addKonferenz({
      schuelerId: lena.id,
      datum: vor(40),
      titel: 'Hilfeplankonferenz I',
      teilnehmer: 'Mutter, Klassenlehrerin, SCAS-Beraterin, Fachkraft',
      themen: 'Schulabsentismus, depressive Symptomatik, Trennungsangst. Begleitungsplan besprochen.',
      beschluesse: '1. Graduierte Schulrückkehr ab KW 14. 2. Wöchentliche Begleitung durch Fachkraft. 3. SCAS-Hausbesuch alle 2 Wochen.',
      naechsterTermin: vor(-30),
    });

    // ─── 11. Termine ────────────────────────────────────────
    DB.createTermin({ datum: vor(-3), uhrzeit: '14:00', titel: 'Sitzung 7 mit Lena', typ: 'sitzung', schuelerId: lena.id });
    DB.createTermin({ datum: vor(-10), uhrzeit: '10:00', titel: 'Elterngespräch Maria Silva', typ: 'elterngespraech', schuelerId: lena.id });

    // ─── 12. Aufgaben ───────────────────────────────────────
    DB.addAufgabe({ titel: 'Elterngespräch mit Maria vorbereiten', prioritaet: 'hoch', faelligkeit: vor(-2), erledigt: false });
    DB.addAufgabe({ titel: 'Bericht für Hilfeplankonferenz II schreiben', prioritaet: 'normal', faelligkeit: vor(-25), erledigt: false });

    // ─── 13. Stärken-Profil ─────────────────────────────────
    const staerken = JSON.parse(localStorage.getItem('pw_staerken') || '{}');
    staerken[lena.id] = { 0: 7, 1: 8, 2: 5, 3: 6, 4: 4, 5: 6, 6: 3, 7: 4, 8: 7, 9: 5, 10: 6, 11: 5, 12: 6, 13: 4, 14: 5, 15: 8, 16: 6, 17: 7 };
    localStorage.setItem('pw_staerken', JSON.stringify(staerken));

    // ─── 14. Persönliche Notiz ──────────────────────────────
    DB.addPersNotiz({
      titel: 'Supervision: Fall Lena',
      inhalt: 'Supervisorin empfiehlt: Trennungsangst nicht nur kognitiv angehen, sondern Bindungsarbeit mit Mutter stärken. Mutter-Kind-Sitzung erwägen.',
      tags: ['supervision', 'bindung', 'lena'],
    });

    localStorage.setItem(this.SEED_FLAG, 'true');
    console.log('[DemoSeed] Demo-Klientin "Lena Demo" angelegt mit 6 Sitzungen, 2 Screenings, Helfer-Netzwerk, Roadmap Phase 3.');
    return true;
  },

  reset() {
    localStorage.removeItem(this.SEED_FLAG);
  },
};
