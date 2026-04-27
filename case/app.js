/* ============================================================
   Pathways CASE — Bootstrap & Router
   ============================================================
   Hub-App: Klienten-Verwaltung + Launcher zu allen anderen Apps.
   Lädt /core/-Module und delegiert Rendering an /case/views/.
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
  localStorage.setItem('pw_app_case_theme', document.body.classList.contains('theme-dark') ? 'dark' : 'light');
}
function applyTheme() {
  if (localStorage.getItem('pw_app_case_theme') === 'dark') {
    document.body.classList.add('theme-dark');
  }
}

// ─── Settings (Stub für Phase B; wird erweitert in D.4) ───────
function showSettings() {
  showToast('Einstellungen kommen in Phase D', 'info');
}

// ─── Krise (Direkt-Link zur CRISIS-App) ───────────────────────
function openCrisis() {
  Bridge.openApp('crisis', APP.currentSchuelerId ? { schueler: APP.currentSchuelerId } : {});
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

  // Deep-Link via URL: ?schueler=xyz
  const params = Bridge.parseQuery();
  if (params.schueler) {
    APP.currentSchuelerId = params.schueler;
    showView('profil', params.schueler);
  } else {
    showView('home');
  }

  console.log('[CASE] Ready. Bridge:', Bridge.isAvailable() ? 'BroadcastChannel' : 'storage-fallback');
});
