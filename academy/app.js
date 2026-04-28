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
  { typ: 'vignette', titel: 'Fall-Vignette: Schulverweigerung', kategorie: 'Praxis', quelle: 'S3-Leitlinie Schulabsentismus', text: 'Lena, 14, fehlt seit 3 Wochen in der Schule. Die Mutter sagt: "Sie will einfach nicht." Lehrkräfte berichten, dass Lena vorher gemobbt wurde. Frage: Was wäre dein nächster Schritt — und warum?', reflexion: 'Schulverweigerung hat oft multiple Ursachen. Hier: Mobbing als Auslöser, mögliche Angst oder Depression als Maintainer. Nächster Schritt: validierendes Einzelgespräch mit Lena, dann Screening (PHQ-A, GAD-7).', xp: 10 },
  { typ: 'konzept', titel: 'Polyvagaltheorie in 2 Minuten', kategorie: 'Polyvagal', quelle: 'Porges 2011', text: 'Das autonome Nervensystem hat drei Zustände: Sicherheit (ventral-vagal), Kampf/Flucht (sympathisch), Erstarrung (dorsal-vagal). In der Sitzung erkennst du den Zustand an: Blickkontakt vs. Vermeidung, Stimmqualität, Körperhaltung. Frage: Welchen PVT-Zustand zeigt ein Klient, der "abschaltet" und nicht mehr spricht?', reflexion: 'Dorsal-vagaler Shutdown (Erstarrung). Co-Regulation durch ruhige Stimme, Orientierung im Raum, Grounding-Übung. Nicht: mehr Fragen stellen.', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Selbstverletzung', kategorie: 'Krise', quelle: 'Nock 2010', text: 'Karim, 16, zeigt dir frische Schnitte am Unterarm. Er sagt: "Es hilft mir, runterzukommen." Er bittet dich, es niemandem zu sagen. Was tust du?', reflexion: 'Schweigepflicht gilt — aber: Selbstverletzung ist nicht automatisch suizidal. Trotzdem: C-SSRS durchführen. Funktion der Selbstverletzung verstehen (Spannungsabbau). Alternative Skills anbieten (Eiswürfel, Sport). Eltern informieren nur bei akuter Gefahr.', xp: 10 },
  { typ: 'konzept', titel: 'ACE-Score & Langzeitfolgen', kategorie: 'ACE', quelle: 'Felitti et al. 1998', text: 'Die Adverse Childhood Experiences-Studie (Felitti 1998) zeigt: ACE ≥ 4 verdoppelt das Depressionsrisiko und verdreifacht das Suizidrisiko. Aber: ACE ist kein Schicksal. Schutzfaktoren (stabile Bezugsperson, Hobbys, Bildungserfolg) können die Auswirkungen puffern.', reflexion: 'In der Praxis: ACE-Score immer erheben, aber nie als Label verwenden. "Du hast ACE 6" sagt weniger als "Welche Erfahrungen haben dich geprägt?"', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Eltern-Widerstand', kategorie: 'Elternarbeit', quelle: 'MI Prinzipien', text: 'Du empfiehlst den Eltern eine psychiatrische Abklärung für ihren 12-jährigen Sohn. Die Mutter reagiert aufgebracht: "Mein Kind ist nicht verrückt!" Wie reagierst du?', reflexion: 'Entstigmatisierung: "Psychiater heißt nicht verrückt — es heißt, wir wollen verstehen, was Ihrem Sohn hilft." Vergleich mit Augenarzt anbieten. Eltern-Sorge validieren. Entscheidung bei ihnen lassen, aber Fakten klar benennen.', xp: 10 },
  { typ: 'konzept', titel: 'Motivational Interviewing: OARS', kategorie: 'MI', quelle: 'Miller & Rollnick 2013', text: 'Die vier Grundtechniken: Open Questions (offene Fragen), Affirmations (Bestärkung), Reflective Listening (reflektierendes Zuhören), Summarizing (Zusammenfassen). Beispiel: Statt "Warum nimmst du Drogen?" → "Erzähl mir, wie ein typischer Abend bei dir aussieht."', reflexion: 'MI ist besonders wirksam bei ambivalenten Jugendlichen. Die Fachkraft vermeidet den "Righting Reflex" (sofort korrigieren wollen). Stattdessen: Ambivalenz explorieren, Change Talk verstärken.', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Dissoziative Episode', kategorie: 'Trauma', quelle: 'Porges 2011', text: 'Während einer Sitzung wird Yara, 15, plötzlich still. Ihr Blick wird glasig, sie reagiert nicht auf Ansprache. Was tust du?', reflexion: 'Grounding-Intervention: ruhige Stimme, Orientierung geben ("Yara, du bist hier im Raum, es ist sicher"). Sensorische Reize: kaltes Wasser, Eiswürfel, starker Geruch. NICHT berühren ohne Einverständnis. Dokumentieren: PVT-Status wechselte zu Frozen.', xp: 10 },
  { typ: 'konzept', titel: 'Bindungstheorie nach Bowlby', kategorie: 'Bindung', quelle: 'Bowlby 1969', text: 'Vier Bindungsstile: sicher, unsicher-vermeidend, unsicher-ambivalent, desorganisiert. In der Jugendhilfe begegnen wir überwiegend unsichere Bindungen. Die therapeutische Beziehung wird zum korrigierenden Bindungserleben.', reflexion: 'Ein Jugendlicher mit desorganisierter Bindung zeigt widersprüchliches Verhalten: Nähe suchen und gleichzeitig abstoßen. Die Fachkraft muss konsistent bleiben, auch wenn es sich anfühlt wie Ablehnung.', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Schweigender Klient', kategorie: 'Kommunikation', quelle: 'Praxiswissen', text: 'Tom, 13, sitzt seit 20 Minuten schweigend da. Jede Frage beantwortet er mit "Weiß nicht" oder Achselzucken. Du hast noch 30 Minuten.', reflexion: 'Schweigen kann Widerstand, Angst, Loyalitätskonflikt oder Nicht-Wissen sein. Optionen: Parallel-Aktivität (zeichnen, spazieren, Karten spielen). Metakommunikation: "Es ist OK, nicht zu reden. Ich bin trotzdem da." Thema wechseln auf Stärken oder Interessen.', xp: 10 },
  { typ: 'konzept', titel: 'Window of Tolerance (Siegel)', kategorie: 'Trauma', quelle: 'Siegel 1999', text: 'Jeder Mensch hat ein "Fenster" in dem er Stress verarbeiten kann. Oberhalb: Hyperarousal (Panik, Wut). Unterhalb: Hypoarousal (Dissoziation, Erstarrung). Ziel der Therapie: das Fenster vergrößern.', reflexion: 'Praktisch: Wenn ein Klient aus dem Fenster fällt (hyper oder hypo), ist kognitives Arbeiten sinnlos. Erst regulieren (Atmung, Grounding), dann sprechen. Den PVT-Status in VIA dokumentieren hilft, Muster zu erkennen.', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Substanzkonsum', kategorie: 'Substanz', quelle: 'CRAFFT, MI', text: 'Marie, 16, erzählt beiläufig, dass sie "manchmal kiffen geht" nach der Schule. Sie sagt: "Ist doch normal, alle machen das." Wie gehst du damit um?', reflexion: 'Nicht moralisieren. Funktion explorieren: Entspannung? Gruppendruck? Flucht? Harm-Reduction-Ansatz statt Abstinenz-Forderung. CRAFFT-Screening bei Verdacht auf problematischen Konsum. Eltern nur informieren wenn Kindeswohl gefährdet.', xp: 10 },
  { typ: 'konzept', titel: 'Stepped Care Modell', kategorie: 'Evidenz', quelle: 'Gillaspy 2015', text: 'Nicht jeder Klient braucht intensive Therapie. Stepped Care: Stufe 1 (Psychoedukation), Stufe 2 (guided self-help), Stufe 3 (Einzelbegleitung), Stufe 4 (spezialisierte Therapie), Stufe 5 (stationär). Die Fachkraft muss wissen, wann eine Stufe nicht reicht.', reflexion: 'Indikatoren für Step-up: kein Fortschritt nach 6 Sitzungen (ORS stagniert), zunehmende Krisen-Frequenz, neue Symptome. VIA warnt automatisch bei ORS-Stagnation — das ist der Moment für die Stepped-Care-Entscheidung.', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Cybermobbing', kategorie: 'Krise', quelle: 'Praxiswissen', text: 'Lara, 14, zeigt dir Screenshots von Nachrichten in einer WhatsApp-Gruppe. Mitschüler verbreiten ein peinliches Foto von ihr. Sie weint: "Ich will sterben." Wie reagierst du?', reflexion: 'Sofort: C-SSRS — "Ich will sterben" muss abgeklärt werden (Lebensüberdruss vs. aktive Suizidalität). Dann: Screenshots sichern (Beweismittel). Eltern informieren. Schule einschalten (Anti-Mobbing-Protokoll). Langfristig: Coping-Strategien, ggf. Anzeige nach lux. Cybermobbing-Gesetz.', xp: 10 },
  { typ: 'konzept', titel: 'Resilienzfaktoren nach Werner', kategorie: 'Resilienz', quelle: 'Werner & Smith 1992 & Smith', text: 'Die Kauai-Studie identifizierte Schutzfaktoren die Kinder trotz widriger Umstände gesund aufwachsen lassen: (1) mindestens eine stabile Bezugsperson, (2) Selbstwirksamkeit, (3) soziale Unterstützung, (4) aktives Coping, (5) Glaube an Sinn. Die Fachkraft stärkt diese Faktoren gezielt.', reflexion: 'In der Praxis: Stärken-Profil in VIA nutzen. Welcher Resilienzfaktor ist vorhanden? Welcher fehlt? Ziele in der Roadmap auf fehlende Schutzfaktoren ausrichten.', xp: 10 },
  { typ: 'vignette', titel: 'Fall-Vignette: Loyalitätskonflikt', kategorie: 'Systemisch', quelle: 'Minuchin 1974', text: 'Amir, 11, sagt: "Papa sagt, ich soll dir nichts erzählen. Er sagt, du willst uns die Kinder wegnehmen." Wie reagierst du?', reflexion: 'Loyalitätskonflikt validieren: "Es ist schwer, wenn Erwachsene verschiedene Dinge sagen." Nicht den Vater abwerten. Klarstellen: "Ich bin für dich da, nicht gegen jemanden." Beziehung zum Vater pflegen (Elterngespräch anbieten). ONE-Beratung bei Verdacht auf Instrumentalisierung.', xp: 10 },
  { typ: 'konzept', titel: 'Therapeutische Allianz (Bordin 1979)', kategorie: 'Allianz', quelle: 'Bordin 1979, Horvath 2011', text: 'Drei Komponenten: (1) Bond — emotionale Verbindung, (2) Goals — Einigung über Ziele, (3) Tasks — Einigung über Methoden. SRS misst die Allianz. Wenn SRS < 25: Allianz-Bruch möglich. Ansprechen, nicht ignorieren.', reflexion: 'Meta-Analyse (Horvath 2011): Allianz erklärt 7-8% der Varianz im Outcome — mehr als jede spezifische Technik. Welcher Klient hatte zuletzt SRS < 30?', xp: 5 },
  { typ: 'konzept', titel: 'Das Innere Arbeitsmodell', kategorie: 'Bindung', quelle: 'Bowlby 1969', text: 'Kinder bilden "innere Arbeitsmodelle" — mentale Repräsentationen von Beziehungen. Ein Kind, das gelernt hat "Erwachsene sind unzuverlässig", wird dieses Modell auf dich übertragen. Die therapeutische Beziehung kann dieses Modell korrigieren — aber nur durch Konsistenz über Monate.', reflexion: 'Welches innere Arbeitsmodell bringt dein schwierigster Klient mit? Wie zeigt es sich in eurer Beziehung?', xp: 5 },
  { typ: 'konzept', titel: 'Neuroception (Porges 2004)', kategorie: 'Polyvagal', quelle: 'Porges 2004', text: 'Neuroception ist die unbewusste Fähigkeit des Nervensystems, Sicherheit oder Gefahr zu erkennen — ohne bewusstes Denken. Ein traumatisiertes Kind kann in einer objektiv sicheren Umgebung Gefahr "spüren". Der Raum, deine Stimme, dein Gesichtsausdruck — alles wird vom Nervensystem ausgewertet.', reflexion: 'Was könnte in deinem Sitzungsraum die Neuroception eines Klienten stören? (Licht? Lärm? Sitzposition?)', xp: 5 },
  { typ: 'vignette', titel: 'Der Junge der immer zu spät kommt', kategorie: 'Bindung', quelle: 'Ainsworth 1978', text: 'Moritz, 15, kommt zu jeder Sitzung 15-20 Minuten zu spät. Er entschuldigt sich nicht. Wenn du es ansprichst, zuckt er die Schultern. Die Sitzungszeit wird zu kurz für echte Arbeit.', reflexion: 'Vermeidende Bindung? Zu-spät-Kommen als Kontrolle über Nähe/Distanz. Nicht konfrontieren, sondern bemerken: "Mir fällt auf, dass die ersten 15 Minuten für dich schwierig sind. Was denkst du?" Struktur bieten, aber nicht bestrafen.', xp: 5 },
  { typ: 'konzept', titel: 'Common Factors (Wampold 2015)', kategorie: 'Evidenz', quelle: 'Wampold 2015', text: 'Was wirkt in Therapie? Nicht primär die Technik (8% der Varianz), sondern: Allianz (7%), Empathie (9%), positive Erwartung (7%), kulturelle Passung. Die "gemeinsamen Faktoren" erklären mehr Outcome als jede spezifische Methode. Das bedeutet: WER die Fachkraft ist, ist wichtiger als WAS sie tut.', reflexion: 'Wenn die Person wichtiger ist als die Methode — was investierst du in deine eigene Entwicklung als Mensch (nicht nur als Fachkraft)?', xp: 5 },
  { typ: 'konzept', titel: 'Collaborative Problem Solving', kategorie: 'CPS', quelle: 'Greene 2014', text: 'Ross Greenes Modell: "Kinder benehmen sich gut wenn sie können." Problemverhalten entsteht nicht aus Bösartigkeit, sondern aus fehlenden Skills (Frustrationstoleranz, Flexibilität, Problemlösung). Plan B: (1) Empathie-Schritt, (2) Problem definieren, (3) Gemeinsam Lösung finden.', reflexion: 'Welcher Klient zeigt Verhalten, das du bisher als "will nicht" interpretiert hast? Was wenn er "kann nicht"?', xp: 5 },
  { typ: 'vignette', titel: 'Das Mädchen das alles kontrolliert', kategorie: 'Trauma', quelle: 'Herman 1992', text: 'Sara, 13, bestimmt in jeder Sitzung: wo sie sitzt, wann geredet wird, welches Thema. Wenn du abweichst, wird sie wütend oder geht. Die Fachkraft fühlt sich hilflos und kontrolliert.', reflexion: 'Kontrollbedürfnis nach Trauma = Überlebensstrategie. Sara hat gelernt, dass sie nur sicher ist wenn SIE bestimmt. Strategie: Kontrolle teilen, nicht nehmen. "Wollen wir heute A oder B machen?" Kleine Entscheidungen geben. Nicht kämpfen um die Kontrolle.', xp: 5 },
  { typ: 'konzept', titel: 'Mentalisieren (Fonagy 2002)', kategorie: 'Mentalisierung', quelle: 'Fonagy & Target 2002', text: 'Mentalisieren = die Fähigkeit, Verhalten als Ausdruck innerer Zustände zu verstehen — bei sich selbst und anderen. "Er schlägt mich" wird zu "Er schlägt mich weil er Angst hat, verlassen zu werden." Trauma beeinträchtigt die Mentalisierungsfähigkeit. Die therapeutische Beziehung fördert sie.', reflexion: 'Welches Verhalten eines Klienten fällt dir schwer zu "mentalisieren"? Welcher innere Zustand könnte dahinter stecken?', xp: 5 },
  { typ: 'konzept', titel: 'Dose-Response in der Therapie', kategorie: 'Evidenz', quelle: 'Lambert 2013', text: 'Lambert (2013): 50% der Klienten zeigen nach 13-18 Sitzungen klinisch signifikante Verbesserung. 75% nach 26 Sitzungen. Aber: 5-10% verschlechtern sich in Therapie. Outcome-Monitoring (ORS/SRS) erkennt Verschlechterung rechtzeitig. Ohne Monitoring dauert es im Durchschnitt 10 Sitzungen bis ein Therapeut merkt, dass es nicht funktioniert.', reflexion: 'Nutzt du bei jedem Klienten ORS/SRS? Wenn nein — warum nicht?', xp: 5 },
  { typ: 'vignette', titel: 'Der Vater der die Therapie sabotiert', kategorie: 'Systemisch', quelle: 'Minuchin 1974', text: 'Der Vater von Amelie, 11, sagt zu ihr vor jeder Sitzung: "Erzähl der nichts Wichtiges." Amelie ist in der Sitzung verschlossen und schaut dauernd auf die Uhr. Du vermutest, dass der Vater die Therapie ablehnt.', reflexion: 'Systemisches Denken: Nicht gegen den Vater arbeiten, sondern ihn einbeziehen. Ihn als Experten für sein Kind ansprechen. "Was beobachten SIE zu Hause?" Widerstand ist Information über das System, nicht über den Klienten.', xp: 5 },
  { typ: 'konzept', titel: 'Emotionsregulation nach Gross', kategorie: 'Emotion', quelle: 'Gross 1998', text: 'Das Prozessmodell: Situation → Aufmerksamkeit → Bewertung → Reaktion. An jeder Stelle kann interveniert werden. Situation auswählen (Vermeidung), Aufmerksamkeit lenken (Ablenkung), Bewertung ändern (Reappraisal), Reaktion modulieren (Suppression — die schlechteste Strategie). Reappraisal ist langfristig am wirksamsten.', reflexion: 'Welche Regulationsstrategie nutzt DEIN schwierigster Klient am häufigsten? Welche könnte er/sie als nächstes lernen?', xp: 5 },
  { typ: 'vignette', titel: 'Die Mutter die weint', kategorie: 'Elternarbeit', quelle: 'Weisz 2017', text: 'Im Elterngespräch bricht die Mutter plötzlich in Tränen aus: "Ich bin eine schlechte Mutter. Alles ist meine Schuld." Du hattest gerade erklärt, dass das Kind Trauma-Symptome zeigt. Die Mutter fühlt sich schuldig, obwohl sie nicht die Täterin ist.', reflexion: 'Schuld ≠ Verantwortung. "Sie sind nicht schuld an dem was passiert ist. Aber Sie können Teil der Lösung sein." Nicht trösten mit "das ist nicht so schlimm", sondern validieren und reframen.', xp: 5 },
  { typ: 'konzept', titel: 'Epigenetik und Trauma', kategorie: 'Trauma', quelle: 'Yehuda 2016', text: 'Trauma kann epigenetische Spuren hinterlassen — Veränderungen in der Genexpression, die an die nächste Generation weitergegeben werden können. Kinder von Holocaust-Überlebenden zeigen veränderte Cortisol-Reaktionen (Yehuda 2016). Das bedeutet: Trauma-Folgen sind nicht nur psychologisch, sondern biologisch. Und: Intervention kann epigenetische Muster umkehren.', reflexion: 'Was bedeutet transgenerationale Traumatisierung für deine Arbeit? Siehst du bei Klienten-Eltern eigene Trauma-Muster?', xp: 5 },
  { typ: 'konzept', titel: 'Rupture & Repair (Safran 2000)', kategorie: 'Allianz', quelle: 'Safran & Muran 2000', text: 'Allianzbrüche sind nicht vermeidbar — sie sind therapeutische Chancen. Safran unterscheidet Withdrawal-Ruptures (Klient zieht sich zurück) und Confrontation-Ruptures (Klient greift an). Beides signalisiert: etwas stimmt in der Beziehung nicht. Repair = den Bruch ansprechen, Meta-Kommunikation, Verantwortung übernehmen.', reflexion: 'Wann hast du zuletzt einen Allianzbruch bemerkt und angesprochen? Was hat es schwer gemacht?', xp: 5 },
];

const IMPULS_KEY = 'pw_academy_impuls';

function getTagesImpuls() {
  const tag = new Date().toISOString().split('T')[0];
  const saved = JSON.parse(localStorage.getItem(IMPULS_KEY) || '{}');
  if (saved.tag === tag) return { impuls: IMPULSE[saved.idx], idx: saved.idx, reflektiert: saved.reflektiert };
  // Deterministisch: Tag des Jahres modulo Anzahl Impulse
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date() - start) / 86400000);
  const idx = dayOfYear % IMPULSE.length;
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
  const streak = getStreak();
  const kat = impuls.kategorie || (impuls.typ === 'vignette' ? 'Praxis' : 'Theorie');
  const quelle = impuls.quelle || '';
  const container = document.getElementById('ac-content');
  container.innerHTML = `
    <div style="max-width: 640px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
          <h2 style="font-family: var(--font-serif); font-weight: 400; font-size: 1.75rem; letter-spacing: -0.03em;">Tages-Impuls</h2>
          <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--sage); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.25rem;">
            ${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--gold); letter-spacing: 0.08em;">${streak} Tage Streak</div>
        </div>
      </div>

      <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 2px; padding: 2rem; position: relative;">
        <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem;">
          <span style="font-family: var(--font-mono); font-size: 0.5625rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 3px 10px; border: 1px solid var(--line); border-radius: 100px; color: var(--gold);">${Utils.escapeHtml(kat)}</span>
          <span style="font-family: var(--font-mono); font-size: 0.5625rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sage);">${impuls.typ === 'vignette' ? 'Fallvignette' : 'Konzept'}</span>
        </div>

        <h3 style="font-family: var(--font-serif); font-weight: 500; font-size: 1.375rem; letter-spacing: -0.02em; color: var(--ink); margin-bottom: 1rem;">${Utils.escapeHtml(impuls.titel)}</h3>

        <p style="font-size: 0.9375rem; line-height: 1.7; color: rgba(10, 10, 20, 0.65); font-weight: 300;">${Utils.escapeHtml(impuls.text)}</p>

        ${quelle ? `<div style="font-family: var(--font-mono); font-size: 0.625rem; color: var(--sage); letter-spacing: 0.06em; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--line);">${Utils.escapeHtml(quelle)}</div>` : ''}
      </div>

      ${reflektiert ? `
        <div style="background: rgba(212, 169, 63, 0.04); border: 1px solid var(--line); border-radius: 2px; padding: 1.5rem; margin-top: 1rem;">
          <div style="font-family: var(--font-serif); font-weight: 500; font-size: 1rem; margin-bottom: 0.75rem; color: var(--ink);">Reflexion</div>
          <p style="font-size: 0.875rem; line-height: 1.7; color: rgba(10, 10, 20, 0.6); font-style: italic; font-weight: 300;">${Utils.escapeHtml(impuls.reflexion)}</p>
          <div style="margin-top: 1rem; font-family: var(--font-mono); font-size: 0.6875rem; color: var(--gold); letter-spacing: 0.08em;">✓ Reflektiert — +${impuls.xp} XP</div>
        </div>
      ` : `
        <button class="btn" onclick="reflektierImpuls()" style="margin-top: 1.25rem; border-color: var(--gold); color: var(--gold); font-family: var(--font-mono); font-size: 0.6875rem; letter-spacing: 0.12em; text-transform: uppercase; border-radius: 100px; padding: 0.625rem 1.5rem;">
          Reflexion aufdecken · +${impuls.xp} XP
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
    <div style="max-width: 640px; margin: 0 auto;">
      <div style="margin-bottom: 2rem;">
        <h2 style="font-family: var(--font-serif); font-weight: 400; font-size: 1.75rem; letter-spacing: -0.03em;">Selbstfürsorge</h2>
        <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--sage); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.25rem;">
          ProQOL-basiert · 10 Items · Wöchentlich empfohlen
        </div>
      </div>

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

  // Ergebnis persistieren
  const sfHistory = JSON.parse(localStorage.getItem('pw_academy_sf_history') || '[]');
  sfHistory.push({ datum: new Date().toISOString(), total, max, pct, label });
  if (sfHistory.length > 20) sfHistory.splice(0, sfHistory.length - 20);
  localStorage.setItem('pw_academy_sf_history', JSON.stringify(sfHistory));
  localStorage.setItem('pw_academy_sf_score', String(pct));

  // Verlauf anzeigen
  const verlauf = sfHistory.slice(-6);

  document.getElementById('sf-result').innerHTML = `
    <div class="ac-section" style="margin-top: var(--space-4); border-left: 4px solid ${farbe};">
      <div style="font-size: 28px; font-weight: var(--font-weight-bold); color: ${farbe};">${total}/${max} (${pct}%)</div>
      <div style="font-size: 18px; font-weight: var(--font-weight-semibold); margin-top: var(--space-2);">${label}</div>
      <p style="margin-top: var(--space-2); font-size: 14px; color: var(--text-secondary);">${text}</p>
    </div>
    ${verlauf.length >= 2 ? `
      <div class="ac-section" style="margin-top: var(--space-3);">
        <h3>Selbstfürsorge-Verlauf</h3>
        <div style="display: flex; align-items: flex-end; gap: 6px; height: 80px; margin-top: var(--space-2);">
          ${verlauf.map(v => {
            const h = Math.max(5, v.pct);
            const c = v.pct >= 75 ? '#10B981' : v.pct >= 50 ? '#F59E0B' : '#DC2626';
            return `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
              <div style="font-size: 10px; font-weight: 700; color: ${c};">${v.pct}%</div>
              <div style="width: 100%; background: ${c}; border-radius: 3px 3px 0 0; height: ${h}%;"></div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">${Utils.formatDate(v.datum, { short: true })}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: var(--space-2);">
          ${verlauf.length >= 3 ? (() => {
            const delta = verlauf.at(-1).pct - verlauf[0].pct;
            return delta > 5 ? '📈 Trend: Verbesserung' : delta < -5 ? '📉 Trend: Verschlechterung — Supervision empfohlen' : '→ Trend: stabil';
          })() : ''}
        </div>
      </div>
    ` : ''}
  `;
  addXP(20);
  showToast('+20 XP für Selbstfürsorge-Reflexion', 'ok');
}

// ─── Skills-Trainer mit Rollenspiel (Manifest) ──────────────
const SZENARIEN = [
  {
    id: 'verweigerung', titel: 'Schulverweigerung',
    situation: 'Lena, 14, sagt: "Ich gehe nie wieder in diese Schule. Ihr könnt mich nicht zwingen."',
    gute_reaktionen: ['Validierung der Gefühle', 'Offene Fragen', 'Nicht sofort Lösungen anbieten', 'Autonomie respektieren'],
    schlechte_reaktionen: ['Drohen', 'Bagatellisieren', 'Moralisieren', 'Eltern sofort anrufen'],
    feedback_gut: 'Gut! Du validierst Lenas Gefühle und gibst ihr Kontrolle zurück. Das stärkt die Allianz und öffnet den Raum für echtes Verstehen.',
    feedback_schlecht: 'Vorsicht — Druck und Moralisieren verstärken die Verweigerung. Erst Beziehung aufbauen, dann Lösungen.',
    optionen: [
      { text: '"Das klingt so, als wärst du wirklich fertig mit der Schule. Was ist passiert?"', typ: 'gut', skill: 'Validierung + offene Frage' },
      { text: '"Du musst in die Schule, das ist Pflicht."', typ: 'schlecht', skill: 'Moralischer Druck' },
      { text: '"Ich verstehe, dass du gerade nicht willst. Was bräuchtest du, um es dir vorzustellen?"', typ: 'gut', skill: 'Autonomie-Fokus' },
      { text: '"Andere Kinder gehen auch hin, das ist doch nicht so schlimm."', typ: 'schlecht', skill: 'Bagatellisierung' },
    ],
  },
  {
    id: 'selbstverletzung', titel: 'Selbstverletzung offenbart',
    situation: 'Karim, 16, zeigt dir frische Schnitte am Unterarm. "Es hilft mir runterzukommen. Sag es bitte niemandem."',
    gute_reaktionen: ['Ruhe bewahren', 'Nicht erschrecken', 'Funktion verstehen', 'C-SSRS durchführen'],
    schlechte_reaktionen: ['Panik zeigen', 'Sofort Eltern anrufen', 'Vorwürfe machen'],
    feedback_gut: 'Richtig. Du bleibst ruhig, fragst nach der Funktion und handelst professionell. Das schafft Vertrauen.',
    feedback_schlecht: 'Panik oder sofortige Eskalation zerstört das Vertrauen. Erst verstehen, dann handeln.',
    optionen: [
      { text: '"Danke, dass du mir das zeigst. Das braucht Mut. Kannst du mir erzählen, was vorher passiert?"', typ: 'gut', skill: 'Wertschätzung + Exploration' },
      { text: '"Oh Gott, das ist schlimm! Ich muss sofort deine Eltern anrufen."', typ: 'schlecht', skill: 'Panik-Reaktion' },
      { text: '"Ich mache mir Sorgen um dich. Darf ich dir ein paar Fragen stellen, damit ich verstehe wie es dir geht?"', typ: 'gut', skill: 'C-SSRS einleiten' },
      { text: '"Warum tust du dir das an? Du hast doch alles."', typ: 'schlecht', skill: 'Bagatellisierung + Vorwurf' },
    ],
  },
  {
    id: 'eltern-wut', titel: 'Wütende Eltern',
    situation: 'Vater von Yara stürmt ins Büro: "Was erzählen Sie meiner Tochter? Sie weint jeden Abend seit sie bei Ihnen war!"',
    gute_reaktionen: ['Ruhe bewahren', 'Gefühle validieren', 'Nicht defensiv werden', 'Gemeinsame Sorge betonen'],
    schlechte_reaktionen: ['Gegenangriff', 'Defensiv werden', 'Fachsprache nutzen'],
    feedback_gut: 'Perfekt. Du deeskalierst durch Ruhe und Empathie. Der Vater fühlt sich gehört statt bekämpft.',
    feedback_schlecht: 'Defensive oder fachliche Reaktionen eskalieren die Situation. Erst regulieren, dann informieren.',
    optionen: [
      { text: '"Ich höre, dass Sie sich große Sorgen machen. Das nehme ich sehr ernst. Setzen wir uns?"', typ: 'gut', skill: 'Deeskalation' },
      { text: '"Beruhigen Sie sich erstmal. Ich habe nur meine Arbeit gemacht."', typ: 'schlecht', skill: 'Defensive' },
      { text: '"Es tut mir leid, dass Yara weint. Können Sie mir erzählen, was sie Ihnen gesagt hat?"', typ: 'gut', skill: 'Empathie + Exploration' },
      { text: '"Das ist ein normaler Teil des therapeutischen Prozesses."', typ: 'schlecht', skill: 'Fachsprache als Mauer' },
    ],
  },
  {
    id: 'dissoziation', titel: 'Dissoziative Episode in der Sitzung',
    situation: 'Yara, 15, wird mitten im Gespräch über ihre Familie plötzlich still. Ihr Blick ist glasig, sie reagiert nicht auf ihren Namen.',
    gute_reaktionen: ['Ruhig bleiben', 'Orientierung geben', 'Sensorische Reize', 'Nicht anfassen ohne Erlaubnis'],
    schlechte_reaktionen: ['Schütteln', 'Laut rufen', 'Sofort Thema weitermachen'],
    feedback_gut: 'Richtig. Grounding-Techniken: ruhige Stimme, "Du bist hier im Raum, es ist sicher." Sensorische Reize (kaltes Wasser, starker Geruch). Warten, nicht drängen.',
    feedback_schlecht: 'Physischer Kontakt oder laute Ansprache kann die Dissoziation verstärken. Erst orientieren, dann regulieren.',
    optionen: [
      { text: '"Yara, du bist hier bei mir im Raum. Schau mal, was siehst du hier? Kannst du den Stuhl unter dir spüren?"', typ: 'gut', skill: 'Grounding + Orientierung' },
      { text: '"Yara! Hey! Wach auf!" (laut, Schulter berühren)', typ: 'schlecht', skill: 'Übergriffig + re-traumatisierend' },
      { text: '(Ruhig ein Glas kaltes Wasser hinstellen, abwarten, leise: "Nimm dir Zeit.")', typ: 'gut', skill: 'Sensorischer Reiz + Geduld' },
      { text: '"OK, dann machen wir weiter mit dem Thema wenn du wieder da bist."', typ: 'schlecht', skill: 'Bagatellisierung' },
    ],
  },
  {
    id: 'schweigen', titel: 'Schweigender Jugendlicher',
    situation: 'Tom, 13, sitzt seit 15 Minuten schweigend vor dir. Jede Frage wird mit "Weiß nicht" oder Achselzucken beantwortet.',
    gute_reaktionen: ['Parallel-Aktivität anbieten', 'Druck rausnehmen', 'Metakommunikation', 'Thema wechseln auf Stärken'],
    schlechte_reaktionen: ['Mehr Fragen stellen', 'Schweigen als Verweigerung deuten', 'Konfrontieren'],
    feedback_gut: 'Gut. Schweigen kann viele Ursachen haben: Angst, Loyalitätskonflikt, Nicht-Wissen, Scham. Druck rausnehmen öffnet Räume die Fragen schließen.',
    feedback_schlecht: 'Mehr Fragen bei einem schweigenden Klienten erhöht den Druck und verstärkt die Blockade.',
    optionen: [
      { text: '"Es ist OK, nicht zu reden. Magst du stattdessen was zeichnen oder ein Spiel spielen?"', typ: 'gut', skill: 'Parallel-Aktivität' },
      { text: '"Tom, ich kann dir nur helfen wenn du mit mir redest."', typ: 'schlecht', skill: 'Druck aufbauen' },
      { text: '"Weißt du was, lass uns kurz rausgehen. Frische Luft, 5 Minuten."', typ: 'gut', skill: 'Setting-Wechsel' },
      { text: '"Deine Mutter hat mir erzählt, dass es Probleme in der Schule gibt. Stimmt das?"', typ: 'schlecht', skill: 'Vertrauensbruch (Eltern-Info nutzen)' },
    ],
  },
  {
    id: 'substanz', titel: 'Jugendlicher berichtet Substanzkonsum',
    situation: 'Marie, 16, erzählt beiläufig: "Ich geh manchmal kiffen nach der Schule. Ist doch normal, alle machen das."',
    gute_reaktionen: ['Nicht moralisieren', 'Funktion explorieren', 'Harm Reduction', 'MI-Techniken'],
    schlechte_reaktionen: ['Sofort Eltern anrufen', 'Moralische Predigt', '"Drogen sind gefährlich"'],
    feedback_gut: 'Richtig. Motivational Interviewing: Ambivalenz explorieren statt konfrontieren. Funktion verstehen (Entspannung? Gruppendruck? Flucht?). Harm Reduction statt Abstinenz-Forderung.',
    feedback_schlecht: 'Moralisieren verschließt die Tür. Marie wird nichts mehr erzählen. Die Chance zur Begleitung ist vertan.',
    optionen: [
      { text: '"Erzähl mal — wie sieht so ein Nachmittag aus? Was gefällt dir daran?"', typ: 'gut', skill: 'Offene Frage + Funktion explorieren' },
      { text: '"Cannabis ist gerade für Jugendliche sehr schädlich für das Gehirn."', typ: 'schlecht', skill: 'Moralische Belehrung' },
      { text: '"Hast du schon mal gemerkt, dass es dir danach schlechter geht? Oder besser?"', typ: 'gut', skill: 'Ambivalenz explorieren (MI)' },
      { text: '"Ich muss das deinen Eltern sagen, das weißt du."', typ: 'schlecht', skill: 'Drohung mit Konsequenzen' },
    ],
  },
];

let skillsState = { szenario: null, gewaehlt: [] };

function renderSkillsTrainer() {
  const container = document.getElementById('ac-content');

  if (!skillsState.szenario) {
    container.innerHTML = `
      <div style="max-width: 700px; margin: 0 auto;">
        <div style="margin-bottom: 2rem;">
          <h2 style="font-family: var(--font-serif); font-weight: 400; font-size: 1.75rem; letter-spacing: -0.03em;">Skills-Trainer</h2>
          <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--sage); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.25rem;">
            ${SZENARIEN.length} Rollenspiel-Szenarien
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
          ${SZENARIEN.map(sz => `
            <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 2px; padding: 1.5rem; cursor: pointer; transition: all 0.15s;"
                 onclick="startSzenario('${sz.id}')" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
              <div style="font-family: var(--font-serif); font-weight: 500; font-size: 1rem; margin-bottom: 0.5rem;">${Utils.escapeHtml(sz.titel)}</div>
              <p style="font-size: 0.8125rem; color: rgba(10,10,20,0.5); font-style: italic; line-height: 1.6;">"${Utils.escapeHtml(sz.situation.slice(0, 100))}…"</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    return;
  }

  const sz = skillsState.szenario;
  const alleBeantwortet = skillsState.gewaehlt.length === sz.optionen.length;
  const guteGewaehlt = skillsState.gewaehlt.filter(i => sz.optionen[i].typ === 'gut').length;
  const schlechteGewaehlt = skillsState.gewaehlt.filter(i => sz.optionen[i].typ === 'schlecht').length;

  container.innerHTML = `
    <div style="max-width: 700px;">
      <button class="btn" onclick="skillsState.szenario=null; skillsState.gewaehlt=[]; renderSkillsTrainer();" style="margin-bottom: var(--space-3);">← Zurück zur Auswahl</button>

      <div class="ac-section" style="border-left: 4px solid var(--color-app-academy);">
        <div style="font-size: 12px; text-transform: uppercase; color: var(--color-app-academy); letter-spacing: 1px;">Szenario</div>
        <h3>${Utils.escapeHtml(sz.titel)}</h3>
        <p style="font-size: 16px; line-height: var(--line-height-relaxed); margin-top: var(--space-2); font-style: italic;">"${Utils.escapeHtml(sz.situation)}"</p>
      </div>

      <h3 style="margin-top: var(--space-4);">Wie reagierst du?</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: var(--space-3);">Klicke auf die Antworten, die du wählen würdest.</p>

      ${sz.optionen.map((opt, i) => {
        const gewaehlt = skillsState.gewaehlt.includes(i);
        const showFeedback = gewaehlt;
        return `
          <div class="ac-section" style="cursor: pointer; ${gewaehlt ? (opt.typ === 'gut' ? 'border-left: 4px solid #10B981; background: rgba(16,185,129,0.05);' : 'border-left: 4px solid #DC2626; background: rgba(220,38,38,0.05);') : ''}"
               onclick="selectSkillOption(${i})">
            <p style="font-size: 15px;">"${Utils.escapeHtml(opt.text)}"</p>
            ${showFeedback ? `
              <div style="margin-top: var(--space-2); font-size: 13px; color: ${opt.typ === 'gut' ? '#059669' : '#DC2626'};">
                ${opt.typ === 'gut' ? '✓' : '✕'} <strong>${Utils.escapeHtml(opt.skill)}</strong>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}

      ${skillsState.gewaehlt.length >= 2 ? `
        <div class="ac-section" style="margin-top: var(--space-4); border-left: 4px solid ${guteGewaehlt > schlechteGewaehlt ? '#10B981' : '#F59E0B'};">
          <h3>Feedback</h3>
          <p>${guteGewaehlt > schlechteGewaehlt ? Utils.escapeHtml(sz.feedback_gut) : Utils.escapeHtml(sz.feedback_schlecht)}</p>
          <div style="margin-top: var(--space-3);">
            <strong>Empfohlene Skills:</strong> ${sz.gute_reaktionen.join(' · ')}
          </div>
          <div style="margin-top: var(--space-2);">
            <strong>Vermeiden:</strong> ${sz.schlechte_reaktionen.join(' · ')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function startSzenario(id) {
  skillsState.szenario = SZENARIEN.find(s => s.id === id);
  skillsState.gewaehlt = [];
  renderSkillsTrainer();
}

function selectSkillOption(idx) {
  if (skillsState.gewaehlt.includes(idx)) return;
  skillsState.gewaehlt.push(idx);
  if (skillsState.gewaehlt.length === 2) {
    const sz = skillsState.szenario;
    const guteGewaehlt = skillsState.gewaehlt.filter(i => sz.optionen[i].typ === 'gut').length;
    addXP(guteGewaehlt >= 2 ? 30 : guteGewaehlt === 1 ? 15 : 5);
    tickStreak();
  }
  renderSkillsTrainer();
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
  else if (name === 'skills') renderSkillsTrainer();
  else if (name === 'selbstfuersorge') renderSelbstfuersorge();
  else if (name === 'profil') renderProfil();
}

// ─── Lernpfade ────────────────────────────────────────────────
async function loadPfade() {
  if (APP.pfade) return APP.pfade;
  const data = await Utils.safeFetch('courses/lernpfade-index.json');
  if (!data) { showToast('Lernpfade konnten nicht geladen werden', 'error'); return []; }
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
  const data = await Utils.safeFetch('cdss/decision-trees.json');
  if (!data) { showToast('CDSS-Bäume konnten nicht geladen werden', 'error'); return []; }
  APP.cdssTrees = data.trees;
  return APP.cdssTrees;
}

const CDSS_VIGNETTEN = [
  { id: 'v1', chip: 'Schulvermeidung, 14J, Familie kooperativ',
    titel: 'Schulvermeidung seit 6 Monaten',
    studien: [
      { autor: 'Kearney & Silverman 2004', evidenz: 'II', kern: 'SRAS unterscheidet 4 Funktionen der Schulvermeidung: negative Verstärkung (Angst vermeiden), positive Verstärkung (Belohnung zu Hause), Aufmerksamkeit, tangible Verstärker.' },
      { autor: 'Maynard et al. 2015 (Meta-Analyse)', evidenz: 'I', kern: 'KVT ist die wirksamste Intervention bei angstbedingter Schulvermeidung. Effektstärke d=0.54 für Anwesenheits-Tage.' },
    ],
    empfehlungen: ['Funktionsanalyse: WARUM vermeidet? (SRAS durchführen)', 'Bei Angst: graduierte Exposition (S3-Leitlinie)', 'Bei oppositioneller Verweigerung: Verhaltensvertrag + Eltern-Coaching', 'Schule einbeziehen: Vertrauensperson, angepasster Stundenplan', 'GAD-7 + PHQ-A durchführen (Komorbidität häufig)'],
  },
  { id: 'v2', chip: 'Ritzen, 13J, Eltern ahnungslos',
    titel: 'Wiederholtes Ritzen bei 13-Jähriger',
    studien: [
      { autor: 'Nock 2010', evidenz: 'II', kern: 'NSSI dient der Emotionsregulation (Spannungsabbau). Suizidalität und NSSI sind verwandt aber distinkt — 70% der NSSI-Betroffenen haben keine Suizidabsicht, aber das Risiko ist erhöht.' },
      { autor: 'Linehan 1993 (DBT)', evidenz: 'I', kern: 'DBT-Skills (TIPP, Opposite Action, Distress Tolerance) sind die am besten untersuchte Intervention bei NSSI. Überlegen gegenüber TAU.' },
    ],
    empfehlungen: ['C-SSRS durchführen — NSSI ≠ suizidal, aber Risiko abklären', 'Funktion verstehen: Wann? Wo? Was davor? Was danach? (Spannungsabbau?)', 'Alternative Skills: Eiswürfel, Sport, rote Farbe auf Haut statt Schnitt', 'Eltern informieren — Schweigepflicht weicht bei Selbstgefährdung', 'PCL-5 wenn Trauma-Verdacht (NSSI häufig bei Trauma)'],
  },
  { id: 'v3', chip: 'Wut-Ausbrüche, 12J, ADHS-Verdacht',
    titel: 'Extreme Wutausbrüche bei 12-Jährigem',
    studien: [
      { autor: 'Greene 2014 (CPS)', evidenz: 'II', kern: 'Collaborative Problem Solving: "Kinder benehmen sich gut wenn sie können." Wut entsteht aus fehlenden Skills (Frustrationstoleranz, Flexibilität), nicht aus Bösartigkeit.' },
      { autor: 'Barkley 2015 (ADHS)', evidenz: 'I', kern: 'Bei ADHS ist Emotionsregulation ein Kerndefizit (nicht nur Aufmerksamkeit). 30-50% der Kinder mit ADHS zeigen signifikante Wutausbrüche. Medikation verbessert auch die Emotionsregulation.' },
    ],
    empfehlungen: ['ADHS-Screening (ASRS, Conners) — Wut kann ADHS-Symptom sein', 'SDQ durchführen (Conduct-Subskala)', 'CPS-Methode: Plan B (Empathie → Problem definieren → gemeinsame Lösung)', 'DBT-Skills: TIPP für akute Regulation', 'Eltern-Coaching: "Das Kind kann nicht, es will nicht" reframen'],
  },
];

async function renderCdssList() {
  const trees = await loadCdss();
  const container = document.getElementById('ac-content');
  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="margin-bottom: 2rem;">
        <h2 style="font-family: var(--font-serif); font-weight: 400; font-size: 1.75rem; letter-spacing: -0.03em;">Clinical Decision Support</h2>
        <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--sage); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.25rem;">
          Evidenzbasierte Empfehlungen für komplexe Fälle
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <div style="font-family: var(--font-serif); font-weight: 500; font-size: 1rem; margin-bottom: 0.75rem;">Häufige Vignetten</div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${CDSS_VIGNETTEN.map(v => `
            <button class="btn" onclick="showVignette('${v.id}')" style="font-size: 0.75rem; border-radius: 100px; padding: 0.5rem 1rem;">${Utils.escapeHtml(v.chip)}</button>
          `).join('')}
        </div>
      </div>

      <div id="cdss-vignette-result"></div>

      <div style="margin-top: 2rem;">
        <div style="font-family: var(--font-serif); font-weight: 500; font-size: 1rem; margin-bottom: 0.75rem;">Entscheidungsbäume</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
          ${trees.map(t => `
            <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 2px; padding: 1.25rem; cursor: pointer; transition: all 0.15s;"
                 onclick="openCdss('${t.id}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
              <div style="font-size: 20px; margin-bottom: 0.5rem;">${t.icon}</div>
              <div style="font-family: var(--font-serif); font-weight: 500; font-size: 0.9375rem;">${Utils.escapeHtml(t.titel)}</div>
              <div style="font-size: 0.75rem; color: var(--sage); margin-top: 0.25rem;">${Utils.escapeHtml(t.intro.slice(0, 60))}…</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function showVignette(id) {
  const v = CDSS_VIGNETTEN.find(x => x.id === id);
  if (!v) return;
  const el = document.getElementById('cdss-vignette-result');
  el.innerHTML = `
    <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 2px; padding: 2rem;">
      <h3 style="font-family: var(--font-serif); font-weight: 500; font-size: 1.25rem; margin-bottom: 1rem;">${Utils.escapeHtml(v.titel)}</h3>

      <div style="margin-bottom: 1.5rem;">
        <div style="font-family: var(--font-mono); font-size: 0.625rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.75rem;">Relevante Studien</div>
        ${v.studien.map(s => `
          <div style="padding: 0.75rem 1rem; border-left: 2px solid var(--gold); margin-bottom: 0.5rem; background: rgba(212,169,63,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 500; font-size: 0.875rem;">${Utils.escapeHtml(s.autor)}</span>
              <span style="font-family: var(--font-mono); font-size: 0.5625rem; padding: 2px 8px; border: 1px solid var(--line); border-radius: 100px; color: var(--sage);">Evidenz ${s.evidenz}</span>
            </div>
            <p style="font-size: 0.8125rem; color: rgba(10,10,20,0.6); margin-top: 0.375rem; line-height: 1.6;">${Utils.escapeHtml(s.kern)}</p>
          </div>
        `).join('')}
      </div>

      <div>
        <div style="font-family: var(--font-mono); font-size: 0.625rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.75rem;">Empfehlungen (priorisiert)</div>
        <ol style="padding-left: 1.25rem; font-size: 0.875rem; line-height: 1.8; color: rgba(10,10,20,0.7);">
          ${v.empfehlungen.map(e => `<li style="margin-bottom: 0.25rem;">${Utils.escapeHtml(e)}</li>`).join('')}
        </ol>
      </div>
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
              return p ? `<button class="btn" onclick="setTab('lernpfade'); setTimeout(()=>openPfad('${mid}'), 100)">${p.icon} ${p.titel}</button>` : '';
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
// ─── Wissenstest-Kategorien mit eigenem Fragenpool ──────────
const QUIZ_KATEGORIEN = [
  {
    id: 'bindung', titel: 'Bindungstheorie', icon: '🔗', count: 15,
    fragen: [
      { frage: 'Wer entwickelte die Bindungstheorie?', optionen: ['Freud', 'Bowlby', 'Piaget', 'Erikson'], korrekt: 1, erklaerung: 'John Bowlby (1969) entwickelte die Bindungstheorie. Er beschrieb Bindung als biologisches Überlebenssystem.' },
      { frage: 'Wie viele Bindungsmuster beschrieb Mary Ainsworth?', optionen: ['2', '3', '4', '5'], korrekt: 2, erklaerung: 'Ainsworth (1978) beschrieb 3 Muster (sicher, vermeidend, ambivalent). Main & Hesse fügten später das 4. hinzu (desorganisiert).' },
      { frage: 'Was kennzeichnet desorganisierte Bindung?', optionen: ['Klammern', 'Vermeidung', 'Widersprüchliches Verhalten (Nähe + Abstoßung)', 'Gleichgültigkeit'], korrekt: 2, erklaerung: 'Desorganisierte Bindung (Typ D): Das Kind zeigt widersprüchliches Verhalten — es sucht Nähe und stößt gleichzeitig ab. Die Bezugsperson ist Quelle von Trost UND Angst.' },
      { frage: 'Was ist ein "inneres Arbeitsmodell"?', optionen: ['Ein Therapieplan', 'Mentale Repräsentation von Beziehungen', 'Ein diagnostisches Instrument', 'Ein Lernkonzept'], korrekt: 1, erklaerung: 'Bowlby: Innere Arbeitsmodelle sind mentale Vorstellungen davon, wie Beziehungen funktionieren — gebildet durch frühe Bindungserfahrungen.' },
      { frage: 'Welches Bindungsmuster ist am stärksten mit Misshandlung assoziiert?', optionen: ['Sicher', 'Vermeidend', 'Ambivalent', 'Desorganisiert'], korrekt: 3, erklaerung: 'Desorganisierte Bindung tritt gehäuft bei Misshandlung auf (Main & Hesse 1990) — die Bezugsperson ist gleichzeitig Schutz und Bedrohung.' },
      { frage: 'Was ist Mentalisierung?', optionen: ['Meditation', 'Fähigkeit, Verhalten als Ausdruck innerer Zustände zu verstehen', 'Intellektuelle Übung', 'Diagnose-Methode'], korrekt: 1, erklaerung: 'Fonagy & Target (2002): Mentalisierung = die Fähigkeit, eigenes und fremdes Verhalten als Ausdruck von Gedanken, Gefühlen, Wünschen zu verstehen.' },
      { frage: 'Was ist die wichtigste Intervention bei einem vermeidend gebundenen Jugendlichen?', optionen: ['Konfrontation', 'Konsistenz und Geduld', 'Mehr Fragen stellen', 'Medikation'], korrekt: 1, erklaerung: 'Vermeidend gebundene Kinder haben gelernt, Bedürfnisse zu unterdrücken. Sie brauchen eine Bezugsperson die BLEIBT, auch wenn sie ablehnen.' },
      { frage: 'Was beschreibt die "Strange Situation" (Ainsworth)?', optionen: ['Eine Therapiemethode', 'Ein experimentelles Setting zur Beobachtung von Bindungsverhalten', 'Ein Fragebogen', 'Eine Diagnose'], korrekt: 1, erklaerung: 'Die Strange Situation (Ainsworth 1978): Standardisiertes Setting mit Trennung und Wiedervereingung — beobachtet wie das Kind auf die Rückkehr der Bezugsperson reagiert.' },
      { frage: 'Was ist RAD (ICD-11 6B44)?', optionen: ['Reaktive Angststörung', 'Reaktive Bindungsstörung', 'Reizbare Aufmerksamkeitsstörung', 'Regulationsstörung'], korrekt: 1, erklaerung: 'Reactive Attachment Disorder: Gehemmtes Bindungsverhalten nach pathogener Fürsorge. Kind zeigt kaum Bindungsverhalten, sucht selten Trost.' },
      { frage: 'Wie fördert man Mentalisierung bei Jugendlichen?', optionen: ['Arbeitsblätter', 'Laut über innere Zustände nachdenken (Modellierung)', 'Strafen', 'Ignorieren'], korrekt: 1, erklaerung: 'Mentalisierung wird durch Modellierung gelernt. Die Fachkraft denkt laut: "Ich frage mich ob du vielleicht Angst hast, dass..."' },
      { frage: 'Ab welchem Alter beginnt Bindungsverhalten?', optionen: ['Geburt', '6-9 Monate', '2 Jahre', '5 Jahre'], korrekt: 1, erklaerung: 'Spezifische Bindung zu einer Bezugsperson entwickelt sich ab ca. 6-9 Monaten (Bowlby). Vorher: unspezifische Nähesuche.' },
      { frage: 'Was unterscheidet DSED von RAD?', optionen: ['DSED zeigt Klammern, RAD zeigt Vermeidung', 'DSED zeigt unterschiedslose Kontaktaufnahme mit Fremden', 'DSED ist schwerer', 'Kein Unterschied'], korrekt: 1, erklaerung: 'DSED (Disinhibited Social Engagement Disorder): Kind nähert sich Fremden unterschiedslos. RAD: Kind zeigt kaum Bindungsverhalten. Beide nach pathogener Fürsorge.' },
      { frage: 'Was meint "korrigierendes Bindungserleben"?', optionen: ['Alte Bindungsmuster löschen', 'Neue, positive Beziehungserfahrungen die das innere Arbeitsmodell verändern', 'Medikamentöse Korrektur', 'Eltern ersetzen'], korrekt: 1, erklaerung: 'Durch konsistente, sichere Beziehungserfahrungen mit der Fachkraft kann das innere Arbeitsmodell ("Erwachsene sind unzuverlässig") langsam korrigiert werden.' },
      { frage: 'Warum ist Konsistenz bei desorganisierter Bindung so wichtig?', optionen: ['Weil Kinder Regeln brauchen', 'Weil das innere Modell "Erwachsene sind unberechenbar" korrigiert werden muss', 'Wegen der Hausordnung', 'Aus rechtlichen Gründen'], korrekt: 1, erklaerung: 'Das Kind hat gelernt: Die Person die mich schützen soll, ist auch die die mich bedroht. Nur durch monatelange Konsistenz wird dieses Modell korrigiert.' },
      { frage: 'Welcher Forscher prägte den Begriff "Mentalisierung"?', optionen: ['Bowlby', 'Ainsworth', 'Fonagy', 'Porges'], korrekt: 2, erklaerung: 'Peter Fonagy (und Mary Target) prägten das Konzept der Mentalisierung und verbanden es mit Bindungstheorie (Fonagy & Target 2002).' },
    ],
  },
  { id: 'polyvagal', titel: 'Polyvagal-Theorie', icon: '🧠', count: 12, fragen: [] },
  { id: 'trauma', titel: 'Trauma-Grundlagen', icon: '🌪️', count: 20, fragen: [] },
  { id: 'icd', titel: 'ICD-10 Differenzialdiagnostik', icon: '🏥', count: 25, fragen: [] },
  { id: 'suizid', titel: 'Suizidprävention', icon: '🛡️', count: 15, fragen: [] },
  { id: 'adhs', titel: 'ADHS bei Jugendlichen', icon: '⚡', count: 15, fragen: [] },
  { id: 'allianz', titel: 'Therapeutische Allianz', icon: '🤝', count: 10, fragen: [] },
  { id: 'dbt', titel: 'DBT Skills', icon: '🎭', count: 12, fragen: [] },
  { id: 'kvt', titel: 'KVT Grundlagen', icon: '🧠', count: 15, fragen: [] },
  { id: 'krise', titel: 'Krisenintervention', icon: '🚨', count: 10, fragen: [] },
];

async function renderWissenstest() {
  const container = document.getElementById('ac-content');

  // Auch Fragen aus Lernpfaden sammeln
  const pfade = await loadPfade();
  const pfadFragen = [];
  pfade.forEach(p => {
    p.schritte.filter(s => s.typ === 'quiz').forEach(s => {
      pfadFragen.push(...(s.fragen || []));
    });
  });

  container.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="margin-bottom: 2rem;">
        <h2 style="font-family: var(--font-serif); font-weight: 400; font-size: 1.75rem; letter-spacing: -0.03em;">Wissenstest</h2>
        <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--sage); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.25rem;">
          ${QUIZ_KATEGORIEN.reduce((s, k) => s + k.count, 0) + pfadFragen.length} Fragen in ${QUIZ_KATEGORIEN.length + 1} Kategorien
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
        ${QUIZ_KATEGORIEN.map(k => {
          const hasFragen = k.fragen && k.fragen.length > 0;
          return `
            <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 2px; padding: 1.25rem; cursor: ${hasFragen ? 'pointer' : 'default'}; transition: all 0.15s; opacity: ${hasFragen ? '1' : '0.5'};"
                 ${hasFragen ? `onclick="startQuizKategorie('${k.id}')" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.transform='';this.style.boxShadow=''"` : ''}>
              <div style="font-size: 24px; margin-bottom: 0.5rem;">${k.icon}</div>
              <div style="font-family: var(--font-serif); font-weight: 500; font-size: 1rem; margin-bottom: 0.25rem;">${Utils.escapeHtml(k.titel)}</div>
              <div style="font-family: var(--font-mono); font-size: 0.625rem; color: var(--sage); letter-spacing: 0.08em;">${hasFragen ? k.fragen.length + ' Fragen' : k.count + ' Fragen · bald'}</div>
            </div>
          `;
        }).join('')}

        <div style="background: var(--paper); border: 1px solid var(--line); border-radius: 2px; padding: 1.25rem; cursor: pointer; transition: all 0.15s;"
             onclick="startQuizRandom()" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
          <div style="font-size: 24px; margin-bottom: 0.5rem;">🎲</div>
          <div style="font-family: var(--font-serif); font-weight: 500; font-size: 1rem; margin-bottom: 0.25rem;">Zufalls-Mix</div>
          <div style="font-family: var(--font-mono); font-size: 0.625rem; color: var(--sage); letter-spacing: 0.08em;">${pfadFragen.length} Fragen aus Lernpfaden</div>
        </div>
      </div>
    </div>
  `;
}

function startQuizKategorie(katId) {
  const kat = QUIZ_KATEGORIEN.find(k => k.id === katId);
  if (!kat || !kat.fragen.length) return;
  const container = document.getElementById('ac-content');
  const quizContainer = document.createElement('div');
  quizContainer.style.maxWidth = '700px';
  quizContainer.style.margin = '0 auto';
  container.innerHTML = '';
  const header = document.createElement('div');
  header.innerHTML = `<button class="btn" onclick="renderWissenstest()" style="margin-bottom: 1rem;">← Zurück</button><h2 style="font-family: var(--font-serif); font-weight: 400; margin-bottom: 1.5rem;">${kat.icon} ${Utils.escapeHtml(kat.titel)}</h2>`;
  container.appendChild(header);
  container.appendChild(quizContainer);
  QuizEngine.start(kat.fragen, { container: quizContainer, onComplete: result => { if (result.passed) { addXP(30); showToast('+30 XP!', 'ok'); } } });
}

async function startQuizRandom() {
  const pfade = await loadPfade();
  const allQ = [];
  pfade.forEach(p => p.schritte.filter(s => s.typ === 'quiz').forEach(s => allQ.push(...(s.fragen || []))));
  for (let i = allQ.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [allQ[i], allQ[j]] = [allQ[j], allQ[i]]; }
  const container = document.getElementById('ac-content');
  const quizContainer = document.createElement('div');
  quizContainer.style.maxWidth = '700px';
  quizContainer.style.margin = '0 auto';
  container.innerHTML = '';
  const header = document.createElement('div');
  header.innerHTML = `<button class="btn" onclick="renderWissenstest()" style="margin-bottom: 1rem;">← Zurück</button><h2 style="font-family: var(--font-serif); font-weight: 400; margin-bottom: 1.5rem;">🎲 Zufalls-Quiz</h2>`;
  container.appendChild(header);
  container.appendChild(quizContainer);
  QuizEngine.start(allQ.slice(0, 10), { container: quizContainer, onComplete: result => { if (result.passed) { addXP(50); showToast('+50 XP!', 'ok'); } } });
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
    <div style="max-width: 800px; margin: 0 auto;">
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family: var(--font-serif); font-weight: 400; font-size: 1.75rem; letter-spacing: -0.03em;">Karriere-Profil</h2>
      <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--sage); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.25rem;">Deine professionelle Entwicklung</div>
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

    ${(() => {
      const reflexionen = DB.getPersNotizen().filter(n => (n.tags || []).includes('academy')).sort((a, b) => (b.erstellt || '').localeCompare(a.erstellt || ''));
      if (!reflexionen.length) return '';
      return `
        <div class="ac-section">
          <h3>📝 Reflexions-Tagebuch (${reflexionen.length})</h3>
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${reflexionen.slice(0, 5).map(r => `
              <div style="padding: var(--space-2) var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid var(--color-app-academy);">
                <div style="font-size: 13px; font-weight: 600;">${Utils.escapeHtml(r.titel)}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${Utils.formatDate(r.erstellt)}</div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${Utils.escapeHtml(Utils.truncate(r.inhalt || '', 120))}</div>
              </div>
            `).join('')}
            ${reflexionen.length > 5 ? `<div style="font-size: 12px; color: var(--text-muted);">+ ${reflexionen.length - 5} weitere Reflexionen</div>` : ''}
          </div>
        </div>
      `;
    })()}

    <div class="ac-section">
      <h3>📊 Karriere-Tracker</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: var(--space-3);">
        Deine professionelle Entwicklung auf einen Blick.
      </p>
      ${(() => {
        const klienten = DB.getSchueler();
        const sitzungenTotal = klienten.reduce((sum, s) => sum + DB.getNotizen(s.id).filter(n => n.kategorie === 'session').length, 0);
        const screeningsTotal = klienten.reduce((sum, s) => sum + DB.getScreenings(s.id).filter(x => x.abgeschlossen).length, 0);
        const konferenzenTotal = klienten.reduce((sum, s) => sum + DB.getKonferenzen(s.id).length, 0);
        const sfScore = localStorage.getItem('pw_academy_sf_score') || '—';

        return `
          <div class="ac-profile-grid">
            <div class="ac-stat-card">
              <div class="ac-stat-card-num">${klienten.length}</div>
              <div class="ac-stat-card-label">Klienten begleitet</div>
            </div>
            <div class="ac-stat-card">
              <div class="ac-stat-card-num">${sitzungenTotal}</div>
              <div class="ac-stat-card-label">Sitzungen dokumentiert</div>
            </div>
            <div class="ac-stat-card">
              <div class="ac-stat-card-num">${screeningsTotal}</div>
              <div class="ac-stat-card-label">Screenings durchgeführt</div>
            </div>
            <div class="ac-stat-card">
              <div class="ac-stat-card-num">${konferenzenTotal}</div>
              <div class="ac-stat-card-label">Konferenzen dokumentiert</div>
            </div>
          </div>

          <h4 style="margin-top: var(--space-4);">Spezialisierungs-Pfade (Manifest)</h4>
          <div style="display: grid; gap: var(--space-2); margin-top: var(--space-2);">
            ${[
              { id: 'trauma', label: 'Trauma-Spezialist', stunden: 40, icon: '🌪️', req: 'Lernpfad Trauma + 10 Trauma-Klienten + C-SSRS-Kompetenz', erfuellt: completedPfade >= 1 && klienten.length >= 3 },
              { id: 'krisenintervention', label: 'Krisenintervention', stunden: 30, icon: '🚨', req: '10 C-SSRS + 5 Sicherheitspläne + Skills-Training absolviert', erfuellt: xp >= 200 },
              { id: 'diagnostik', label: 'Diagnostik-Experte', stunden: 50, icon: '🔍', req: 'Lernpfad Screening + 20 Screenings + 5P-Kompetenz', erfuellt: screeningsTotal >= 10 },
            ].map(sp => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 4px solid ${sp.erfuellt ? '#10B981' : 'var(--border)'};">
                <div>
                  <strong>${sp.icon} ${sp.label}</strong> <span style="font-size: 12px; color: var(--text-muted);">(${sp.stunden}h)</span>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${sp.req}</div>
                </div>
                <span style="font-size: 14px;">${sp.erfuellt ? '✅ Bereit' : '⬜ Offen'}</span>
              </div>
            `).join('')}
          </div>
        `;
      })()}
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
