#!/usr/bin/env node
/* ============================================================
   Build Search Index für /library/
   ============================================================
   Liest alle Material-HTMLs und erstellt einen Suchindex.

   Usage:  node tools/build-search-index.js
   Output: library/data/materials-index.json
   ============================================================ */

const fs = require('fs');
const path = require('path');

// ─── Material-Ordner mit Metadaten ──────────────────────────
const MATERIAL_FOLDERS = [
  { ordner: 'arbeitsblatter',         typ: 'arbeitsblatt', schwierigkeit: 'standard', label: 'Arbeitsblatt', icon: '📝' },
  { ordner: 'arbeitsblaetter-einfach', typ: 'arbeitsblatt', schwierigkeit: 'einfach',  label: 'Arbeitsblatt (einfach)', icon: '📝' },
  { ordner: 'arbeitsblaetter-mittel',  typ: 'arbeitsblatt', schwierigkeit: 'mittel',   label: 'Arbeitsblatt (mittel)', icon: '📝' },
  { ordner: 'therapie-module',         typ: 'therapie',     schwierigkeit: null,        label: 'Therapie-Modul',      icon: '🧠' },
  { ordner: 'fachkraft-module',        typ: 'fachkraft',    schwierigkeit: null,        label: 'Fachkraft-Modul',     icon: '🎓' },
  { ordner: 'eltern-infoblaetter',     typ: 'eltern',       schwierigkeit: null,        label: 'Eltern-Material',     icon: '👨‍👩‍👧' },
  { ordner: 'evaluationsboegen',       typ: 'evaluation',   schwierigkeit: null,        label: 'Evaluationsbogen',    icon: '📊' },
  { ordner: 'entscheidungsbaeume',     typ: 'tool',         schwierigkeit: null,        label: 'Entscheidungsbaum',   icon: '🌳' },
  { ordner: 'fallbeispiele',           typ: 'fallbeispiel', schwierigkeit: null,        label: 'Fallbeispiel',        icon: '📖' },
  { ordner: 'ueberweisungen',          typ: 'ueberweisung', schwierigkeit: null,        label: 'Überweisung',         icon: '🏥' },
  { ordner: 'skills-kurs',             typ: 'skills',       schwierigkeit: null,        label: 'Skills-Kurs',         icon: '🛠️' },
];

// ─── Stopwords (DE/EN, raus aus Schlüsselwörtern) ─────────
const STOPWORDS = new Set([
  'der','die','das','und','oder','aber','wenn','dann','ich','du','er','sie','es','wir','ihr',
  'mit','von','zu','in','an','auf','für','aus','bei','durch','über','unter','vor','nach',
  'ist','sind','war','waren','hat','habe','haben','wird','werden','kann','können','muss','müssen',
  'nicht','ein','eine','einen','einem','einer','eines','dem','den','des','als','wie','was','wer',
  'this','that','the','and','or','but','if','then','i','you','he','she','it','we','they',
  'with','of','to','in','at','on','for','from','by','through','over','under','before','after',
  'is','are','was','were','has','have','had','will','would','can','could','must','should',
  'not','a','an','as','like','what','who','where','when','why','how',
  'sich','sehr','auch','nur','noch','schon','also','mal','dass','beim','zum','zur','vom','im','am',
]);

// ─── HTML → Plain Text ──────────────────────────────────────
function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Title aus HTML extrahieren ─────────────────────────────
function extractTitle(html, fallback) {
  let m = html.match(/<title>([^<]+)<\/title>/i);
  if (m) return m[1].trim();
  m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) return htmlToText(m[1]);
  // Fallback: aus Dateiname
  return fallback.replace(/[-_]/g, ' ').replace(/\.html$/, '');
}

// ─── Schlüsselwörter aus Body-Text extrahieren ──────────────
function extractKeywords(text, maxLen = 500) {
  const sample = text.slice(0, maxLen).toLowerCase();
  const words = sample.match(/[a-zäöüß]{4,}/gi) || [];
  const freq = {};
  words.forEach(w => {
    if (STOPWORDS.has(w)) return;
    freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
}

// ─── Beschreibung (erste 200 Zeichen Body) ─────────────────
function extractDescription(text) {
  const desc = text.slice(0, 240).trim();
  return desc.length === 240 ? desc + '…' : desc;
}

// ─── Verarbeitung pro Datei ─────────────────────────────────
function processFile(filePath, meta) {
  const html = fs.readFileSync(filePath, 'utf8');
  const text = htmlToText(html);
  const fileName = path.basename(filePath);
  const titel = extractTitle(html, fileName);

  // CSS-Referenz erkennen (für Stil-Validierung)
  const cssMatch = html.match(/href="[^"]*\/([^"\/]+\.css)"/);
  const cssRef = cssMatch ? cssMatch[1] : null;

  return {
    pfad: path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/'),
    datei: fileName,
    titel,
    typ: meta.typ,
    schwierigkeit: meta.schwierigkeit,
    label: meta.label,
    icon: meta.icon,
    ordner: meta.ordner,
    beschreibung: extractDescription(text),
    keywords: extractKeywords(text),
    css: cssRef,
    bytes: html.length,
  };
}

// ─── Hauptlauf ──────────────────────────────────────────────
function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const allMaterials = [];
  let processed = 0;

  for (const meta of MATERIAL_FOLDERS) {
    const folder = path.join(projectRoot, meta.ordner);
    if (!fs.existsSync(folder)) {
      console.warn(`[skip] ${meta.ordner} nicht gefunden`);
      continue;
    }
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.html'));
    files.forEach(f => {
      try {
        const entry = processFile(path.join(folder, f), meta);
        allMaterials.push(entry);
        processed++;
      } catch (e) {
        console.error(`Fehler bei ${meta.ordner}/${f}:`, e.message);
      }
    });
    console.log(`[${meta.ordner}] ${files.length} Dateien indiziert`);
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: allMaterials.length,
    materials: allMaterials.sort((a, b) => a.titel.localeCompare(b.titel)),
  };

  const outPath = path.join(projectRoot, 'library/data/materials-index.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
  const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`\n✓ ${processed} Materialien in ${outPath} (${sizeKB} KB)`);
}

main();
