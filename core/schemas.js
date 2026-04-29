/* ============================================================
   Pathways Core — Schemas
   ============================================================
   Lightweight Type-Guards für die 15 Datenstrukturen aus DB.
   Apps können beim Schreiben validieren, um kaputte Daten
   zwischen Apps zu vermeiden.

   Beispiel:
     const result = Schemas.validate('schueler', daten);
     if (!result.ok) console.warn(result.errors);

   API:
     Schemas.validate(name, daten)        → { ok, errors[] }
     Schemas.assert(name, daten)          → throws if invalid
     Schemas.list()                       → string[]
   ============================================================ */

const SCHEMA_VERSION = 1;

const SCHEMAS = {
  schueler: {
    required: ['id'],
    optional: ['vorname', 'nachname', 'geburtsdatum', 'klasse', 'eintrittsdatum',
               'foto', 'allgemeineNotizen', 'topicStatus', 'topicNotizen', 'risiko',
               'anamnese', 'ziele', 'hypothesenVerlauf', 'treatmentResponse',
               'diagnosen', 'medikation', 'sorgerecht', 'notfallKontakte',
               'gesetzlicherVertreter', 'schweigepflichtStatus', 'erstellt', 'geaendert'],
    types: { id: 'string', vorname: 'string', risiko: 'string',
             diagnosen: 'array', medikation: 'array', notfallKontakte: 'array' },
  },
  notiz: {
    required: ['id', 'schuelerId'],
    optional: ['datum', 'inhalt', 'kategorie', 'themaId', 'soap', 'erstellt'],
    types: { id: 'string', schuelerId: 'string', kategorie: 'string' },
  },
  termin: {
    required: ['id', 'datum'],
    optional: ['schuelerId', 'uhrzeit', 'titel', 'beschreibung', 'typ', 'anwesenheit', 'erstellt', 'geaendert'],
    types: { id: 'string', datum: 'string', typ: 'string' },
  },
  screening: {
    required: ['id', 'schuelerId'],
    optional: ['datum', 'antworten', 'scores', 'flaggedAreas', 'comorbidityPattern',
               'worksheetRecommendations', 'severity', 'clinicalNotes',
               'followUpDate', 'abgeschlossen', 'erstellt', 'geaendert'],
    types: { id: 'string', schuelerId: 'string', antworten: 'object', scores: 'object',
             flaggedAreas: 'array', abgeschlossen: 'boolean' },
  },
  roadmap: {
    required: ['id', 'schuelerId', 'phasen'],
    optional: ['screeningId', 'erstellt', 'geaendert'],
    types: { id: 'string', schuelerId: 'string', phasen: 'array' },
  },
  wohlbefinden: {
    required: ['id', 'schuelerId', 'datum'],
    optional: ['score', 'notiz', 'who5Items', 'who5Score', 'who5DepressionScreening'],
    types: { id: 'string', schuelerId: 'string', score: 'number' },
  },
  fallformulierung: {
    required: ['id', 'schuelerId'],
    optional: ['presenting', 'predisposing', 'precipitating', 'perpetuating', 'protective',
               'hypothese', 'erstellt', 'geaendert'],
    types: { id: 'string', schuelerId: 'string',
             presenting: 'array', predisposing: 'array', precipitating: 'array',
             perpetuating: 'array', protective: 'array' },
  },
  verlauf: {
    required: ['id', 'schuelerId', 'datum'],
    optional: ['werte'],
    types: { id: 'string', schuelerId: 'string', werte: 'object' },
  },
  kontakt: {
    required: ['id', 'schuelerId'],
    optional: ['kontaktperson', 'art', 'datum', 'dauer', 'inhalt', 'vereinbarungen',
               'nachfassDatum', 'erstellt'],
    types: { id: 'string', schuelerId: 'string', art: 'string' },
  },
  risiko: {
    required: ['id', 'schuelerId', 'datum'],
    optional: ['werte'],
    types: { id: 'string', schuelerId: 'string', werte: 'object' },
  },
  helfer: {
    required: ['id', 'schuelerId'],
    optional: ['name', 'rolle', 'institution', 'telefon', 'email', 'kategorie',
               'notiz', 'letzterKontakt', 'aktiv', 'erstellt'],
    types: { id: 'string', schuelerId: 'string', name: 'string', aktiv: 'boolean' },
  },
  zeit: {
    required: ['id'],
    optional: ['schuelerId', 'datum', 'dauer', 'kategorie', 'beschreibung', 'erstellt'],
    types: { id: 'string', dauer: 'number', kategorie: 'string' },
  },
  konferenz: {
    required: ['id', 'schuelerId'],
    optional: ['datum', 'titel', 'teilnehmer', 'anlass', 'themen', 'beschluesse',
               'aufgaben', 'naechsterTermin', 'erstellt'],
    types: { id: 'string', schuelerId: 'string', teilnehmer: 'array', aufgaben: 'array' },
  },
  aufgabe: {
    required: ['id'],
    optional: ['titel', 'beschreibung', 'erledigt', 'prioritaet', 'faelligkeit', 'erstellt'],
    types: { id: 'string', erledigt: 'boolean' },
  },
  persnotiz: {
    required: ['id'],
    optional: ['titel', 'inhalt', 'tags', 'erstellt', 'geaendert'],
    types: { id: 'string', tags: 'array' },
  },
};

/** Return the JS type tag we use for validation. */
function typeOf(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  return typeof v;
}

const Schemas = {
  /** Validate `data` against schema `name`. Returns { ok, errors[] }. */
  validate(name, data) {
    const schema = SCHEMAS[name];
    if (!schema) return { ok: false, errors: [`Unbekanntes Schema: ${name}`] };
    if (!data || typeof data !== 'object') {
      return { ok: false, errors: ['data muss ein Objekt sein'] };
    }
    const errors = [];

    // Required fields
    schema.required.forEach(key => {
      if (data[key] === undefined || data[key] === null || data[key] === '') {
        errors.push(`Pflichtfeld fehlt: ${key}`);
      }
    });

    // Type checks (only on present fields)
    Object.entries(schema.types || {}).forEach(([key, expected]) => {
      if (data[key] === undefined || data[key] === null) return;
      const actual = typeOf(data[key]);
      if (actual !== expected) {
        errors.push(`Falscher Typ für ${key}: erwartet ${expected}, ist ${actual}`);
      }
    });

    return { ok: errors.length === 0, errors };
  },

  /** Throw if validation fails. */
  assert(name, data) {
    const r = this.validate(name, data);
    if (!r.ok) throw new Error(`[Schemas] ${name}: ${r.errors.join('; ')}`);
    return data;
  },

  /** List all registered schema names. */
  list() {
    return Object.keys(SCHEMAS);
  },
};

// CommonJS export (für Tools/Tests). Browser nutzt globale `Schemas`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCHEMA_VERSION, SCHEMAS, Schemas };
}
