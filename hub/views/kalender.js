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

  async function add() {
    const klienten = DB.getSchueler();
    const klientOptions = [{ value: '', label: '— klientenübergreifend —' }];
    klienten.forEach(s => klientOptions.push({ value: s.id, label: `${s.vorname || ''} ${s.nachname || ''}`.trim() || s.id }));

    const data = await Utils.modalForm({
      title: 'Neuer Termin',
      fields: [
        { id: 'datum', label: 'Datum', type: 'date', value: Utils.today(), required: true },
        { id: 'uhrzeit', label: 'Uhrzeit', type: 'time' },
        { id: 'titel', label: 'Titel', required: true, placeholder: 'z.B. Sitzung mit Lena' },
        { id: 'typ', label: 'Typ', type: 'select', options: [
          { value: 'sitzung', label: '📝 Sitzung' },
          { value: 'elterngespraech', label: '👨‍👩‍👧 Elterngespräch' },
          { value: 'supervision', label: '🎓 Supervision' },
          { value: 'konferenz', label: '🤝 Konferenz' },
          { value: 'termin', label: '📅 Sonstiger Termin' },
        ], value: 'sitzung' },
        { id: 'schuelerId', label: 'Klient', type: 'select', options: klientOptions },
      ],
    });
    if (!data) return;
    DB.createTermin(data);
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

    // Wochen-Grid: aktuelle Woche (Mo-Fr)
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const wochentage = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    const wochenDaten = wochentage.map((tag, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const termine = all.filter(t => t.datum === iso);
      const isHeute = iso === heute;
      return { tag, datum: iso, termine, isHeute, dayNum: d.getDate() };
    });

    container.innerHTML = `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">📅 Kalender</div>
          <button class="btn btn-primary" onclick="KalenderView.add()">+ Termin</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-2); margin-bottom: var(--space-4);">
          ${wochenDaten.map(w => `
            <div style="padding: var(--space-2); border-radius: var(--radius-sm); background: ${w.isHeute ? 'rgba(99,102,241,0.1)' : 'var(--bg-subtle)'}; border: ${w.isHeute ? '2px solid var(--color-app-hub)' : '1px solid var(--border)'}; min-height: 80px;">
              <div style="font-size: 12px; font-weight: 600; color: ${w.isHeute ? 'var(--color-app-hub)' : 'var(--text-muted)'};">${w.tag} ${w.dayNum}</div>
              ${w.termine.length ? w.termine.map(t => `
                <div style="margin-top: 4px; padding: 2px 6px; background: var(--bg-card); border-radius: 4px; font-size: 11px; border-left: 3px solid var(--color-app-hub); cursor: default;" title="${Utils.escapeHtml(t.titel || '')}">
                  ${t.uhrzeit ? `<strong>${t.uhrzeit}</strong> ` : ''}${Utils.escapeHtml(Utils.truncate(t.titel || '?', 15))}
                </div>
              `).join('') : `<div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">—</div>`}
            </div>
          `).join('')}
        </div>

        <h3>Anstehend (${zukunft.length})</h3>
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
