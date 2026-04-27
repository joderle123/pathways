/* ============================================================
   VIA — Plan-Views (aus ehem. ROADMAP)
   ============================================================ */

// APP wird von via/app.js bereitgestellt

const STAERKEN = [
  'Kreativität','Empathie','Humor','Durchhaltung','Neugier','Sport',
  'Soziale Kompetenz','Selbstständigkeit','Mut','Akademisches','Dankbarkeit',
  'Freundlichkeit','Teamwork','Hoffnung',
];

// showToast, toggleTheme, applyTheme bereitgestellt von via/app.js

async function loadPhasen() {
  if (APP.phasen) return APP.phasen;
  const data = await Utils.safeFetch('phases/phase-templates.json');
  if (!data) { showToast('Phase-Templates konnten nicht geladen werden', 'error'); return []; }
  APP.phasen = data.phasen;
  return APP.phasen;
}

function getOrCreateRoadmap() {
  let rm = DB.getRoadmap(APP.schuelerId);
  if (!rm) {
    // Migration: alte data.js-Variante hat ROADMAP_PHASEN. Wir nutzen lokale phase-templates.json
    rm = {
      id: DB.generateId(),
      schuelerId: APP.schuelerId,
      screeningId: null,
      phasen: APP.phasen.map(p => ({
        nr: p.nr,
        status: p.nr === 0 ? 'aktiv' : 'offen',
        startDatum: p.nr === 0 ? new Date().toISOString().split('T')[0] : null,
        endDatum: null,
        themen: [],
        notizen: '',
        ziele: [],
      })),
      erstellt: new Date().toISOString(),
      geaendert: new Date().toISOString(),
    };
    DB.saveRoadmap(rm);
  }
  // Sicherstellen, dass ziele-Array existiert
  rm.phasen.forEach(p => { if (!p.ziele) p.ziele = []; });
  return rm;
}

