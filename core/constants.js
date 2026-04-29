/* ============================================================
   Pathways Core — Constants Manifest
   ============================================================
   Zentrale Konstanten der App. Heute leben die meisten in js/data.js
   (>5000 Zeilen). Dieses Modul macht sie für alle Apps auffindbar
   und versioniert.

   Migration:
   - Phase A:   Re-Export-Wrapper (jetzt). Apps laden weiterhin js/data.js.
   - Phase C:   Pro App die jeweils benötigten Konstanten als JSON
                in den App-Ordner extrahieren (z.B. /library/data/*.json).
   - Phase D:   js/data.js obsolet, alle Konstanten als JSON oder Module.

   API:
     CONSTANTS_VERSION         (zur Migrations-Steuerung)
     Constants.has(name)       — prüft, ob globale Konstante geladen
     Constants.get(name)       — gibt globale Konstante oder Default zurück
     Constants.require(names)  — wirft Fehler, falls Konstante fehlt
   ============================================================ */

const CONSTANTS_VERSION = 1;

// Liste aller Pathways-Konstanten, die in js/data.js definiert sind.
// Wenn eine App diese braucht, muss js/data.js geladen sein
// (oder eine extrahierte JSON-Datei aus /core/data/<name>.json).
const KNOWN_CONSTANTS = [
  // Screening
  'SCREENING_DOMAINS',          // 18 Screening-Domänen mit Items, Cutoffs
  'SCREENING_THEMA_MAP',        // Domain → Themen-IDs
  'SMART_SCREENING_VORSCHLAEGE',// Domain → Auto-Roadmap-Vorschläge

  // Diagnostik
  'HYPOTHESEN_THEMA_MAP',       // Hypothese → Themen
  'ICD_ARBEITSBLATT_MAP',       // ICD-10 → Arbeitsblatt-Empfehlung

  // Roadmap & Therapie
  'ROADMAP_PHASEN',             // 7 Phasen-Definition
  'THEMA_MODULE',               // Sitzungsleitfäden je Thema
  'STAERKEN_DIMENSIONEN',       // 14 Stärken-Profile

  // Materialien (Mappings)
  'ARBEITSBLAETTER',            // Theme → Arbeitsblatt-Datei
  'THERAPIE_MODULE_DATEIEN',    // Theme → Therapie-Modul HTML
  'FACHKRAFT_MODULE_DATEIEN',   // Theme → Fachkraft-Modul HTML
  'ELTERN_INFOBLAETTER',        // Theme → Eltern-Infoblatt
  'ELTERN_GESPRAECHSLEITFAEDEN',// Gesprächsleitfäden

  // Tools
  'EVALUATIONSBOEGEN',          // ORS, SRS, ProQOL etc.
  'FALLBEISPIELE',              // Trainingsfälle
  'WB_LERNPFADE',               // Weiterbildungs-Lernpfade
];

const Constants = {
  /** Gibt true zurück, wenn die Konstante als globaler Wert verfügbar ist. */
  has(name) {
    return typeof globalThis[name] !== 'undefined';
  },

  /**
   * Holt eine globale Konstante oder gibt `defaultValue` zurück.
   * Loggt Warnung wenn nicht gefunden und kein Default angegeben.
   */
  get(name, defaultValue) {
    if (typeof globalThis[name] !== 'undefined') return globalThis[name];
    if (defaultValue === undefined) {
      console.warn(`[Constants] "${name}" nicht geladen. Stelle sicher, dass js/data.js eingebunden ist.`);
    }
    return defaultValue;
  },

  /**
   * Wirft Fehler, wenn eine oder mehrere Konstanten fehlen.
   * Hilfreich am App-Start zur frühen Diagnose.
   */
  require(...names) {
    const missing = names.filter(n => !this.has(n));
    if (missing.length) {
      throw new Error(`[Constants] Fehlende Konstanten: ${missing.join(', ')}. Lade js/data.js vor App-Start.`);
    }
  },

  /** Listet alle bekannten Konstanten und ihren Lade-Status auf. */
  status() {
    return KNOWN_CONSTANTS.map(name => ({
      name,
      loaded: this.has(name),
      type: this.has(name) ? (Array.isArray(globalThis[name]) ? 'array' : typeof globalThis[name]) : null,
    }));
  },
};

// CommonJS export (für Tools/Tests). Browser nutzt globale `Constants`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONSTANTS_VERSION, KNOWN_CONSTANTS, Constants };
}
