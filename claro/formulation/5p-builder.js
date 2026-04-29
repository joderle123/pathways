/* ============================================================
   DIAGNOSE — 5P-Fallformulierung
   ============================================================
   Strukturierte Fallformulierung nach 5P-Modell:
   - Presenting (aktuelle Beschwerden)
   - Predisposing (prädisponierende Faktoren / Vorgeschichte)
   - Precipitating (auslösende Ereignisse)
   - Perpetuating (aufrechterhaltende Faktoren)
   - Protective (Schutzfaktoren / Ressourcen)

   Auto-Tag-Vorschläge basierend auf Anamnese + Screenings.
   Persistierung über DB.saveFallformulierung.
   ============================================================ */

const FivePModel = (function () {
  // ─── Auto-Tags pro P-Kategorie ─────────────────────────
  const PRESET_TAGS = {
    presenting: [
      'Depressive Stimmung', 'Angst / Panik', 'Selbstverletzung',
      'Suizidgedanken', 'Schlafstörung', 'Konzentrationsstörung',
      'Wutausbrüche', 'Sozialer Rückzug', 'Schulverweigerung',
      'Substanzkonsum', 'Essauffälligkeiten', 'Flashbacks',
      'Dissoziation', 'Somatische Beschwerden',
    ],
    predisposing: [
      'ACE: Misshandlung', 'ACE: Vernachlässigung', 'ACE: Häusliche Gewalt',
      'Trennung der Eltern', 'Frühe Verluste', 'Bindungsstörung',
      'Familiäre psychische Erkrankung', 'Familiäre Suchterkrankung',
      'Migrationshintergrund', 'Niedriger SES', 'Lernbehinderung',
      'Frühgeburtlichkeit', 'Chronische Erkrankung', 'Adoption / Pflege',
    ],
    precipitating: [
      'Aktueller Konflikt zu Hause', 'Schulwechsel', 'Mobbing',
      'Erste Liebesbeziehung / Trennung', 'Tod eines Angehörigen',
      'Diagnose chronischer Erkrankung', 'Umzug', 'Pubertäre Entwicklung',
      'Sexuelle Gewalt', 'Unfall / Notfall', 'Akademischer Druck',
      'Outing-Krise', 'Erstkonsum Substanz', 'COVID-Folgen',
    ],
    perpetuating: [
      'Konflikt-Eltern (anhaltend)', 'Soziale Isolation',
      'Vermeidungsverhalten', 'Substanzkonsum (Selbstmedikation)',
      'Schlafmangel', 'Gedanken-Grübeln', 'Negative Selbstbewertung',
      'Mangelnde Skills (Emotion)', 'Toxische Peer-Group',
      'Chronische Über-/Unterforderung Schule', 'Online-Sucht',
      'Familien-System destruktiv', 'Schweigepflicht-Probleme',
    ],
    protective: [
      'Eine vertrauensvolle Bezugsperson', 'Stabile Freundschaft',
      'Sport / Bewegung', 'Hobby / Leidenschaft', 'Tier / Haustier',
      'Spirituelle Praxis', 'Künstlerische Begabung', 'Akademische Stärke',
      'Humor / Resilienz', 'Frühere Therapie-Erfahrung',
      'Familie unterstützend', 'Lehrer-Unterstützung', 'Verein / Engagement',
      'Gesunde Ernährung', 'Selbstreflexion ausgeprägt',
    ],
  };

  const COLORS = {
    presenting: { color: '#DC2626', label: '🩺 Presenting Problem' },
    predisposing: { color: '#7C3AED', label: '📜 Predisposing (Vorgeschichte)' },
    precipitating: { color: '#F59E0B', label: '⚡ Precipitating (Auslöser)' },
    perpetuating: { color: '#0EA5E9', label: '🔄 Perpetuating (Aufrechterhaltend)' },
    protective: { color: '#10B981', label: '🛡️ Protective (Schutz)' },
  };

  let state = {
    schuelerId: null,
    formulation: null,
    suggestions: {}, // { presenting: [...], ... }
  };

  // ─── Auto-Tag-Suggestions basierend auf vorhandenen Daten
  function buildSuggestions(schuelerId) {
    const sugg = { presenting: [], predisposing: [], precipitating: [], perpetuating: [], protective: [] };

    // Aus Anamnese
    const s = DB.getSchuelerById(schuelerId);
    if (s?.anamnese) {
      if (s.anamnese.includes('ace_emotional_abuse')) sugg.predisposing.push('ACE: Emotionale Misshandlung');
      if (s.anamnese.includes('ace_physical_abuse')) sugg.predisposing.push('ACE: Körperliche Misshandlung');
      if (s.anamnese.includes('ace_sexual_abuse')) sugg.predisposing.push('ACE: Sexuelle Gewalt');
      if (s.anamnese.includes('ace_emotional_neglect')) sugg.predisposing.push('ACE: Vernachlässigung');
      if (s.anamnese.includes('ace_parent_separation')) sugg.predisposing.push('Trennung der Eltern');
      if (s.anamnese.includes('ace_domestic_violence')) sugg.predisposing.push('ACE: Häusliche Gewalt');
      if (s.anamnese.includes('ace_substance_abuse')) sugg.predisposing.push('Familiäre Suchterkrankung');
      if (s.anamnese.includes('ace_mental_illness')) sugg.predisposing.push('Familiäre psychische Erkrankung');
      if (s.anamnese.includes('schul_mobbing')) sugg.precipitating.push('Mobbing');
      if (s.anamnese.includes('schul_absentismus')) sugg.presenting.push('Schulverweigerung');
      if (s.anamnese.includes('schul_phobie')) sugg.presenting.push('Schulphobie (Trennungsangst)');
      if (s.anamnese.includes('health_chronisch')) sugg.predisposing.push('Chronische Erkrankung');
      if (s.anamnese.includes('fam_pflege')) sugg.predisposing.push('Adoption / Pflege');
      // Neue Domänen
      if (s.anamnese.includes('bind_desorganisiert')) sugg.predisposing.push('Desorganisierte Bindung');
      if (s.anamnese.includes('bind_wechsel')) sugg.predisposing.push('Häufiger Bezugspersonenwechsel');
      if (s.anamnese.includes('bind_ambivalent')) sugg.perpetuating.push('Ambivalentes Bindungsmuster');
      if (s.anamnese.includes('bind_vermeidend')) sugg.perpetuating.push('Vermeidendes Bindungsmuster');
      if (s.anamnese.includes('entw_sprache')) sugg.predisposing.push('Sprachentwicklungsverzögerung');
      if (s.anamnese.includes('entw_autismus_hinweise')) sugg.predisposing.push('ASS-Hinweise');
      if (s.anamnese.includes('subst_cannabis')) sugg.perpetuating.push('Cannabiskonsum (selbstmedikation?)');
      if (s.anamnese.includes('subst_alkohol')) sugg.perpetuating.push('Alkoholkonsum');
      if (s.anamnese.includes('sv_nssi')) sugg.presenting.push('Nicht-suizidale Selbstverletzung');
      if (s.anamnese.includes('sv_suizidgedanken')) sugg.presenting.push('Aktive Suizidgedanken');
      if (s.anamnese.includes('schlaf_einschlaf')) sugg.perpetuating.push('Einschlafstörung');
      if (s.anamnese.includes('schlaf_alptraeume')) sugg.perpetuating.push('Alpträume');
      if (s.anamnese.includes('fam_migration')) sugg.predisposing.push('Migrationshintergrund');
      if (s.anamnese.includes('fam_flucht')) sugg.predisposing.push('Flucht-/Asyl-Erfahrung');
      if (s.anamnese.includes('fam_parentifizierung')) sugg.perpetuating.push('Parentifizierung');
      if (s.anamnese.includes('sex_precocious')) sugg.presenting.push('Sexualisiertes Verhalten (Missbrauchsindikator)');
      if (s.anamnese.includes('sex_gender')) sugg.presenting.push('Geschlechtsinkongruenz');
      if (s.anamnese.includes('legal_jugendgericht')) sugg.perpetuating.push('Jugendgerichtliche Maßnahme');
      // Schutzfaktoren
      if (s.anamnese.includes('bind_bezugsperson_stabil')) sugg.protective.push('Stabile Hauptbezugsperson vorhanden');
      if (s.anamnese.includes('sex_altersgerecht')) sugg.protective.push('Altersgerechte sexuelle Entwicklung');
    }

    // Aus Screenings
    const screenings = DB.getScreenings(schuelerId).filter(x => x.abgeschlossen);
    const latest = screenings.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))[0];
    if (latest?.scores) {
      const phq = latest.scores['phq-a'];
      const gad = latest.scores['gad-7'];
      const pcl = latest.scores['pcl-5'];
      if (phq?.score >= 10) sugg.presenting.push('Depressive Stimmung');
      if (gad?.score >= 10) sugg.presenting.push('Angst / Panik');
      if (pcl?.score >= 33) sugg.presenting.push('Trauma-Symptome');
      if (phq?.flagSuicide) sugg.presenting.push('Suizidgedanken');
    }

    // Aus Helfern → Schutzfaktor
    const helfer = DB.getHelfer(schuelerId);
    if (helfer.length > 0) sugg.protective.push(`${helfer.length} Helfer im Netzwerk`);

    return sugg;
  }

  function load(schuelerId) {
    state.schuelerId = schuelerId;
    state.formulation = DB.getFallformulierung(schuelerId) || DB.createFallformulierung(schuelerId);
    state.suggestions = buildSuggestions(schuelerId);
  }

  function toggleTag(category, tag) {
    if (!state.formulation[category]) state.formulation[category] = [];
    const arr = state.formulation[category];
    const idx = arr.indexOf(tag);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(tag);
    render();
  }

  function setHypothese(text) {
    state.formulation.hypothese = text;
  }

  function autoPopulate(schuelerId) {
    load(schuelerId);
    const sugg = state.suggestions;
    let changed = false;
    Object.keys(sugg).forEach(cat => {
      if (!state.formulation[cat]) state.formulation[cat] = [];
      sugg[cat].forEach(tag => {
        if (!state.formulation[cat].includes(tag)) {
          state.formulation[cat].push(tag);
          changed = true;
        }
      });
    });
    if (changed) {
      state.formulation.autoPopulatedAt = new Date().toISOString();
      DB.saveFallformulierung(state.formulation);
    }
    return changed;
  }

  function save() {
    const text = document.getElementById('fp-hypothese')?.value || '';
    state.formulation.hypothese = text;
    DB.saveFallformulierung(state.formulation);
    showToast('5P-Fallformulierung gespeichert', 'ok');
    Bridge.notify('formulation_saved', { schuelerId: state.schuelerId });
  }

  function render() {
    const container = document.getElementById('dg-content');
    if (!state.schuelerId) {
      container.innerHTML = `
        <div class="dg-section">
          <h2>📐 5P-Fallformulierung</h2>
          <p>Bitte zuerst einen Klienten auswählen (Deep-Link aus CASE).</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="dg-section">
        <h2>📐 5P-Fallformulierung</h2>
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
          Strukturierte Hypothesen-Bildung. Auto-Vorschläge sind aus Anamnese und Screenings abgeleitet —
          klicke an/ab. Eigene Tags via Eingabe unten.
        </p>

        <div class="dg-5p-grid">
          ${Object.entries(COLORS).map(([cat, info]) => {
            const selected = state.formulation[cat] || [];
            const sugg = state.suggestions[cat] || [];
            const allTags = [...new Set([...PRESET_TAGS[cat], ...sugg, ...selected])];
            return `
              <div class="dg-5p-card ${cat}">
                <h3 style="color: ${info.color};">${info.label}</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: var(--space-2); max-height: 240px; overflow-y: auto;">
                  ${allTags.map(tag => {
                    const isSelected = selected.includes(tag);
                    const isSugg = sugg.includes(tag) && !isSelected;
                    return `
                      <button
                        onclick="FivePModel.toggleTag('${cat}', ${JSON.stringify(tag).replace(/"/g, '&quot;')})"
                        style="font-size: 11px; padding: 4px 8px; border-radius: var(--radius-full); cursor: pointer;
                          background: ${isSelected ? info.color : (isSugg ? '#FEF3C7' : 'var(--bg-subtle)')};
                          color: ${isSelected ? '#fff' : 'var(--text)'};
                          border: 1px solid ${isSelected ? info.color : (isSugg ? '#F59E0B' : 'var(--border)')};
                        ">
                        ${isSelected ? '✓ ' : (isSugg ? '💡 ' : '+ ')}${Utils.escapeHtml(tag)}
                      </button>
                    `;
                  }).join('')}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="+ Eigener Tag, Enter zum Hinzufügen"
                    style="width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px;"
                    onkeydown="if(event.key==='Enter' && this.value.trim()) { FivePModel.toggleTag('${cat}', this.value.trim()); this.value=''; }"
                  >
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="margin-top: var(--space-5);">
          <h3>🎯 Integrative Hypothese (Synthese)</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: var(--space-2);">
            Verbinde die 5 P zu einer kohärenten Erzählung: Wie hängen Auslöser, Vorgeschichte und Aufrechterhaltung zusammen?
          </p>
          <textarea id="fp-hypothese" rows="6" style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit; font-size: 14px;">${Utils.escapeHtml(state.formulation.hypothese || '')}</textarea>
        </div>

        <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
          <button class="btn btn-primary" onclick="FivePModel.save()">💾 Speichern</button>
          <button class="btn" onclick="setTab('hypothesen')">→ Hypothesen-Übersicht</button>
        </div>
      </div>
    `;
  }

  return { render, load, toggleTag, save, autoPopulate, PRESET_TAGS, COLORS };
})();
