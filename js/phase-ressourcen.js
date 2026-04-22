// ============================================================
// PHASEN-RESSOURCEN — Kontextbezogene Werkzeuge pro Phase
// ============================================================

// ---- Suggestion Chips: Klickbare Vorschläge neben Freitext-Feldern ----
function renderSuggestionChips(chips, targetId, mode) {
  // mode: 'append' = Text an Textarea anhängen, 'replace' = Input-Wert ersetzen
  var html = '<div class="suggestion-chips">';
  for (var i = 0; i < chips.length; i++) {
    var chip = chips[i];
    var escaped = chip.replace(/'/g, "\\'");
    html += '<button type="button" class="suggestion-chip" ' +
      'onclick="applySuggestion(\'' + escaped + '\', \'' + targetId + '\', \'' + (mode || 'append') + '\')">' +
      chip + '</button>';
  }
  html += '</div>';
  return html;
}

function applySuggestion(text, targetId, mode) {
  var el = document.getElementById(targetId);
  if (!el) return;
  if (mode === 'replace') {
    el.value = text;
  } else {
    // append mode
    var current = el.value.trim();
    if (current && current.indexOf(text) !== -1) return; // bereits vorhanden
    el.value = current ? current + ', ' + text : text;
  }
  // Trigger onchange
  el.dispatchEvent(new Event('change'));
}

function savePhaseData(key, value) {
  var sid = APP.currentSchuelerId;
  if (!sid) return;
  var roadmap = DB.getRoadmap(sid);
  if (!roadmap) return;
  if (!roadmap.phasenDaten) roadmap.phasenDaten = {};
  roadmap.phasenDaten[key] = value;
  DB.saveRoadmap(roadmap);
}

function getPhaseData(key, fallback) {
  var sid = APP.currentSchuelerId;
  if (!sid) return fallback;
  var roadmap = DB.getRoadmap(sid);
  if (!roadmap || !roadmap.phasenDaten) return fallback;
  return roadmap.phasenDaten[key] !== undefined ? roadmap.phasenDaten[key] : fallback;
}

// Dispatcher
function renderPhaseRessourcen(phase, idx, roadmap) {
  var inhalt = '';
  switch (phase.nr) {
    case 0: inhalt = renderRessourcenPhase0(); break;
    case 1: inhalt = renderRessourcenPhase1(); break;
    case 2: inhalt = renderRessourcenPhase2(); break;
    case 3: inhalt = renderRessourcenPhase3(); break;
    case 4: inhalt = renderRessourcenPhase4(); break;
    case 5: inhalt = renderRessourcenPhase5(); break;
    case 6: inhalt = renderRessourcenPhase6(); break;
    default: return '';
  }
  if (!inhalt) return '';

  return '<div class="phase-ressourcen">' +
    '<div class="phase-ressourcen-header">' +
      '<span class="phase-ressourcen-icon">&#128218;</span> Ressourcen &amp; Werkzeuge' +
    '</div>' +
    inhalt +
  '</div>';
}

// ---- Phase 0: Vorbereitung ----
function renderRessourcenPhase0() {
  var checks = getPhaseData('ueberweisungChecklist', [false, false, false, false, false]);
  var labels = [
    'Einverständniserklärung eingeholt',
    'Bezugspersonen identifiziert',
    'Vorgeschichte dokumentiert',
    'Netzwerk-Kontakte notiert',
    'Erstgespräch geplant'
  ];
  var done = checks.filter(Boolean).length;
  var systemkarte = getPhaseData('systemkarte', '');

  var html = '';

  // Vorlagen-Links
  html += '<div class="phase-res-links">' +
    '<a href="therapie-module/therapiemodul-genogramm.html" target="_blank" class="btn btn-secondary btn-sm phase-res-btn">' +
      '&#127795; Genogramm-Vorlage</a>' +
    '<a href="arbeitsblatter/familie.html" target="_blank" class="btn btn-secondary btn-sm phase-res-btn">' +
      '&#128104;&#8205;&#128105;&#8205;&#128103; Familie-Arbeitsblatt</a>' +
  '</div>';

  // Systemkarte
  html += '<div class="phase-res-section">' +
    '<label class="phase-res-label">&#128506; Systemkarte — Wer ist involviert?</label>' +
    '<textarea class="phase-res-textarea" id="systemkarte-input" ' +
      'placeholder="Eltern, Lehrer, Sozialarbeiter, Therapeut, Jugendgericht, weitere Bezugspersonen..." ' +
      'onchange="savePhaseData(\'systemkarte\', this.value)">' + escapeHtml(systemkarte) + '</textarea>' +
    renderSuggestionChips([
      'Mutter', 'Vater', 'Stiefvater/-mutter', 'Großeltern', 'Pflegeeltern',
      'Klassenlehrer/in', 'Schulpsychologe', 'Schulsozialarbeiter',
      'SCAS', 'OPJ', 'Richter', 'Therapeut/in', 'Kinderarzt'
    ], 'systemkarte-input', 'append') +
  '</div>';

  // Überweisungs-Checkliste
  html += '<div class="phase-res-checklist">' +
    '<div class="phase-res-checklist-header">' +
      '<span class="phase-res-checklist-title">Überweisungs-Checkliste</span>' +
      '<span class="phase-res-checklist-count">' + done + '/5 erledigt</span>' +
    '</div>';

  for (var i = 0; i < labels.length; i++) {
    var checked = checks[i];
    html += '<label class="phase-res-check-item" onclick="toggleUeberweisungCheck(' + i + ')">' +
      '<span class="phase-res-checkbox ' + (checked ? 'checked' : '') + '">' +
        (checked ? '&#10003;' : '') +
      '</span>' +
      '<span' + (checked ? ' class="phase-res-done"' : '') + '>' + labels[i] + '</span>' +
    '</label>';
  }

  html += '</div>';

  // Sicherheits-Ersteinschätzung (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'sicherheit-ersteinschaetzung\')">' +
      '<span class="phase-res-accordion-title">&#9888; Sicherheits-Ersteinschätzung — 5-Punkte-Check</span>' +
      '<span class="phase-res-accordion-toggle" id="sicherheit-ersteinschaetzung-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="sicherheit-ersteinschaetzung">' +
      '<div class="phase-res-tip phase-res-tip-red">' +
        '<strong>VOR dem Erstgespräch abklären:</strong><br><br>' +
        '<strong>1. Suizidalität?</strong> — Gibt es Hinweise auf Suizidgedanken oder -versuche in der Vorgeschichte? Wenn ja: C-SSRS vorbereiten, Krisenplan griffbereit.<br><br>' +
        '<strong>2. Selbstverletzung (SVV)?</strong> — Sind Narben/Verletzungen bekannt? Wenn ja: Nicht dramatisieren, Wundversorgung klären.<br><br>' +
        '<strong>3. Gewalt zu Hause?</strong> — Gibt es Hinweise auf häusliche Gewalt, Vernachlässigung, Missbrauch? Meldepflicht prüfen (Art. 7 Jugendschutzgesetz Luxemburg).<br><br>' +
        '<strong>4. Substanzkonsum?</strong> — Alkohol, Cannabis, andere Substanzen? Akute Intoxikation erkennen können.<br><br>' +
        '<strong>5. Fremdgefährdung?</strong> — Besteht Gefahr für andere (Gewalt, Waffen, Drohungen)? Sicherheitsmaßnahmen planen.' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>Merke:</strong> Bei Ja zu einer der 5 Fragen: NICHT alleine handeln. Leitung informieren, ggf. CePAS/Psychiatrie hinzuziehen. Sicherheit geht VOR Beziehungsaufbau.' +
      '</div>' +
    '</div>' +
  '</div>';

  // Einverständnis & Schweigepflicht (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'einverstaendnis-info\')">' +
      '<span class="phase-res-accordion-title">&#128220; Einverständnis & Schweigepflicht — Was VOR dem Erstgespräch geklärt sein muss</span>' +
      '<span class="phase-res-accordion-toggle" id="einverstaendnis-info-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="einverstaendnis-info">' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>Datenschutz:</strong> Dem Jugendlichen (und den Eltern) erklären: Wer hat Zugang zu den Daten? Was wird dokumentiert? Wer darf was lesen?<br><br>' +
        '<strong>Schweigepflicht:</strong> &laquo;Alles bleibt zwischen uns — AUSSER es besteht Gefahr für dich oder jemand anderen. Dann MUSS ich handeln.&raquo;<br><br>' +
        '<strong>Grenzen der Vertraulichkeit:</strong><br>' +
        '&bull; Suizidalität / SVV → Krisenteam<br>' +
        '&bull; Missbrauch / Misshandlung → Meldepflicht (OPJ)<br>' +
        '&bull; Fremdgefährdung → Leitung + ggf. Polizei<br><br>' +
        '<strong>Einverständnis:</strong> Schriftliche Einwilligung der Eltern für die Bezugsarbeit einholen (bei Minderjährigen). Ab 16: Jugendlicher kann selbst einwilligen (Loi du 22 août 2003).' +
      '</div>' +
    '</div>' +
  '</div>';

  // Vorbereitung Gespräch mit Zuweiser (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'zuweiser-vorbereitung\')">' +
      '<span class="phase-res-accordion-title">&#128222; Vorbereitung — Was brauche ich vom Zuweiser?</span>' +
      '<span class="phase-res-accordion-toggle" id="zuweiser-vorbereitung-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="zuweiser-vorbereitung">' +
      '<div class="phase-res-tip phase-res-tip-green">' +
        '<strong>Checkliste — Diese Infos vom SCAS/OPJ/Schule anfordern:</strong><br><br>' +
        '&#9744; Zuweisungsgrund und Vorgeschichte<br>' +
        '&#9744; Bisherige Maßnahmen (was wurde schon versucht?)<br>' +
        '&#9744; Diagnosen / Befunde (falls vorhanden)<br>' +
        '&#9744; Familiäre Situation (Sorgerecht, Kontaktregelung)<br>' +
        '&#9744; Schulische Situation (Schule, Klasse, Probleme)<br>' +
        '&#9744; Medikation (falls bekannt)<br>' +
        '&#9744; Externe Anbindung (Therapeut, Arzt, andere Dienste)<br>' +
        '&#9744; Besondere Risiken (Suizidalität, Gewalt, Sucht)<br>' +
        '&#9744; Kontaktdaten der Eltern/Erziehungsberechtigten<br>' +
        '&#9744; Was erwartet der Zuweiser von der Bezugsarbeit?' +
      '</div>' +
    '</div>' +
  '</div>';

  return html;
}

function toggleUeberweisungCheck(index) {
  var checks = getPhaseData('ueberweisungChecklist', [false, false, false, false, false]);
  checks[index] = !checks[index];
  savePhaseData('ueberweisungChecklist', checks);
  if (typeof renderRoadmap === 'function') renderRoadmap();
}

// ---- Phase 1: Sicherheit & Beziehung ----
function renderRessourcenPhase1() {
  var html = '';

  // Gesprächsleitfaden Erstgespräch (Accordion)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'leitfaden-erstgespraech\')">' +
      '<span class="phase-res-accordion-title">&#128483; Gesprächsleitfaden Erstgespräch</span>' +
      '<span class="phase-res-accordion-toggle" id="leitfaden-erstgespraech-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="leitfaden-erstgespraech">' +
      '<div class="phase-res-tip phase-res-tip-green">' +
        '<strong>Einstieg:</strong><br>' +
        '&laquo;Schön, dass du da bist. Ich bin [Name] und arbeite hier als Bezugsperson. ' +
        'Mein Job ist es, dich zu unterstützen — nicht dich zu bewerten. Alles was du hier sagst, ' +
        'bleibt zwischen uns, es sei denn, du oder jemand anderes ist in Gefahr. ' +
        'Was beschäftigt dich gerade?&raquo;' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>Wenn blockiert:</strong><br>' +
        'Wenn der Jugendliche schweigt oder abweisend ist: &laquo;Das ist völlig okay. ' +
        'Wir müssen heute nicht über alles reden. Magst du mir stattdessen erzählen, ' +
        'was du in deiner Freizeit gerne machst?&raquo; — Wechsel auf Stärken/Interessen als Einstieg.' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>Abschluss:</strong><br>' +
        '&laquo;Danke, dass du heute hier warst. Nächstes Mal können wir da weitermachen, ' +
        'wo du möchtest. Gibt es etwas, das du dir für unser nächstes Treffen wünschst?&raquo;' +
      '</div>' +
    '</div>' +
  '</div>';

  // Krisenprotokoll-Accordion
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'krisenprotokoll\')">' +
      '<span class="phase-res-accordion-title">&#9888; Krisen-Checkliste: Was tun wenn...</span>' +
      '<span class="phase-res-accordion-toggle" id="krisenprotokoll-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="krisenprotokoll">' +
      '<div class="phase-res-tip phase-res-tip-red">' +
        '<strong>Suizidale Äußerung:</strong><br>' +
        '1. Ruhig bleiben, ernst nehmen<br>' +
        '2. Direkt fragen: &laquo;Denkst du daran, dir etwas anzutun?&raquo;<br>' +
        '3. Nicht allein lassen<br>' +
        '4. Sofort Krisenteam / Notarzt informieren<br>' +
        '5. Dokumentieren (Zeitpunkt, Wortlaut, Maßnahmen)' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>Selbstverletzung entdeckt:</strong><br>' +
        '1. Nicht erschrecken oder Vorwürfe machen<br>' +
        '2. &laquo;Ich sehe, dass es dir nicht gut geht. Magst du mir erzählen, was passiert ist?&raquo;<br>' +
        '3. Wunden versorgen (lassen)<br>' +
        '4. Sicherheitsplan gemeinsam erstellen<br>' +
        '5. Eltern / Therapeut informieren (nach Absprache)' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-purple">' +
        '<strong>Dissoziativer Zustand:</strong><br>' +
        '1. Sanft ansprechen mit Namen<br>' +
        '2. Grounding: &laquo;Kannst du mir 5 Dinge sagen, die du gerade siehst?&raquo;<br>' +
        '3. Kaltes Wasser anbieten, Eiswürfel in die Hand<br>' +
        '4. Nicht anfassen ohne Erlaubnis<br>' +
        '5. Raum geben, Sicherheit signalisieren' +
      '</div>' +
    '</div>' +
  '</div>';

  // Buttons
  html += '<div class="phase-res-links">' +
    '<button class="btn btn-secondary btn-sm phase-res-btn" onclick="showProfilTab(\'staerken\')">' +
      '&#128170; Stärken-Ersterfassung &#8594;</button>' +
    '<a href="arbeitsblatter/krisenplan.html" target="_blank" ' +
      'class="btn btn-secondary btn-sm phase-res-btn">' +
      '&#127384; Krisenplan-Vorlage</a>' +
  '</div>';

  // Beziehungsarbeit: Konkrete Aktivitäten
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'beziehungsarbeit\')">' +
      '<span class="phase-res-accordion-title">&#129309; Beziehungsarbeit — Kennenlern-Aktivitäten</span>' +
      '<span class="phase-res-accordion-toggle" id="beziehungsarbeit-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="beziehungsarbeit">' +
      '<div style="font-size:12px;color:#6B7280;margin-bottom:10px;line-height:1.6;">' +
        'Beziehungsaufbau ist das Fundament. Ohne Vertrauen keine Veränderung. ' +
        'Nutze diese Aktivitäten in den ersten Sitzungen — <strong>keine Arbeit an Problemen</strong>, nur Kennenlernen.' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-green">' +
        '<strong>&#127922; Gemeinsames Spiel (15-20 Min)</strong><br>' +
        'Kartenspiel, Brettspiel oder gemeinsam zeichnen. Keine therapeutische Absicht — einfach zusammen sein. ' +
        'Zeigt dem Jugendlichen: &laquo;Du musst hier nicht funktionieren.&raquo;<br>' +
        '<em>Geeignet für: Erste 1-3 Sitzungen</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>&#128172; Interessen-Interview (10-15 Min)</strong><br>' +
        '&laquo;Erzähl mir von dir — nicht von Problemen. Was machst du gerne? Musik? Gaming? Sport?&raquo;<br>' +
        'Höre zu, frage nach, zeige echtes Interesse. Merke dir Details für spätere Sitzungen!<br>' +
        '<em>Geeignet für: Sitzung 1-2</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>&#128694; Walking &amp; Talking (20-30 Min)</strong><br>' +
        'Rausgehen, spazieren, nebeneinander laufen. Kein Augenkontaktzwang. ' +
        'Viele Jugendliche öffnen sich leichter in Bewegung als am Tisch.<br>' +
        '<em>Geeignet für: Jugendliche die Sitzen schwer finden (ADHS, Traumatisierte)</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-purple">' +
        '<strong>&#127912; Kreativ-Zugang (15-20 Min)</strong><br>' +
        'Gemeinsam eine Collage über Interessen machen, Playlist erstellen, oder ein kurzes Comic zeichnen. ' +
        'Zugang über Kreativität statt Worte — besonders gut bei Sprachbarrieren oder Zurückhaltung.<br>' +
        '<em>Geeignet für: Nonverbale Jugendliche, Migrations-Hintergrund</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-green">' +
        '<strong>&#128203; Stärken-Spotlight (10 Min)</strong><br>' +
        'Am Ende jeder Sitzung: &laquo;Was hat mich heute beeindruckt: [konkrete Stärke benennen].&raquo;<br>' +
        'Beispiel: &laquo;Du hast heute mutig erzählt, wie es dir geht. Das zeigt Offenheit.&raquo;<br>' +
        '<em>Geeignet für: Jede Sitzung in Phase 1</em>' +
      '</div>' +
      '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px;margin-top:8px;font-size:11px;color:#166534;line-height:1.5;">' +
        '<strong>Beziehungsarbeit-Checkliste:</strong><br>' +
        '&#10003; Ich komme pünktlich (Zuverlässigkeit)<br>' +
        '&#10003; Ich halte Versprechen (Vorhersagbarkeit)<br>' +
        '&#10003; Ich urteile nicht (Akzeptanz)<br>' +
        '&#10003; Ich sage was ich tue und tue was ich sage (Transparenz)<br>' +
        '&#10003; Ich frage nach Erlaubnis bevor ich Themen anspreche (Autonomie)<br>' +
        '&#10003; Ich benenne was gut läuft (Stärkenorientierung)' +
      '</div>' +
    '</div>' +
  '</div>';

  // Hinweis
  html += '<div class="phase-res-info phase-res-info-yellow">' +
    '&#9888; <strong>Noch keine Arbeitsblätter in dieser Phase</strong> — erst Beziehung aufbauen. ' +
    'Arbeitsblätter kommen ab Phase 4 (Intervention).' +
  '</div>';

  return html;
}

function togglePhaseAccordion(id) {
  var body = document.getElementById(id);
  var toggle = document.getElementById(id + '-toggle');
  if (!body) return;
  var isOpen = body.classList.contains('open');
  body.classList.toggle('open');
  if (toggle) {
    toggle.textContent = isOpen ? '\u25BC Aufklappen' : '\u25B2 Zuklappen';
  }
}
// ---- Phase 2: Exploration ----
function renderRessourcenPhase2() {
  var sid = APP.currentSchuelerId;
  var screenings = DB.getScreenings(sid).filter(function(s) { return s.abgeschlossen; });
  var hasScreening = screenings.length > 0;
  var has5P = !!DB.getFallformulierung(sid);

  var html = '';

  // Buttons
  html += '<div class="phase-res-links">' +
    '<button class="btn ' + (hasScreening ? 'btn-secondary' : 'btn-primary') + ' btn-sm phase-res-btn" ' +
      'onclick="showProfilTab(\'screening\')">' +
      '&#128270; ' + (hasScreening ? 'Screening anzeigen' : 'Screening starten') + ' &#8594;</button>' +
    '<button class="btn ' + (has5P ? 'btn-secondary' : 'btn-primary') + ' btn-sm phase-res-btn" ' +
      'onclick="showProfilTab(\'fallformulierung\')">' +
      '&#129513; ' + (has5P ? '5P-Formulation öffnen' : '5P-Formulation starten') + ' &#8594;</button>' +
  '</div>';

  // Status-Badges
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
    '<span class="phase-res-badge ' + (hasScreening ? 'phase-res-badge-ok' : 'phase-res-badge-wait') + '">' +
      (hasScreening ? '&#10003; Screening durchgeführt' : '&#9203; Screening ausstehend') + '</span>' +
    '<span class="phase-res-badge ' + (has5P ? 'phase-res-badge-ok' : 'phase-res-badge-wait') + '">' +
      (has5P ? '&#10003; 5P-Analyse vorhanden' : '&#9203; 5P-Analyse ausstehend') + '</span>' +
  '</div>';

  // Wenn Screening vorhanden: Top-Problembereiche anzeigen
  if (hasScreening) {
    var latest = screenings.sort(function(a, b) {
      return new Date(b.datum) - new Date(a.datum);
    })[0];
    var flagged = [];
    for (var domId in latest.scores) {
      var dom = SCREENING_DOMAINS.find(function(d) { return d.id === domId; });
      if (dom && !dom.invertiert && latest.scores[domId] >= dom.cutoff) {
        flagged.push({ id: domId, score: latest.scores[domId], domain: dom });
      }
    }
    flagged.sort(function(a, b) { return b.score - a.score; });

    if (flagged.length > 0) {
      html += '<div class="phase-res-section">' +
        '<label class="phase-res-label">&#128200; Auffällige Bereiche aus Screening</label>' +
        '<div class="phase-res-cards">';
      var maxShow = Math.min(flagged.length, 4);
      for (var i = 0; i < maxShow; i++) {
        var f = flagged[i];
        html += '<div class="phase-res-card" style="border:1.5px solid ' + f.domain.farbe + '40;border-top:3px solid ' + f.domain.farbe + ';">' +
          '<div style="font-size:16px;margin-bottom:4px;">' + f.domain.icon + '</div>' +
          '<div style="font-size:12px;font-weight:600;color:#1F2937;">' + f.domain.label + '</div>' +
          '<div style="font-size:11px;color:#6B7280;margin-top:2px;">Score: ' + f.score + ' (Cutoff: ' + f.domain.cutoff + ')</div>' +
        '</div>';
      }
      html += '</div></div>';
    }
  }

  // Exploration-Arbeitsblätter: Wenn Screening vorhanden, passende Arbeitsblätter zu den auffälligen Bereichen zeigen
  if (hasScreening) {
    var latest2 = screenings.sort(function(a, b) { return new Date(b.datum) - new Date(a.datum); })[0];
    var abFlagged = [];
    for (var domId2 in latest2.scores) {
      var dom2 = SCREENING_DOMAINS.find(function(d) { return d.id === domId2; });
      if (dom2 && !dom2.invertiert && latest2.scores[domId2] >= dom2.cutoff) {
        abFlagged.push({ id: domId2, domain: dom2 });
      }
    }
    if (abFlagged.length > 0) {
      html += '<div class="phase-res-section">' +
        '<label class="phase-res-label">&#128196; Arbeitsblätter zum Kennenlernen der Problembereiche</label>' +
        '<div style="font-size:11px;color:#6B7280;margin-bottom:8px;">Diese Arbeitsblätter helfen, die auffälligen Bereiche im Gespräch zu vertiefen — noch keine Intervention, sondern Exploration.</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;">';
      for (var ab = 0; ab < abFlagged.length; ab++) {
        var abItem = abFlagged[ab];
        var abWs = findWorksheetsForThema(abItem.id);
        if (abWs.length > 0) {
          html += '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;">' +
            '<div style="font-size:12px;font-weight:600;margin-bottom:4px;">' + abItem.domain.icon + ' ' + abItem.domain.label + '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
          for (var abw = 0; abw < abWs.length; abw++) {
            html += '<a href="arbeitsblatter/' + abWs[abw] + '" target="_blank" ' +
              'class="btn btn-secondary btn-sm phase-res-btn" style="font-size:11px;">' +
              '&#128196; ' + abWs[abw].replace('.html', '').replace(/-/g, ' ') + '</a>';
          }
          html += '</div></div>';
        }
      }
      html += '</div></div>';
    }
  }

  // Hinweis
  html += '<div class="phase-res-info phase-res-info-blue">' +
    '&#8505; <strong>Themen-Auswahl erst nach der 5P-Formulation.</strong> Erst verstehen, dann planen.' +
  '</div>';

  return html;
}

// ---- Phase 3: Ziele & Plan ----
function renderRessourcenPhase3() {
  var sid = APP.currentSchuelerId;
  var screenings = DB.getScreenings(sid).filter(function(s) { return s.abgeschlossen; });
  var html = '';

  // Buttons
  html += '<div class="phase-res-links">' +
    '<button class="btn btn-primary btn-sm phase-res-btn" onclick="showProfilTab(\'ziele\')">' +
      '&#127919; SMART-Ziele definieren &#8594;</button>' +
    '<button class="btn btn-secondary btn-sm phase-res-btn" onclick="druckeRoadmap()">' +
      '&#128424; Behandlungsplan drucken</button>' +
  '</div>';

  // Empfohlene Themen basierend auf Screening
  if (screenings.length > 0) {
    var latest = screenings.sort(function(a, b) {
      return new Date(b.datum) - new Date(a.datum);
    })[0];

    // Flagged domains über Cutoff
    var flagged = [];
    for (var domId in latest.scores) {
      var dom = SCREENING_DOMAINS.find(function(d) { return d.id === domId; });
      if (dom && !dom.invertiert && latest.scores[domId] >= dom.cutoff) {
        flagged.push({ id: domId, score: latest.scores[domId], domain: dom });
      }
    }
    flagged.sort(function(a, b) { return b.score - a.score; });

    if (flagged.length > 0) {
      html += '<div class="phase-res-section">' +
        '<label class="phase-res-label">&#127919; Empfohlene Themen (basierend auf Screening)</label>' +
        '<div class="phase-res-cards">';

      var shown = Math.min(flagged.length, 3);
      for (var i = 0; i < shown; i++) {
        var f = flagged[i];
        var themen = SCREENING_THEMA_MAP[f.id] || [];
        var erstesThema = themen[0] || null;
        var themaTitel = '';

        if (erstesThema) {
          for (var k = 0; k < THEMEN_KATEGORIEN.length; k++) {
            var kat = THEMEN_KATEGORIEN[k];
            for (var j = 0; j < kat.themen.length; j++) {
              if (kat.themen[j].id === erstesThema) {
                themaTitel = kat.themen[j].titel;
                break;
              }
            }
            if (themaTitel) break;
          }
        }

        var onclick = erstesThema ? 'onclick="openRoadmapThema(\'' + erstesThema + '\')"' : '';
        html += '<div class="phase-res-card" style="border:1.5px solid ' + f.domain.farbe + '40;border-top:3px solid ' + f.domain.farbe + ';" ' + onclick + '>' +
          '<div style="font-size:16px;margin-bottom:4px;">' + f.domain.icon + '</div>' +
          '<div style="font-size:12px;font-weight:600;color:#1F2937;">' + f.domain.label + '</div>' +
          '<div style="font-size:11px;color:#6B7280;margin-top:2px;">Score: ' + f.score + '</div>' +
          (themaTitel ? '<div style="font-size:11px;color:' + f.domain.farbe + ';margin-top:4px;">&#8594; ' + themaTitel + '</div>' : '') +
        '</div>';
      }
      html += '</div></div>';
    }
  }

  // Accordion: SMART-Ziele Anleitung
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'smart-anleitung\')">' +
      '<span class="phase-res-accordion-title">&#128161; Wie formuliere ich SMART-Ziele?</span>' +
      '<span class="phase-res-accordion-toggle" id="smart-anleitung-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="smart-anleitung">' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>S</strong>pezifisch — Was genau soll erreicht werden?<br>' +
        '<em>Nicht: &laquo;Besser in der Schule&raquo; — Sondern: &laquo;Mathe-Note von 5 auf 4 verbessern&raquo;</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-green">' +
        '<strong>M</strong>essbar — Woran erkenne ich den Fortschritt?<br>' +
        '<em>&laquo;3 von 5 Hausaufgaben pro Woche abgeben&raquo;</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>A</strong>ttraktiv — Warum ist das Ziel wichtig für den Jugendlichen?<br>' +
        '<em>&laquo;Damit ich meinen Wunschberuf ergreifen kann&raquo;</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-purple">' +
        '<strong>R</strong>ealistisch — Ist es in dieser Phase erreichbar?<br>' +
        '<em>Kleine Schritte statt Riesensprünge</em>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>T</strong>erminiert — Bis wann?<br>' +
        '<em>&laquo;Bis Ende des Semesters&raquo; oder &laquo;In 4 Wochen&raquo;</em>' +
      '</div>' +
    '</div>' +
  '</div>';

  // Ziel-Priorisierungsmatrix (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'ziel-priorisierung\')">' +
      '<span class="phase-res-accordion-title">&#128200; Ziel-Priorisierungsmatrix: Dringend vs. Wichtig</span>' +
      '<span class="phase-res-accordion-toggle" id="ziel-priorisierung-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="ziel-priorisierung">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
        '<div style="background:#FEE2E2;border:2px solid #EF4444;border-radius:8px;padding:10px;"><strong style="color:#B91C1C;">&#128680; Dringend + Wichtig</strong><br><span style="font-size:11px;color:#991B1B;">SOFORT angehen<br>z.B. Suizidalität, akute Krise, SVV, Gewalt</span></div>' +
        '<div style="background:#DBEAFE;border:2px solid #3B82F6;border-radius:8px;padding:10px;"><strong style="color:#1D4ED8;">&#128197; Wichtig, nicht dringend</strong><br><span style="font-size:11px;color:#1E40AF;">Planen und dranbleiben<br>z.B. Selbstwert, Beziehung, Schule, Emotionsregulation</span></div>' +
        '<div style="background:#FEF9C3;border:2px solid #EAB308;border-radius:8px;padding:10px;"><strong style="color:#A16207;">&#9889; Dringend, nicht wichtig</strong><br><span style="font-size:11px;color:#92400E;">Delegieren/kurzfristig lösen<br>z.B. Konflikt mit Mitbewohner, organisatorische Probleme</span></div>' +
        '<div style="background:#F3F4F6;border:2px solid #9CA3AF;border-radius:8px;padding:10px;"><strong style="color:#4B5563;">&#128274; Weder dringend noch wichtig</strong><br><span style="font-size:11px;color:#6B7280;">Bewusst weglassen<br>z.B. Wunsch-Themen die ablenken, &laquo;Nice to have&raquo;</span></div>' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>Tipp:</strong> Max. 2-3 Ziele gleichzeitig. Priorisiere nach: 1) Sicherheit, 2) Stabilität, 3) Entwicklung. Nie mehr als 1 Ziel aus dem &laquo;Dringend+Wichtig&raquo;-Feld gleichzeitig bearbeiten.' +
      '</div>' +
    '</div>' +
  '</div>';

  // MI Quick-Guide (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'mi-quickguide\')">' +
      '<span class="phase-res-accordion-title">&#128172; Motivational Interviewing — Quick-Guide (OARS)</span>' +
      '<span class="phase-res-accordion-toggle" id="mi-quickguide-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="mi-quickguide">' +
      '<div class="phase-res-tip phase-res-tip-green">' +
        '<strong>O — Open Questions (Offene Fragen)</strong><br>' +
        '&laquo;Was wünschst du dir?&raquo; statt &laquo;Willst du das ändern?&raquo;<br>' +
        '&laquo;Wie siehst du das?&raquo; statt &laquo;Findest du das gut?&raquo;' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>A — Affirmations (Bestätigungen)</strong><br>' +
        '&laquo;Du bist heute trotz allem gekommen — das zeigt Stärke.&raquo;<br>' +
        '&laquo;Dass du darüber nachdenkst, sagt mir viel über dich.&raquo;' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-purple">' +
        '<strong>R — Reflections (Spiegeln)</strong><br>' +
        'Einfach: &laquo;Du sagst, du willst aufhören, aber es fällt dir schwer.&raquo;<br>' +
        'Komplex: &laquo;Es klingt so, als ob du hin- und hergerissen bist zwischen der Sicherheit des Alten und der Angst vor dem Neuen.&raquo;' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>S — Summaries (Zusammenfassungen)</strong><br>' +
        '&laquo;Lass mich zusammenfassen: Einerseits ... andererseits ... Und was ich besonders höre ist...&raquo;<br>' +
        'Immer den Change Talk am Ende betonen!' +
      '</div>' +
    '</div>' +
  '</div>';

  // Was wenn keine Ziele (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'keine-ziele\')">' +
      '<span class="phase-res-accordion-title">&#129300; Was wenn der Jugendliche keine Ziele hat?</span>' +
      '<span class="phase-res-accordion-toggle" id="keine-ziele-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="keine-ziele">' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>3-Schritte-Anleitung:</strong><br><br>' +
        '<strong>Schritt 1: Normalisieren</strong><br>' +
        '&laquo;Es ist total OK, wenn du gerade kein Ziel hast. Viele Jugendliche wissen am Anfang nicht, was sie wollen — das ist normal.&raquo;<br><br>' +
        '<strong>Schritt 2: Indirekt fragen</strong><br>' +
        'Statt &laquo;Was willst du erreichen?&raquo; → &laquo;Was nervt dich gerade am meisten?&raquo; oder &laquo;Wenn eine Fee dir einen Wunsch erfüllen könnte — was wäre das?&raquo; oder &laquo;Was soll in 3 Monaten anders sein?&raquo;<br><br>' +
        '<strong>Schritt 3: Mikroziele setzen</strong><br>' +
        'Wenn wirklich nichts kommt: Beziehungsziel setzen. &laquo;Unser Ziel für die nächsten 3 Wochen: Wir treffen uns 1x pro Woche und du entscheidest worüber wir reden.&raquo; Das IST ein valides Ziel.' +
      '</div>' +
    '</div>' +
  '</div>';

  return html;
}
// ---- Phase 4: Intervention — PVT-gesteuertes Werkzeug ----
function renderRessourcenPhase4() {
  var sid = APP.currentSchuelerId;
  var roadmap = DB.getRoadmap(sid);
  if (!roadmap) return '';

  // Letzte PVT-Zustand aus Sitzungen ermitteln
  var notizen = DB.getNotizen(sid)
    .filter(function(n) { return n.soap && n.soap.pvt; })
    .sort(function(a, b) { return new Date(b.datum) - new Date(a.datum); });
  var lastPVT = notizen.length > 0 ? notizen[0].soap.pvt : null;

  // Aktive Phase-Themen
  var phase4 = roadmap.phasen.find(function(p) { return p.nr === 4; });
  var themenIds = phase4 ? phase4.themen : [];

  var html = '';

  // Phase 4 Anleitung — Was wird erwartet?
  html += '<div style="background:linear-gradient(135deg,#EFF6FF,#F0FDF4);border:1px solid #BAE6FD;border-radius:10px;padding:14px;margin-bottom:14px;">' +
    '<div style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:8px;">&#128736; Phase 4: Intervention — So gehst du vor</div>' +
    '<div style="font-size:12px;color:#374151;line-height:1.7;">' +
      '<strong>Was ist das Ziel?</strong> Die in der 5P-Analyse identifizierten Perpetuating-Faktoren (aufrechterhaltende Faktoren) gezielt bearbeiten.<br><br>' +
      '<strong>Was tust du in jeder Sitzung?</strong>' +
      '<ol style="margin:6px 0 6px 18px;padding:0;">' +
        '<li><strong>PVT-Check</strong> — Prüfe den Nervensystem-Zustand. Bei „eingefroren" erst Grounding, bei „angespannt" erst Co-Regulation.</li>' +
        '<li><strong>Thema wählen</strong> — Nimm das nächste Thema aus der Liste unten. Die Reihenfolge orientiert sich am PVT-Zustand.</li>' +
        '<li><strong>Therapiemodul öffnen</strong> — Klicke auf das Modul. Es enthält ein durchgeskriptetes 60-Min-Programm mit Minute-für-Minute-Anleitung.</li>' +
        '<li><strong>Arbeitsblatt einsetzen</strong> — Begleitend zum Modul gibt es druckbare Arbeitsblätter.</li>' +
        '<li><strong>SOAP dokumentieren</strong> — Nach jeder Sitzung: Was wurde besprochen? Wie hat der Schüler reagiert? Was sind die nächsten Schritte?</li>' +
      '</ol>' +
      '<strong>Wann ist Phase 4 abgeschlossen?</strong> Wenn alle zugeordneten Themen bearbeitet sind ODER die SMART-Ziele erreicht sind (mind. 70% Fortschritt).' +
    '</div>' +
  '</div>';

  // PVT-Filter
  html += '<div class="phase-res-section">' +
    '<label class="phase-res-label">&#129504; Nervensystem-Status &#8594; Was ist heute möglich?</label>';

  if (lastPVT) {
    html += '<div style="font-size:11px;color:#6B7280;margin-bottom:8px;">' +
      'Letzter Check-in: <strong>' + pvtLabel(lastPVT) + '</strong></div>';
  }

  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">';
  var states = [
    { id: 'safe', label: '&#128994; Sicher', farbe: '#059669', active: lastPVT === 'safe' },
    { id: 'activated', label: '&#128993; Angespannt', farbe: '#D97706', active: lastPVT === 'activated' },
    { id: 'frozen', label: '&#128995; Eingefroren', farbe: '#7C3AED', active: lastPVT === 'frozen' }
  ];
  for (var i = 0; i < states.length; i++) {
    var st = states[i];
    html += '<button class="pvt-filter-btn' + (st.active ? ' active' : '') + '" ' +
      'style="border-color:' + st.farbe + ';color:' + st.farbe + ';' +
      (st.active ? 'background:' + st.farbe + ';color:#fff;' : '') + '" ' +
      'onclick="setPhase4PVTFilter(\'' + st.id + '\')">' +
      st.label + '</button>';
  }
  html += '</div>';

  // PVT-basierte Empfehlung
  var pvtFilter = getPhaseData('pvtFilter', lastPVT || 'safe');
  html += renderPVTEmpfehlung(pvtFilter);
  html += '</div>';

  // Aktive Themen + passende Arbeitsblätter (PVT-gefiltert)
  if (themenIds.length > 0) {
    var groundingIds = ['krisenintervention', 'trauma', 'emotionserkennung', 'stress-angst', 'impulskontrolle'];
    var coregIds = ['emotionsregulation', 'stress-angst', 'impulskontrolle', 'wut', 'achtsamkeit', 'selbstfuersorge'];
    var showAll = getPhaseData('pvtShowAll', false);

    // PVT-Filter-Banner
    if (pvtFilter === 'frozen' && !showAll) {
      html += '<div class="phase-res-tip phase-res-tip-purple" style="margin-bottom:10px;">' +
        '&#128995; <strong>Eingefroren</strong> — Nur Grounding-/Stabilisierungsthemen werden angezeigt. ' +
        '<button class="btn btn-secondary btn-sm" style="margin-left:8px;font-size:10px;" ' +
        'onclick="savePhaseData(\'pvtShowAll\',true);if(typeof renderRoadmap===\'function\')renderRoadmap();">' +
        'Alle Themen anzeigen</button></div>';
    } else if (pvtFilter === 'activated' && !showAll) {
      html += '<div class="phase-res-tip phase-res-tip-yellow" style="margin-bottom:10px;">' +
        '&#128993; <strong>Angespannt</strong> — Co-Regulation-Themen werden priorisiert. ' +
        '<button class="btn btn-secondary btn-sm" style="margin-left:8px;font-size:10px;" ' +
        'onclick="savePhaseData(\'pvtShowAll\',true);if(typeof renderRoadmap===\'function\')renderRoadmap();">' +
        'Alle Themen anzeigen</button></div>';
    }

    // Themen sortieren/filtern nach PVT
    var sortedThemen = themenIds.slice();
    if (!showAll) {
      if (pvtFilter === 'frozen') {
        sortedThemen = sortedThemen.filter(function(tid) {
          return groundingIds.indexOf(tid) !== -1;
        });
        // Falls keine Grounding-Themen in Phase → alle zeigen mit Hinweis
        if (sortedThemen.length === 0) sortedThemen = themenIds.slice();
      } else if (pvtFilter === 'activated') {
        // Co-Reg zuerst, dann Rest
        var coreg = sortedThemen.filter(function(tid) { return coregIds.indexOf(tid) !== -1; });
        var rest = sortedThemen.filter(function(tid) { return coregIds.indexOf(tid) === -1; });
        sortedThemen = coreg.concat(rest);
      }
    }

    html += '<div class="phase-res-section">' +
      '<label class="phase-res-label">&#128196; Arbeitsblätter für aktive Themen</label>' +
      '<div style="display:flex;flex-direction:column;gap:6px;">';

    for (var t = 0; t < sortedThemen.length; t++) {
      var tid = sortedThemen[t];
      var worksheets = findWorksheetsForThema(tid);
      if (worksheets.length > 0) {
        var themaLabel = findThemaLabel(tid);
        var isPriority = (pvtFilter === 'frozen' && groundingIds.indexOf(tid) !== -1) ||
                         (pvtFilter === 'activated' && coregIds.indexOf(tid) !== -1);
        var borderStyle = isPriority ? 'border-left:3px solid ' + (pvtFilter === 'frozen' ? '#7C3AED' : '#D97706') + ';' : '';
        html += '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:6px;padding:8px 10px;' + borderStyle + '">' +
          '<div style="font-size:12px;font-weight:600;margin-bottom:4px;">' + themaLabel +
          (isPriority ? ' <span style="font-size:10px;color:' + (pvtFilter === 'frozen' ? '#7C3AED' : '#D97706') + ';">&#9733; empfohlen</span>' : '') +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
        for (var w = 0; w < worksheets.length; w++) {
          var ws = worksheets[w];
          html += '<a href="arbeitsblatter/' + ws + '" target="_blank" ' +
            'class="btn btn-secondary btn-sm phase-res-btn" style="font-size:11px;">' +
            ws.replace('.html', '').replace(/-/g, ' ') + '</a>';
        }
        html += '</div></div>';
      }
    }
    html += '</div></div>';
  }

  // SRS-Trend
  var srsNotizen = notizen.filter(function(n) { return n.soap && n.soap.srs && n.soap.srs.total > 0; });
  if (srsNotizen.length >= 2) {
    var last3 = srsNotizen.slice(0, 3);
    var scores = last3.map(function(n) { return n.soap.srs.total; });
    var trend = scores[0] - scores[scores.length - 1];
    var trendClass = trend > 0 ? 'phase-res-info-green' : (trend < -5 ? 'phase-res-tip-red' : 'phase-res-info-blue');
    var trendIcon = trend > 0 ? '&#128200;' : (trend < -5 ? '&#128201;' : '&#8596;');
    var trendText = trend > 0
      ? 'SRS-Trend positiv (' + scores.join(' &#8594; ') + '). Weiter so!'
      : (trend < -5
        ? 'SRS-Trend negativ (' + scores.join(' &#8594; ') + '). Allianz-Reparatur nötig — Formulation überprüfen?'
        : 'SRS stabil (' + scores.join(', ') + ').');

    html += '<div class="phase-res-info ' + trendClass + '">' +
      trendIcon + ' <strong>' + trendText + '</strong></div>';
  }

  return html;
}

