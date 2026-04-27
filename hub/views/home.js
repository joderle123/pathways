/* ============================================================
   HUB — Home View (Manifest-Vision)
   ============================================================
   Tagesbriefing, Klinische Geschichte, Workload-Schutz,
   Risiko-Ampel mit Erklärung, App-Launcher.
   ============================================================ */

const HomeView = (function () {
  const APPS = [
    { id: 'claro',   icon: '🔍', label: 'CLARO',   color: 'var(--color-app-claro)' },
    { id: 'via',     icon: '🛤️', label: 'VIA',     color: 'var(--color-app-via)' },
    { id: 'codex',   icon: '📚', label: 'CODEX',   color: 'var(--color-app-codex)' },
    { id: 'academy', icon: '🎓', label: 'ACADEMY', color: 'var(--color-app-academy)' },
  ];

  function initials(s) {
    return ((s.vorname || '').charAt(0) + (s.nachname || '').charAt(0)).toUpperCase() || '?';
  }

  // ─── Risiko-Ampel mit Erklärung ───────────────────────────
  function risikoInfo(schuelerId) {
    const eintraege = DB.getRisiko(schuelerId).sort((a, b) => b.datum.localeCompare(a.datum));
    if (!eintraege.length) return { level: 'unbekannt', farbe: 'var(--text-muted)', label: '—', erklaerung: 'Noch keine Risiko-Bewertung.' };

    const letzter = eintraege[0];
    const farben = Object.values(letzter.werte || {});
    const datum = Utils.formatDate(letzter.datum, { short: true });

    if (farben.includes('rot')) {
      const grund = letzter.werte?.cssrs_severity === 'critical' ? 'C-SSRS kritisch'
        : letzter.werte?.cssrs_severity === 'high' ? 'C-SSRS hoch'
        : 'Risiko-Eintrag rot';
      return { level: 'rot', farbe: '#DC2626', label: '🔴 ROT', erklaerung: `${grund} seit ${datum}. Sicherheitsplan prüfen.` };
    }
    if (farben.includes('gelb')) {
      return { level: 'gelb', farbe: '#F59E0B', label: '🟡 GELB', erklaerung: `Erhöhte Aufmerksamkeit seit ${datum}.` };
    }
    return { level: 'gruen', farbe: '#10B981', label: '🟢 GRÜN', erklaerung: `Stabil seit ${datum}.` };
  }

  // ─── Klinische Geschichte (Manifest: "3 Sätze die alles sagen") ─
  function klinischeGeschichte(s) {
    const name = s.vorname || 'Klient';

    // ── Daten sammeln ──
    let alter = '';
    if (s.geburtsdatum) {
      alter = `${Math.floor((Date.now() - new Date(s.geburtsdatum).getTime()) / (365.25 * 86400000))} Jahre`;
    }

    const anamnese = s.anamnese || [];
    const aceCount = anamnese.filter(id => id.startsWith('ace_')).length;
    const hatTrauma = anamnese.some(id => ['ace_sexual_abuse', 'ace_physical_abuse', 'ace_domestic_violence'].includes(id));
    const hatVernachl = anamnese.some(id => ['ace_emotional_neglect', 'ace_physical_neglect'].includes(id));
    const hatFamilie = anamnese.some(id => id.startsWith('fam_'));
    const hatSchule = anamnese.some(id => id.startsWith('schul_'));

    // Screening-basierte Hypothesen aus letztem Screening
    const screenings = DB.getScreenings(s.id).filter(x => x.abgeschlossen).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    const latest = screenings[0];
    const scores = latest?.scores || {};
    const phqa = scores['phq-a']?.score || 0;
    const gad = scores['gad-7']?.score || 0;
    const pcl = scores['pcl-5']?.score || 0;
    const sdq = scores['sdq'];

    // Muster bestimmen (internalisierend vs externalisierend vs gemischt)
    const intern = phqa >= 10 || gad >= 10 || pcl >= 33;
    const extern = (sdq?.subscales?.conduct >= 4) || (sdq?.subscales?.hyperact >= 7);
    let musterLabel = '';
    if (intern && extern) musterLabel = 'gemischtes Muster (internalisierend + externalisierend)';
    else if (intern) musterLabel = 'internalisierendes Muster';
    else if (extern) musterLabel = 'externalisierendes Muster';

    // Spezifische klinische Bilder
    const bilder = [];
    if (phqa >= 15) bilder.push('Depression');
    else if (phqa >= 10) bilder.push('depressive Symptomatik');
    if (gad >= 10) bilder.push('Angst');
    if (pcl >= 33) bilder.push('Trauma-Symptomatik');
    if (sdq?.subscales?.conduct >= 4) bilder.push('Conduct-Auffälligkeiten');

    // Hintergrund-Facetten
    const bg = [];
    if (hatTrauma) bg.push('Trauma-Hintergrund');
    else if (hatVernachl) bg.push('Vernachlässigungs-Erfahrung');
    if (hatFamilie) bg.push('familiär belastet');
    if (hatSchule) bg.push('schulisch belastet');
    if (aceCount >= 4) bg.push('ACE hoch (' + aceCount + '/10)');

    // ── Satz 1: Wer ist diese Person klinisch? ──
    const satz1Teile = [alter];
    if (musterLabel) satz1Teile.push(musterLabel);
    else if (bilder.length) satz1Teile.push(bilder.join(' + '));
    if (bg.length) satz1Teile.push('mit ' + bg.slice(0, 2).join(' und '));
    const satz1 = satz1Teile.filter(Boolean).join(', ') + '.';

    // ── Satz 2: Wo steht der Fall gerade? ──
    const roadmap = DB.getRoadmap(s.id);
    const aktivePhase = roadmap?.phasen?.find(p => p.status === 'aktiv');
    const sitzungen = DB.getNotizen(s.id).filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

    // Allianz aus SRS
    let allianzLabel = '';
    if (sitzungen.length >= 2) {
      const letzte3SRS = sitzungen.slice(0, 3).map(n => n.soap?.srs_total).filter(v => v !== undefined);
      if (letzte3SRS.length >= 2) {
        const avg = letzte3SRS.reduce((a, b) => a + b, 0) / letzte3SRS.length;
        if (avg >= 32) allianzLabel = 'Allianz stabil';
        else if (avg >= 25) allianzLabel = 'Allianz fragil';
        else allianzLabel = 'Allianz kritisch';
      }
    }

    let satz2 = '';
    if (aktivePhase) {
      const startDatum = aktivePhase.beginn || roadmap.erstellt;
      const wochen = startDatum ? Math.floor((Date.now() - new Date(startDatum).getTime()) / (7 * 86400000)) : '?';
      satz2 = `Phase ${aktivePhase.nr} seit ${wochen} Wochen`;
      if (allianzLabel) satz2 += ', ' + allianzLabel;
      satz2 += '.';
    } else if (sitzungen.length > 0) {
      satz2 = `${sitzungen.length} Sitzungen dokumentiert, noch keine Roadmap.`;
    } else {
      satz2 = 'Noch keine Begleitung begonnen.';
    }

    // ── Treatment Response (ORS erste 3 vs letzte 3) ──
    let responseLabel = '';
    if (sitzungen.length >= 6) {
      const erste3 = sitzungen.slice(-3).map(n => n.soap?.ors_total).filter(v => v !== undefined);
      const letzte3 = sitzungen.slice(0, 3).map(n => n.soap?.ors_total).filter(v => v !== undefined);
      if (erste3.length && letzte3.length) {
        const diff = (letzte3.reduce((a, b) => a + b, 0) / letzte3.length) - (erste3.reduce((a, b) => a + b, 0) / erste3.length);
        if (diff > 3) responseLabel = 'ORS deutlich verbessert ↑';
        else if (diff > 0) responseLabel = 'ORS leicht verbessert';
        else if (diff > -3) responseLabel = 'ORS stagniert →';
        else responseLabel = 'ORS verschlechtert ↓';
      }
    }
    if (responseLabel) satz2 += ` ${responseLabel}.`;

    // ── 5P-Hypothese wenn vorhanden ──
    const ff = DB.getFallformulierung?.(s.id);
    if (ff?.hypothese) {
      satz2 += ` Hypothese: ${ff.hypothese.slice(0, 60)}${ff.hypothese.length > 60 ? '…' : ''}.`;
    }

    // ── Satz 3: Was steht heute an? (kontext-sensitiv) ──
    let satz3 = '';
    const heute = new Date().toISOString().split('T')[0];
    const termineHeute = DB.getTermine(s.id).filter(t => t.datum?.startsWith(heute));

    // Helfer-Update nötig?
    const helfer = DB.getHelfer(s.id);
    const helferOhneUpdate = helfer.filter(h => {
      if (!h.letzterKontakt) return true;
      return Utils.daysBetween(h.letzterKontakt, new Date().toISOString()) > 30;
    });

    if (termineHeute.length > 0) {
      satz3 = `Heute: ${termineHeute[0].titel || termineHeute[0].typ || 'Termin'}.`;
    } else if (sitzungen.length > 0) {
      const tage = Utils.daysBetween(sitzungen[0].datum, new Date().toISOString());
      const aktThema = aktivePhase?.themen?.[0];
      if (tage > 14) {
        satz3 = `${tage} Tage seit letzter Sitzung — Kontakt aufnehmen.`;
      } else if (aktThema) {
        satz3 = `Heute: ${aktThema} weiter vertiefen.`;
      } else {
        const ors = sitzungen[0].soap?.ors_total;
        satz3 = ors !== undefined ? `Letzter ORS ${ors.toFixed(1)}.` : '';
      }
    }
    if (helferOhneUpdate.length > 0 && !satz3.includes('Kontakt')) {
      satz3 += ` ${helferOhneUpdate[0].name} braucht Update.`;
    }

    return [satz1, satz2, satz3].filter(Boolean).join(' ');
  }

  // ─── Tagesbriefing ────────────────────────────────────────
  function generateBriefing(alle) {
    const items = [];
    const heute = new Date().toISOString().split('T')[0];

    alle.forEach(s => {
      const name = s.vorname || 'Klient';
      const risiko = risikoInfo(s.id);

      // Rote Ampel → Aufmerksamkeit
      if (risiko.level === 'rot') {
        items.push({ prio: 1, icon: '🔴', text: `<strong>${Utils.escapeHtml(name)}</strong> — ${risiko.erklaerung}`, sid: s.id });
      }

      // SRS-Trend fällt (3+ Sitzungen)
      const sitzungen = DB.getNotizen(s.id).filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
      if (sitzungen.length >= 3) {
        const letzte3 = sitzungen.slice(0, 3).map(n => n.soap?.srs_total).filter(v => v !== undefined);
        if (letzte3.length === 3 && letzte3[0] < letzte3[1] && letzte3[1] < letzte3[2]) {
          items.push({ prio: 2, icon: '📉', text: `<strong>${Utils.escapeHtml(name)}</strong> — SRS fällt seit 3 Sitzungen. Allianz-Check empfohlen.`, sid: s.id });
        }
      }

      // Keine Sitzung seit >14 Tagen
      if (sitzungen.length > 0) {
        const tage = Utils.daysBetween(sitzungen[0].datum, new Date().toISOString());
        if (tage > 14) {
          items.push({ prio: 3, icon: '⏰', text: `<strong>${Utils.escapeHtml(name)}</strong> — ${tage} Tage ohne Sitzung. Kontakt aufnehmen?`, sid: s.id });
        }
      }

      // Termine heute
      const termine = DB.getTermine(s.id).filter(t => t.datum?.startsWith(heute));
      termine.forEach(t => {
        items.push({ prio: 2, icon: '📅', text: `<strong>${Utils.escapeHtml(name)}</strong> — Termin heute: ${Utils.escapeHtml(t.titel || t.typ || 'Termin')}`, sid: s.id });
      });

      // Gelbe Ampel
      if (risiko.level === 'gelb') {
        items.push({ prio: 3, icon: '🟡', text: `<strong>${Utils.escapeHtml(name)}</strong> — ${risiko.erklaerung}`, sid: s.id });
      }
    });

    items.sort((a, b) => a.prio - b.prio);
    return items;
  }

  // ─── Workload-Schutz ──────────────────────────────────────
  function renderWorkload(alle) {
    const rote = alle.filter(s => risikoInfo(s.id).level === 'rot').length;
    const gelbe = alle.filter(s => risikoInfo(s.id).level === 'gelb').length;
    const gruene = alle.filter(s => risikoInfo(s.id).level === 'gruen').length;
    const unbekannt = alle.filter(s => risikoInfo(s.id).level === 'unbekannt').length;
    const gesamt = alle.length;

    // Gewichtete Last: rot=3, gelb=2, grün=1, unbekannt=1
    const last = rote * 3 + gelbe * 2 + gruene + unbekannt;
    const maxLast = gesamt * 3;
    const lastProzent = maxLast > 0 ? Math.round((last / maxLast) * 100) : 0;
    const lastFarbe = lastProzent > 70 ? '#DC2626' : lastProzent > 40 ? '#F59E0B' : '#10B981';
    const lastLabel = lastProzent > 70 ? 'Hohe Belastung' : lastProzent > 40 ? 'Mittlere Belastung' : 'Im grünen Bereich';

    const offeneAufgaben = DB.getAufgaben().filter(a => !a.erledigt).length;

    // Krisenfrequenz: wie oft in 30 Tagen ein roter Risiko-Eintrag
    const vor30 = new Date(Date.now() - 30 * 86400000).toISOString();
    let krisenCount = 0;
    alle.forEach(s => {
      DB.getRisiko(s.id).forEach(r => {
        if (r.datum >= vor30 && Object.values(r.werte || {}).includes('rot')) krisenCount++;
      });
    });

    // Schwere-Score pro Klient (für Detail-Ansicht)
    const schwereDetails = alle.map(s => {
      const r = risikoInfo(s.id);
      const gewicht = r.level === 'rot' ? 3 : r.level === 'gelb' ? 2 : r.level === 'unbekannt' ? 1 : 1;
      const sitzungen = DB.getNotizen(s.id).filter(n => n.kategorie === 'session').length;
      return { name: `${s.vorname || ''} ${s.nachname || ''}`.trim(), id: s.id, gewicht, risiko: r.label, sitzungen };
    }).sort((a, b) => b.gewicht - a.gewicht);

    return `
      <div class="hub-workload">
        <div class="hub-workload-header">
          <span>⚖️ Workload-Schutz</span>
          <span style="font-size: 13px; color: ${lastFarbe}; font-weight: var(--font-weight-semibold);">${lastLabel}</span>
        </div>
        <div class="hub-workload-bar">
          <div class="hub-workload-fill" style="width: ${lastProzent}%; background: ${lastFarbe};"></div>
        </div>
        <div class="hub-workload-stats">
          <span>🔴 ${rote}</span>
          <span>🟡 ${gelbe}</span>
          <span>🟢 ${gruene}</span>
          <span>🚨 ${krisenCount} Krisen/30d</span>
          <span>📋 ${offeneAufgaben} Aufgaben</span>
          <span>👥 ${gesamt} Klienten</span>
        </div>
        <details style="margin-top: var(--space-3);">
          <summary style="cursor: pointer; font-size: 13px; color: var(--text-muted);">Belastung pro Klient anzeigen</summary>
          <div style="margin-top: var(--space-2);">
            ${schwereDetails.map(d => `
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); font-size: 13px;">
                <span style="cursor: pointer; text-decoration: underline;" onclick="showView('profil','${d.id}')">${Utils.escapeHtml(d.name)}</span>
                <span>${d.risiko} · ${'█'.repeat(d.gewicht)}${'░'.repeat(3 - d.gewicht)} · ${d.sitzungen} Sitzungen</span>
              </div>
            `).join('')}
          </div>
          ${lastProzent > 70 ? `
            <div style="margin-top: var(--space-3); padding: var(--space-3); background: #FEE2E2; border-radius: var(--radius-sm); font-size: 13px; color: #7F1D1D;">
              ⚠️ <strong>Hohe Belastung.</strong> Erwäge: Supervision ansprechen, Caseload-Review mit Leitung, Selbstfürsorge-Check in ACADEMY.
            </div>
          ` : ''}
        </details>
      </div>
    `;
  }

  // ─── Klient-Karte (Manifest-Style) ────────────────────────
  function renderKlientCard(s) {
    const fullName = `${s.vorname || ''} ${s.nachname || ''}`.trim() || '(ohne Name)';
    const meta = [s.klasse ? `Klasse ${s.klasse}` : null, s.geburtsdatum ? Utils.formatDate(s.geburtsdatum) : null].filter(Boolean).join(' · ');
    const risiko = risikoInfo(s.id);
    const geschichte = klinischeGeschichte(s);

    return `
      <div class="pw-card hub-klient-card" data-id="${s.id}" style="border-left: 4px solid ${risiko.farbe};">
        <div class="pw-card-header">
          <div class="pw-avatar">${initials(s)}</div>
          <div class="pw-card-title">
            <div class="pw-card-name">${Utils.escapeHtml(fullName)}</div>
            <div class="pw-card-meta">${Utils.escapeHtml(meta) || ''}</div>
          </div>
          <div class="hub-risiko-badge" style="background: ${risiko.farbe}20; color: ${risiko.farbe}; border: 1px solid ${risiko.farbe}40;">
            ${risiko.label}
          </div>
        </div>

        <div class="hub-geschichte">${Utils.escapeHtml(geschichte)}</div>

        <div class="hub-risiko-erklaerung">
          <span style="color: ${risiko.farbe};">●</span> ${Utils.escapeHtml(risiko.erklaerung)}
        </div>

        <div class="pw-launcher">${APPS.map(app => `
          <a class="pw-launch-btn" href="${Bridge.deepLink(app.id, { schueler: s.id })}" target="_blank" title="${app.label}">
            <span class="icon">${app.icon}</span><span>${app.label}</span>
          </a>
        `).join('')}</div>

        <div style="margin-top:var(--space-3); display:flex; gap:var(--space-2);">
          <button class="btn" style="flex:1" onclick="showView('profil','${s.id}')">Profil →</button>
          <button class="pw-btn-icon" onclick="openSchuelerModal('${s.id}')" title="Bearbeiten" style="color:var(--text-muted)">✏️</button>
        </div>
      </div>
    `;
  }

  // ─── Hauptrender ──────────────────────────────────────────
  function render() {
    const container = document.getElementById('view-container');
    const alle = DB.getSchueler().sort((a, b) => {
      const ra = risikoInfo(a.id), rb = risikoInfo(b.id);
      const prio = { rot: 0, gelb: 1, unbekannt: 2, gruen: 3 };
      return (prio[ra.level] ?? 2) - (prio[rb.level] ?? 2);
    });

    if (alle.length === 0) {
      container.innerHTML = `
        <div class="pw-empty">
          <div class="pw-empty-icon">👤</div>
          <h2>Noch keine Klienten</h2>
          <p>Lege deinen ersten Klienten an, um zu starten.</p>
          <button class="btn btn-primary" style="margin-top: var(--space-3);" onclick="openSchuelerModal()">+ Klient anlegen</button>
        </div>
      `;
      return;
    }

    const briefing = generateBriefing(alle);

    container.innerHTML = `
      ${briefing.length > 0 ? `
        <div class="hub-briefing">
          <div class="hub-briefing-header">
            <span>📋 Tagesbriefing</span>
            <span style="font-size: 13px; color: var(--text-muted);">${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div class="hub-briefing-count">${briefing.length} ${briefing.length === 1 ? 'Punkt' : 'Punkte'} brauchen Aufmerksamkeit.</div>
          <div class="hub-briefing-items">
            ${briefing.map(item => `
              <div class="hub-briefing-item" onclick="showView('profil','${item.sid}')">
                <span class="hub-briefing-icon">${item.icon}</span>
                <span>${item.text}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="hub-briefing hub-briefing-ok">
          <div class="hub-briefing-header"><span>✅ Tagesbriefing</span></div>
          <div class="hub-briefing-count">Alles im grünen Bereich. Keine akuten Handlungsbedarfe.</div>
        </div>
      `}

      ${renderWorkload(alle)}

      <div class="pw-grid">
        ${alle.map(renderKlientCard).join('')}
      </div>
    `;
  }

  return { render };
})();
