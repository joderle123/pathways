/* ============================================================
   Pathways ACADEMY — App
   ============================================================
   Lernpfade, CDSS-Wizard, Wissenstest, Gamification.
   ============================================================ */

const KEYS = {
  PROGRESS: 'pw_academy_progress',  // { lernpfadId: { stepId: { completed, completedAt } } }
  XP: 'pw_academy_xp',
  THEME: 'pw_app_academy_theme',
  STREAK: 'pw_academy_streak',
};

const APP = {
  activeTab: 'lernpfade',
  pfade: null,
  cdssTrees: null,
  currentPfad: null,
  currentStep: null,
  currentCdss: null,
  cdssNode: null,
  cdssHistory: [],
};

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `pw-toast pw-toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 200); }, 3000);
}

// ─── Theme ────────────────────────────────────────────────────
function applyTheme() {
  if (localStorage.getItem(KEYS.THEME) === 'dark') document.body.classList.add('theme-dark');
}
function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  localStorage.setItem(KEYS.THEME, document.body.classList.contains('theme-dark') ? 'dark' : 'light');
}

// ─── Progress / XP / Streak ──────────────────────────────────
function getProgress() {
  try { return JSON.parse(localStorage.getItem(KEYS.PROGRESS) || '{}'); }
  catch { return {}; }
}
function setProgress(p) { localStorage.setItem(KEYS.PROGRESS, JSON.stringify(p)); }

function getXP() { return parseInt(localStorage.getItem(KEYS.XP) || '0', 10); }
function addXP(n) {
  const newXP = getXP() + n;
  localStorage.setItem(KEYS.XP, newXP);
  updateGamificationUI();
  Bridge.notify('academy_xp_changed', { xp: newXP });
}

function getLevel(xp) {
  if (xp >= 1000) return { level: 5, label: 'Master', next: null };
  if (xp >= 500)  return { level: 4, label: 'Expert', next: 1000 };
  if (xp >= 200)  return { level: 3, label: 'Practitioner', next: 500 };
  if (xp >= 50)   return { level: 2, label: 'Apprentice', next: 200 };
  return { level: 1, label: 'Novice', next: 50 };
}

function getStreak() {
  try {
    const s = JSON.parse(localStorage.getItem(KEYS.STREAK) || '{}');
    const today = new Date().toISOString().split('T')[0];
    if (!s.lastDay) return 0;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (s.lastDay === today) return s.count || 0;
    if (s.lastDay === yesterday) return s.count || 0;
    return 0; // gap → reset
  } catch { return 0; }
}

function tickStreak() {
  const today = new Date().toISOString().split('T')[0];
  const s = JSON.parse(localStorage.getItem(KEYS.STREAK) || '{}');
  if (s.lastDay === today) return; // schon getickt
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newCount = s.lastDay === yesterday ? (s.count || 0) + 1 : 1;
  localStorage.setItem(KEYS.STREAK, JSON.stringify({ lastDay: today, count: newCount }));
}

function updateGamificationUI() {
  const xp = getXP();
  const lvl = getLevel(xp);
  document.getElementById('ac-xp-num').textContent = xp;
  document.getElementById('ac-level-num').textContent = lvl.level;
  document.getElementById('ac-streak-num').textContent = getStreak();
}

// ─── Tab Routing ──────────────────────────────────────────────
// ─── Mikro-Learning: Tages-Impuls (Manifest: "5 Min pro Tag") ─
const IMPULSE = [
  { typ: 'vignette', titel: 'Fall-Vignette: Schulverweigerung', text: 'Lena, 14, fehlt seit 3 Wochen in der Schule. Die Mutter sagt: "Sie will einfach nicht." Lehrkräfte berichten, dass Lena vorher gemobbt wurde. Frage: Was wäre dein nächster Schritt — und warum?', reflexion: 'Schulverweigerung hat oft multiple Ursachen. Hier: Mobbing als Auslöser, mögliche Angst oder Depression als Maintainer. Nächster Schritt: validierendes Einzelgespräch mit Lena, dann Screening (PHQ-A, GAD-7).', xp: 10 },
  { typ: 'konzept', titel: 'Polyvagaltheorie in 2 Minuten', text: 'Das autonome Nervensystem hat drei Zustände: Sicherheit (ventral-vagal), Kampf/Flucht (sympathisch), Erstarrung (dorsal-vagal). In der Sitzung erkennst du den Zustand an: Blickkontakt vs. Vermeidung, Stimmqualität, Körperhaltung. Frage: Welchen PVT-Zustand zeigt ein Klient, der "abschaltet" und nicht mehr spricht?', reflexion: 'Dorsal-vagaler Shutdown (Erstarrung). Co-Regulation durch ruhige Stimme, Orientierung im Raum, Grounding-Übung. Nicht: mehr Fragen stellen.', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Selbstverletzung', text: 'Karim, 16, zeigt dir frische Schnitte am Unterarm. Er sagt: "Es hilft mir, runterzukommen." Er bittet dich, es niemandem zu sagen. Was tust du?', reflexion: 'Schweigepflicht gilt — aber: Selbstverletzung ist nicht automatisch suizidal. Trotzdem: C-SSRS durchführen. Funktion der Selbstverletzung verstehen (Spannungsabbau). Alternative Skills anbieten (Eiswürfel, Sport). Eltern informieren nur bei akuter Gefahr.', xp: 10 },
  { typ: 'konzept', titel: 'ACE-Score & Langzeitfolgen', text: 'Die Adverse Childhood Experiences-Studie (Felitti 1998) zeigt: ACE ≥ 4 verdoppelt das Depressionsrisiko und verdreifacht das Suizidrisiko. Aber: ACE ist kein Schicksal. Schutzfaktoren (stabile Bezugsperson, Hobbys, Bildungserfolg) können die Auswirkungen puffern.', reflexion: 'In der Praxis: ACE-Score immer erheben, aber nie als Label verwenden. "Du hast ACE 6" sagt weniger als "Welche Erfahrungen haben dich geprägt?"', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Eltern-Widerstand', text: 'Du empfiehlst den Eltern eine psychiatrische Abklärung für ihren 12-jährigen Sohn. Die Mutter reagiert aufgebracht: "Mein Kind ist nicht verrückt!" Wie reagierst du?', reflexion: 'Entstigmatisierung: "Psychiater heißt nicht verrückt — es heißt, wir wollen verstehen, was Ihrem Sohn hilft." Vergleich mit Augenarzt anbieten. Eltern-Sorge validieren. Entscheidung bei ihnen lassen, aber Fakten klar benennen.', xp: 10 },
];

const IMPULS_KEY = 'pw_academy_impuls';

function getTagesImpuls() {
  const tag = new Date().toISOString().split('T')[0];
  const saved = JSON.parse(localStorage.getItem(IMPULS_KEY) || '{}');
  if (saved.tag === tag) return { impuls: IMPULSE[saved.idx], idx: saved.idx, reflektiert: saved.reflektiert };
  const idx = Math.floor(Math.random() * IMPULSE.length);
  localStorage.setItem(IMPULS_KEY, JSON.stringify({ tag, idx, reflektiert: false }));
  return { impuls: IMPULSE[idx], idx, reflektiert: false };
}

function reflektierImpuls() {
  const saved = JSON.parse(localStorage.getItem(IMPULS_KEY) || '{}');
  saved.reflektiert = true;
  localStorage.setItem(IMPULS_KEY, JSON.stringify(saved));
  addXP(IMPULSE[saved.idx]?.xp || 10);
  tickStreak();
  showToast('+10 XP für Tages-Reflexion!', 'ok');
  renderImpuls();
}

function renderImpuls() {
  const { impuls, reflektiert } = getTagesImpuls();
  const container = document.getElementById('ac-content');
  container.innerHTML = `
    <div style="max-width: 700px;">
      <div style="margin-bottom: var(--space-4);">
        <h2 style="font-size: 28px;">💡 Tages-Impuls</h2>
        <p style="color: var(--text-muted); font-size: 14px;">5 Minuten täglich — ${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div class="ac-section" style="border-left: 4px solid var(--color-app-academy);">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-app-academy); margin-bottom: var(--space-2);">${impuls.typ === 'vignette' ? 'Fall-Vignette' : 'Konzept'}</div>
        <h3>${Utils.escapeHtml(impuls.titel)}</h3>
        <p style="font-size: 15px; line-height: var(--line-height-relaxed); margin-top: var(--space-3);">${Utils.escapeHtml(impuls.text)}</p>
      </div>

      ${reflektiert ? `
        <div class="ac-section" style="background: rgba(20,184,166,0.05); border: 1px solid var(--color-app-academy);">
          <h3>💭 Reflexion</h3>
          <p style="font-size: 14px; line-height: var(--line-height-relaxed);">${Utils.escapeHtml(impuls.reflexion)}</p>
          <div style="margin-top: var(--space-3); color: var(--color-app-academy); font-weight: var(--font-weight-semibold);">✓ Reflektiert — +${impuls.xp} XP</div>
        </div>
      ` : `
        <button class="btn btn-primary" onclick="reflektierImpuls()" style="margin-top: var(--space-3);">
          💭 Reflexion aufdecken (+${impuls.xp} XP)
        </button>
      `}
    </div>
  `;
}

// ─── Selbstfürsorge-Check (Manifest: ProQOL) ────────────────
const SELBSTFUERSORGE_ITEMS = [
  'Ich freue mich auf meine Arbeit.',
  'Ich fühle mich durch meine Arbeit erfüllt.',
  'Ich schlafe gut.',
  'Ich habe genug Energie für Hobbys nach der Arbeit.',
  'Ich fühle mich von meinem Team unterstützt.',
  'Ich kann nach Feierabend abschalten.',
  'Ich nehme mir regelmäßig Pausen.',
  'Ich fühle mich emotional stabil.',
  'Ich habe jemanden, mit dem ich über schwierige Fälle spreche.',
  'Ich habe das Gefühl, etwas zu bewirken.',
];

function renderSelbstfuersorge() {
  const container = document.getElementById('ac-content');
  container.innerHTML = `
    <div style="max-width: 700px;">
      <h2 style="font-size: 28px; margin-bottom: var(--space-2);">💚 Selbstfürsorge-Check</h2>
      <p style="color: var(--text-muted); margin-bottom: var(--space-4);">
        Kurzer Check basierend auf ProQOL-Konzepten. Bewerte jede Aussage ehrlich (1–5).
      </p>

      <div id="sf-items">
        ${SELBSTFUERSORGE_ITEMS.map((item, i) => `
          <div class="ac-section" style="padding: var(--space-3) var(--space-4); margin-bottom: var(--space-2);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);">
              <span style="font-size: 14px; flex: 1;">${Utils.escapeHtml(item)}</span>
              <div style="display: flex; gap: 4px;">
                ${[1,2,3,4,5].map(v => `
                  <button class="btn sf-btn" data-item="${i}" data-val="${v}" onclick="this.parentElement.querySelectorAll('.sf-btn').forEach(b=>b.classList.remove('sf-selected'));this.classList.add('sf-selected');">${v}</button>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="btn btn-primary" style="margin-top: var(--space-3);" onclick="auswerteSelbstfuersorge()">Auswerten</button>
      <div id="sf-result"></div>
    </div>
  `;
}

function auswerteSelbstfuersorge() {
  const btns = document.querySelectorAll('.sf-selected');
  if (btns.length < SELBSTFUERSORGE_ITEMS.length) { showToast('Bitte alle Items bewerten', 'info'); return; }
  const total = [...btns].reduce((s, b) => s + parseInt(b.dataset.val), 0);
  const max = SELBSTFUERSORGE_ITEMS.length * 5;
  const pct = Math.round(total / max * 100);

  let farbe, label, text;
  if (pct >= 75) { farbe = '#10B981'; label = 'Stabil'; text = 'Deine Selbstfürsorge ist gut. Weiter so!'; }
  else if (pct >= 50) { farbe = '#F59E0B'; label = 'Aufpassen'; text = 'Einige Bereiche brauchen Aufmerksamkeit. Überlege, was du konkret ändern kannst.'; }
  else { farbe = '#DC2626'; label = 'Handlungsbedarf'; text = 'Mehrere Warnsignale. Sprich mit deiner Supervision oder einem Kollegen. Burnout-Risiko besteht.'; }

  document.getElementById('sf-result').innerHTML = `
    <div class="ac-section" style="margin-top: var(--space-4); border-left: 4px solid ${farbe};">
      <div style="font-size: 28px; font-weight: var(--font-weight-bold); color: ${farbe};">${total}/${max} (${pct}%)</div>
      <div style="font-size: 18px; font-weight: var(--font-weight-semibold); margin-top: var(--space-2);">${label}</div>
      <p style="margin-top: var(--space-2); font-size: 14px; color: var(--text-secondary);">${text}</p>
    </div>
  `;
  addXP(20);
  showToast('+20 XP für Selbstfürsorge-Reflexion', 'ok');
}

function setTab(name) {
  APP.activeTab = name;
  document.querySelectorAll('.ac-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  if (name === 'impuls') renderImpuls();
  else if (name === 'lernpfade') renderPfade();
  else if (name === 'cdss') renderCdssList();
  else if (name === 'wissenstest') renderWissenstest();
  else if (name === 'selbstfuersorge') renderSelbstfuersorge();
  else if (name === 'profil') renderProfil();
}

// ─── Lernpfade ────────────────────────────────────────────────
async function loadPfade() {
  if (APP.pfade) return APP.pfade;
  const res = await fetch('courses/lernpfade-index.json');
  const data = await res.json();
  APP.pfade = data.lernpfade;
  return APP.pfade;
}

async function renderPfade() {
  const container = document.getElementById('ac-content');
  const pfade = await loadPfade();
  const progress = getProgress();

  container.innerHTML = `
    <div style="margin-bottom: var(--space-5);">
      <h2 style="font-size: 28px; margin-bottom: var(--space-2);">📚 Lernpfade</h2>
      <p style="color: var(--text-secondary);">Strukturierte Module mit Lektüre, Quiz und Reflexion. Jeder Schritt bringt XP.</p>
    </div>
    <div class="ac-pfad-grid">
      ${pfade.map(p => {
        const steps = p.schritte || [];
        const completed = steps.filter(s => progress[p.id]?.[s.id]?.completed).length;
        const pct = steps.length ? Math.round(completed / steps.length * 100) : 0;
        return `
          <div class="ac-pfad" onclick="openPfad('${p.id}')">
            <div class="ac-pfad-header">
              <div class="ac-pfad-icon">${p.icon}</div>
              <div>
                <div class="ac-pfad-title">${Utils.escapeHtml(p.titel)}</div>
                <div class="ac-pfad-meta">${p.kategorie} · ${p.dauer} · ${p.xp} XP</div>
              </div>
            </div>
            <div class="ac-pfad-desc">${Utils.escapeHtml(p.beschreibung)}</div>
            <div class="ac-progress"><div class="ac-progress-fill" style="width: ${pct}%;"></div></div>
            <div class="ac-progress-text">
              <span>${completed} / ${steps.length} Schritte</span>
              <span>${pct}%</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function openPfad(id) {
  const pfade = await loadPfade();
  APP.currentPfad = pfade.find(p => p.id === id);
  if (!APP.currentPfad) return;
  renderPfadDetail();
}

function renderPfadDetail() {
  const p = APP.currentPfad;
  const progress = getProgress();
  const container = document.getElementById('ac-content');

  container.innerHTML = `
    <button class="btn" onclick="setTab('lernpfade')" style="margin-bottom: var(--space-3);">← Zurück</button>
    <div class="ac-pfad-detail">
      <div style="display: flex; gap: var(--space-3); align-items: center; margin-bottom: var(--space-3);">
        <div class="ac-pfad-icon" style="width: 64px; height: 64px; font-size: 32px;">${p.icon}</div>
        <div>
          <h2 style="margin: 0;">${Utils.escapeHtml(p.titel)}</h2>
          <div style="color: var(--text-muted);">${p.kategorie} · ${p.dauer} · ${p.xp} XP</div>
        </div>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4); line-height: var(--line-height-relaxed);">${Utils.escapeHtml(p.beschreibung)}</p>

      <h3>Schritte</h3>
      <div class="ac-step-list">
        ${p.schritte.map(s => {
          const done = progress[p.id]?.[s.id]?.completed;
          const icons = { lektuere: '📖', quiz: '❓', reflexion: '💭' };
          return `
            <div class="ac-step ${done ? 'completed' : ''}" onclick="openStep(${s.id})">
              <div class="ac-step-icon">${done ? '✓' : icons[s.typ] || '◯'}</div>
              <div style="flex: 1;">
                <div class="ac-step-title">${Utils.escapeHtml(s.titel)}</div>
                <div class="ac-step-meta">${s.typ}</div>
              </div>
              ${done ? `<div style="color: #10B981;">✓</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function openStep(stepId) {
  const p = APP.currentPfad;
  APP.currentStep = p.schritte.find(s => s.id === stepId);
  if (!APP.currentStep) return;
  renderStep();
}

function renderStep() {
  const s = APP.currentStep;
  const container = document.getElementById('ac-content');

  if (s.typ === 'quiz') {
    container.innerHTML = `<button class="btn" onclick="renderPfadDetail()" style="margin-bottom: var(--space-3);">← Zurück</button>`;
    const quizContainer = document.createElement('div');
    container.appendChild(quizContainer);
    QuizEngine.start(s.fragen, {
      container: quizContainer,
      onComplete: result => {
        if (result.passed && !result.done) {
          markStepDone(s.id, APP.currentPfad.xp / APP.currentPfad.schritte.length);
        }
        if (result.done) {
          renderPfadDetail();
        }
      },
    });
    return;
  }

  let body = '';
  if (s.typ === 'lektuere') {
    body = `<div style="font-size: 16px; line-height: var(--line-height-relaxed); color: var(--text-secondary);">${Utils.escapeHtml(s.inhalt)}</div>`;
  } else if (s.typ === 'reflexion') {
    body = `
      <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: var(--space-4); margin-bottom: var(--space-3);">
        <strong>${Utils.escapeHtml(s.frage)}</strong>
      </div>
      <textarea id="reflexion-text" rows="6" style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit; font-size: 15px;" placeholder="Deine Reflexion (privat, nur lokal gespeichert)…"></textarea>
    `;
  }

  container.innerHTML = `
    <button class="btn" onclick="renderPfadDetail()" style="margin-bottom: var(--space-3);">← Zurück</button>
    <div class="ac-section">
      <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-2);">${s.typ}</div>
      <h2>${Utils.escapeHtml(s.titel)}</h2>
      ${body}
      <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
        <button class="btn btn-primary" onclick="completeStep()">✓ Abgeschlossen</button>
        <button class="btn" onclick="renderPfadDetail()">Später</button>
      </div>
    </div>
  `;
}

function completeStep() {
  const s = APP.currentStep;
  if (s.typ === 'reflexion') {
    const text = document.getElementById('reflexion-text')?.value || '';
    DB.addPersNotiz({
      titel: `Reflexion: ${s.titel}`,
      inhalt: text,
      tags: ['academy', APP.currentPfad.id],
    });
  }
  const xpPerStep = Math.round(APP.currentPfad.xp / APP.currentPfad.schritte.length);
  markStepDone(s.id, xpPerStep);
  renderPfadDetail();
}

function markStepDone(stepId, xp) {
  const progress = getProgress();
  const pid = APP.currentPfad.id;
  if (!progress[pid]) progress[pid] = {};
  if (!progress[pid][stepId]?.completed) {
    progress[pid][stepId] = { completed: true, completedAt: new Date().toISOString() };
    setProgress(progress);
    addXP(xp);
    showToast(`+${xp} XP — Schritt abgeschlossen!`, 'ok');
    tickStreak();
    updateGamificationUI();
  }
}

// ─── CDSS ─────────────────────────────────────────────────────
async function loadCdss() {
  if (APP.cdssTrees) return APP.cdssTrees;
  const res = await fetch('cdss/decision-trees.json');
  const data = await res.json();
  APP.cdssTrees = data.trees;
  return APP.cdssTrees;
}

async function renderCdssList() {
  const trees = await loadCdss();
  const container = document.getElementById('ac-content');
  container.innerHTML = `
    <div style="margin-bottom: var(--space-5);">
      <h2 style="font-size: 28px; margin-bottom: var(--space-2);">🤖 CDSS — Clinical Decision Support</h2>
      <p style="color: var(--text-secondary);">Strukturierte Entscheidungshilfen für komplexe Fälle. Jeder Pfad endet in evidenzbasierten Empfehlungen.</p>
    </div>
    <div class="ac-pfad-grid">
      ${trees.map(t => `
        <div class="ac-pfad" onclick="openCdss('${t.id}')">
          <div class="ac-pfad-header">
            <div class="ac-pfad-icon">${t.icon}</div>
            <div>
              <div class="ac-pfad-title">${Utils.escapeHtml(t.titel)}</div>
              <div class="ac-pfad-meta">CDSS-Wizard</div>
            </div>
          </div>
          <div class="ac-pfad-desc">${Utils.escapeHtml(t.intro)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function openCdss(id) {
  const trees = await loadCdss();
  APP.currentCdss = trees.find(t => t.id === id);
  if (!APP.currentCdss) return;
  APP.cdssNode = APP.currentCdss.start;
  APP.cdssHistory = [];
  renderCdssNode();
}

function renderCdssNode() {
  const tree = APP.currentCdss;
  const node = tree.nodes[APP.cdssNode];
  const container = document.getElementById('ac-content');

  if (node.outcome) {
    container.innerHTML = `
      <button class="btn" onclick="setTab('cdss')" style="margin-bottom: var(--space-3);">← CDSS-Liste</button>
      <div class="ac-cdss-result">
        <div style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-2);">Empfehlung</div>
        <h2>${Utils.escapeHtml(node.outcome)}</h2>
        <h3 style="margin-top: var(--space-4);">Vorgehen</h3>
        <ul style="line-height: var(--line-height-relaxed); font-size: 15px; padding-left: var(--space-4);">
          ${node.empfehlung.map(e => `<li style="margin-bottom: var(--space-2);">${Utils.escapeHtml(e)}</li>`).join('')}
        </ul>
        ${node.module ? `
          <h3 style="margin-top: var(--space-4);">📚 Passende Lernmodule</h3>
          <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
            ${node.module.map(mid => {
              const p = APP.pfade?.find(x => x.id === mid);
              return p ? `<button class="btn" onclick="setTab('lernpfade').then(()=>openPfad('${mid}'))">${p.icon} ${p.titel}</button>` : '';
            }).join('')}
          </div>
        ` : ''}
        <div style="margin-top: var(--space-5); display: flex; gap: var(--space-2);">
          ${APP.cdssHistory.length ? `<button class="btn" onclick="cdssBack()">← Zurück</button>` : ''}
          <button class="btn" onclick="openCdss('${tree.id}')">🔄 Neu starten</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <button class="btn" onclick="setTab('cdss')" style="margin-bottom: var(--space-3);">← CDSS-Liste</button>
    <div class="ac-cdss-q">
      <div style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-2);">${tree.icon} ${tree.titel}</div>
      <h3 style="font-size: 20px; margin-bottom: var(--space-4);">${Utils.escapeHtml(node.frage)}</h3>
      <div style="display: flex; flex-direction: column; gap: var(--space-2);">
        ${node.optionen.map(opt => `
          <button class="btn btn-lg" style="text-align: left; padding: var(--space-3) var(--space-4);" onclick="cdssNext('${opt.next}')">${Utils.escapeHtml(opt.label)}</button>
        `).join('')}
      </div>
      ${APP.cdssHistory.length ? `<button class="btn" style="margin-top: var(--space-3);" onclick="cdssBack()">← Zurück</button>` : ''}
    </div>
  `;
}

function cdssNext(nodeId) {
  APP.cdssHistory.push(APP.cdssNode);
  APP.cdssNode = nodeId;
  renderCdssNode();
}

function cdssBack() {
  if (!APP.cdssHistory.length) return;
  APP.cdssNode = APP.cdssHistory.pop();
  renderCdssNode();
}

// ─── Wissenstest (kombiniertes Quiz) ─────────────────────────
async function renderWissenstest() {
  const pfade = await loadPfade();
  const allQuestions = [];
  pfade.forEach(p => {
    p.schritte.filter(s => s.typ === 'quiz').forEach(s => {
      allQuestions.push(...(s.fragen || []));
    });
  });

  // Shuffle
  for (let i = allQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
  }

  const container = document.getElementById('ac-content');

  if (!allQuestions.length) {
    container.innerHTML = `<div class="pw-empty"><div class="pw-empty-icon">🎯</div><p>Noch keine Quiz-Fragen verfügbar.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom: var(--space-5);">
      <h2 style="font-size: 28px; margin-bottom: var(--space-2);">🎯 Wissenstest</h2>
      <p style="color: var(--text-secondary);">Random ${Math.min(allQuestions.length, 5)} Fragen aus allen Lernpfaden — gemischt.</p>
    </div>
  `;
  const quizContainer = document.createElement('div');
  container.appendChild(quizContainer);

  QuizEngine.start(allQuestions.slice(0, 5), {
    container: quizContainer,
    onComplete: result => {
      if (result.passed && !result.done) {
        addXP(50);
        showToast('+50 XP für Wissenstest!', 'ok');
      }
    },
  });
}

// ─── Profil-Tab ──────────────────────────────────────────────
async function renderProfil() {
  const pfade = await loadPfade();
  const progress = getProgress();
  const xp = getXP();
  const lvl = getLevel(xp);
  const streak = getStreak();

  let totalSteps = 0, completedSteps = 0;
  pfade.forEach(p => {
    totalSteps += p.schritte.length;
    completedSteps += p.schritte.filter(s => progress[p.id]?.[s.id]?.completed).length;
  });
  const completedPfade = pfade.filter(p => p.schritte.every(s => progress[p.id]?.[s.id]?.completed)).length;

  // Badges
  const BADGES = [
    { id: 'first', icon: '🌱', name: 'Erster Schritt', earned: completedSteps >= 1 },
    { id: 'quiz', icon: '🎯', name: 'Quiz-Master', earned: xp >= 100 },
    { id: 'pfad', icon: '📚', name: 'Pfad-Bezwinger', earned: completedPfade >= 1 },
    { id: 'streak3', icon: '🔥', name: '3-Tage-Streak', earned: streak >= 3 },
    { id: 'streak7', icon: '⚡', name: 'Wochen-Champion', earned: streak >= 7 },
    { id: 'lvl3', icon: '⭐', name: 'Practitioner', earned: lvl.level >= 3 },
    { id: 'all', icon: '🏆', name: 'Alle Pfade', earned: completedPfade === pfade.length },
  ];

  const container = document.getElementById('ac-content');
  container.innerHTML = `
    <div style="margin-bottom: var(--space-5);">
      <h2 style="font-size: 28px; margin-bottom: var(--space-2);">👤 Mein Lern-Profil</h2>
    </div>

    <div class="ac-profile-grid">
      <div class="ac-stat-card">
        <div class="ac-stat-card-num">${xp}</div>
        <div class="ac-stat-card-label">XP gesammelt</div>
      </div>
      <div class="ac-stat-card">
        <div class="ac-stat-card-num">${lvl.level}</div>
        <div class="ac-stat-card-label">${lvl.label}</div>
      </div>
      <div class="ac-stat-card">
        <div class="ac-stat-card-num">${completedSteps}/${totalSteps}</div>
        <div class="ac-stat-card-label">Schritte abgeschlossen</div>
      </div>
      <div class="ac-stat-card">
        <div class="ac-stat-card-num">${streak}</div>
        <div class="ac-stat-card-label">Streak (Tage)</div>
      </div>
    </div>

    ${lvl.next ? `
      <div class="ac-section">
        <h3>Fortschritt zum nächsten Level</h3>
        <div class="ac-progress" style="margin-top: var(--space-3);"><div class="ac-progress-fill" style="width: ${Math.min(100, xp / lvl.next * 100)}%;"></div></div>
        <div class="ac-progress-text">
          <span>${xp} XP</span>
          <span>${lvl.next - xp} XP bis Level ${lvl.level + 1}</span>
        </div>
      </div>
    ` : `
      <div class="ac-section" style="background: linear-gradient(135deg, #FEF3C7, #FDE68A); border-color: #F59E0B;">
        <h3>🏆 Maximales Level erreicht!</h3>
        <p>Du hast den höchsten Status erreicht — Master-Level.</p>
      </div>
    `}

    <div class="ac-section">
      <h3>🏅 Abzeichen (${BADGES.filter(b => b.earned).length}/${BADGES.length})</h3>
      <div class="ac-badges-grid">
        ${BADGES.map(b => `
          <div class="ac-badge ${b.earned ? 'earned' : 'locked'}">
            <div class="ac-badge-icon">${b.icon}</div>
            <div class="ac-badge-name">${b.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── Bridge ──────────────────────────────────────────────────
Bridge.subscribe('schueler_updated', () => {
  // ggf. Empfehlungs-Logik
});

// ─── Bootstrap ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  updateGamificationUI();
  setTab('impuls');
});
