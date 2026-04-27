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
  const ANAMNESE_ITEMS = {
    ace: {
      label: '⚠️ ACE (Adverse Childhood Experiences)',
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
    family: {
      label: '👨‍👩‍👧 Familienstruktur',
      items: [
        { id: 'fam_alleinerziehend', label: 'Alleinerziehend aufgewachsen' },
        { id: 'fam_pflege', label: 'Pflegefamilie' },
        { id: 'fam_heim', label: 'Heim/Wohngruppe' },
        { id: 'fam_geschwister', label: 'Geschwister-Konflikte' },
      ],
    },
    schule: {
      label: '🏫 Schulische Erfahrungen',
      items: [
        { id: 'schul_absentismus', label: 'Schulabsentismus' },
        { id: 'schul_mobbing', label: 'Mobbing erlebt' },
        { id: 'schul_wechsel', label: 'Mehrfache Schulwechsel' },
        { id: 'schul_klassenwiederholung', label: 'Klasse wiederholt' },
      ],
    },
    gesundheit: {
      label: '💊 Gesundheit',
      items: [
        { id: 'health_chronisch', label: 'Chronische Krankheit' },
        { id: 'health_behinderung', label: 'Behinderung' },
        { id: 'health_medikation', label: 'Medikation' },
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
              <div class="pw-list-item" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${Utils.escapeHtml(k.titel || 'Hilfeplankonferenz')}</strong>
                  <span style="color: var(--text-muted); font-size: var(--text-sm);">${k.datum ? Utils.formatDate(k.datum) : ''}</span>
                </div>
                ${k.themen ? `<div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;">${Utils.escapeHtml(Utils.truncate(k.themen, 200))}</div>` : ''}
                ${k.naechsterTermin ? `<div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 4px;">→ Nächster Termin: ${Utils.formatDate(k.naechsterTermin)}</div>` : ''}
              </div>`).join('')}</div>`
        }
      </div>
    `;
  }

  function addKonferenz(schuelerId) {
    const datum = prompt('Datum (YYYY-MM-DD)?', new Date().toISOString().split('T')[0]);
    if (!datum) return;
    const titel = prompt('Titel?', 'Hilfeplankonferenz') || 'Hilfeplankonferenz';
    const themen = prompt('Hauptthemen?') || '';
    DB.addKonferenz({ schuelerId, datum, titel, themen });
    showToast('Konferenz dokumentiert', 'ok');
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
          : `<div class="pw-list">${kontakte.map(k => `
              <div class="pw-list-item" style="flex-direction: column; align-items: stretch;">
                <div style="display: flex; justify-content: space-between;">
                  <div>
                    <strong>${Utils.escapeHtml(k.kontaktperson || '?')}</strong>
                    <span style="margin-left: 6px; padding: 2px 8px; background: var(--bg-subtle); border-radius: var(--radius-full); font-size: var(--text-xs); color: var(--text-secondary);">${Utils.escapeHtml(k.art || 'kontakt')}</span>
                  </div>
                  <span style="color: var(--text-muted); font-size: var(--text-sm);">${k.datum ? Utils.formatDate(k.datum) : ''}</span>
                </div>
                ${k.inhalt ? `<div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;">${Utils.escapeHtml(Utils.truncate(k.inhalt, 200))}</div>` : ''}
              </div>`).join('')}</div>`
        }
      </div>
    `;
  }

  function addKontakt(schuelerId) {
    const kontaktperson = prompt('Mit wem? (Name)');
    if (!kontaktperson) return;
    const art = prompt('Art? (telefon, email, vor-ort, meeting)', 'telefon') || 'telefon';
    const inhalt = prompt('Inhalt / Notiz?') || '';
    DB.addKontakt({ schuelerId, kontaktperson, art, inhalt });
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
      exportedBy: 'CASE-App',
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
      ['kontakte', 'Kontakte'],
      ['dsgvo', 'DSGVO'],
    ];

    let body = '';
    if (activeTab === 'stamm') body = renderStammTab(s);
    else if (activeTab === 'anamnese') body = renderAnamneseTab(s);
    else if (activeTab === 'helfer') body = renderHelferTab(s);
    else if (activeTab === 'konferenzen') body = renderKonferenzenTab(s);
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
    addKonferenz, addKontakt, exportDsgvo, deleteSchueler,
  };
})();
