/* ============================================================
   CASE — Profil View
   ============================================================
   Detailansicht eines Klienten mit Tabs:
   - Stammdaten (Name, Klasse, Notizen, Diagnosen, Medikation)
   - Anamnese (mit ACE-Score)
   - Helfer (professionelles Netzwerk)
   - Konferenzen (Hilfeplan)
   - Kontakte (Kontakt-Log)
   - DSGVO (Datenauskunft)
   ============================================================ */

const ProfilView = (function () {
  let activeTab = 'stamm';

  // ─── Anamnese-Items (ACE & weitere) ────────────────────────
  // Vollständige klinische Anamnese für KJP-Standard
  // ACE: Felitti et al. (1998). Weitere Domänen: AACAP Practice Parameters,
  // NICE Guidelines CG28, S3-Leitlinie Diagnostik psychischer Störungen im Kindes- und Jugendalter
  const ANAMNESE_ITEMS = {
    ace: {
      label: '⚠️ ACE — Adverse Childhood Experiences (Felitti et al. 1998)',
      items: [
        { id: 'ace_emotional_abuse', label: 'Emotionale Misshandlung' },
        { id: 'ace_physical_abuse', label: 'Körperliche Misshandlung' },
        { id: 'ace_sexual_abuse', label: 'Sexuelle Gewalt' },
        { id: 'ace_emotional_neglect', label: 'Emotionale Vernachlässigung' },
        { id: 'ace_physical_neglect', label: 'Körperliche Vernachlässigung' },
        { id: 'ace_parent_separation', label: 'Trennung der Eltern' },
        { id: 'ace_domestic_violence', label: 'Häusliche Gewalt erlebt' },
        { id: 'ace_substance_abuse', label: 'Suchtmittelmissbrauch in der Familie' },
        { id: 'ace_mental_illness', label: 'Psychische Erkrankung in der Familie' },
        { id: 'ace_incarceration', label: 'Inhaftierung eines Familienmitglieds' },
      ],
    },
    bindung: {
      label: '🔗 Bindung & frühe Beziehungen (Bowlby 1969, Ainsworth 1978)',
      items: [
        { id: 'bind_fruehe_trennung', label: 'Frühe Trennung von Bezugsperson (< 3 Jahre)' },
        { id: 'bind_bezugsperson_stabil', label: 'Stabile Hauptbezugsperson vorhanden' },
        { id: 'bind_wechsel', label: 'Häufiger Wechsel der Bezugsperson(en)' },
        { id: 'bind_hospitalismus', label: 'Frühe Hospitalisierung (> 2 Wochen als Kleinkind)' },
        { id: 'bind_adoption', label: 'Adoption' },
        { id: 'bind_ambivalent', label: 'Klammerndes / anklammernd-ambivalentes Verhalten' },
        { id: 'bind_vermeidend', label: 'Kontaktvermeidendes / distanziertes Verhalten' },
        { id: 'bind_desorganisiert', label: 'Widersprüchliches Bindungsverhalten (Nähe suchen + abstoßen)' },
      ],
    },
    entwicklung: {
      label: '🧒 Entwicklungsgeschichte',
      items: [
        { id: 'entw_fruehgeburt', label: 'Frühgeburt (< 37. SSW)' },
        { id: 'entw_komplikationen', label: 'Perinatale Komplikationen' },
        { id: 'entw_motorik', label: 'Verzögerte motorische Entwicklung' },
        { id: 'entw_sprache', label: 'Verzögerte Sprachentwicklung' },
        { id: 'entw_sauberkeit', label: 'Verzögerte Sauberkeitsentwicklung (Enuresis/Enkopresis)' },
        { id: 'entw_regression', label: 'Entwicklungsrückschritte (Regression)' },
        { id: 'entw_autismus_hinweise', label: 'Hinweise auf ASS (eingeschränkte Interaktion, stereotype Verhaltensweisen)' },
      ],
    },
    family: {
      label: '👨‍👩‍👧 Familienstruktur',
      items: [
        { id: 'fam_alleinerziehend', label: 'Alleinerziehend aufgewachsen' },
        { id: 'fam_pflege', label: 'Pflegefamilie' },
        { id: 'fam_heim', label: 'Heim / Wohngruppe' },
        { id: 'fam_geschwister', label: 'Geschwister-Konflikte' },
        { id: 'fam_patchwork', label: 'Patchwork-Familie (Stiefeltern)' },
        { id: 'fam_parentifizierung', label: 'Parentifizierung (Kind übernimmt Elternrolle)' },
        { id: 'fam_migration', label: 'Migrationshintergrund' },
        { id: 'fam_flucht', label: 'Flucht- / Asyl-Erfahrung' },
        { id: 'fam_armut', label: 'Finanzielle Belastung / Armut' },
      ],
    },
    schule: {
      label: '🏫 Schulische Erfahrungen',
      items: [
        { id: 'schul_absentismus', label: 'Schulabsentismus (> 5 Tage/Monat)' },
        { id: 'schul_phobie', label: 'Schulphobie (Trennungsangst morgens)' },
        { id: 'schul_angst', label: 'Schulangst (Leistungs-/Sozialangst)' },
        { id: 'schul_verweigerung', label: 'Schulverweigerung (oppositionell)' },
        { id: 'schul_mobbing', label: 'Mobbing erlebt (auch Cybermobbing)' },
        { id: 'schul_wechsel', label: 'Mehrfache Schulwechsel (≥ 2)' },
        { id: 'schul_klassenwiederholung', label: 'Klasse wiederholt' },
        { id: 'schul_sonderpaedagogik', label: 'Sonderpädagogischer Förderbedarf' },
        { id: 'schul_hochbegabung', label: 'Hochbegabung (diagnostiziert)' },
      ],
    },
    substanzen: {
      label: '🌿 Substanzkonsum (CRAFFT-Screening empfohlen ab 12J)',
      items: [
        { id: 'subst_alkohol', label: 'Alkoholkonsum (regelmäßig)' },
        { id: 'subst_cannabis', label: 'Cannabiskonsum' },
        { id: 'subst_nikotin', label: 'Nikotinkonsum (auch E-Zigarette)' },
        { id: 'subst_andere', label: 'Andere Substanzen (Amphetamine, MDMA, Opioide)' },
        { id: 'subst_medikamente', label: 'Medikamentenmissbrauch (Benzodiazepine, Opioide)' },
        { id: 'subst_entzug', label: 'Entzugssymptome berichtet' },
      ],
    },
    selbstverletzung: {
      label: '🩸 Selbstverletzung & Suizidalität',
      items: [
        { id: 'sv_nssi', label: 'Nicht-suizidale Selbstverletzung (NSSI) — aktuell' },
        { id: 'sv_nssi_vergangenheit', label: 'NSSI in der Vergangenheit' },
        { id: 'sv_suizidversuch', label: 'Suizidversuch in der Vorgeschichte' },
        { id: 'sv_suizidgedanken', label: 'Aktive Suizidgedanken (aktuell)' },
        { id: 'sv_passive_todesgedanken', label: 'Passive Todesgedanken ("wäre besser tot")' },
        { id: 'sv_familiaer', label: 'Suizid oder Suizidversuch in der Familie' },
      ],
    },
    schlaf: {
      label: '😴 Schlaf & Zirkadianrhythmus',
      items: [
        { id: 'schlaf_einschlaf', label: 'Einschlafprobleme (> 30 Min.)' },
        { id: 'schlaf_durchschlaf', label: 'Durchschlafstörung' },
        { id: 'schlaf_alptraeume', label: 'Häufige Alpträume / Nachtangst' },
        { id: 'schlaf_dauer', label: 'Zu wenig Schlaf (< 7h bei Jugendlichen)' },
        { id: 'schlaf_tags', label: 'Ausgeprägte Tagesmüdigkeit' },
        { id: 'schlaf_rhythm', label: 'Verschobener Schlaf-Wach-Rhythmus (spät ein / spät auf)' },
      ],
    },
    gesundheit: {
      label: '💊 Somatik & Medikation',
      items: [
        { id: 'health_chronisch', label: 'Chronische Erkrankung' },
        { id: 'health_behinderung', label: 'Körperliche / geistige Behinderung' },
        { id: 'health_medikation', label: 'Aktuelle Medikation (Psychopharmaka)' },
        { id: 'health_ssri', label: 'SSRI / Antidepressiva' },
        { id: 'health_methylphenidat', label: 'Methylphenidat / Stimulanzien (ADHS)' },
        { id: 'health_neuroleptika', label: 'Antipsychotika / Neuroleptika' },
        { id: 'health_kopfschmerzen', label: 'Häufige Kopfschmerzen / Migräne' },
        { id: 'health_bauchschmerzen', label: 'Häufige Bauchschmerzen (funktionell)' },
        { id: 'health_allergien', label: 'Allergien / Asthma' },
      ],
    },
    sexualitaet: {
      label: '🌈 Sexuelle Entwicklung & Identität',
      items: [
        { id: 'sex_altersgerecht', label: 'Altersgerechte sexuelle Entwicklung' },
        { id: 'sex_precocious', label: 'Sexualisiertes Verhalten (altersuntypisch) — Missbrauchsindikator' },
        { id: 'sex_gender', label: 'Geschlechtsinkongruenz / Gender-Dysphorie' },
        { id: 'sex_outing', label: 'Outing-Prozess (LGBTQ+)' },
        { id: 'sex_beziehung', label: 'Erste Liebesbeziehung / Trennungserfahrung' },
      ],
    },
    legal: {
      label: '⚖️ Rechtliches & Jugendhilfe',
      items: [
        { id: 'legal_jugendgericht', label: 'Jugendgericht / Bewährung' },
        { id: 'legal_polizei', label: 'Polizeikontakt (als Täter)' },
        { id: 'legal_opfer', label: 'Opfer einer Straftat (Anzeige erstattet)' },
        { id: 'legal_sorgerecht', label: 'Sorgerechtsentzug / -einschränkung' },
        { id: 'legal_one', label: 'ONE (Office National de l\'Enfance) involviert' },
        { id: 'legal_schutzmaßnahme', label: 'Laufende Schutzmaßnahme' },
      ],
    },
  };

  function aceScore(anamnese) {
    if (!Array.isArray(anamnese)) return 0;
    return anamnese.filter(id => id.startsWith('ace_')).length;
  }

  function aceFlag(score) {
    if (score >= 4) return { color: 'var(--danger)', label: 'Hoch — erhöhtes Risiko' };
    if (score >= 1) return { color: 'var(--accent)', label: 'Belastet' };
    return { color: '#10B981', label: 'Niedrig' };
  }

  // ─── Tab: Stammdaten ───────────────────────────────────────
  function renderStammTab(s) {
    const fields = [
      ['Vorname', s.vorname], ['Nachname', s.nachname],
      ['Geburtsdatum', s.geburtsdatum ? Utils.formatDate(s.geburtsdatum) : '—'],
      ['Klasse', s.klasse || '—'],
      ['Eintrittsdatum', s.eintrittsdatum ? Utils.formatDate(s.eintrittsdatum) : '—'],
      ['Risiko', s.risiko || 'niedrig'],
      ['Sorgerecht', s.sorgerecht || '—'],
      ['Schweigepflicht', s.schweigepflichtStatus || 'standard'],
    ];
    return `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">Stammdaten</div>
          <button class="btn" onclick="openSchuelerModal('${s.id}')">Bearbeiten</button>
        </div>
        <div class="pw-grid" style="grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
          ${fields.map(([k, v]) => `
            <div>
              <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">${k}</div>
              <div style="font-size: var(--text-md); margin-top: 2px;">${Utils.escapeHtml(v) || '—'}</div>
            </div>
          `).join('')}
        </div>
        ${s.allgemeineNotizen ? `
          <div style="margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--border);">
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-2);">NOTIZEN</div>
            <div style="white-space: pre-wrap; line-height: var(--line-height-relaxed);">${Utils.escapeHtml(s.allgemeineNotizen)}</div>
          </div>
        ` : ''}
      </div>

      ${(s.diagnosen?.length || 0) > 0 ? `
        <div class="pw-section">
          <div class="pw-section-title">🩺 Diagnosen</div>
          <div class="pw-list" style="margin-top: var(--space-2);">
            ${s.diagnosen.map(d => `
              <div class="pw-list-item">
                <div><strong>${Utils.escapeHtml(d.icd || '?')}</strong> — ${Utils.escapeHtml(d.label || '')}</div>
                <div style="color: var(--text-muted); font-size: var(--text-sm);">${d.diagnostiziertAm ? Utils.formatDate(d.diagnostiziertAm) : ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${(s.medikation?.length || 0) > 0 ? `
        <div class="pw-section">
          <div class="pw-section-title">💊 Medikation</div>
          <div class="pw-list" style="margin-top: var(--space-2);">
            ${s.medikation.map(m => `
              <div class="pw-list-item">
                <div><strong>${Utils.escapeHtml(m.name || '?')}</strong>${m.dosierung ? ' — ' + Utils.escapeHtml(m.dosierung) : ''}</div>
                <div style="color: var(--text-muted); font-size: var(--text-sm);">${Utils.escapeHtml(m.arzt || '')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  // ─── Tab: Anamnese ──────────────────────────────────────────
  function renderAnamneseTab(s) {
    const aktuell = new Set(s.anamnese || []);
    const ace = aceScore(s.anamnese || []);
    const flag = aceFlag(ace);

    return `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">Anamnese</div>
          <button class="btn btn-primary" onclick="ProfilView.saveAnamnese('${s.id}')">Speichern</button>
        </div>

        <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: var(--space-4); margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">ACE Score</div>
              <div style="font-size: var(--text-3xl); font-weight: var(--font-weight-bold); color: ${flag.color};">${ace}/10</div>
              <div style="font-size: var(--text-sm); color: var(--text-secondary);">${flag.label}</div>
            </div>
            <div style="font-size: var(--text-xs); color: var(--text-muted); text-align: right; max-width: 280px;">
              Adverse Childhood Experiences: ein höherer Score (≥4) ist mit erhöhtem Risiko für Depression, Sucht und chronische Erkrankungen verbunden (Felitti et al., 1998).
            </div>
          </div>
        </div>

        ${Object.entries(ANAMNESE_ITEMS).map(([catId, cat]) => `
          <div style="margin-bottom: var(--space-5);">
            <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2);">${cat.label}</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2);">
              ${cat.items.map(it => `
                <label style="display: flex; gap: var(--space-2); align-items: center; padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer;">
                  <input type="checkbox" data-anamnese="${it.id}" ${aktuell.has(it.id) ? 'checked' : ''}>
                  <span>${Utils.escapeHtml(it.label)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function saveAnamnese(schuelerId) {
    const checked = Array.from(document.querySelectorAll('[data-anamnese]:checked')).map(el => el.dataset.anamnese);
    DB.updateSchueler(schuelerId, { anamnese: checked });
    showToast('Anamnese gespeichert', 'ok');
    Bridge.notify('schueler_updated', { schuelerId });
    render(schuelerId);
  }

  // ─── Tab: Helfer-Netzwerk (Manifest: interaktive Karte + Beziehungsqualität) ──
  const BEZ_QUALITAET = {
    eng:        { icon: '💚', label: 'Eng', farbe: '#10B981' },
    neutral:    { icon: '🔵', label: 'Neutral', farbe: '#3B82F6' },
    distanziert:{ icon: '🟡', label: 'Distanziert', farbe: '#F59E0B' },
    konflikt:   { icon: '🔴', label: 'Konflikt', farbe: '#DC2626' },
  };

  const HELFER_KATEGORIEN = [
    { id: 'familie', label: '👨‍👩‍👧 Familie', rollen: ['Mutter', 'Vater', 'Stiefvater', 'Stiefmutter', 'Großeltern', 'Geschwister', 'Pflegeeltern'] },
    { id: 'schule', label: '🏫 Schule', rollen: ['Klassenlehrer', 'Schulpsychologe', 'SePAS', 'Direktor', 'SSE-Koordinator'] },
    { id: 'medizin', label: '🏥 Medizin/Therapie', rollen: ['Psychiater', 'Kinderarzt', 'Therapeut', 'Logopäde', 'Ergotherapeut'] },
    { id: 'sozial', label: '🤝 Soziale Dienste', rollen: ['SCAS', 'ONE', 'SSM', 'Jugendgericht', 'Vormund'] },
    { id: 'freizeit', label: '⚽ Freizeit/Sonstige', rollen: ['Trainer', 'Mentor', 'Nachbar', 'Freund', 'Seelsorger'] },
  ];

  function renderHelferTab(s) {
    const helfer = DB.getHelfer(s.id);

    // Gruppieren nach Kategorie
    const gruppen = {};
    HELFER_KATEGORIEN.forEach(k => gruppen[k.id] = []);
    helfer.forEach(h => {
      const kat = h.kategorie || 'freizeit';
      if (!gruppen[kat]) gruppen[kat] = [];
      gruppen[kat].push(h);
    });

    // Wer braucht ein Update? (>30 Tage seit letztem Kontakt)
    const brauchtUpdate = helfer.filter(h => {
      if (!h.letzterKontakt) return true;
      const tage = Utils.daysBetween(h.letzterKontakt, new Date().toISOString());
      return tage > 30;
    });

    return `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">Helfer-Netzwerk (${helfer.length})</div>
          <button class="btn btn-primary" onclick="ProfilView.addHelfer('${s.id}')">+ Helfer hinzufügen</button>
        </div>

        ${brauchtUpdate.length > 0 ? `
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: var(--radius-sm); padding: var(--space-3); margin-bottom: var(--space-4); font-size: 14px;">
            ⚠️ <strong>${brauchtUpdate.length} Kontakt(e)</strong> seit über 30 Tagen ohne Update:
            ${brauchtUpdate.slice(0, 3).map(h => Utils.escapeHtml(h.name)).join(', ')}${brauchtUpdate.length > 3 ? '…' : ''}
          </div>
        ` : ''}

        ${helfer.length === 0
          ? `<div class="pw-empty"><div class="pw-empty-icon">🤝</div><p>Noch kein Helfer eingetragen.</p></div>`
          : HELFER_KATEGORIEN.map(kat => {
              const items = gruppen[kat.id] || [];
              if (!items.length) return '';
              return `
                <div style="margin-bottom: var(--space-4);">
                  <h3 style="font-size: 15px; margin-bottom: var(--space-2);">${kat.label}</h3>
                  <div class="hub-helfer-grid">
                    ${items.map(h => {
                      const bez = BEZ_QUALITAET[h.beziehung || 'neutral'];
                      const tage = h.letzterKontakt ? Utils.daysBetween(h.letzterKontakt, new Date().toISOString()) : null;
                      const altKontakt = tage !== null && tage > 30;
                      return `
                        <div class="hub-helfer-card" style="border-left: 4px solid ${bez.farbe};">
                          <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                              <div style="font-weight: var(--font-weight-semibold);">${Utils.escapeHtml(h.name || '?')}</div>
                              <div style="font-size: 13px; color: var(--text-muted);">${Utils.escapeHtml(h.rolle || '')}</div>
                            </div>
                            <div style="display: flex; gap: 4px;">
                              <span title="Beziehungsqualität: ${bez.label}" style="font-size: 16px;">${bez.icon}</span>
                              <button class="pw-btn-icon" onclick="ProfilView.editHelfer('${h.id}','${s.id}')" title="Bearbeiten" style="font-size: 12px;">✏️</button>
                              <button class="pw-btn-icon" onclick="ProfilView.deleteHelfer('${h.id}','${s.id}')" title="Löschen" style="font-size: 12px;">🗑️</button>
                            </div>
                          </div>
                          <div style="font-size: 12px; color: var(--text-muted); margin-top: var(--space-2);">
                            ${h.institution ? Utils.escapeHtml(h.institution) + ' · ' : ''}
                            ${h.telefon ? '☎ ' + Utils.escapeHtml(h.telefon) + ' · ' : ''}
                            ${h.email ? '✉ ' + Utils.escapeHtml(h.email) : ''}
                          </div>
                          <div style="display: flex; justify-content: space-between; margin-top: var(--space-2); font-size: 12px;">
                            <span style="color: ${altKontakt ? '#DC2626' : 'var(--text-muted)'};">
                              ${tage !== null ? (altKontakt ? `⚠️ ${tage}d ohne Kontakt` : `Kontakt vor ${tage}d`) : 'Kein Kontakt notiert'}
                            </span>
                            <span>${h.informiert ? '✓ informiert' : ''}</span>
                          </div>
                          ${h.notiz ? `<div style="font-size: 12px; font-style: italic; color: var(--text-secondary); margin-top: var(--space-1); padding-top: var(--space-1); border-top: 1px solid var(--border);">${Utils.escapeHtml(Utils.truncate(h.notiz, 80))}</div>` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')
        }
      </div>
    `;
  }

  function addHelfer(schuelerId) {
    const container = document.getElementById('view-container');
    const formHtml = `
      <div class="pw-section">
        <h2>Neuer Helfer</h2>
        <div class="pw-form-row"><label>Name *<input id="hf-name" required></label><label>Rolle<input id="hf-rolle" placeholder="z.B. Psychiater"></label></div>
        <div class="pw-form-row">
          <label>Kategorie
            <select id="hf-kategorie">
              ${HELFER_KATEGORIEN.map(k => `<option value="${k.id}">${k.label}</option>`).join('')}
            </select>
          </label>
          <label>Beziehungsqualität
            <select id="hf-beziehung">
              ${Object.entries(BEZ_QUALITAET).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="pw-form-row"><label>Institution<input id="hf-institution" placeholder="z.B. CHNP"></label><label>Telefon<input id="hf-telefon"></label></div>
        <div class="pw-form-row"><label>E-Mail<input id="hf-email" type="email"></label><label>Letzter Kontakt<input id="hf-kontakt" type="date" value="${new Date().toISOString().split('T')[0]}"></label></div>
        <label>Notiz<textarea id="hf-notiz" rows="2"></textarea></label>
        <div style="margin-top: var(--space-3); display: flex; gap: var(--space-2);">
          <button class="btn btn-primary" onclick="ProfilView.saveNewHelfer('${schuelerId}')">Speichern</button>
          <button class="btn" onclick="ProfilView.render('${schuelerId}')">Abbrechen</button>
        </div>
      </div>
    `;
    container.innerHTML = formHtml;
    setTimeout(() => document.getElementById('hf-name').focus(), 50);
  }

  function saveNewHelfer(schuelerId) {
    const name = document.getElementById('hf-name').value.trim();
    if (!name) { showToast('Name ist Pflicht', 'error'); return; }
    DB.addHelfer({
      schuelerId,
      name,
      rolle: document.getElementById('hf-rolle').value.trim(),
      kategorie: document.getElementById('hf-kategorie').value,
      beziehung: document.getElementById('hf-beziehung').value,
      institution: document.getElementById('hf-institution').value.trim(),
      telefon: document.getElementById('hf-telefon').value.trim(),
      email: document.getElementById('hf-email').value.trim(),
      letzterKontakt: document.getElementById('hf-kontakt').value || null,
      notiz: document.getElementById('hf-notiz').value.trim(),
      informiert: false,
    });
    showToast('Helfer hinzugefügt', 'ok');
    activeTab = 'helfer';
    render(schuelerId);
  }

  function editHelfer(helferId, schuelerId) {
    const h = DB.getHelfer(schuelerId).find(x => x.id === helferId);
    if (!h) return;
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="pw-section">
        <h2>Helfer bearbeiten</h2>
        <div class="pw-form-row"><label>Name *<input id="hf-name" value="${Utils.escapeHtml(h.name || '')}"></label><label>Rolle<input id="hf-rolle" value="${Utils.escapeHtml(h.rolle || '')}"></label></div>
        <div class="pw-form-row">
          <label>Kategorie
            <select id="hf-kategorie">
              ${HELFER_KATEGORIEN.map(k => `<option value="${k.id}" ${h.kategorie === k.id ? 'selected' : ''}>${k.label}</option>`).join('')}
            </select>
          </label>
          <label>Beziehungsqualität
            <select id="hf-beziehung">
              ${Object.entries(BEZ_QUALITAET).map(([k, v]) => `<option value="${k}" ${h.beziehung === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="pw-form-row"><label>Institution<input id="hf-institution" value="${Utils.escapeHtml(h.institution || '')}"></label><label>Telefon<input id="hf-telefon" value="${Utils.escapeHtml(h.telefon || '')}"></label></div>
        <div class="pw-form-row"><label>E-Mail<input id="hf-email" value="${Utils.escapeHtml(h.email || '')}"></label><label>Letzter Kontakt<input id="hf-kontakt" type="date" value="${h.letzterKontakt || ''}"></label></div>
        <label>Notiz<textarea id="hf-notiz" rows="2">${Utils.escapeHtml(h.notiz || '')}</textarea></label>
        <label style="display: flex; gap: var(--space-2); align-items: center; margin-top: var(--space-2);"><input type="checkbox" id="hf-informiert" ${h.informiert ? 'checked' : ''}> Ist über den Fall informiert</label>
        <div style="margin-top: var(--space-3); display: flex; gap: var(--space-2);">
          <button class="btn btn-primary" onclick="ProfilView.saveEditHelfer('${helferId}','${schuelerId}')">Speichern</button>
          <button class="btn" onclick="ProfilView.render('${schuelerId}')">Abbrechen</button>
        </div>
      </div>
    `;
  }

  function saveEditHelfer(helferId, schuelerId) {
    const name = document.getElementById('hf-name').value.trim();
    if (!name) { showToast('Name ist Pflicht', 'error'); return; }
    DB.updateHelfer(helferId, {
      name,
      rolle: document.getElementById('hf-rolle').value.trim(),
      kategorie: document.getElementById('hf-kategorie').value,
      beziehung: document.getElementById('hf-beziehung').value,
      institution: document.getElementById('hf-institution').value.trim(),
      telefon: document.getElementById('hf-telefon').value.trim(),
      email: document.getElementById('hf-email').value.trim(),
      letzterKontakt: document.getElementById('hf-kontakt').value || null,
      notiz: document.getElementById('hf-notiz').value.trim(),
      informiert: document.getElementById('hf-informiert').checked,
    });
    showToast('Helfer aktualisiert', 'ok');
    activeTab = 'helfer';
    render(schuelerId);
  }

  function deleteHelfer(id, schuelerId) {
    if (!confirm('Helfer löschen?')) return;
    DB.deleteHelfer(id);
    render(schuelerId);
  }

  // ─── Tab: Konferenzen ──────────────────────────────────────
  function renderKonferenzenTab(s) {
    const konferenzen = DB.getKonferenzen(s.id).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    return `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">Hilfeplan-Konferenzen</div>
          <button class="btn btn-primary" onclick="ProfilView.addKonferenz('${s.id}')">+ Konferenz</button>
        </div>
        ${konferenzen.length === 0
          ? `<div class="pw-empty"><div class="pw-empty-icon">🤝</div><p>Noch keine Konferenz dokumentiert.</p></div>`
          : `<div class="pw-list">${konferenzen.map(k => `
              <details class="pw-list-item" style="flex-direction: column; align-items: stretch;">
                <summary style="display: flex; justify-content: space-between; cursor: pointer;">
                  <strong>${Utils.escapeHtml(k.titel || 'Hilfeplankonferenz')}</strong>
                  <span style="color: var(--text-muted); font-size: var(--text-sm);">${k.datum ? Utils.formatDate(k.datum) : ''}</span>
                </summary>
                ${k.teilnehmer ? `<div style="font-size: var(--text-sm); margin-top: var(--space-2);"><strong>Teilnehmer:</strong> ${Utils.escapeHtml(k.teilnehmer)}</div>` : ''}
                ${k.themen ? `<div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;"><strong>Themen:</strong> ${Utils.escapeHtml(k.themen)}</div>` : ''}
                ${k.beschluesse ? `<div style="font-size: var(--text-sm); margin-top: 4px; padding: var(--space-2); background: var(--bg-subtle); border-radius: var(--radius-sm);"><strong>Beschlüsse:</strong> ${Utils.escapeHtml(k.beschluesse)}</div>` : ''}
                ${k.naechsterTermin ? `<div style="font-size: var(--text-xs); color: var(--color-app-hub); margin-top: 4px;">📅 Nächster Termin: ${Utils.formatDate(k.naechsterTermin)}</div>` : ''}
              </details>`).join('')}</div>`
        }
      </div>
    `;
  }

  async function addKonferenz(schuelerId) {
    const helfer = DB.getHelfer(schuelerId);
    const data = await Utils.modalForm({
      title: 'Neue Konferenz dokumentieren',
      fields: [
        { id: 'datum', label: 'Datum', type: 'date', value: Utils.today(), required: true },
        { id: 'titel', label: 'Titel', value: 'Hilfeplankonferenz', required: true },
        { id: 'teilnehmer', label: 'Teilnehmer', placeholder: 'z.B. Mutter, Lehrerin, SCAS-Berater' },
        { id: 'themen', label: 'Hauptthemen / Agenda', type: 'textarea', placeholder: 'Was wurde besprochen?' },
        { id: 'beschluesse', label: 'Beschlüsse / Folge-Aktionen', type: 'textarea', placeholder: 'Wer macht was bis wann?' },
        { id: 'naechsterTermin', label: 'Nächster Termin', type: 'date' },
      ],
    });
    if (!data) return;
    DB.addKonferenz({ schuelerId, ...data });
    showToast('Konferenz dokumentiert', 'ok');
    render(schuelerId);
  }

  // ─── Tab: Konferenz-Modus (Manifest: projektorfähig) ────────
  function renderKonferenzModus(s) {
    const fullName = `${s.vorname || ''} ${s.nachname || ''}`.trim();
    const screenings = DB.getScreenings(s.id).filter(x => x.abgeschlossen).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    const latest = screenings[0];
    const scores = latest?.scores || {};
    const roadmap = DB.getRoadmap(s.id);
    const aktivePhase = roadmap?.phasen?.find(p => p.status === 'aktiv');
    const sitzungen = DB.getNotizen(s.id).filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    const helfer = DB.getHelfer(s.id);
    const risiko = DB.getRisiko(s.id).sort((a, b) => b.datum.localeCompare(a.datum));
    const ff = DB.getFallformulierung(s.id);
    const aceCount = (s.anamnese || []).filter(id => id.startsWith('ace_')).length;
    const konferenzen = DB.getKonferenzen(s.id).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

    // ORS-Trend letzte 5
    const orsTrend = sitzungen.slice(0, 5).reverse().map(n => n.soap?.ors_total).filter(v => v !== undefined);
    const srsTrend = sitzungen.slice(0, 5).reverse().map(n => n.soap?.srs_total).filter(v => v !== undefined);

    return `
      <div class="hub-konferenz-modus">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
          <div>
            <h2 style="font-size: 28px; margin: 0;">🖥️ Fallkonferenz: ${Utils.escapeHtml(fullName)}</h2>
            <div style="color: var(--text-muted); font-size: 14px;">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <button class="btn btn-primary" onclick="window.print()">🖨️ Drucken</button>
        </div>

        <div class="hub-konf-grid">
          <!-- Spalte 1: Stammdaten + Risiko -->
          <div class="hub-konf-block">
            <h3>👤 Stammdaten</h3>
            <table class="hub-konf-table">
              <tr><td>Name</td><td><strong>${Utils.escapeHtml(fullName)}</strong></td></tr>
              <tr><td>Geburtsdatum</td><td>${s.geburtsdatum ? Utils.formatDate(s.geburtsdatum) : '—'}</td></tr>
              <tr><td>Klasse</td><td>${Utils.escapeHtml(s.klasse || '—')}</td></tr>
              <tr><td>Eintritt</td><td>${s.eintrittsdatum ? Utils.formatDate(s.eintrittsdatum) : '—'}</td></tr>
              <tr><td>ACE-Score</td><td><strong style="color: ${aceCount >= 4 ? 'var(--danger)' : 'var(--text)'};">${aceCount}/10</strong></td></tr>
              <tr><td>Sitzungen</td><td>${sitzungen.length}</td></tr>
            </table>
          </div>

          <!-- Spalte 2: Aktuelle Lage -->
          <div class="hub-konf-block">
            <h3>📊 Aktuelle Lage</h3>
            ${aktivePhase ? `<div class="hub-konf-highlight">Phase ${aktivePhase.nr} · ${aktivePhase.themen?.join(', ') || 'Keine Themen'}</div>` : '<div style="color: var(--text-muted);">Keine aktive Phase</div>'}
            ${risiko.length > 0 ? `
              <div style="margin-top: var(--space-2);">
                Risiko: <strong style="color: ${risiko[0].werte && Object.values(risiko[0].werte).includes('rot') ? '#DC2626' : Object.values(risiko[0].werte || {}).includes('gelb') ? '#F59E0B' : '#10B981'};">
                  ${Object.values(risiko[0].werte || {}).includes('rot') ? 'ROT' : Object.values(risiko[0].werte || {}).includes('gelb') ? 'GELB' : 'GRÜN'}
                </strong> seit ${Utils.formatDate(risiko[0].datum, { short: true })}
              </div>
            ` : ''}

            <h4 style="margin-top: var(--space-3);">Screening-Scores</h4>
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              ${Object.entries(scores).map(([id, val]) => `
                <span style="padding: 4px 10px; background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: 13px;">
                  <strong>${id.toUpperCase()}</strong>: ${val.score}/${val.max}
                </span>
              `).join('') || '<span style="color: var(--text-muted);">Keine Screenings</span>'}
            </div>
          </div>

          <!-- Spalte 3: Verlauf (ORS/SRS) -->
          <div class="hub-konf-block">
            <h3>📈 Verlauf (letzte 5 Sitzungen)</h3>
            ${orsTrend.length > 0 ? `
              <div style="margin-bottom: var(--space-2);">
                <strong>ORS:</strong> ${orsTrend.map(v => v.toFixed(1)).join(' → ')}
                <span style="color: ${orsTrend.at(-1) > orsTrend[0] ? '#10B981' : '#DC2626'};">
                  ${orsTrend.at(-1) > orsTrend[0] ? '↑' : orsTrend.at(-1) < orsTrend[0] ? '↓' : '→'}
                </span>
              </div>
            ` : ''}
            ${srsTrend.length > 0 ? `
              <div>
                <strong>SRS:</strong> ${srsTrend.map(v => v.toFixed(1)).join(' → ')}
                <span style="color: ${srsTrend.at(-1) >= 25 ? '#10B981' : '#DC2626'};">
                  ${srsTrend.at(-1) >= 25 ? '(Allianz stabil)' : '(Allianz fragil)'}
                </span>
              </div>
            ` : '<div style="color: var(--text-muted);">Keine ORS/SRS-Daten</div>'}
          </div>

          <!-- Spalte 4: Helfer-Netzwerk -->
          <div class="hub-konf-block">
            <h3>🤝 Helfer-Netzwerk (${helfer.length})</h3>
            ${helfer.length > 0 ? `
              <table class="hub-konf-table">
                ${helfer.map(h => `
                  <tr>
                    <td><strong>${Utils.escapeHtml(h.name || '?')}</strong></td>
                    <td>${Utils.escapeHtml(h.rolle || '')}</td>
                    <td>${h.informiert ? '✓' : '—'}</td>
                  </tr>
                `).join('')}
              </table>
            ` : '<div style="color: var(--text-muted);">Keine Helfer</div>'}
          </div>
        </div>

        ${ff ? `
          <div class="hub-konf-block" style="margin-top: var(--space-4);">
            <h3>📐 5P-Fallformulierung</h3>
            <div class="hub-konf-5p">
              ${['predisposing', 'precipitating', 'perpetuating', 'protective', 'presenting'].map(p => `
                <div class="hub-konf-5p-item">
                  <div class="hub-konf-5p-label">${p.charAt(0).toUpperCase() + p.slice(1)}</div>
                  <div>${Utils.escapeHtml(ff[p] || '—')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="hub-konf-block" style="margin-top: var(--space-4);">
          <h3>📝 Konferenz-Notizen</h3>
          <textarea id="konf-notizen" rows="6" placeholder="Notizen während der Konferenz eingeben..." style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit; font-size: 15px;"></textarea>
          <div style="margin-top: var(--space-2); display: flex; gap: var(--space-2);">
            <button class="btn btn-primary" onclick="ProfilView.saveKonferenzNotizen('${s.id}')">💾 Als Konferenz speichern</button>
          </div>
        </div>
      </div>
    `;
  }

  function saveKonferenzNotizen(schuelerId) {
    const notizen = document.getElementById('konf-notizen')?.value?.trim();
    if (!notizen) { showToast('Keine Notizen eingegeben', 'info'); return; }
    DB.addKonferenz({
      schuelerId,
      datum: new Date().toISOString().split('T')[0],
      titel: 'Fallkonferenz',
      themen: notizen,
    });
    showToast('Konferenz-Protokoll gespeichert', 'ok');
    activeTab = 'konferenzen';
    render(schuelerId);
  }

  // ─── Tab: Kontakte ─────────────────────────────────────────
  function renderKontakteTab(s) {
    const kontakte = DB.getKontakte(s.id).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    return `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">Kontakt-Log</div>
          <button class="btn btn-primary" onclick="ProfilView.addKontakt('${s.id}')">+ Kontakt</button>
        </div>
        ${kontakte.length === 0
          ? `<div class="pw-empty"><div class="pw-empty-icon">📞</div><p>Noch kein Kontakt protokolliert.</p></div>`
          : `<div class="pw-list">${kontakte.map(k => {
              const artIcons = { telefon: '📞', email: '✉️', 'vor-ort': '🏠', meeting: '🤝', video: '💻' };
              return `
                <div class="pw-list-item" style="flex-direction: column; align-items: stretch;">
                  <div style="display: flex; justify-content: space-between;">
                    <div>
                      ${artIcons[k.art] || '📋'} <strong>${Utils.escapeHtml(k.kontaktperson || '?')}</strong>
                      <span style="margin-left: 6px; padding: 2px 8px; background: var(--bg-subtle); border-radius: var(--radius-full); font-size: var(--text-xs); color: var(--text-secondary);">${Utils.escapeHtml(k.art || 'kontakt')}</span>
                    </div>
                    <span style="color: var(--text-muted); font-size: var(--text-sm);">${k.datum ? Utils.formatDate(k.datum) : ''}</span>
                  </div>
                  ${k.inhalt ? `<div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;">${Utils.escapeHtml(k.inhalt)}</div>` : ''}
                  ${k.folgeaktion ? `<div style="font-size: var(--text-sm); color: var(--color-app-hub); margin-top: 4px;">→ ${Utils.escapeHtml(k.folgeaktion)}</div>` : ''}
                </div>`;
            }).join('')}</div>`
        }
      </div>
    `;
  }

  async function addKontakt(schuelerId) {
    const helfer = DB.getHelfer(schuelerId);
    const personOptions = helfer.map(h => ({ value: h.name, label: `${h.name} (${h.rolle || ''})` }));
    personOptions.unshift({ value: '', label: '— Auswählen oder frei eingeben —' });

    const data = await Utils.modalForm({
      title: 'Kontakt protokollieren',
      fields: [
        { id: 'datum', label: 'Datum', type: 'date', value: Utils.today(), required: true },
        helfer.length > 0
          ? { id: 'kontaktperson', label: 'Mit wem?', type: 'select', options: personOptions }
          : { id: 'kontaktperson', label: 'Mit wem?', placeholder: 'Name', required: true },
        { id: 'art', label: 'Art', type: 'select', options: [
          { value: 'telefon', label: '📞 Telefon' },
          { value: 'email', label: '✉️ E-Mail' },
          { value: 'vor-ort', label: '🏠 Vor Ort' },
          { value: 'meeting', label: '🤝 Meeting' },
          { value: 'video', label: '💻 Videocall' },
        ], value: 'telefon' },
        { id: 'inhalt', label: 'Inhalt / Notiz', type: 'textarea', placeholder: 'Was wurde besprochen? Wichtigste Punkte.' },
        { id: 'folgeaktion', label: 'Folge-Aktion', placeholder: 'Was muss als nächstes passieren?' },
      ],
    });
    if (!data) return;
    DB.addKontakt({ schuelerId, ...data });
    showToast('Kontakt protokolliert', 'ok');
    render(schuelerId);
  }

  // ─── Tab: DSGVO ─────────────────────────────────────────────
  function renderDSGVOTab(s) {
    return `
      <div class="pw-section">
        <div class="pw-section-title">📋 DSGVO — Datenauskunft</div>
        <p style="color: var(--text-secondary); margin: var(--space-3) 0;">
          Hier kannst du alle gespeicherten Daten zu diesem Klienten als JSON exportieren — z.B. für Auskunftspflicht-Anfragen oder Datenübertragbarkeit.
        </p>
        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="ProfilView.exportDsgvo('${s.id}')">📦 JSON exportieren</button>
          <button class="btn" onclick="ProfilView.deleteSchueler('${s.id}')" style="border-color: var(--danger); color: var(--danger);">🗑️ Klient endgültig löschen</button>
        </div>
        <div style="margin-top: var(--space-4); padding: var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm); font-size: var(--text-sm); color: var(--text-secondary);">
          <strong>Was wird exportiert:</strong> Stammdaten, alle Notizen, Termine, Screenings, Roadmap, Wohlbefinden, Verlauf, Risiko-Werte, Kontakte, Helfer, Konferenzen, Fallformulierung.
        </div>
      </div>
    `;
  }

  function exportDsgvo(schuelerId) {
    const s = DB.getSchuelerById(schuelerId);
    if (!s) return;
    const daten = {
      schueler: s,
      notizen: DB.getNotizen(schuelerId),
      termine: DB.getTermine(schuelerId),
      screenings: DB.getScreenings(schuelerId),
      roadmaps: DB.getRoadmaps(schuelerId),
      wohlbefinden: DB.getWohlbefinden(schuelerId),
      verlauf: DB.getVerlauf(schuelerId),
      kontakte: DB.getKontakte(schuelerId),
      risiko: DB.getRisiko(schuelerId),
      helfer: DB.getHelfer(schuelerId),
      konferenzen: DB.getKonferenzen(schuelerId),
      fallformulierungen: DB.getFallformulierungen(schuelerId),
      exportedAt: new Date().toISOString(),
      sicherheitsplaene: (() => { try { const all = JSON.parse(localStorage.getItem('pw_safety_plans') || '{}'); return all[schuelerId] || null; } catch { return null; } })(),
      staerken: (() => { try { const all = JSON.parse(localStorage.getItem('pw_staerken') || '{}'); return all[schuelerId] || null; } catch { return null; } })(),
      exportedBy: 'Pathways HUB',
      exportVersion: '3.1',
    };
    const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsgvo-${s.vorname}-${s.nachname}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('DSGVO-Export erstellt', 'ok');
  }

  function deleteSchueler(schuelerId) {
    const s = DB.getSchuelerById(schuelerId);
    if (!s) return;
    if (!confirm(`Klient "${s.vorname} ${s.nachname}" und ALLE zugehörigen Daten endgültig löschen?\n\nDieser Schritt kann nicht rückgängig gemacht werden.`)) return;
    DB.deleteSchueler(schuelerId);
    showToast('Klient gelöscht', 'ok');
    Bridge.notify('schueler_deleted', { schuelerId });
    showView('home');
  }

  // ─── Main render ────────────────────────────────────────────
  function render(schuelerId) {
    schuelerId = schuelerId || APP.currentSchuelerId;
    const container = document.getElementById('view-container');
    const s = DB.getSchuelerById(schuelerId);

    if (!s) {
      container.innerHTML = `<div class="pw-empty"><div class="pw-empty-icon">❓</div><p>Klient nicht gefunden.</p><button class="btn" onclick="showView('home')">← Zurück</button></div>`;
      return;
    }

    APP.currentSchuelerId = schuelerId;

    const fullName = `${s.vorname || ''} ${s.nachname || ''}`.trim();
    document.getElementById('view-title').innerHTML = `<button class="pw-btn-icon" onclick="showView('home')" style="margin-right:8px; color: var(--text-muted);">←</button>👤 ${Utils.escapeHtml(fullName)}`;

    const tabs = [
      ['stamm', 'Stammdaten'],
      ['anamnese', 'Anamnese'],
      ['helfer', 'Helfer'],
      ['konferenzen', 'Konferenzen'],
      ['konferenz-modus', '🖥️ Konferenz-Modus'],
      ['kontakte', 'Kontakte'],
      ['dsgvo', 'DSGVO'],
    ];

    let body = '';
    if (activeTab === 'stamm') body = renderStammTab(s);
    else if (activeTab === 'anamnese') body = renderAnamneseTab(s);
    else if (activeTab === 'helfer') body = renderHelferTab(s);
    else if (activeTab === 'konferenzen') body = renderKonferenzenTab(s);
    else if (activeTab === 'konferenz-modus') body = renderKonferenzModus(s);
    else if (activeTab === 'kontakte') body = renderKontakteTab(s);
    else if (activeTab === 'dsgvo') body = renderDSGVOTab(s);

    container.innerHTML = `
      <div class="pw-tabs">
        ${tabs.map(([id, label]) => `
          <button class="pw-tab ${activeTab === id ? 'active' : ''}" onclick="ProfilView.setTab('${id}')">${label}</button>
        `).join('')}
      </div>
      ${body}
    `;
  }

  function setTab(id) { activeTab = id; render(); }

  return {
    render, setTab,
    saveAnamnese, addHelfer, saveNewHelfer, editHelfer, saveEditHelfer, deleteHelfer,
    addKonferenz, saveKonferenzNotizen, addKontakt, exportDsgvo, deleteSchueler,
  };
})();
