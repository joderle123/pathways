/* ============================================================
   DIAGNOSE — Hypothesen-Engine
   ============================================================
   Generiert klinische Hypothesen basierend auf Screening-Ergebnissen,
   Anamnese und ACE-Score. Regelbasiert mit Begründung.

   API:
     Hypotheses.generate(schuelerId)  → [{ titel, evidence, rationale, themen }]
   ============================================================ */

const Hypotheses = (function () {
  // ─── Regeln ────────────────────────────────────────────
  // Jede Regel: testet Bedingungen, liefert Hypothese mit Begründung
  const RULES = [
    {
      id: 'depression-major',
      titel: 'Depressive Episode (F32) — Major Depression',
      themen: ['depressive-stimmungen', 'emotionsregulation', 'verhaltensaktivierung'],
      icd: 'F32',
      test: ctx => ctx.phqa >= 15,
      rationale: ctx => `PHQ-A Score ${ctx.phqa} ≥ 15 (mittelschwer-schwer). Klinische Diagnostik empfohlen.`,
    },
    {
      id: 'depression-mild',
      titel: 'Leichte depressive Episode',
      themen: ['depressive-stimmungen', 'wohlbefinden'],
      icd: 'F32.0',
      test: ctx => ctx.phqa >= 10 && ctx.phqa < 15,
      rationale: ctx => `PHQ-A Score ${ctx.phqa} im Bereich leichter Depression.`,
    },
    {
      id: 'gad',
      titel: 'Generalisierte Angststörung (F41.1)',
      themen: ['stress-angst', 'achtsamkeit', 'kognitive-umstrukturierung'],
      icd: 'F41.1',
      test: ctx => ctx.gad >= 10,
      rationale: ctx => `GAD-7 Score ${ctx.gad} ≥ 10. Anhaltende Sorgen mit Funktionsbeeinträchtigung wahrscheinlich.`,
    },
    {
      id: 'ptsd',
      titel: 'Posttraumatische Belastungsstörung (F43.1)',
      themen: ['trauma', 'krisenintervention', 'stabilisierung'],
      icd: 'F43.1',
      test: ctx => ctx.pcl >= 33,
      rationale: ctx => {
        const parts = [`PCL-5 Score ${ctx.pcl} ≥ 33 erfüllt klinischen Cutoff.`];
        // Trauma-Spezifikation (Manifest: Typ I vs II, akut vs chronisch)
        const multiTrauma = [ctx.anamnese_ace_sexual_abuse, ctx.anamnese_ace_physical_abuse, ctx.anamnese_ace_domestic_violence].filter(Boolean).length;
        if (multiTrauma >= 2) {
          parts.push('<strong>Typ II (komplex)</strong> — multiple Traumata in der Vorgeschichte. Erwäge ICD-11 KPTBS (6B41).');
        } else if (multiTrauma === 1) {
          parts.push('Typ I (Einzel-Trauma) wahrscheinlich. Prüfe ob einzelnes Ereignis oder wiederholte Exposition.');
        }
        if (ctx.ace >= 4) {
          parts.push('Chronifizierung wahrscheinlich bei ACE ≥ 4. Stabilisierung vor Exposition (Herman Phase 1).');
        } else {
          parts.push('Akute Phase möglich. Prüfe Zeitrahmen seit Trauma-Exposition.');
        }
        return parts.join(' ');
      },
    },
    {
      id: 'adhs',
      titel: 'ADHS (F90) — Verdacht',
      themen: ['konzentration-aufmerksamkeit', 'impulskontrolle', 'lernstrategien'],
      icd: 'F90',
      test: ctx => ctx.asrs >= 16,
      rationale: ctx => `ASRS Score ${ctx.asrs}. Vertiefte ADHS-Diagnostik (Conners, ADHS-DC) erwägen.`,
    },
    {
      id: 'sozialverhalten',
      titel: 'Störung des Sozialverhaltens (F91)',
      themen: ['wut-aggression', 'impulskontrolle', 'soziale-wahrnehmung'],
      icd: 'F91',
      test: ctx => ctx.sdq?.subscales?.conduct >= 4,
      rationale: ctx => `SDQ Conduct-Subskala ${ctx.sdq.subscales.conduct} ≥ 4 (auffällig).`,
    },
    {
      id: 'essstoerung',
      titel: 'Essstörungs-Verdacht (F50)',
      themen: ['essverhalten', 'koerperbild-sexualitaet'],
      icd: 'F50',
      test: ctx => ctx.scoff >= 2,
      rationale: ctx => `SCOFF ${ctx.scoff} ≥ 2 — Verdacht auf gestörtes Essverhalten.`,
    },
    {
      id: 'komorbid-depression-angst',
      titel: 'Komorbidität Depression + Angst',
      themen: ['emotionsregulation', 'achtsamkeit', 'depressive-stimmungen'],
      icd: 'F41.2',
      test: ctx => ctx.phqa >= 10 && ctx.gad >= 10,
      rationale: ctx => `Sowohl PHQ-A (${ctx.phqa}) als auch GAD-7 (${ctx.gad}) erhöht. Häufige Komorbidität.`,
    },
    {
      id: 'komorbid-trauma-depression',
      titel: 'Trauma-bedingte Depression',
      themen: ['trauma', 'depressive-stimmungen', 'stabilisierung'],
      icd: 'F43.1+F32',
      test: ctx => ctx.pcl >= 33 && ctx.phqa >= 10,
      rationale: ctx => `Trauma-Symptome (PCL-5 ${ctx.pcl}) + Depression (PHQ-A ${ctx.phqa}). Bei Komorbidität: Stabilisierung priorisieren (Herman 1992 Phase 1).`,
    },
    {
      id: 'ace-hochbelastet',
      titel: 'Hochbelastete Biographie (ACE ≥ 4)',
      themen: ['trauma', 'resilienz', 'bindungsstoerung'],
      icd: 'Z61',
      test: ctx => ctx.ace >= 4,
      rationale: ctx => `ACE-Score ${ctx.ace} ≥ 4 erhöht Risiko für Depression, Sucht, chronische Erkrankungen (Felitti et al. 1998).`,
    },
    {
      id: 'suizidrisiko',
      titel: '⚠️ Suizidrisiko',
      themen: ['krisenintervention', 'sicherheitsplan'],
      icd: 'X71-X83',
      test: ctx => ctx.phqaItem9 >= 1 || ctx.cssrs?.severity === 'high' || ctx.cssrs?.severity === 'critical',
      rationale: ctx => `${ctx.phqaItem9 >= 1 ? `PHQ-A Item 9 (Suizidgedanken) ≥ ${ctx.phqaItem9}. ` : ''}${ctx.cssrs ? `C-SSRS Severity: ${ctx.cssrs.severity}. ` : ''}<strong>Sicherheitsplan jetzt erstellen.</strong>`,
    },
  ];

  /** Liefert kontextuelle Werte für die Regel-Auswertung. */
  function buildContext(schuelerId) {
    const screenings = DB.getScreenings(schuelerId).filter(s => s.abgeschlossen);
    const latest = screenings.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))[0];

    const ctx = {
      schuelerId,
      phqa: 0, phqaItem9: 0,
      gad: 0, pcl: 0, asrs: 0, scoff: 0,
      sdq: null,
      cssrs: null,
      ace: 0,
    };

    // Screening-Scores aus letztem Screening
    if (latest && latest.scores) {
      Object.entries(latest.scores).forEach(([instrId, val]) => {
        if (typeof val === 'object' && val.score !== undefined) {
          if (instrId === 'phq-a') { ctx.phqa = val.score; ctx.phqaItem9 = val.item9 || 0; }
          if (instrId === 'gad-7') ctx.gad = val.score;
          if (instrId === 'pcl-5') ctx.pcl = val.score;
          if (instrId === 'asrs') ctx.asrs = val.score;
          if (instrId === 'scoff') ctx.scoff = val.score;
          if (instrId === 'sdq') ctx.sdq = val;
        }
      });
    }

    // C-SSRS aus pw_risiko
    const risiko = DB.getRisiko(schuelerId).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    const cssrsRisk = risiko.find(r => r.werte?.cssrs_severity);
    if (cssrsRisk) ctx.cssrs = cssrsRisk.werte;

    // ACE + Einzel-Flags aus Anamnese
    const s = DB.getSchuelerById(schuelerId);
    if (s?.anamnese) {
      ctx.ace = s.anamnese.filter(id => id.startsWith('ace_')).length;
      s.anamnese.forEach(id => ctx['anamnese_' + id] = true);
    }

    return ctx;
  }

  const SEQUENZIERUNG = {
    'ptsd': 'Erst stabilisieren (Phase 1 Herman), dann verarbeiten. Trauma-Exposition nicht vor stabiler Allianz.',
    'komorbid-trauma-depression': 'Stabilisierung priorisieren. Depression oft sekundär zum Trauma.',
    'suizidrisiko': 'Sicherheitsplan SOFORT. Keine explorative Arbeit bis Risiko abgeklärt.',
  };

  // Score-Schwellen und Maxima pro Instrument
  const CUTOFFS = {
    'phq-a': { cutoff: 10, max: 27 },
    'gad-7': { cutoff: 10, max: 21 },
    'pcl-5': { cutoff: 33, max: 80 },
    'asrs':  { cutoff: 16, max: 72 },
    'scoff': { cutoff: 2, max: 5 },
    'sdq-conduct': { cutoff: 4, max: 10 },
  };

  function proportionalBoost(score, instrumentId) {
    const c = CUTOFFS[instrumentId];
    if (!c || score <= 0) return 0;
    return Math.min(30, ((score - c.cutoff) / (c.max - c.cutoff)) * 30);
  }

  function konfidenzBerechnen(rule, ctx) {
    let k = 40;

    // Proportionaler Boost basierend auf Score-Höhe (nicht binär)
    if (rule.id.includes('depression') && ctx.phqa > 0) {
      k += 10 + proportionalBoost(ctx.phqa, 'phq-a');
    }
    if (rule.id === 'gad' && ctx.gad > 0) {
      k += 10 + proportionalBoost(ctx.gad, 'gad-7');
    }
    if (rule.id === 'ptsd' && ctx.pcl > 0) {
      k += 10 + proportionalBoost(ctx.pcl, 'pcl-5');
    }
    if (rule.id === 'adhs' && ctx.asrs > 0) {
      k += 10 + proportionalBoost(ctx.asrs, 'asrs');
    }

    // Cross-Instrument-Korroboration (mehrere Quellen = höhere Konfidenz)
    if (rule.id.includes('depression') && ctx.gad >= 5) k += 5;
    if (rule.id === 'gad' && ctx.phqa >= 5) k += 5;
    if (rule.id === 'ptsd' && ctx.ace >= 2) k += 8;
    if (rule.id.includes('trauma') && ctx.pcl >= 20) k += 5;

    // Anamnese-Konsistenz
    if (rule.id.includes('trauma') && ctx.ace >= 4) k += 10;
    if (rule.id === 'ace-hochbelastet' && ctx.ace >= 6) k += 15;

    // Komorbidität → leicht niedrigere Konfidenz
    if (rule.id.startsWith('komorbid')) k -= 8;

    // Suizidrisiko immer hoch wenn Daten vorhanden
    if (rule.id === 'suizidrisiko') k = 90;

    // Temporale Bestätigung: Hypothese aus vorherigem Screening → Boost
    if (ctx.previousHypotheses?.includes(rule.id)) k += 10;

    return Math.max(20, Math.min(95, k));
  }

  // Soft-Rules: Vorschläge basierend auf Anamnese OHNE Screening
  const SOFT_RULES = [
    { id: 'soft-depression', titel: 'Mögliche Depression — Screening empfohlen', icd: 'F32?', themen: ['depressive-stimmungen'],
      test: ctx => ctx.ace >= 4 && ctx.phqa === 0,
      rationale: ctx => `ACE ≥ 4 ohne PHQ-A-Screening. Depressive Symptomatik bei ${Math.round(30 + ctx.ace * 5)}% dieser Population. PHQ-A empfohlen.`,
      basekonfidenz: 30 },
    { id: 'soft-trauma', titel: 'Mögliche Trauma-Symptomatik — Screening empfohlen', icd: 'F43?', themen: ['trauma', 'stabilisierung'],
      test: ctx => (ctx.anamnese_ace_sexual_abuse || ctx.anamnese_ace_physical_abuse || ctx.anamnese_ace_domestic_violence) && ctx.pcl === 0,
      rationale: ctx => `Trauma-Exposition in Anamnese ohne PCL-5. Abklärung dringend empfohlen.`,
      basekonfidenz: 35 },
    { id: 'soft-angst', titel: 'Mögliche Angststörung — Screening empfohlen', icd: 'F41?', themen: ['stress-angst'],
      test: ctx => ctx.anamnese_schul_absentismus && ctx.gad === 0,
      rationale: ctx => 'Schulabsentismus in Anamnese ohne GAD-7. Angststörung als häufige Ursache abklären.',
      basekonfidenz: 25 },
  ];

  function generate(schuelerId) {
    const ctx = buildContext(schuelerId);

    // Vorherige Hypothesen laden für temporales Tracking
    const s = DB.getSchuelerById(schuelerId);
    ctx.previousHypotheses = (s?.hypothesenVerlauf || []).flatMap(h => h.ids || []);

    const hypotheses = [];

    // Harte Regeln (Screening-basiert)
    RULES.forEach(rule => {
      try {
        if (rule.test(ctx)) {
          hypotheses.push({
            id: rule.id,
            titel: rule.titel,
            icd: rule.icd,
            themen: rule.themen,
            rationale: rule.rationale(ctx),
            konfidenz: konfidenzBerechnen(rule, ctx),
            sequenzierung: SEQUENZIERUNG[rule.id] || null,
            status: ctx.previousHypotheses.includes(rule.id) ? 'BESTÄTIGT' : 'NEU',
          });
        }
      } catch (e) {}
    });

    // Soft-Rules (Anamnese-basiert, nur wenn keine harten Treffer für gleiche Domäne)
    const harteIds = new Set(hypotheses.map(h => h.id));
    SOFT_RULES.forEach(rule => {
      try {
        if (rule.test(ctx) && !harteIds.has(rule.id.replace('soft-', ''))) {
          hypotheses.push({
            id: rule.id,
            titel: rule.titel,
            icd: rule.icd,
            themen: rule.themen,
            rationale: rule.rationale(ctx),
            konfidenz: rule.basekonfidenz,
            sequenzierung: null,
            status: 'VORLÄUFIG',
          });
        }
      } catch (e) {}
    });

    hypotheses.sort((a, b) => b.konfidenz - a.konfidenz);

    // Temporales Tracking speichern
    try {
      const verlauf = s?.hypothesenVerlauf || [];
      verlauf.push({ datum: new Date().toISOString(), ids: hypotheses.map(h => h.id) });
      if (verlauf.length > 20) verlauf.splice(0, verlauf.length - 20);
      DB.updateSchueler(schuelerId, { hypothesenVerlauf: verlauf });
    } catch (e) {}

    return hypotheses;
  }

  return { generate, buildContext, RULES };
})();
