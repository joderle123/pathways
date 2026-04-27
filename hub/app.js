/* ============================================================
   Pathways HUB — Bootstrap & Router
   ============================================================
   Cockpit: Klienten-Verwaltung + Launcher zu allen anderen Apps.
   Lädt /core/-Module und delegiert Rendering an /hub/views/.
   ============================================================ */

// ─── App State ────────────────────────────────────────────────
const APP = {
  currentView: 'home',
  currentSchuelerId: null,
};

// ─── DB Toast-Callback registrieren ───────────────────────────
DB.onQuotaError = (key) => {
  showToast(`Speicher voll für ${key}. Bitte exportieren!`, 'error');
};

// ─── View Router ──────────────────────────────────────────────
const VIEWS = {
  home: { title: '🏠 Dashboard', render: () => HomeView.render() },
  profil: { title: '👤 Klient', render: () => ProfilView.render(APP.currentSchuelerId) },
  kalender: { title: '📅 Kalender', render: () => KalenderView.render() },
  aufgaben: { title: '✅ Aufgaben', render: () => AufgabenView.render() },
  notizen: { title: '📝 Notizen', render: () => NotizenView.render() },
  muster: { title: '🔬 Muster-Erkennung', render: () => renderMusterErkennung() },
  crisis: { title: '🚨 Krise', render: () => CrisisView.render() },
};

function showView(name, schuelerId) {
  if (!VIEWS[name]) { console.warn('Unknown view:', name); return; }
  APP.currentView = name;
  if (schuelerId) APP.currentSchuelerId = schuelerId;

  // Sidebar active state
  document.querySelectorAll('.pw-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === name);
  });

  // Title + content
  document.getElementById('view-title').textContent = VIEWS[name].title;
  const container = document.getElementById('view-container');
  container.innerHTML = '';
  VIEWS[name].render();
}

// ─── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `pw-toast pw-toast-${type}`;
  t.textContent = message;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 200);
  }, 3500);
}

// ─── Schüler-Modal ────────────────────────────────────────────
let editingSchuelerId = null;
function openSchuelerModal(id = null) {
  editingSchuelerId = id;
  document.getElementById('schueler-modal-title').textContent = id ? 'Klient bearbeiten' : 'Neuer Klient';
  if (id) {
    const s = DB.getSchuelerById(id);
    if (!s) return;
    document.getElementById('sf-vorname').value = s.vorname || '';
    document.getElementById('sf-nachname').value = s.nachname || '';
    document.getElementById('sf-geburtsdatum').value = s.geburtsdatum || '';
    document.getElementById('sf-klasse').value = s.klasse || '';
    document.getElementById('sf-eintrittsdatum').value = s.eintrittsdatum || '';
    document.getElementById('sf-risiko').value = s.risiko || 'niedrig';
    document.getElementById('sf-notizen').value = s.allgemeineNotizen || '';
  } else {
    document.getElementById('schueler-form').reset();
    document.getElementById('sf-eintrittsdatum').value = new Date().toISOString().split('T')[0];
  }
  document.getElementById('schueler-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('sf-vorname').focus(), 50);
}

function closeSchuelerModal() {
  document.getElementById('schueler-modal').style.display = 'none';
  editingSchuelerId = null;
}

function saveSchueler() {
  const daten = {
    vorname: document.getElementById('sf-vorname').value.trim(),
    nachname: document.getElementById('sf-nachname').value.trim(),
    geburtsdatum: document.getElementById('sf-geburtsdatum').value,
    klasse: document.getElementById('sf-klasse').value.trim(),
    eintrittsdatum: document.getElementById('sf-eintrittsdatum').value,
    risiko: document.getElementById('sf-risiko').value,
    allgemeineNotizen: document.getElementById('sf-notizen').value.trim(),
  };
  if (!daten.vorname) { showToast('Vorname ist Pflicht', 'error'); return; }
  try {
    if (editingSchuelerId) {
      DB.updateSchueler(editingSchuelerId, daten);
      showToast(`${daten.vorname} aktualisiert`, 'ok');
      Bridge.notify('schueler_updated', { schuelerId: editingSchuelerId });
    } else {
      const neu = DB.createSchueler(daten);
      showToast(`${daten.vorname} angelegt`, 'ok');
      Bridge.notify('schueler_created', { schuelerId: neu.id });
    }
    closeSchuelerModal();
    if (APP.currentView === 'home') HomeView.render();
    if (APP.currentView === 'profil') ProfilView.render(APP.currentSchuelerId);
  } catch (e) {
    showToast('Fehler beim Speichern: ' + e.message, 'error');
  }
}

// ─── Theme Toggle ─────────────────────────────────────────────
function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  const dark = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  localStorage.setItem('pw_app_hub_theme', dark);
  localStorage.setItem('pw_app_case_theme', dark);
}
function applyTheme() {
  const theme = localStorage.getItem('pw_app_hub_theme') || localStorage.getItem('pw_app_case_theme');
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  }
}

