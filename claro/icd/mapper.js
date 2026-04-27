/* ============================================================
   DIAGNOSE — ICD-10/11 Mapper
   ============================================================
   Mappt Symptom-Konstellationen auf ICD-Codes mit
   Differential-diagnostischen Hinweisen.
   ============================================================ */

const ICDMapper = (function () {
  // ─── ICD-Hauptcodes mit Beschreibung + Differentialen ──
  const ICD = {
    'F32': {
      label: 'Depressive Episode',
      description: 'Mind. 2 Wochen anhaltende depressive Stimmung, Antriebslosigkeit, Anhedonie.',
      differentials: ['F41.2 Angst-Depression-gemischt', 'F43.2 Anpassungsstörung', 'F31 Bipolar'],
      criteria: ['Stimmung gedrückt', 'Antrieb reduziert', 'Anhedonie', '+ ≥2 Symptome (Schlaf, Appetit, Konzentration, Schuld, Suizid, Psychomotorik)'],
    },
    'F33': {
      label: 'Rezidivierende depressive Störung',
      description: 'Wiederholte depressive Episoden ohne hypomanische/manische Phasen.',
      differentials: ['F31 Bipolar', 'F34.1 Dysthymia'],
      criteria: ['≥2 Episoden', 'Mind. 2 Monate dazwischen normal'],
    },
    'F40.1': {
      label: 'Soziale Phobie',
      description: 'Anhaltende Angst vor sozialen Situationen mit Bewertung.',
      differentials: ['F40.0 Agoraphobie', 'F60.6 Selbstunsichere PS', 'F84 Autismus'],
      criteria: ['Angst in sozialen Situationen', 'Vermeidungsverhalten', 'Funktionsbeeinträchtigung'],
    },
    'F41.0': {
      label: 'Panikstörung',
      description: 'Wiederkehrende, unerwartete Panikattacken.',
      differentials: ['F41.1 GAD', 'Somatische Ursachen (Schilddrüse, Herz)'],
      criteria: ['Wiederkehrende Panikattacken', 'Erwartungsangst', 'Verhaltensänderung'],
    },
    'F41.1': {
      label: 'Generalisierte Angststörung',
      description: 'Anhaltende, frei flottierende Angst und Sorgen über mind. 6 Monate.',
      differentials: ['F32 Depression', 'F40 Phobien'],
      criteria: ['Übermäßige Sorgen', 'Schwer kontrollierbar', '≥3 Symptome (Reizbarkeit, Schlaf, Konzentration, Muskelspannung)'],
    },
    'F41.2': {
      label: 'Angst und depressive Störung gemischt',
      description: 'Symptome beider Bereiche, weder erfüllen Vollkriterien.',
      differentials: ['F32 Depression', 'F41.1 GAD'],
    },
    'F43.0': {
      label: 'Akute Belastungsreaktion',
      description: 'Vorübergehende Reaktion auf außergewöhnliche Belastung, < 4 Wochen.',
      differentials: ['F43.1 PTBS', 'F43.2 Anpassungsstörung'],
    },
    'F43.1': {
      label: 'PTBS — Posttraumatische Belastungsstörung',
      description: 'Anhaltende Belastung nach Trauma. Wiedererleben, Vermeidung, Hyperarousal.',
      differentials: ['F43.2 Anpassungsstörung', 'F60 Persönlichkeitsstörung', 'F32 Depression'],
      criteria: ['Trauma-Exposition', 'Wiedererleben', 'Vermeidung', 'Negative Stimmung', 'Hyperarousal', '> 1 Monat'],
    },
    'F43.2': {
      label: 'Anpassungsstörung',
      description: 'Subklinisch nach Belastung. Innerhalb 3 Monaten nach Auslöser.',
      differentials: ['F32 Depression', 'F43.0 ABR', 'F43.1 PTBS'],
    },
    'F50.0': {
      label: 'Anorexia nervosa',
      description: 'BMI &lt; 17.5, Gewichtsphobie, Körperbildstörung, Amenorrhoe.',
      differentials: ['F50.2 Bulimia nervosa', 'F50.4 Atypische Essstörung'],
    },
    'F50.2': {
      label: 'Bulimia nervosa',
      description: 'Essattacken + kompensatorisches Verhalten (Erbrechen, Laxantien, Sport).',
      differentials: ['F50.0 Anorexia', 'F50.4 Binge Eating'],
    },
    'F90': {
      label: 'ADHS',
      description: 'Aufmerksamkeitsdefizit + Hyperaktivität/Impulsivität, Beginn < 12 J.',
      differentials: ['F91 Sozialverhaltensstörung', 'F84 Autismus', 'F32 Depression', 'F43 PTBS'],
      criteria: ['≥6 Symptome (5 ab 17 J.)', 'Beginn vor 12. Lebensjahr', 'In ≥2 Settings', '> 6 Monate'],
    },
    'F91': {
      label: 'Störung des Sozialverhaltens',
      description: 'Wiederholte aggressive oder dissoziale Verhaltensweisen.',
      differentials: ['F90 ADHS', 'F92 Komb. Sozialv.+Emot.', 'F60.2 Dissoziale PS'],
    },
    'F94.1': {
      label: 'Reaktive Bindungsstörung',
      description: 'Bindungsstörung nach pathogener Fürsorge in der frühen Kindheit.',
      differentials: ['F84 Autismus', 'F94.2 Enthemmte Bindung'],
    },
  };

  function lookup(code) {
    return ICD[code] || null;
  }

  function search(query) {
    const q = (query || '').toLowerCase();
    return Object.entries(ICD)
      .filter(([code, info]) =>
        code.toLowerCase().includes(q) ||
        info.label.toLowerCase().includes(q) ||
        info.description.toLowerCase().includes(q)
      )
      .map(([code, info]) => ({ code, ...info }));
  }

  function render() {
    const container = document.getElementById('dg-content');
    container.innerHTML = `
      <div class="dg-section">
        <h2>🏥 ICD-10 Mapper</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-3);">
          Differentialdiagnostik mit den wichtigsten F-Codes. Inklusive Abgrenzung und Kriterien.
        </p>
        <input
          type="search"
          placeholder="Suche: Code (F32) oder Begriff (Depression)…"
          style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 15px; margin-bottom: var(--space-4);"
          oninput="ICDMapper._renderResults(this.value)"
        >
        <div id="icd-results"></div>
      </div>
    `;
    _renderResults('');
  }

  function _renderResults(q) {
    const results = search(q || '');
    const container = document.getElementById('icd-results');
    if (!results.length) {
      container.innerHTML = `<div class="pw-empty"><p>Keine Treffer für "${Utils.escapeHtml(q)}".</p></div>`;
      return;
    }
    container.innerHTML = results.map(r => `
      <div class="dg-hypothesis">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="dg-hypothesis-title">${r.code} — ${Utils.escapeHtml(r.label)}</div>
        </div>
        <div style="margin: var(--space-2) 0; font-size: 14px;">${Utils.escapeHtml(r.description)}</div>
        ${r.criteria ? `
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: var(--space-2);">
            <strong>Kriterien:</strong> ${r.criteria.map(Utils.escapeHtml).join(' · ')}
          </div>
        ` : ''}
        ${r.differentials ? `
          <div class="dg-hypothesis-rationale">
            <strong>DD:</strong> ${r.differentials.map(Utils.escapeHtml).join(' · ')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  return { render, lookup, search, ICD, _renderResults };
})();