function setPlanTab(name) {
  APP.activeTab = name;
  document.querySelectorAll('.via-sub-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === name));
  if (name === 'phasen') renderPhasen();
  else if (name === 'ziele') renderZiele();
  else if (name === 'staerken') renderStaerken();
  else if (name === 'report') renderReport();
}

// ─── Phasen ───────────────────────────────────────────────
async function renderPhasen() {
  await loadPhasen();
  const container = document.getElementById('via-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="rm-section"><h2>🎯 7-Phasen-Roadmap</h2><p>Kein Klient gewählt.</p></div>`;
    return;
  }
  const rm = getOrCreateRoadmap();
  const aktivePhase = rm.phasen.find(p => p.status === 'aktiv');
  const currentNr = APP.currentPhase ?? aktivePhase?.nr ?? 0;
  const phaseDef = APP.phasen[currentNr];
  const phaseStatus = rm.phasen.find(p => p.nr === currentNr);

  // Stepper
  const stepperHtml = APP.phasen.map(p => {
    const status = rm.phasen.find(x => x.nr === p.nr);
    const isActive = p.nr === currentNr;
    const isDone = status?.status === 'abgeschlossen';
    return `
      <div class="rm-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" onclick="setCurrentPhase(${p.nr})">
        <div class="rm-step-icon">${p.icon}</div>
        <div class="rm-step-num">Phase ${p.nr}</div>
        <div class="rm-step-name">${p.name}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="rm-stepper">${stepperHtml}</div>

    <div class="rm-phase-detail" style="border-top: 4px solid ${phaseDef.color};">
      <div class="rm-phase-header">
        <div class="rm-phase-icon-big" style="background: ${phaseDef.color}22;">${phaseDef.icon}</div>
        <div>
          <h2>Phase ${phaseDef.nr}: ${phaseDef.name}</h2>
          <div class="rm-phase-meta">${phaseDef.dauer} · Status: ${phaseStatus?.status || 'offen'}</div>
        </div>
      </div>

      <div class="rm-phase-ziel">
        <strong>🎯 Ziel:</strong> ${Utils.escapeHtml(phaseDef.ziel)}
      </div>

      <h3>Fokus-Aktivitäten</h3>
      <ul style="line-height: var(--line-height-relaxed); margin-bottom: var(--space-4);">
        ${phaseDef.fokus.map(f => `<li>${Utils.escapeHtml(f)}</li>`).join('')}
      </ul>

      <h3>Übergangs-Kriterien — Bereit für nächste Phase?</h3>
      ${renderKriterienCheck(phaseDef, APP.schuelerId)}

      ${phaseStatus?.reflexion ? `
        <div style="background: rgba(16,185,129,0.06); border: 1px solid var(--color-app-via); border-radius: var(--radius-sm); padding: var(--space-4); margin-bottom: var(--space-4);">
          <h3 style="color: var(--color-app-via); margin-bottom: var(--space-2);">🎓 Abschluss-Reflexion (${Utils.formatDate(phaseStatus.reflexion.datum)})</h3>
          ${phaseStatus.reflexion.gut ? `<div style="margin-bottom: var(--space-2);"><strong>Was hat funktioniert:</strong> ${Utils.escapeHtml(phaseStatus.reflexion.gut)}</div>` : ''}
          ${phaseStatus.reflexion.schwierig ? `<div style="margin-bottom: var(--space-2);"><strong>Was war schwierig:</strong> ${Utils.escapeHtml(phaseStatus.reflexion.schwierig)}</div>` : ''}
          ${phaseStatus.reflexion.hypothese ? `<div><strong>Hypothese:</strong> ${Utils.escapeHtml(phaseStatus.reflexion.hypothese)}</div>` : ''}
        </div>
      ` : ''}

      <h3>Notizen zu dieser Phase</h3>
      <textarea id="phase-notizen" rows="4" style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit;">${Utils.escapeHtml(phaseStatus?.notizen || '')}</textarea>

      <div class="rm-phase-status">
        ${phaseStatus?.status !== 'aktiv' ? `<button class="btn btn-primary" onclick="setPhaseStatus(${currentNr},'aktiv')">▶️ Als aktiv markieren</button>` : ''}
        ${phaseStatus?.status === 'aktiv' ? `<button class="btn" onclick="setPhaseStatus(${currentNr},'abgeschlossen')">✓ Abschließen + nächste Phase aktivieren</button>` : ''}
        <button class="btn" onclick="savePhaseNotizen(${currentNr})">💾 Notizen speichern</button>
      </div>
    </div>
  `;
}

function setCurrentPhase(nr) {
  APP.currentPhase = nr;
  renderPhasen();
}

function setPhaseStatus(nr, status) {
  if (status === 'abgeschlossen') {
    renderPhaseReflexion(nr);
    return;
  }
  applyPhaseStatus(nr, status);
}

function renderKriterienCheck(phaseDef, schuelerId) {
  if (!schuelerId || !phaseDef.kriterien_zur_naechsten) {
    return `<ul style="line-height: var(--line-height-relaxed); margin-bottom: var(--space-4); color: var(--text-secondary);">
      ${(phaseDef.kriterien_zur_naechsten || []).map(k => `<li>⬜ ${Utils.escapeHtml(k)}</li>`).join('')}
    </ul>`;
  }

  const sitzungen = DB.getNotizen(schuelerId).filter(n => n.kategorie === 'session').sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const letzte3SRS = sitzungen.slice(0, 3).map(n => n.soap?.srs_total).filter(v => v !== undefined);
  const avgSRS = letzte3SRS.length ? letzte3SRS.reduce((a, b) => a + b, 0) / letzte3SRS.length : 0;
  const screenings = DB.getScreenings(schuelerId).filter(x => x.abgeschlossen);
  const hatT2 = screenings.length >= 2;
  const orsTrend = sitzungen.slice(0, 5).map(n => n.soap?.ors_total).filter(v => v !== undefined);
  const orsVerbesserung = orsTrend.length >= 2 && orsTrend[0] > orsTrend[orsTrend.length - 1] + 2;
  const staerken = DB.getStaerken ? DB.getStaerken(schuelerId) : null;

  const checks = (phaseDef.kriterien_zur_naechsten || []).map(k => {
    const kLow = k.toLowerCase();
    let erfuellt = false;
    if (kLow.includes('allianz') || kLow.includes('beziehung')) erfuellt = avgSRS >= 32;
    else if (kLow.includes('screening') || kLow.includes('t2')) erfuellt = hatT2;
    else if (kLow.includes('verbesserung') || kLow.includes('fortschritt')) erfuellt = orsVerbesserung;
    else if (kLow.includes('sitzung')) erfuellt = sitzungen.length >= 3;
    else if (kLow.includes('stärken') || kLow.includes('ressourcen')) erfuellt = !!staerken;
    return { text: k, erfuellt };
  });

  const alleErfuellt = checks.every(c => c.erfuellt);
  const erfuelltCount = checks.filter(c => c.erfuellt).length;

  return `
    <div style="margin-bottom: var(--space-4);">
      <ul style="line-height: var(--line-height-relaxed); list-style: none; padding: 0;">
        ${checks.map(c => `
          <li style="padding: var(--space-2) 0; display: flex; gap: var(--space-2); align-items: center;">
            <span style="font-size: 16px;">${c.erfuellt ? '✅' : '⬜'}</span>
            <span style="color: ${c.erfuellt ? '#059669' : 'var(--text-secondary)'};">${Utils.escapeHtml(c.text)}</span>
          </li>
        `).join('')}
      </ul>
      <div style="font-size: 13px; color: ${alleErfuellt ? '#059669' : 'var(--text-muted)'}; margin-top: var(--space-2);">
        ${erfuelltCount}/${checks.length} Kriterien erfüllt.
        ${alleErfuellt ? '<strong>Phase kann abgeschlossen werden.</strong>' : 'Noch nicht alle Kriterien erreicht (Übergang trotzdem möglich).'}
      </div>
    </div>
  `;
}

function renderPhaseReflexion(nr) {
  const container = document.getElementById('via-content');
  const phaseDef = APP.phasen?.[nr];
  container.innerHTML = `
    <div class="rm-section" style="max-width: 700px;">
      <h2>🎓 Phase ${nr} abschließen — Reflexion</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        Bevor diese Phase endet: kurze Reflexion. Was hat funktioniert, was hat überrascht?
        Klinisches Wachstum wird dokumentiert.
      </p>
      <div style="margin-bottom: var(--space-3);">
        <label style="font-weight: var(--font-weight-semibold); display: block; margin-bottom: 4px;">Was hat in dieser Phase gut funktioniert?</label>
        <textarea id="refl-gut" rows="3" style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit;"></textarea>
      </div>
      <div style="margin-bottom: var(--space-3);">
        <label style="font-weight: var(--font-weight-semibold); display: block; margin-bottom: 4px;">Was hat überrascht oder war schwierig?</label>
        <textarea id="refl-schwierig" rows="3" style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit;"></textarea>
      </div>
      <div style="margin-bottom: var(--space-3);">
        <label style="font-weight: var(--font-weight-semibold); display: block; margin-bottom: 4px;">Welche Hypothese hat sich bestätigt / verändert?</label>
        <textarea id="refl-hypothese" rows="2" style="width: 100%; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); font-family: inherit;"></textarea>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <button class="btn btn-primary" onclick="confirmPhaseAbschluss(${nr})">✓ Phase abschließen + Reflexion speichern</button>
        <button class="btn" onclick="renderPhasen()">Abbrechen</button>
      </div>
    </div>
  `;
}

function confirmPhaseAbschluss(nr) {
  const reflexion = {
    gut: document.getElementById('refl-gut')?.value || '',
    schwierig: document.getElementById('refl-schwierig')?.value || '',
    hypothese: document.getElementById('refl-hypothese')?.value || '',
    datum: new Date().toISOString(),
  };
  applyPhaseStatus(nr, 'abgeschlossen', reflexion);
}

function applyPhaseStatus(nr, status, reflexion) {
  const rm = getOrCreateRoadmap();
  const p = rm.phasen.find(x => x.nr === nr);
  if (!p) return;
  p.status = status;
  if (status === 'aktiv') p.startDatum = p.startDatum || new Date().toISOString().split('T')[0];
  if (status === 'abgeschlossen') {
    p.endDatum = new Date().toISOString().split('T')[0];
    if (reflexion) p.reflexion = reflexion;
    const next = rm.phasen.find(x => x.nr === nr + 1);
    if (next && next.status === 'offen') {
      next.status = 'aktiv';
      next.startDatum = new Date().toISOString().split('T')[0];
    }
    rm.phasen.forEach(x => { if (x.nr !== nr && x.nr !== nr+1 && x.status === 'aktiv') x.status = 'offen'; });
  } else if (status === 'aktiv') {
    rm.phasen.forEach(x => { if (x.nr !== nr && x.status === 'aktiv') x.status = 'offen'; });
  }
  DB.saveRoadmap(rm);
  showToast(`Phase ${nr}: Status → ${status}`, 'ok');
  Bridge.notify('roadmap_updated', { schuelerId: APP.schuelerId, phaseNr: nr, status });
  renderPhasen();
}

function savePhaseNotizen(nr) {
  const text = document.getElementById('phase-notizen').value;
  const rm = getOrCreateRoadmap();
  const p = rm.phasen.find(x => x.nr === nr);
  if (p) { p.notizen = text; DB.saveRoadmap(rm); showToast('Notizen gespeichert', 'ok'); }
}

// ─── SMART-Ziele ──────────────────────────────────────────
async function renderZiele() {
  await loadPhasen();
  const container = document.getElementById('via-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="rm-section"><h2>🎲 SMART-Ziele</h2><p>Kein Klient gewählt.</p></div>`;
    return;
  }
  const rm = getOrCreateRoadmap();
  const allGoals = rm.phasen.flatMap(p => (p.ziele || []).map(g => ({ ...g, phaseNr: p.nr })));

  container.innerHTML = `
    <div class="rm-section">
      <h2>🎲 SMART-Ziele</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        Spezifisch, Messbar, Attraktiv (klient-relevant), Realistisch, Terminiert.
        Ziele werden Phasen zugeordnet.
      </p>
      <button class="btn btn-primary" onclick="addZiel()" style="margin-bottom: var(--space-4);">+ Neues SMART-Ziel</button>

      ${allGoals.length === 0
        ? `<div class="pw-empty"><div class="pw-empty-icon">🎯</div><p>Noch keine Ziele definiert.</p></div>`
        : allGoals.map(g => `
            <div class="rm-goal ${g.status === 'erreicht' ? 'done' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="rm-goal-title">${g.status === 'erreicht' ? '✓ ' : ''}${Utils.escapeHtml(g.titel || g.text || '?')}</div>
                <button class="btn" style="padding: 4px 8px; font-size: 12px;" onclick="toggleZiel('${g.id}', ${g.phaseNr})">${g.status === 'erreicht' ? '↻ Re-open' : '✓ Erreicht'}</button>
              </div>
              ${g.beschreibung ? `<div style="font-size: 13px; color: var(--text-secondary); margin: var(--space-2) 0;">${Utils.escapeHtml(g.beschreibung)}</div>` : ''}
              <div class="rm-goal-meta">
                <span>Phase ${g.phaseNr}: ${APP.phasen[g.phaseNr]?.name}</span>
                ${g.terminiert ? `<span>📅 ${Utils.formatDate(g.terminiert)}</span>` : ''}
                <span>${g.status || 'offen'}</span>
              </div>
            </div>
          `).join('')
      }
    </div>
  `;
}

async function addZiel() {
  const rm = getOrCreateRoadmap();
  const phaseOptions = (APP.phasen || []).map(p => ({ value: String(p.nr), label: `Phase ${p.nr}: ${p.name}` }));
  const aktive = rm.phasen.find(p => p.status === 'aktiv');

  const data = await Utils.modalForm({
    title: 'Neues SMART-Ziel',
    fields: [
      { id: 'titel', label: 'Spezifisch + Messbar — Was genau?', required: true, placeholder: 'z.B. "3× pro Woche 20 Min. Sport"' },
      { id: 'beschreibung', label: 'Attraktiv + Realistisch — Warum?', type: 'textarea', rows: 2, placeholder: 'Begründung und Motivation' },
      { id: 'phaseNr', label: 'Welche Phase?', type: 'select', options: phaseOptions, value: String(aktive?.nr || 0) },
      { id: 'terminiert', label: 'Terminiert — Bis wann?', type: 'date' },
    ],
  });
  if (!data) return;

  const phaseNr = parseInt(data.phaseNr, 10);
  const phase = rm.phasen.find(p => p.nr === phaseNr);
  if (!phase) { showToast('Ungültige Phase', 'info'); return; }
  if (!phase.ziele) phase.ziele = [];

  phase.ziele.push({
    id: DB.generateId(),
    titel: data.titel,
    beschreibung: data.beschreibung,
    terminiert: data.terminiert,
    status: 'offen',
    erstellt: new Date().toISOString(),
  });
  DB.saveRoadmap(rm);
  showToast('SMART-Ziel angelegt', 'ok');
  renderZiele();
}

function toggleZiel(id, phaseNr) {
  const rm = getOrCreateRoadmap();
  const phase = rm.phasen.find(p => p.nr === phaseNr);
  if (!phase) return;
  const z = (phase.ziele || []).find(x => x.id === id);
  if (!z) return;
  z.status = z.status === 'erreicht' ? 'offen' : 'erreicht';
  if (z.status === 'erreicht') z.erreichtAm = new Date().toISOString();
  DB.saveRoadmap(rm);
  renderZiele();
}

// ─── Stärken-Profil ───────────────────────────────────────
const STORAGE_STAERKEN = 'pw_staerken';
function getStaerken() {
  try { return JSON.parse(localStorage.getItem(STORAGE_STAERKEN) || '{}'); } catch { return {}; }
}
function saveStaerkenAll(map) { localStorage.setItem(STORAGE_STAERKEN, JSON.stringify(map)); }

function renderStaerken() {
  const container = document.getElementById('via-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="rm-section"><h2>💪 Stärken-Profil</h2><p>Kein Klient gewählt.</p></div>`;
    return;
  }
  const all = getStaerken();
  const data = all[APP.schuelerId] || {};

  container.innerHTML = `
    <div class="rm-section">
      <h2>💪 Stärken-Profil</h2>
      <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
        14 Stärken-Dimensionen. Jede Bewertung 1-10. Stärken sind Ressourcen — fokussiere darauf, nicht nur auf Defizite.
      </p>

      <div class="rm-radar">
        ${STAERKEN.map((name, i) => {
          const val = data[i] || 5;
          return `
            <div class="rm-strength">
              <div class="rm-strength-name">
                <span>${name}</span>
                <span style="color: var(--color-app-roadmap); font-weight: var(--font-weight-bold);">${val}/10</span>
              </div>
              <div class="rm-strength-bar">
                <div class="rm-strength-fill" style="width: ${val * 10}%;"></div>
              </div>
              <input type="range" min="1" max="10" value="${val}" oninput="updateStaerke(${i}, this.value)">
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin-top: var(--space-5);">
        <button class="btn btn-primary" onclick="saveStaerkenForKlient()">💾 Speichern</button>
      </div>
    </div>
  `;
}

function updateStaerke(idx, val) {
  const all = getStaerken();
  if (!all[APP.schuelerId]) all[APP.schuelerId] = {};
  all[APP.schuelerId][idx] = parseInt(val, 10);
  saveStaerkenAll(all);
  renderStaerken();
}

function saveStaerkenForKlient() {
  showToast('Stärken-Profil aktualisiert', 'ok');
  Bridge.notify('staerken_updated', { schuelerId: APP.schuelerId });
}

// ─── Förderplan-Report (druckbar) ─────────────────────────
async function renderReport() {
  await loadPhasen();
  const container = document.getElementById('via-content');
  if (!APP.schuelerId) {
    container.innerHTML = `<div class="rm-section"><h2>📄 Förderplan</h2><p>Kein Klient gewählt.</p></div>`;
    return;
  }
  const s = DB.getSchuelerById(APP.schuelerId);
  const rm = getOrCreateRoadmap();
  const allGoals = rm.phasen.flatMap(p => (p.ziele || []).map(g => ({ ...g, phaseNr: p.nr })));
  const ff = DB.getFallformulierung(APP.schuelerId);

  container.innerHTML = `
    <div style="margin-bottom: var(--space-3); display: flex; gap: var(--space-2);">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Drucken / PDF</button>
      <button class="btn" onclick="exportReportText()">📄 Als Text exportieren</button>
    </div>

    <div class="rm-section">
      <h1 style="margin-bottom: var(--space-3);">Förderplan</h1>
      <h2>${Utils.escapeHtml(`${s?.vorname || ''} ${s?.nachname || ''}`.trim() || 'Klient')}</h2>
      <div style="color: var(--text-muted); margin-bottom: var(--space-4);">
        Erstellt: ${Utils.formatDate(rm.erstellt)} · Geändert: ${Utils.formatDate(rm.geaendert)}
      </div>

      <h3>Phasen-Übersicht</h3>
      ${rm.phasen.map((p, i) => {
        const def = APP.phasen[p.nr];
        return `
          <div style="display: flex; gap: var(--space-2); padding: var(--space-2); border-left: 4px solid ${def.color}; margin-bottom: var(--space-2);">
            <div style="font-size: 24px;">${def.icon}</div>
            <div style="flex: 1;">
              <strong>Phase ${p.nr}: ${def.name}</strong>
              <span style="margin-left: var(--space-2); padding: 2px 8px; border-radius: var(--radius-full); background: var(--bg-subtle); font-size: 11px;">${p.status}</span>
              ${p.startDatum ? `<div style="font-size: 12px; color: var(--text-muted);">${Utils.formatDate(p.startDatum)} ${p.endDatum ? '→ ' + Utils.formatDate(p.endDatum) : ''}</div>` : ''}
              ${p.notizen ? `<div style="font-size: 13px; margin-top: 4px;">${Utils.escapeHtml(p.notizen)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}

      ${allGoals.length ? `
        <h3 style="margin-top: var(--space-5);">SMART-Ziele (${allGoals.length})</h3>
        ${allGoals.map(g => `
          <div style="padding: var(--space-2); border-bottom: 1px solid var(--border);">
            ${g.status === 'erreicht' ? '✓' : '○'} <strong>${Utils.escapeHtml(g.titel || g.text)}</strong>
            <div style="font-size: 12px; color: var(--text-muted);">Phase ${g.phaseNr}${g.terminiert ? ' · ' + Utils.formatDate(g.terminiert) : ''}</div>
          </div>
        `).join('')}
      ` : ''}

      ${ff?.hypothese ? `
        <h3 style="margin-top: var(--space-5);">Hypothese (5P)</h3>
        <div style="padding: var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm); white-space: pre-wrap;">${Utils.escapeHtml(ff.hypothese)}</div>
      ` : ''}
    </div>
  `;
}

function exportReportText() {
  const s = DB.getSchuelerById(APP.schuelerId);
  const rm = getOrCreateRoadmap();
  const allGoals = rm.phasen.flatMap(p => (p.ziele || []).map(g => ({ ...g, phaseNr: p.nr })));
  const lines = [
    'PATHWAYS — FÖRDERPLAN',
    '═══════════════════════════════════',
    `Klient: ${s?.vorname || ''} ${s?.nachname || ''}`,
    `Erstellt: ${Utils.formatDate(rm.erstellt)}`,
    '',
    'PHASEN',
    '═══════════════════════════════════',
  ];
  rm.phasen.forEach(p => {
    const def = APP.phasen[p.nr];
    lines.push(`Phase ${p.nr}: ${def.name} [${p.status}]`);
    if (p.startDatum) lines.push(`  Start: ${Utils.formatDate(p.startDatum)}`);
    if (p.notizen) lines.push(`  Notiz: ${p.notizen}`);
    lines.push('');
  });
  if (allGoals.length) {
    lines.push('SMART-ZIELE');
    lines.push('═══════════════════════════════════');
    allGoals.forEach(g => {
      lines.push(`${g.status === 'erreicht' ? '✓' : '○'} ${g.titel || g.text} (Phase ${g.phaseNr})`);
    });
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foerderplan-${s?.nachname || 'klient'}-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Bridge ───────────────────────────────────────────────
Bridge.subscribe('screening_completed', e => {
  if (e.schuelerId === APP.schuelerId) showToast('Screening abgeschlossen — Hypothesen-Empfehlungen prüfen', 'info');
});

// updateContext und Bootstrap werden von via/app.js bereitgestellt
