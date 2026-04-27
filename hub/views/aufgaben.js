/* ============================================================
   CASE — Aufgaben View
   ============================================================
   Persönliche Todo-Liste der Fachkraft (cross-client).
   ============================================================ */

const AufgabenView = (function () {
  async function add() {
    const klienten = DB.getSchueler();
    const klientOptions = [{ value: '', label: '— Kein Klient (persönlich) —' }];
    klienten.forEach(s => klientOptions.push({ value: s.id, label: `${s.vorname || ''} ${s.nachname || ''}`.trim() || s.id }));

    const data = await Utils.modalForm({
      title: 'Neue Aufgabe',
      fields: [
        { id: 'titel', label: 'Was ist zu tun?', required: true, placeholder: 'z.B. Bericht für Konferenz schreiben' },
        { id: 'prioritaet', label: 'Priorität', type: 'select', options: [
          { value: 'hoch', label: '🔴 Hoch' },
          { value: 'normal', label: '🔵 Normal' },
          { value: 'niedrig', label: '⚪ Niedrig' },
        ], value: 'normal' },
        { id: 'schuelerId', label: 'Klient', type: 'select', options: klientOptions },
        { id: 'faelligkeit', label: 'Fällig bis', type: 'date' },
      ],
    });
    if (!data) return;
    DB.addAufgabe({ ...data, erledigt: false });
    showToast('Aufgabe hinzugefügt', 'ok');
    render();
  }

  function toggle(id) {
    const aufgaben = DB.getAufgaben();
    const a = aufgaben.find(x => x.id === id);
    if (a) { DB.updateAufgabe(id, { erledigt: !a.erledigt }); render(); }
  }

  function del(id) {
    if (!confirm('Aufgabe löschen?')) return;
    DB.deleteAufgabe(id);
    render();
  }

  function badge(p) {
    const colors = { hoch: 'var(--danger)', normal: 'var(--info)', niedrig: 'var(--text-muted)' };
    return `<span style="padding: 2px 8px; background: ${colors[p] || colors.normal}; color: white; border-radius: var(--radius-full); font-size: var(--text-xs);">${p}</span>`;
  }

  function render() {
    const container = document.getElementById('view-container');
    const all = DB.getAufgaben();
    const offen = all.filter(a => !a.erledigt);
    const erledigt = all.filter(a => a.erledigt).slice(-10);

    container.innerHTML = `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">✅ Aufgaben (${offen.length} offen)</div>
          <button class="btn btn-primary" onclick="AufgabenView.add()">+ Aufgabe</button>
        </div>
        ${offen.length === 0
          ? `<div class="pw-empty"><div class="pw-empty-icon">🎉</div><p>Alles erledigt!</p></div>`
          : `<div class="pw-list">${offen.map(a => `
              <div class="pw-list-item">
                <div style="display: flex; gap: var(--space-3); align-items: center; flex: 1;">
                  <input type="checkbox" onchange="AufgabenView.toggle('${a.id}')" style="width: 20px; height: 20px;">
                  <div style="flex: 1;">
                    <div style="font-weight: var(--font-weight-medium);">${Utils.escapeHtml(a.titel)}</div>
                    <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; display: flex; gap: var(--space-2); align-items: center;">
                      ${badge(a.prioritaet || 'normal')}
                      ${a.faelligkeit ? '· fällig: ' + Utils.formatDate(a.faelligkeit) : ''}
                      ${a.schuelerId ? (() => { const s = DB.getSchuelerById(a.schuelerId); return s ? `· 👤 ${Utils.escapeHtml(s.vorname || '')}` : ''; })() : ''}
                    </div>
                  </div>
                </div>
                <button class="pw-btn-icon" onclick="AufgabenView.del('${a.id}')" title="Löschen" style="color: var(--text-muted);">🗑️</button>
              </div>`).join('')}</div>`
        }
      </div>

      ${erledigt.length > 0 ? `
        <div class="pw-section">
          <div class="pw-section-title" style="color: var(--text-muted);">Erledigt (letzte 10)</div>
          <div class="pw-list" style="margin-top: var(--space-2);">${erledigt.map(a => `
            <div class="pw-list-item" style="opacity: 0.6;">
              <div style="display: flex; gap: var(--space-3); align-items: center;">
                <input type="checkbox" checked onchange="AufgabenView.toggle('${a.id}')">
                <span style="text-decoration: line-through;">${Utils.escapeHtml(a.titel)}</span>
              </div>
            </div>`).join('')}</div>
        </div>
      ` : ''}
    `;
  }

  return { render, add, toggle, del };
})();
