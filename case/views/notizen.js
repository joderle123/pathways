/* ============================================================
   CASE — Notizen View (persönlich, nicht klient-gebunden)
   ============================================================
   OneNote-style Schnell-Notizen für die Fachkraft.
   ============================================================ */

const NotizenView = (function () {
  function add() {
    const titel = prompt('Titel?');
    if (!titel) return;
    const inhalt = prompt('Inhalt?') || '';
    const tags = (prompt('Tags? (Komma-getrennt, optional)') || '').split(',').map(t => t.trim()).filter(Boolean);
    DB.addPersNotiz({ titel, inhalt, tags });
    showToast('Notiz angelegt', 'ok');
    render();
  }

  function edit(id) {
    const all = DB.getPersNotizen();
    const n = all.find(x => x.id === id);
    if (!n) return;
    const inhalt = prompt('Inhalt:', n.inhalt || '');
    if (inhalt === null) return;
    DB.updatePersNotiz(id, { inhalt });
    render();
  }

  function del(id) {
    if (!confirm('Notiz löschen?')) return;
    DB.deletePersNotiz(id);
    render();
  }

  let searchQuery = '';
  function setSearch(v) { searchQuery = v.toLowerCase(); render(); }

  function render() {
    const container = document.getElementById('view-container');
    let all = DB.getPersNotizen().sort((a, b) => (b.geaendert || b.erstellt || '').localeCompare(a.geaendert || a.erstellt || ''));

    if (searchQuery) {
      all = all.filter(n =>
        (n.titel || '').toLowerCase().includes(searchQuery) ||
        (n.inhalt || '').toLowerCase().includes(searchQuery) ||
        (n.tags || []).some(t => t.toLowerCase().includes(searchQuery))
      );
    }

    container.innerHTML = `
      <div class="pw-section">
        <div class="pw-section-header">
          <div class="pw-section-title">📝 Persönliche Notizen (${all.length})</div>
          <div style="display: flex; gap: var(--space-2);">
            <input placeholder="Suchen…" value="${Utils.escapeHtml(searchQuery)}" oninput="NotizenView.setSearch(this.value)" style="width: 220px;">
            <button class="btn btn-primary" onclick="NotizenView.add()">+ Notiz</button>
          </div>
        </div>
        ${all.length === 0
          ? `<div class="pw-empty"><div class="pw-empty-icon">📝</div><p>Noch keine Notiz.</p></div>`
          : `<div class="pw-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">${all.map(n => `
              <div class="pw-card" onclick="NotizenView.edit('${n.id}')" style="cursor: pointer;">
                <div style="display: flex; justify-content: space-between; gap: var(--space-2);">
                  <strong>${Utils.escapeHtml(n.titel || '(ohne Titel)')}</strong>
                  <button class="pw-btn-icon" onclick="event.stopPropagation(); NotizenView.del('${n.id}')" title="Löschen" style="color: var(--text-muted);">🗑️</button>
                </div>
                <div style="font-size: var(--text-sm); color: var(--text-secondary); margin: var(--space-2) 0; line-height: var(--line-height-relaxed); white-space: pre-wrap;">
                  ${Utils.escapeHtml(Utils.truncate(n.inhalt || '', 240))}
                </div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${(n.tags || []).map(t => `<span style="padding: 2px 8px; background: var(--bg-subtle); border-radius: var(--radius-full); font-size: var(--text-xs);">${Utils.escapeHtml(t)}</span>`).join('')}
                </div>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-2);">
                  ${n.geaendert ? Utils.formatDate(n.geaendert) : Utils.formatDate(n.erstellt || '')}
                </div>
              </div>`).join('')}</div>`
        }
      </div>
    `;
  }

  return { render, add, edit, del, setSearch };
})();