function pvtLabel(state) {
  var map = { safe: '&#128994; Sicher & offen', activated: '&#128993; Angespannt', frozen: '&#128995; Eingefroren' };
  return map[state] || state;
}

function renderPVTEmpfehlung(state) {
  var empf = {
    safe: {
      bg: 'phase-res-tip-green',
      title: 'Tiefenarbeit möglich',
      text: 'Der Jugendliche ist reguliert. Starte mit dem geplanten Thema. Arbeitsblätter und Reflexionsübungen sind möglich.',
      methoden: ['Kognitive Umstrukturierung', 'Rollenspiel', 'Arbeitsblatt bearbeiten', 'Narrative Übungen', 'Expositionsplanung']
    },
    activated: {
      bg: 'phase-res-tip-yellow',
      title: 'Erst regulieren, dann arbeiten',
      text: 'Das Nervensystem ist im Kampf-/Fluchtmodus. Starte mit Co-Regulation bevor du zum Thema gehst.',
      methoden: ['Atemübung (4-7-8)', 'Bilaterale Stimulation', 'Bewegung/Spaziergang', 'Musikhören', 'Nur kurze Arbeitsblätter']
    },
    frozen: {
      bg: 'phase-res-tip-purple',
      title: 'Nur Grounding & Sicherheit',
      text: 'Dorsal-Vagal aktiv. Kein neues Material heute. Das Ziel ist Kontakt halten.',
      methoden: ['5-4-3-2-1 Grounding', 'Warmes Getränk', 'Sanfte Bewegung', 'Malen/Zeichnen', 'Stille aushalten']
    }
  };

  var e = empf[state] || empf.safe;
  var html = '<div class="phase-res-tip ' + e.bg + '">' +
    '<strong>' + e.title + '</strong><br>' + e.text +
    '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">';
  for (var i = 0; i < e.methoden.length; i++) {
    html += '<span style="padding:2px 8px;background:rgba(255,255,255,0.7);border-radius:10px;font-size:11px;">' +
      e.methoden[i] + '</span>';
  }
  html += '</div></div>';
  return html;
}

