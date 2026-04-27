/* ============================================================
   CASE — Home View
   ============================================================
   Dashboard: Klientenliste + Schnell-Statistik + App-Launcher
   pro Klient. Reagiert auf Bridge-Events (Live-Updates).
   ============================================================ */

const HomeView = (function () {
  // ─── Sub-Apps für Launcher ─────────────────────────────────
  const APPS = [
    { id: 'diagnose', icon: '🔍', label: 'Diagnose', color: 'var(--color-app-diagnose)' },
    { id: 'roadmap',  icon: '🗺️',  label: 'Roadmap', color: 'var(--color-app-roadmap)' },
    { id: 'session',  icon: '📝', label: 'Sitzung', color: 'var(--color-app-session)' },
    { id: 'library',  icon: '📚', label: 'Material', color: 'var(--color-app-library)' },
    { id: 'crisis',   icon: '🚨', label: 'Krise',   color: 'var(--color-app-crisis)' },
    { id: 'parents',  icon: '👨‍👩‍👧', label: 'Eltern', color: 'var(--color-app-parents)' },
    { id: 'academy',  icon: '🎓', label: 'Lernen',  color: 'var(--color-app-academy)' },
  ];

  function initials(s) {
    const v = (s.vorname || '').charAt(0).toUpperCase();
    const n = (s.nachname || '').charAt(0).toUpperCase();
    return (v + n) || '?';
  }

  /** Determine current risk level based on latest pw_risiko entry. */
  function risikoLevel(schuelerId) {
    const eintraege = DB.getRisiko(schuelerId);
    if (!eintraege.length) return 'unbekannt';
    const letzter = eintraege.sort((a, b) => b.datum.localeCompare(a.datum))[0];
    const farben = Object.values(letzter.werte || {});
    if (farben.includes('rot')) return 'rot';
    if (farben.includes('gelb')) return 'gelb';
    return 'gruen';
  }

  /** Compose live-status row (last screening, session, risk). */
  function statusRow(s) {
    const screenings = DB.getScreenings(s.id).filter(x => x.abgeschlossen);
    const lastScreening = screenings.sort((a, b) => b.datum.localeCompare(a.datum))[0];
    const notizen = DB.getNotizen(s.id);
    const lastSitzung = notizen.filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))[0];
    const roadmap = DB.getRoadmap(s.id);
    const aktivePhase = roadmap?.phasen?.find(p => p.status === 'aktiv');
    const risiko = risikoLevel(s.id);

    const stats = [];
    stats.push(`<span class="pw-stat"><span class="pw-stat-dot ${risiko === 'unbekannt' ? '' : risiko}"></span>Risiko ${risiko}</span>`);
    if (lastScreening) {
      const tage = Utils.daysBetween(lastScreening.datum, new Date().toISOString());
      stats.push(`<span class="pw-stat">🔍 Screening vor ${tage}d</span>`);
    } else {
      stats.push(`<span class="pw-stat" style="color:var(--text-muted)">🔍 noch kein Screening</span>`);
    }
    if (aktivePhase) stats.push(`<span class="pw-stat">🗺️ Phase ${aktivePhase.nr}</span>`);
    if (lastSitzung) {
      const tage = Utils.daysBetween(lastSitzung.datum, new Date().toISOString());
      stats.push(`<span class="pw-stat">📝 Sitzung vor ${tage}d</span>`);
    }
    return `<div class="pw-status-row">${stats.join('')}</div>`;
  }

  /** App-Launcher buttons (cross-app deep-links). */
  function launcher(s) {
    return `<div class="pw-launcher">${APPS.map(app => `
      <a class="pw-launch-btn" data-app="${app.id}"
         href="${Bridge.deepLink(app.id, { schueler: s.id })}"
         target="_blank"
         title="${Utils.escapeHtml(app.label)}">
        <span class="icon">${app.icon}</span>
        <span>${app.label}</span>
      </a>
    `).join('')}</div>`;
  }

  function renderKlientCard(s) {
    const fullName = `${s.vorname || ''} ${s.nachname || ''}`.trim() || '(ohne Name)';
    const meta = [
      s.klasse ? `Klasse ${s.klasse}` : null,
      s.geburtsdatum ? Utils.formatDate(s.geburtsdatum) : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="pw-card" data-id="${s.id}">
        <div class="pw-card-header">
          <div class="pw-avatar">${initials(s)}</div>
          <div class="pw-card-title">
            <div class="pw-card-name">${Utils.escapeHtml(fullName)}</div>
            <div class="pw-card-meta">${Utils.escapeHtml(meta) || '<em>keine Daten</em>'}</div>
          </div>
          <button class="pw-btn-icon" onclick="openSchuelerModal('${s.id}')" title="Bearbeiten" style="color:var(--text-muted)">✏️</button>
        </div>
        ${statusRow(s)}
        ${launcher(s)}
        <div style="margin-top:var(--space-3); display:flex; gap:var(--space-2);">
          <button class="btn" style="flex:1" onclick="showView('profil','${s.id}')">Profil öffnen →</button>
        </div>
      </div>
    `;
  }

  function renderStats() {
    const all = DB.getSchueler();
    const aktiv = all.filter(s => (s.status || 'aktiv') === 'aktiv');
    const screeningHeute = DB.getScreenings().filter(x => {
      const d = new Date(x.datum);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    });
    const offeneAufgaben = DB.getAufgaben().filter(a => !a.erledigt);

    return `
      <div class="pw-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: var(--space-5);">
        <div class="pw-card" style="text-align:center; padding: var(--space-4);">
          <div style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--primary);">${aktiv.length}</div>
          <div style="font-size: var(--text-sm); color: var(--text-muted);">Aktive Klienten</div>
        </div>
        <div class="pw-card" style="text-align:center; padding: var(--space-4);">
          <div style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--secondary);">${screeningHeute.length}</div>
          <div style="font-size: var(--text-sm); color: var(--text-muted);">Screenings heute</div>
        </div>
        <div class="pw-card" style="text-align:center; padding: var(--space-4);">
          <div style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--accent);">${offeneAufgaben.length}</div>
          <div style="font-size: var(--text-sm); color: var(--text-muted);">Offene Aufgaben</div>
        </div>
        <div class="pw-card" style="text-align:center; padding: var(--space-4);">
          <div style="font-size: 2rem; font-weight: var(--font-weight-bold); color: var(--info);">${all.length}</div>
          <div style="font-size: var(--text-sm); color: var(--text-muted);">Gesamt</div>
        </div>
      </div>
    `;
  }

  function render() {
    const container = document.getElementById('view-container');
    const all = DB.getSchueler().sort((a, b) => (a.nachname || '').localeCompare(b.nachname || ''));

    if (all.length === 0) {
      container.innerHTML = `
        ${renderStats()}
        <div class="pw-empty">
          <div class="pw-empty-icon">👤</div>
          <h2>Noch keine Klienten</h2>
          <p>Lege deinen ersten Klienten an, um zu starten.</p>
          <button class="btn btn-primary" style="margin-top: var(--space-3);" onclick="openSchuelerModal()">+ Klient anlegen</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      ${renderStats()}
      <div class="pw-grid">
        ${all.map(renderKlientCard).join('')}
      </div>
    `;
  }

  return { render };
})();
