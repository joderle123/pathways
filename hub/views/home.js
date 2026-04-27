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

  // ─── Klinische Geschichte (3 Sätze) ───────────────────────
  function klinischeGeschichte(s) {
    const teile = [];

    // Satz 1: Alter + Muster + Hintergrund
    let alter = '';
    if (s.geburtsdatum) {
      const j = Math.floor((Date.now() - new Date(s.geburtsdatum).getTime()) / (365.25 * 86400000));
      alter = `${j} Jahre`;
    }
    const anamnese = s.anamnese || [];
    const aceCount = anamnese.filter(id => id.startsWith('ace_')).length;
    const hatTrauma = anamnese.some(id => ['ace_sexual_abuse', 'ace_physical_abuse', 'ace_domestic_violence'].includes(id));
    const screenings = DB.getScreenings(s.id).filter(x => x.abgeschlossen);
    const hypothesen = [];
    screenings.forEach(sc => {
      if (sc.ergebnis?.flagSuicide) hypothesen.push('Suizidalität');
      if (sc.ergebnis?.score > 15 && sc.instrumentId === 'phq-a') hypothesen.push('Depression');
      if (sc.ergebnis?.score > 10 && sc.instrumentId === 'gad-7') hypothesen.push('Angst');
      if (sc.ergebnis?.score > 33 && sc.instrumentId === 'pcl-5') hypothesen.push('Trauma');
    });
    const muster = hypothesen.length ? hypothesen.slice(0, 2).join(', ') : (hatTrauma ? 'Trauma-Hintergrund' : '');
    const hintergrund = aceCount >= 4 ? 'ACE hoch' : aceCount >= 1 ? 'ACE belastet' : '';

    const satz1Teile = [alter, muster, hintergrund].filter(Boolean);
    teile.push(satz1Teile.length ? satz1Teile.join(', ') + '.' : `${s.vorname || 'Klient'}, Daten unvollständig.`);

    // Satz 2: Aktive Phase + Dauer + Allianz
    const roadmap = DB.getRoadmap(s.id);
    const aktivePhase = roadmap?.phasen?.find(p => p.status === 'aktiv');
    if (aktivePhase) {
      const startDatum = aktivePhase.beginn || roadmap.erstellt;
      const wochen = startDatum ? Math.floor((Date.now() - new Date(startDatum).getTime()) / (7 * 86400000)) : '?';
      teile.push(`Phase ${aktivePhase.nr} seit ${wochen} Wochen.`);
    } else {
      teile.push('Noch keine Roadmap-Phase aktiv.');
    }

    // Satz 3: Letzte Sitzung + Trend
    const notizen = DB.getNotizen(s.id).filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    if (notizen.length > 0) {
      const letzte = notizen[0];
      const tage = Utils.daysBetween(letzte.datum, new Date().toISOString());
      const ors = letzte.soap?.ors_total;
      if (ors !== undefined) {
        const trend = notizen.length >= 2 && notizen[1].soap?.ors_total !== undefined
          ? (ors > notizen[1].soap.ors_total ? '↑' : ors < notizen[1].soap.ors_total ? '↓' : '→')
          : '';
        teile.push(`Letzte Sitzung vor ${tage}d, ORS ${ors.toFixed(1)} ${trend}.`);
      } else {
        teile.push(`Letzte Sitzung vor ${tage}d.`);
      }
    }

    return teile.join(' ');
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

    return `
      <div class="hub-workload">
        <div class="hub-workload-header">
          <span>⚖️ Workload</span>
          <span style="font-size: 13px; color: ${lastFarbe}; font-weight: var(--font-weight-semibold);">${lastLabel}</span>
        </div>
        <div class="hub-workload-bar">
          <div class="hub-workload-fill" style="width: ${lastProzent}%; background: ${lastFarbe};"></div>
        </div>
        <div class="hub-workload-stats">
          <span>🔴 ${rote}</span>
          <span>🟡 ${gelbe}</span>
          <span>🟢 ${gruene}</span>
          <span>📋 ${offeneAufgaben} Aufgaben</span>
          <span>👥 ${gesamt} Klienten</span>
        </div>
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