// ─── Settings (Stub für Phase B; wird erweitert in D.4) ───────
function showSettings() {
  showToast('Einstellungen kommen in Phase D', 'info');
}

// ─── Muster-Erkennung (Manifest: Pattern im eigenen Caseload) ─
function renderMusterErkennung() {
  const container = document.getElementById('view-container');
  const alle = DB.getSchueler();

  if (alle.length < 2) {
    container.innerHTML = `<div class="pw-empty"><div class="pw-empty-icon">🔬</div><h2>Zu wenig Daten</h2><p>Mindestens 2 Klienten nötig für Muster-Erkennung.</p></div>`;
    return;
  }

  // Profile erstellen: Diagnose-Muster, ACE, Phase, Outcome
  const profile = alle.map(s => {
    const screenings = DB.getScreenings(s.id).filter(x => x.abgeschlossen).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    const latest = screenings[0];
    const scores = latest?.scores || {};
    const anamnese = s.anamnese || [];
    const aceCount = anamnese.filter(id => id.startsWith('ace_')).length;
    const sitzungen = DB.getNotizen(s.id).filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    const roadmap = DB.getRoadmap(s.id);
    const aktivePhase = roadmap?.phasen?.find(p => p.status === 'aktiv');

    const tags = new Set();
    if ((scores['phq-a']?.score || 0) >= 10) tags.add('Depression');
    if ((scores['gad-7']?.score || 0) >= 10) tags.add('Angst');
    if ((scores['pcl-5']?.score || 0) >= 33) tags.add('Trauma');
    if ((scores['sdq']?.subscales?.conduct || 0) >= 4) tags.add('Conduct');
    if ((scores['asrs']?.score || 0) >= 16) tags.add('ADHS');
    if (aceCount >= 4) tags.add('ACE-hoch');
    if (anamnese.some(id => id.startsWith('schul_'))) tags.add('Schul-Belastung');

    const orsTrend = sitzungen.slice(0, 3).map(n => n.soap?.ors_total).filter(v => v !== undefined);
    let verlauf = 'unbekannt';
    if (orsTrend.length >= 2) {
      verlauf = orsTrend[0] > orsTrend[orsTrend.length - 1] + 2 ? 'besserung' : orsTrend[0] < orsTrend[orsTrend.length - 1] - 2 ? 'verschlechterung' : 'stabil';
    }

    return { s, tags: [...tags], aceCount, phase: aktivePhase?.nr || 0, sitzungen: sitzungen.length, verlauf, orsTrend };
  });

  // Ähnliche Klienten finden (Jaccard-Ähnlichkeit auf Tags)
  function jaccard(a, b) {
    const union = new Set([...a, ...b]);
    const inter = a.filter(x => b.includes(x));
    return union.size > 0 ? inter.length / union.size : 0;
  }

  // Tag-Häufigkeiten
  const tagCounts = {};
  profile.forEach(p => p.tags.forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
  const tagsSorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  // Cluster: Klienten mit gleichem Hauptproblem gruppieren
  const cluster = {};
  tagsSorted.forEach(([tag]) => {
    cluster[tag] = profile.filter(p => p.tags.includes(tag));
  });

  // Verlauf-Statistik
  const verlaufStats = { besserung: 0, stabil: 0, verschlechterung: 0, unbekannt: 0 };
  profile.forEach(p => verlaufStats[p.verlauf]++);

  // Ähnlichkeits-Paare (Top 5)
  const paare = [];
  for (let i = 0; i < profile.length; i++) {
    for (let j = i + 1; j < profile.length; j++) {
      const sim = jaccard(profile[i].tags, profile[j].tags);
      if (sim > 0.3) paare.push({ a: profile[i], b: profile[j], sim });
    }
  }
  paare.sort((a, b) => b.sim - a.sim);

  container.innerHTML = `
    <div style="max-width: 900px;">
      <h2>🔬 Muster-Erkennung im Caseload</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-5);">
        Analyse deines gesamten Caseloads: häufige Themen, ähnliche Profile, Verlaufs-Muster.
      </p>

      <div class="pw-card" style="margin-bottom: var(--space-4);">
        <h3>📊 Verlaufs-Übersicht</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); margin-top: var(--space-3);">
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: #10B981;">${verlaufStats.besserung}</div><div style="font-size: 13px; color: var(--text-muted);">Besserung</div></div>
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: #3B82F6;">${verlaufStats.stabil}</div><div style="font-size: 13px; color: var(--text-muted);">Stabil</div></div>
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: #DC2626;">${verlaufStats.verschlechterung}</div><div style="font-size: 13px; color: var(--text-muted);">Verschlechterung</div></div>
          <div style="text-align: center;"><div style="font-size: 28px; font-weight: 700; color: var(--text-muted);">${verlaufStats.unbekannt}</div><div style="font-size: 13px; color: var(--text-muted);">Unbekannt</div></div>
        </div>
      </div>

      <div class="pw-card" style="margin-bottom: var(--space-4);">
        <h3>🏷️ Häufigste Themen im Caseload</h3>
        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-3);">
          ${tagsSorted.map(([tag, count]) => `
            <span style="padding: 6px 14px; background: var(--bg-subtle); border-radius: var(--radius-full); font-size: 14px;">
              <strong>${tag}</strong> <span style="color: var(--text-muted);">(${count})</span>
            </span>
          `).join('') || '<span style="color: var(--text-muted);">Keine Screening-Daten</span>'}
        </div>
      </div>

      ${paare.length > 0 ? `
        <div class="pw-card" style="margin-bottom: var(--space-4);">
          <h3>👥 Ähnliche Profile</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: var(--space-3);">Klienten mit überlappenden Problemfeldern — Erfahrungen können übertragbar sein.</p>
          ${paare.slice(0, 5).map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border);">
              <div>
                <strong>${Utils.escapeHtml(p.a.s.vorname || '?')}</strong> ↔ <strong>${Utils.escapeHtml(p.b.s.vorname || '?')}</strong>
                <div style="font-size: 12px; color: var(--text-muted);">Gemeinsam: ${p.a.tags.filter(t => p.b.tags.includes(t)).join(', ')}</div>
              </div>
              <span style="font-size: 13px; color: var(--color-app-hub); font-weight: var(--font-weight-semibold);">${Math.round(p.sim * 100)}% ähnlich</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${tagsSorted.length > 0 ? `
        <div class="pw-card">
          <h3>🔍 Cluster-Analyse</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: var(--space-3);">Klienten gruppiert nach Hauptproblem.</p>
          ${tagsSorted.slice(0, 5).map(([tag, count]) => `
            <div style="margin-bottom: var(--space-3);">
              <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-1);">${tag} (${count})</div>
              <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                ${cluster[tag].map(p => `
                  <span class="btn" style="font-size: 13px; padding: 4px 10px; cursor: pointer;" onclick="showView('profil','${p.s.id}')">
                    ${Utils.escapeHtml(p.s.vorname || '?')} · ${p.verlauf === 'besserung' ? '↑' : p.verlauf === 'verschlechterung' ? '↓' : '→'}
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// ─── Krise (intern in HUB) ────────────────────────────────────
function openCrisis() {
  showView('crisis');
}

// ─── Bridge: Cross-App Live-Updates empfangen ─────────────────
Bridge.subscribe('screening_completed', e => {
  showToast(`Screening abgeschlossen für Klient ${e.schuelerId?.slice(-4)}`, 'info');
  if (APP.currentView === 'home') HomeView.render();
  if (APP.currentView === 'profil' && APP.currentSchuelerId === e.schuelerId) {
    ProfilView.render(APP.currentSchuelerId);
  }
});
Bridge.subscribe('crisis_alert', e => {
  showToast(`⚠️ Krisen-Alert für Klient ${e.schuelerId?.slice(-4)}`, 'error');
});
Bridge.subscribe('roadmap_updated', e => {
  if (APP.currentView === 'profil' && APP.currentSchuelerId === e.schuelerId) {
    ProfilView.render(APP.currentSchuelerId);
  }
});

// ─── Bootstrap ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  // Deep-Link via URL: ?schueler=xyz&view=crisis
  const params = Bridge.parseQuery();
  if (params.schueler) APP.currentSchuelerId = params.schueler;

  if (params.view === 'crisis') {
    showView('crisis');
  } else if (params.schueler) {
    showView('profil', params.schueler);
  } else {
    showView('home');
  }

  console.log('[HUB] Ready. Bridge:', Bridge.isAvailable() ? 'BroadcastChannel' : 'storage-fallback');
});