function setPhase4PVTFilter(state) {
  savePhaseData('pvtFilter', state);
  savePhaseData('pvtShowAll', false);
  if (typeof renderRoadmap === 'function') renderRoadmap();
}

function findWorksheetsForThema(themaId) {
  // Suche in SCREENING_THEMA_MAP welche Domains dieses Thema enthalten
  var worksheets = [];
  for (var domId in SCREENING_THEMA_MAP) {
    if (SCREENING_THEMA_MAP[domId].indexOf(themaId) !== -1) {
      var dom = SCREENING_DOMAINS.find(function(d) { return d.id === domId; });
      if (dom && dom.worksheets) {
        for (var i = 0; i < dom.worksheets.length; i++) {
          if (worksheets.indexOf(dom.worksheets[i]) === -1) {
            worksheets.push(dom.worksheets[i]);
          }
        }
      }
    }
  }
  return worksheets.slice(0, 4); // Max 4 pro Thema
}

function findThemaLabel(themaId) {
  for (var k = 0; k < THEMEN_KATEGORIEN.length; k++) {
    var kat = THEMEN_KATEGORIEN[k];
    for (var j = 0; j < kat.themen.length; j++) {
      if (kat.themen[j].id === themaId) return kat.themen[j].titel;
    }
  }
  return themaId;
}
// ---- Phase 5: Konsolidierung — Rückfallprävention & Werkzeugkoffer ----
function renderRessourcenPhase5() {
  var sid = APP.currentSchuelerId;
  var rueckfallplan = getPhaseData('rueckfallplan', '');
  var werkzeuge = getPhaseData('werkzeugkoffer', ['', '', '', '', '']);
  var fruehwarnung = getPhaseData('fruehwarnung', '');

  var html = '';

  // Fortschritts-Zusammenfassung
  var notizen = DB.getNotizen(sid).filter(function(n) { return n.soap && n.soap.srs; });
  var totalSitzungen = notizen.length;
  var screenings = DB.getScreenings(sid).filter(function(s) { return s.abgeschlossen; });

  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
    '<span class="phase-res-badge phase-res-badge-ok">' + totalSitzungen + ' Sitzungen dokumentiert</span>' +
    '<span class="phase-res-badge phase-res-badge-ok">' + screenings.length + ' Screening(s) durchgeführt</span>' +
  '</div>';

  // Frühwarnsignale
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'fruehwarnung\')">' +
      '<span class="phase-res-accordion-title">&#9888; Frühwarnsignale erkennen</span>' +
      '<span class="phase-res-accordion-toggle" id="fruehwarnung-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="fruehwarnung">' +
      '<p style="margin:0 0 8px;font-size:12px;">Gemeinsam mit dem Jugendlichen besprechen: <em>Woran merkst du, dass es dir wieder schlechter geht?</em></p>' +
      '<textarea class="phase-res-textarea" id="fruehwarnung-input" style="min-height:80px;" ' +
        'placeholder="z.B. Schlaf wird schlechter, ziehe mich zurück, esse weniger, werde aggressiver, schwänze Schule..." ' +
        'onchange="savePhaseData(\'fruehwarnung\', this.value)">' + escapeHtml(fruehwarnung) + '</textarea>' +
      renderSuggestionChips([
        'Schlaf wird schlechter', 'Ziehe mich zurück', 'Esse weniger/mehr',
        'Werde aggressiv', 'Schwänze Schule', 'Gedankenkreisen',
        'Konzentration lässt nach', 'Weinen ohne Grund', 'Selbstverletzungs-Drang'
      ], 'fruehwarnung-input', 'append') +
    '</div>' +
  '</div>';

  // Werkzeugkoffer — Was hat funktioniert?
  html += '<div class="phase-res-section">' +
    '<label class="phase-res-label">&#129520; Mein Werkzeugkoffer — Was hat mir geholfen?</label>' +
    '<div style="display:flex;flex-direction:column;gap:6px;">';

  var werkzeugLabels = [
    'Wenn ich traurig bin, hilft mir:',
    'Wenn ich wütend bin, hilft mir:',
    'Wenn ich Angst habe, hilft mir:',
    'Wenn ich mich einsam fühle, hilft mir:',
    'Mein Notfall-Werkzeug (immer dabei):'
  ];
  var werkzeugIcons = ['&#128546;', '&#128545;', '&#128552;', '&#128532;', '&#127384;'];
  var werkzeugSuggestions = [
    ['Musik hören', 'Spazieren gehen', 'Tagebuch schreiben', 'Mit jemandem reden', 'Weinen zulassen'],
    ['Sport machen', 'Kissen boxen', 'Tief atmen', 'Raum verlassen', 'Eiswürfel halten'],
    ['4-7-8 Atmung', 'Grounding (5-4-3-2-1)', 'Vertrauensperson anrufen', 'Bewegung', 'Sichere Orte vorstellen'],
    ['Freund/in treffen', 'Online-Chat', 'Haustier kuscheln', 'Brief schreiben', 'Ehrenamt'],
    ['Notfallnummer speichern', 'Krisenplan dabei haben', 'Atemübung', 'Lieblingslied', 'Foto von Vertrauensperson']
  ];

  for (var i = 0; i < werkzeugLabels.length; i++) {
    html += '<div style="background:#fff;padding:8px 10px;border:1px solid #E5E7EB;border-radius:6px;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:16px;flex-shrink:0;">' + werkzeugIcons[i] + '</span>' +
        '<div style="flex:1;">' +
          '<div style="font-size:11px;color:#6B7280;margin-bottom:2px;">' + werkzeugLabels[i] + '</div>' +
          '<input type="text" id="werkzeug-input-' + i + '" style="width:100%;border:1px solid #D1D5DB;border-radius:4px;padding:4px 8px;font-size:12px;" ' +
            'placeholder="..." value="' + escapeHtml(werkzeuge[i] || '') + '" ' +
            'onchange="saveWerkzeug(' + i + ', this.value)">' +
        '</div>' +
      '</div>' +
      renderSuggestionChips(werkzeugSuggestions[i], 'werkzeug-input-' + i, 'replace') +
    '</div>';
  }
  html += '</div></div>';

  // Rückfallplan
  html += '<div class="phase-res-section">' +
    '<label class="phase-res-label">&#128196; Rückfallplan — Wenn es mir wieder schlecht geht</label>' +
    '<textarea class="phase-res-textarea" id="rueckfallplan-input" style="min-height:100px;" ' +
      'placeholder="Schritt 1: Frühwarnsignale erkennen&#10;Schritt 2: Werkzeugkoffer nutzen&#10;Schritt 3: Vertrauensperson anrufen&#10;Schritt 4: Professionelle Hilfe holen&#10;Notfallnummer: ..." ' +
      'onchange="savePhaseData(\'rueckfallplan\', this.value)">' + escapeHtml(rueckfallplan) + '</textarea>' +
    renderSuggestionChips([
      'Frühwarnsignale erkennen', 'Werkzeugkoffer nutzen',
      'Vertrauensperson anrufen', 'Professionelle Hilfe holen',
      'Krisentelefon: 12345', 'Notarzt: 112'
    ], 'rueckfallplan-input', 'append') +
  '</div>';

  // Links
  html += '<div class="phase-res-links">' +
    '<a href="arbeitsblatter/resilienz-staerken.html" target="_blank" class="btn btn-secondary btn-sm phase-res-btn">' +
      '&#128170; Resilienz-Arbeitsblatt</a>' +
    '<button class="btn btn-secondary btn-sm phase-res-btn" onclick="druckeWerkzeugkoffer()">' +
      '&#128424; Werkzeugkoffer drucken</button>' +
  '</div>';

  return html;
}

