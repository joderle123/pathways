/* ============================================================
   CASE — Kalender View
   ============================================================
   Liste anstehender Termine + Schnell-Add.
   (Monats-Grid kommt in einer späteren Iteration.)
   ============================================================ */

const KalenderView = (function () {
  function fmtDateTime(t) {
    if (!t.datum) return '—';
    return Utils.formatDate(t.datum) + (t.uhrzeit ? ` · ${t.uhrzeit}` : '');
  }

  function nameForSchueler(id) {
    if (!id) return '— ohne Klient —';
    const s = DB.getSchuelerById(id);
    return s ? `${s.vorname || ''} ${s.nachname || ''}`.trim() || '?' : '?';
  }

  function add() {
    const datum = prompt('Datum (YYYY-MM-DD)?', new Date().toISOString().split('T')[0]);
    if (!datum) return;
    const uhrzeit = prompt('Uhrzeit (HH:MM, optional)?') || '';
    const titel = prompt('Titel?');
    if (!titel) return;
    const typ = prompt('Typ? (sitzung, elterngespraech, supervision, konferenz, termin)', 'sitzung') || 'sitzung';

    const klienten = DB.getSchueler();
    let schuelerId = null;
    if (klienten.length > 0) {
      const list = klienten.map((s, i) => `${i + 1}. ${s.vorname} ${s.nachname || ''}`).join('\n');
      const idx = prompt(`Klient (Nummer 1-${klienten.length}, leer = klientenübergreifend):\n\n${list}`);
      if (idx && klienten[parseInt(idx, 10) - 1]) {
        schuelerId = klienten[parseInt(idx, 10) - 1].id;
      }
    }

    DB.createTermin({ datum, uhrzeit, titel, typ, schuelerId });
    showToast('Termin angelegt', 'ok');
    render();
  }

  function del(id) {
    if (!confirm('Termin löschen?')) return;
    DB.deleteTermin(id);
    render();
  }

  function render() {
    const container = document.getElementById('view-container');
    const heute = new Date().toISOString().split('T')[0];
    const all = DB.getTermine();
    const zukunft = all.filter(t => (t.datum || '') >= heute).sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    const vergangen = all.filter(t => (t.datum || '') < heute).sort((a, b) => (b.datum || '').localeCompare(a.datum || '')).slice(0, 20);

    container.innerHTML = `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">📅 Anstehende Termine (${zukunft.length})</div>
          <button class="btn btn-primary" onclick="KalenderView.add()">+ Termin</button>
        </div>
        ${zukunft.length === 0
          ? `<div class="pw-empty"><p>Keine anstehenden Termine.</p></div>`
          : `<div class="pw-list">${zukunft.map(t => `
              <div class="pw-list-item">
                <div>
                  <strong>${Utils.escapeHtml(t.titel || '?')}</strong>
                  <span style="margin-left: 6px; padding: 2px 8px; background: var(--bg-subtle); border-radius: var(--radius-full); font-size: var(--text-xs); color: var(--text-secondary);">${Utils.escapeHtml(t.typ || '')}</span>
                  <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">
                    ${fmtDateTime(t)} · ${Utils.escapeHtml(nameForSchueler(t.schuelerId))}
                  </div>
                </div>
                <button class="pw-btn-icon" onclick="KalenderView.del('${t.id}')" title="Löschen" style="color: var(--text-muted);">🗑️</button>
              </div>`).join('')}</div>`
        }
      </div>

      ${vergangen.length > 0 ? `
        <div class="pw-section">
          <div class="pw-section-title" style="color: var(--text-muted);">Vergangene Termine</div>
          <div class="pw-list" style="margin-top: var(--space-2);">${vergangen.map(t => `
            <div class="pw-list-item" style="opacity: 0.7;">
              <div>
                <strong>${Utils.escapeHtml(t.titel || '?')}</strong>
                <div style="font-size: var(--text-xs); color: var(--text-muted);">
                  ${fmtDateTime(t)} · ${Utils.escapeHtml(nameForSchueler(t.schuelerId))}
                </div>
              </div>
            </div>`).join('')}</div>
        </div>
      ` : ''}
    `;
  }

  return { render, add, del };
})();