function saveWerkzeug(index, value) {
  var werkzeuge = getPhaseData('werkzeugkoffer', ['', '', '', '', '']);
  werkzeuge[index] = value;
  savePhaseData('werkzeugkoffer', werkzeuge);
}

function druckeWerkzeugkoffer() {
  var sid = APP.currentSchuelerId;
  var s = DB.getSchuelerById(sid);
  if (!s) return;
  var werkzeuge = getPhaseData('werkzeugkoffer', ['', '', '', '', '']);
  var fruehwarnung = getPhaseData('fruehwarnung', '');
  var rueckfallplan = getPhaseData('rueckfallplan', '');
  var labels = ['Wenn ich traurig bin', 'Wenn ich wütend bin', 'Wenn ich Angst habe', 'Wenn ich mich einsam fühle', 'Mein Notfall-Werkzeug'];

  var w = window.open('', '_blank');
  w.document.write('<html><head><title>Werkzeugkoffer</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;} ' +
    'h1{color:#059669;font-size:22px;} h2{font-size:16px;margin-top:24px;color:#374151;} ' +
    '.tool{padding:10px;margin:6px 0;background:#F0FDF4;border-radius:6px;border-left:3px solid #059669;} ' +
    '.tool-label{font-size:12px;color:#6B7280;} .tool-value{font-size:14px;font-weight:600;margin-top:2px;} ' +
    '.section{margin-top:20px;padding:12px;background:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0;} ' +
    '@media print{body{padding:20px;}}</style></head><body>' +
    '<h1>&#129520; Mein Werkzeugkoffer</h1>' +
    '<p>Für: <strong>' + escapeHtml(s.vorname + ' ' + s.nachname) + '</strong> — Erstellt: ' + new Date().toLocaleDateString('de-DE') + '</p>');

  for (var i = 0; i < labels.length; i++) {
    w.document.write('<div class="tool"><div class="tool-label">' + labels[i] + ':</div>' +
      '<div class="tool-value">' + escapeHtml(werkzeuge[i] || '(noch nicht ausgefüllt)') + '</div></div>');
  }

  if (fruehwarnung) {
    w.document.write('<h2>&#9888; Meine Frühwarnsignale</h2><div class="section">' +
      escapeHtml(fruehwarnung).replace(/\n/g, '<br>') + '</div>');
  }
  if (rueckfallplan) {
    w.document.write('<h2>&#128196; Mein Rückfallplan</h2><div class="section">' +
      escapeHtml(rueckfallplan).replace(/\n/g, '<br>') + '</div>');
  }

  w.document.write('</body></html>');
  w.document.close();
  w.print();
}
// ---- Phase 6: Abschluss — Brief, Follow-Up, Abschlussbericht ----
function renderRessourcenPhase6() {
  var sid = APP.currentSchuelerId;
  var brief = getPhaseData('briefAnSich', '');
  var followUp = getPhaseData('followUpTermine', [
    { datum: '', notiz: '', erledigt: false },
    { datum: '', notiz: '', erledigt: false },
    { datum: '', notiz: '', erledigt: false }
  ]);

  var html = '';

  // Verlaufs-Zusammenfassung
  var roadmap = DB.getRoadmap(sid);
  if (roadmap) {
    var erledigte = roadmap.phasen.filter(function(p) { return p.status === 'erledigt'; }).length;
    var total = roadmap.phasen.length;
    var notizen = DB.getNotizen(sid).filter(function(n) { return n.soap; });
    var sitzungen = notizen.length;
    var startDatum = roadmap.phasen[0] && roadmap.phasen[0].startDatum
      ? new Date(roadmap.phasen[0].startDatum).toLocaleDateString('de-DE')
      : '?';

    html += '<div style="background:linear-gradient(135deg,#EFF6FF,#F0FDF4);border:1px solid #BBF7D0;border-radius:8px;padding:12px;margin-bottom:12px;">' +
      '<div style="font-size:13px;font-weight:600;color:#166534;margin-bottom:8px;">&#127942; Verlauf auf einen Blick</div>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#374151;">' +
        '<div>&#128197; Beginn: <strong>' + startDatum + '</strong></div>' +
        '<div>&#128172; Sitzungen: <strong>' + sitzungen + '</strong></div>' +
        '<div>&#9989; Phasen: <strong>' + erledigte + '/' + total + '</strong></div>' +
      '</div>' +
    '</div>';
  }

  // Brief an mich selbst
  html += '<div class="phase-res-section">' +
    '<label class="phase-res-label">&#9993; Brief an mein zukünftiges Ich</label>' +
    '<p style="font-size:12px;color:#6B7280;margin:0 0 8px;">Der Jugendliche schreibt sich selbst einen Brief — ' +
      'was er/sie gelernt hat, was er/sie sich wünscht, was er/sie nicht vergessen will.</p>' +
    '<textarea class="phase-res-brief" ' +
      'placeholder="Liebe/r zukünftige/r [Name],&#10;&#10;Wenn du das hier liest, erinnere dich daran, dass...&#10;&#10;Was ich gelernt habe:&#10;&#10;Was ich mir wünsche:&#10;&#10;Was ich nie vergessen will:" ' +
      'onchange="savePhaseData(\'briefAnSich\', this.value)">' + escapeHtml(brief) + '</textarea>' +
  '</div>';

  // Follow-Up Termine
  html += '<div class="phase-res-section">' +
    '<label class="phase-res-label">&#128197; Follow-Up Termine nach Abschluss</label>' +
    '<div style="display:flex;flex-direction:column;gap:6px;">';

  var followLabels = ['1. Nachkontakt (4 Wochen)', '2. Nachkontakt (3 Monate)', '3. Nachkontakt (6 Monate)'];
  for (var i = 0; i < 3; i++) {
    var fu = followUp[i] || { datum: '', notiz: '', erledigt: false };
    html += '<div style="display:flex;align-items:center;gap:8px;background:#fff;padding:8px 10px;border:1px solid #E5E7EB;border-radius:6px;">' +
      '<span class="phase-res-checkbox ' + (fu.erledigt ? 'checked' : '') + '" ' +
        'onclick="toggleFollowUp(' + i + ')" style="cursor:pointer;">' +
        (fu.erledigt ? '&#10003;' : '') + '</span>' +
      '<div style="flex:1;">' +
        '<div style="font-size:11px;color:#6B7280;margin-bottom:2px;">' + followLabels[i] + '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<input type="date" style="border:1px solid #D1D5DB;border-radius:4px;padding:3px 6px;font-size:11px;" ' +
            'value="' + (fu.datum || '') + '" onchange="saveFollowUp(' + i + ', \'datum\', this.value)">' +
          '<input type="text" style="flex:1;border:1px solid #D1D5DB;border-radius:4px;padding:3px 6px;font-size:11px;" ' +
            'placeholder="Notiz..." value="' + escapeHtml(fu.notiz || '') + '" ' +
            'onchange="saveFollowUp(' + i + ', \'notiz\', this.value)">' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  html += '</div></div>';

  // Abschlussgespräch-Leitfaden (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'abschluss-leitfaden\')">' +
      '<span class="phase-res-accordion-title">&#128483; Abschlussgespräch-Leitfaden — 4 Schritte</span>' +
      '<span class="phase-res-accordion-toggle" id="abschluss-leitfaden-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="abschluss-leitfaden">' +
      '<div class="phase-res-tip phase-res-tip-green">' +
        '<strong>Schritt 1: Rückblick (10 Min.)</strong><br>' +
        '&laquo;Weißt du noch, wie es war, als wir angefangen haben? Was war damals das Thema?&raquo;<br>' +
        '&laquo;Was hat sich seitdem verändert?&raquo;<br>' +
        'Gemeinsam auf die Ziele schauen: Was wurde erreicht? Was nicht?' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>Schritt 2: Würdigung (10 Min.)</strong><br>' +
        '&laquo;Was ich an dir bewundere ist...&raquo;<br>' +
        '&laquo;Du hast [konkreter Fortschritt] geschafft — das war nicht einfach.&raquo;<br>' +
        'Stärken benennen, die der Jugendliche vielleicht selbst nicht sieht.' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-purple">' +
        '<strong>Schritt 3: Abschied (10 Min.)</strong><br>' +
        '&laquo;Unsere gemeinsame Zeit endet jetzt. Das heißt nicht, dass das was du gelernt hast aufhört.&raquo;<br>' +
        '&laquo;Was nimmst du mit von unserer Arbeit?&raquo;<br>' +
        '&laquo;Gibt es etwas, das du mir noch sagen möchtest?&raquo;<br>' +
        'Eigene Gefühle zeigen ist erlaubt: &laquo;Ich habe gerne mit dir gearbeitet.&raquo;' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>Schritt 4: Ausblick (10 Min.)</strong><br>' +
        '&laquo;Was sind deine nächsten Schritte? Was willst du beibehalten?&raquo;<br>' +
        '&laquo;Wenn es mal schwierig wird: Das ist dein Werkzeugkoffer [überreichen].&raquo;<br>' +
        '&laquo;Du hast 3 Follow-Up Termine: [Termine]. Da schauen wir, wie es dir geht.&raquo;' +
      '</div>' +
    '</div>' +
  '</div>';

  // Übergangsplanung (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'uebergangsplanung\')">' +
      '<span class="phase-res-accordion-title">&#128259; Übergangsplanung — Wenn der Fall weitergereicht wird</span>' +
      '<span class="phase-res-accordion-toggle" id="uebergangsplanung-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="uebergangsplanung">' +
      '<div class="phase-res-tip phase-res-tip-blue">' +
        '<strong>Checkliste Übergang:</strong><br><br>' +
        '&#9744; Abschlussbericht geschrieben (SOAP-Zusammenfassung aller Sitzungen)<br>' +
        '&#9744; 5P-Formulierung aktualisiert<br>' +
        '&#9744; Offene Ziele dokumentiert + Empfehlung für Weiterarbeit<br>' +
        '&#9744; Risikofaktoren und Schutzfaktoren aktuell dokumentiert<br>' +
        '&#9744; Externe Kontakte übergeben (Therapeut, Arzt, Schule)<br>' +
        '&#9744; Medikation dokumentiert<br>' +
        '&#9744; Nächste Stelle informiert (persönlich + schriftlich)<br>' +
        '&#9744; Jugendlicher über Wechsel informiert und vorbereitet<br>' +
        '&#9744; Einverständnis für Datenweitergabe eingeholt<br>' +
        '&#9744; Follow-Up Termine vereinbart' +
      '</div>' +
    '</div>' +
  '</div>';

  // Schwieriger Abschied (NEU)
  html += '<div class="phase-res-accordion">' +
    '<div class="phase-res-accordion-head" onclick="togglePhaseAccordion(\'schwieriger-abschied\')">' +
      '<span class="phase-res-accordion-title">&#128148; Wenn der Jugendliche nicht gehen will</span>' +
      '<span class="phase-res-accordion-toggle" id="schwieriger-abschied-toggle">&#9660; Aufklappen</span>' +
    '</div>' +
    '<div class="phase-res-accordion-body" id="schwieriger-abschied">' +
      '<div class="phase-res-tip phase-res-tip-yellow">' +
        '<strong>Warum ist der Abschied so schwer?</strong><br>' +
        'Für Jugendliche mit Bindungsstörung, Verlusterfahrungen oder Traumata kann das Ende der Bezugsarbeit ein Trigger sein. Der Abschied reaktiviert alte Verlustängste.<br><br>' +
        '<strong>Was hilft:</strong><br>' +
        '&bull; <strong>Frühzeitig ankündigen:</strong> Mind. 4-6 Wochen vorher. Nicht überraschen.<br>' +
        '&bull; <strong>Gefühle validieren:</strong> &laquo;Es ist OK, wenn dich das traurig oder wütend macht. Das zeigt, dass unsere Beziehung dir wichtig war.&raquo;<br>' +
        '&bull; <strong>Abschied gestalten:</strong> Ritual schaffen (Brief, Foto, kleines Geschenk, gemeinsame Aktivität).<br>' +
        '&bull; <strong>Übergang statt Abbruch:</strong> Ausschleichen statt harter Schnitt (von wöchentlich auf 2-wöchentlich auf monatlich).<br>' +
        '&bull; <strong>Nachhaltigkeit betonen:</strong> &laquo;Was wir aufgebaut haben, nimmst du mit. Das verschwindet nicht.&raquo;<br>' +
        '&bull; <strong>Follow-Up nutzen:</strong> Die 3 Follow-Up Termine sind besonders wichtig bei schwierigem Abschied.' +
      '</div>' +
      '<div class="phase-res-tip phase-res-tip-red">' +
        '<strong>Achtung:</strong> Wenn der Jugendliche kurz vor Abschluss regrediert (Symptome kommen zurück), ist das oft ein unbewusster Versuch, die Beziehung zu verlängern. Nicht sofort die Betreuung verlängern — stattdessen thematisieren: &laquo;Könnte es sein, dass die Rückkehr der Probleme mit unserem bevorstehenden Abschied zusammenhängt?&raquo;' +
      '</div>' +
    '</div>' +
  '</div>';

  // Buttons
  html += '<div class="phase-res-links">' +
    '<button class="btn btn-primary btn-sm phase-res-btn" onclick="druckeAbschluss()">' +
      '&#128424; Abschlussbericht drucken</button>' +
    '<button class="btn btn-secondary btn-sm phase-res-btn" onclick="druckeWerkzeugkoffer()">' +
      '&#129520; Werkzeugkoffer drucken</button>' +
    '<button class="btn btn-secondary btn-sm phase-res-btn" onclick="druckeBriefAnSich()">' +
      '&#9993; Brief drucken</button>' +
  '</div>';

  return html;
}

function toggleFollowUp(index) {
  var followUp = getPhaseData('followUpTermine', [
    { datum: '', notiz: '', erledigt: false },
    { datum: '', notiz: '', erledigt: false },
    { datum: '', notiz: '', erledigt: false }
  ]);
  followUp[index].erledigt = !followUp[index].erledigt;
  savePhaseData('followUpTermine', followUp);
  if (typeof renderRoadmap === 'function') renderRoadmap();
}

function saveFollowUp(index, key, value) {
  var followUp = getPhaseData('followUpTermine', [
    { datum: '', notiz: '', erledigt: false },
    { datum: '', notiz: '', erledigt: false },
    { datum: '', notiz: '', erledigt: false }
  ]);
  followUp[index][key] = value;
  savePhaseData('followUpTermine', followUp);
}

function druckeBriefAnSich() {
  var sid = APP.currentSchuelerId;
  var s = DB.getSchuelerById(sid);
  if (!s) return;
  var brief = getPhaseData('briefAnSich', '');
  if (!brief) { showToast('Der Brief ist noch leer.', 'error'); return; }

  var w = window.open('', '_blank');
  w.document.write('<html><head><title>Brief an mich</title>' +
    '<style>body{font-family:Georgia,serif;padding:60px;max-width:550px;margin:0 auto;line-height:1.8;font-size:15px;color:#1F2937;} ' +
    'h1{font-size:20px;color:#0EA5E9;font-family:Arial,sans-serif;} ' +
    '.date{font-size:12px;color:#9CA3AF;margin-bottom:30px;font-family:Arial,sans-serif;} ' +
    '.brief{white-space:pre-wrap;font-style:italic;} ' +
    '@media print{body{padding:40px;}}</style></head><body>' +
    '<h1>&#9993; Brief an mein zukünftiges Ich</h1>' +
    '<div class="date">Geschrieben am ' + new Date().toLocaleDateString('de-DE') + '</div>' +
    '<div class="brief">' + escapeHtml(brief) + '</div>' +
    '</body></html>');
  w.document.close();
  w.print();
}

function druckeAbschluss() {
  var sid = APP.currentSchuelerId;
  var s = DB.getSchuelerById(sid);
  if (!s) return;
  var roadmap = DB.getRoadmap(sid);
  if (!roadmap) return;

  var notizen = DB.getNotizen(sid).filter(function(n) { return n.soap; });
  var screenings = DB.getScreenings(sid).filter(function(sc) { return sc.abgeschlossen; });
  var werkzeuge = getPhaseData('werkzeugkoffer', ['', '', '', '', '']);
  var fruehwarnung = getPhaseData('fruehwarnung', '');
  var rueckfallplan = getPhaseData('rueckfallplan', '');
  var followUp = getPhaseData('followUpTermine', []);

  var werkzeugLabels = ['Traurigkeit', 'Wut', 'Angst', 'Einsamkeit', 'Notfall'];
  var startDatum = roadmap.phasen[0] && roadmap.phasen[0].startDatum
    ? new Date(roadmap.phasen[0].startDatum).toLocaleDateString('de-DE') : '?';

  var w = window.open('', '_blank');
  w.document.write('<html><head><title>Abschlussbericht</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:0 auto;font-size:13px;color:#1F2937;line-height:1.6;} ' +
    'h1{font-size:20px;color:#0EA5E9;border-bottom:2px solid #0EA5E9;padding-bottom:8px;} ' +
    'h2{font-size:15px;color:#374151;margin-top:24px;} ' +
    '.meta{background:#F8FAFC;padding:12px;border-radius:6px;margin-bottom:20px;} ' +
    '.meta td{padding:3px 12px 3px 0;} .meta-label{color:#6B7280;font-size:12px;} ' +
    '.phase{padding:6px 0;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;} ' +
    '.phase-status{font-size:11px;padding:2px 8px;border-radius:10px;} ' +
    '.done{background:#DCFCE7;color:#166534;} .aktiv{background:#DBEAFE;color:#1E40AF;} .offen{background:#F3F4F6;color:#6B7280;} ' +
    '.tool{padding:6px 10px;margin:4px 0;background:#F0FDF4;border-radius:4px;border-left:3px solid #059669;} ' +
    '.section{padding:10px;background:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0;margin:8px 0;white-space:pre-wrap;} ' +
    '@media print{body{padding:20px;}}</style></head><body>');

  w.document.write('<h1>&#127891; Abschlussbericht</h1>');
  w.document.write('<div class="meta"><table>' +
    '<tr><td class="meta-label">Name:</td><td><strong>' + escapeHtml(s.vorname + ' ' + s.nachname) + '</strong></td></tr>' +
    '<tr><td class="meta-label">Beginn:</td><td>' + startDatum + '</td></tr>' +
    '<tr><td class="meta-label">Abschluss:</td><td>' + new Date().toLocaleDateString('de-DE') + '</td></tr>' +
    '<tr><td class="meta-label">Sitzungen:</td><td>' + notizen.length + '</td></tr>' +
    '<tr><td class="meta-label">Screenings:</td><td>' + screenings.length + '</td></tr>' +
    '</table></div>');

  // Phasen-Übersicht
  w.document.write('<h2>Behandlungsphasen</h2>');
  for (var i = 0; i < roadmap.phasen.length; i++) {
    var p = roadmap.phasen[i];
    var def = ROADMAP_PHASEN[p.nr] || {};
    var statusClass = p.status === 'erledigt' ? 'done' : (p.status === 'aktiv' ? 'aktiv' : 'offen');
    var statusLabel = p.status === 'erledigt' ? 'Abgeschlossen' : (p.status === 'aktiv' ? 'Aktiv' : 'Offen');
    w.document.write('<div class="phase"><span>' + def.icon + ' Phase ' + p.nr + ': ' + def.label + '</span>' +
      '<span class="phase-status ' + statusClass + '">' + statusLabel + '</span></div>');
  }

  // Werkzeugkoffer
  w.document.write('<h2>&#129520; Werkzeugkoffer</h2>');
  for (var j = 0; j < werkzeugLabels.length; j++) {
    if (werkzeuge[j]) {
      w.document.write('<div class="tool"><strong>' + werkzeugLabels[j] + ':</strong> ' + escapeHtml(werkzeuge[j]) + '</div>');
    }
  }

  if (fruehwarnung) {
    w.document.write('<h2>&#9888; Frühwarnsignale</h2><div class="section">' + escapeHtml(fruehwarnung) + '</div>');
  }
  if (rueckfallplan) {
    w.document.write('<h2>&#128196; Rückfallplan</h2><div class="section">' + escapeHtml(rueckfallplan) + '</div>');
  }

  // Follow-Up
  var hatFollowUp = followUp.some(function(fu) { return fu.datum; });
  if (hatFollowUp) {
    w.document.write('<h2>&#128197; Follow-Up Termine</h2>');
    for (var k = 0; k < followUp.length; k++) {
      if (followUp[k].datum) {
        w.document.write('<div class="phase"><span>' + new Date(followUp[k].datum).toLocaleDateString('de-DE') +
          (followUp[k].notiz ? ' — ' + escapeHtml(followUp[k].notiz) : '') + '</span>' +
          '<span class="phase-status ' + (followUp[k].erledigt ? 'done' : 'offen') + '">' +
          (followUp[k].erledigt ? 'Erledigt' : 'Geplant') + '</span></div>');
      }
    }
  }

  w.document.write('</body></html>');
  w.document.close();
  w.print();
}
