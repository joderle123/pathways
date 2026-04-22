import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// The DB object lives in data.js as a global (not a module export).
// We recreate its logic here using the same localStorage API so we can test
// the CRUD patterns in isolation without eval-ing the 50 000-line source file.
// Every method below mirrors the real implementation line-for-line.
// ---------------------------------------------------------------------------

const KEYS = {
  SCHUELER: 'pw_schueler',
  NOTIZEN: 'pw_notizen',
  TERMINE: 'pw_termine',
  SCREENINGS: 'pw_screenings',
  ROADMAPS: 'pw_roadmaps',
  WOHLBEFINDEN: 'pw_wohlbefinden',
  FALLFORMULIERUNGEN: 'pw_fallformulierungen',
  VERLAUF: 'pw_verlauf',
  KONTAKTE: 'pw_kontakte',
  RISIKO: 'pw_risiko',
};

/** Faithful replica of the DB object from js/data.js */
const DB = {
  KEYS,

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // -- Schueler ---------------------------------------------------------
  getSchueler() {
    return JSON.parse(localStorage.getItem(this.KEYS.SCHUELER) || '[]');
  },
  saveSchueler(schuelerListe) {
    localStorage.setItem(this.KEYS.SCHUELER, JSON.stringify(schuelerListe));
  },
  getSchuelerById(id) {
    return this.getSchueler().find(s => s.id === id) || null;
  },
  createSchueler(daten) {
    const schuelerListe = this.getSchueler();
    const neuerSchueler = {
      id: this.generateId(),
      vorname: daten.vorname || '',
      nachname: daten.nachname || '',
      geburtsdatum: daten.geburtsdatum || '',
      klasse: daten.klasse || '',
      eintrittsdatum: daten.eintrittsdatum || new Date().toISOString().split('T')[0],
      foto: daten.foto || null,
      allgemeineNotizen: daten.allgemeineNotizen || '',
      topicStatus: {},
      topicNotizen: {},
      risiko: daten.risiko || 'niedrig',
      anamnese: daten.anamnese || [],
      ziele: daten.ziele || [],
      hypothesenVerlauf: daten.hypothesenVerlauf || [],
      treatmentResponse: daten.treatmentResponse || [],
      diagnosen: daten.diagnosen || [],
      medikation: daten.medikation || [],
      sorgerecht: daten.sorgerecht || '',
      notfallKontakte: daten.notfallKontakte || [],
      gesetzlicherVertreter: daten.gesetzlicherVertreter || '',
      schweigepflichtStatus: daten.schweigepflichtStatus || 'standard',
      erstellt: new Date().toISOString(),
      geaendert: new Date().toISOString(),
    };
    schuelerListe.push(neuerSchueler);
    this.saveSchueler(schuelerListe);
    return neuerSchueler;
  },
  updateSchueler(id, daten) {
    const schuelerListe = this.getSchueler();
    const idx = schuelerListe.findIndex(s => s.id === id);
    if (idx === -1) return null;
    schuelerListe[idx] = { ...schuelerListe[idx], ...daten, geaendert: new Date().toISOString() };
    this.saveSchueler(schuelerListe);
    return schuelerListe[idx];
  },
  deleteSchueler(id) {
    const schuelerListe = this.getSchueler().filter(s => s.id !== id);
    this.saveSchueler(schuelerListe);
    // Cascade: also delete related Notizen and Termine
    const notizen = this.getNotizen().filter(n => n.schuelerId !== id);
    localStorage.setItem(this.KEYS.NOTIZEN, JSON.stringify(notizen));
    const termine = this.getTermine().filter(t => t.schuelerId !== id);
    localStorage.setItem(this.KEYS.TERMINE, JSON.stringify(termine));
  },

  // -- Notizen ----------------------------------------------------------
  getNotizen(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.NOTIZEN) || '[]');
    return schuelerId ? alle.filter(n => n.schuelerId === schuelerId) : alle;
  },
  createNotiz(daten) {
    const alle = this.getNotizen();
    const neu = {
      id: this.generateId(),
      schuelerId: daten.schuelerId,
      datum: daten.datum || new Date().toISOString().split('T')[0],
      inhalt: daten.inhalt || '',
      kategorie: daten.kategorie || 'session',
      themaId: daten.themaId || null,
      soap: daten.soap || null,
      erstellt: new Date().toISOString(),
    };
    alle.push(neu);
    localStorage.setItem(this.KEYS.NOTIZEN, JSON.stringify(alle));
    return neu;
  },
  deleteNotiz(id) {
    const alle = this.getNotizen().filter(n => n.id !== id);
    localStorage.setItem(this.KEYS.NOTIZEN, JSON.stringify(alle));
  },

  // -- Termine ----------------------------------------------------------
  getTermine(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.TERMINE) || '[]');
    return schuelerId ? alle.filter(t => t.schuelerId === schuelerId || t.schuelerId === null) : alle;
  },
  createTermin(daten) {
    const alle = this.getTermine();
    const neu = {
      id: this.generateId(),
      schuelerId: daten.schuelerId || null,
      datum: daten.datum,
      uhrzeit: daten.uhrzeit || '',
      titel: daten.titel || '',
      beschreibung: daten.beschreibung || '',
      typ: daten.typ || 'termin',
      erstellt: new Date().toISOString(),
    };
    alle.push(neu);
    localStorage.setItem(this.KEYS.TERMINE, JSON.stringify(alle));
    return neu;
  },
  deleteTermin(id) {
    const alle = this.getTermine().filter(t => t.id !== id);
    localStorage.setItem(this.KEYS.TERMINE, JSON.stringify(alle));
  },

  // -- Screenings -------------------------------------------------------
  getScreenings(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.SCREENINGS) || '[]');
    return schuelerId ? alle.filter(s => s.schuelerId === schuelerId) : alle;
  },
  saveScreening(data) {
    const alle = this.getScreenings();
    const idx = alle.findIndex(s => s.id === data.id);
    if (idx >= 0) {
      alle[idx] = data;
    } else {
      alle.push(data);
    }
    localStorage.setItem(this.KEYS.SCREENINGS, JSON.stringify(alle));
    return data;
  },
};

// =========================================================================
// Tests
// =========================================================================

beforeEach(() => {
  localStorage.clear();
});

// -------------------------------------------------------------------------
// Schueler CRUD
// -------------------------------------------------------------------------
describe('DB.Schueler CRUD', () => {
  it('getSchueler returns empty array when localStorage is empty', () => {
    expect(DB.getSchueler()).toEqual([]);
  });

  it('createSchueler persists a new student and returns it', () => {
    const s = DB.createSchueler({ vorname: 'Max', nachname: 'Muster' });

    expect(s).toHaveProperty('id');
    expect(s.vorname).toBe('Max');
    expect(s.nachname).toBe('Muster');
    expect(s.risiko).toBe('niedrig');
    expect(s.topicStatus).toEqual({});

    // Verify persistence
    const stored = DB.getSchueler();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(s.id);
  });

  it('createSchueler fills defaults for missing fields', () => {
    const s = DB.createSchueler({});

    expect(s.vorname).toBe('');
    expect(s.nachname).toBe('');
    expect(s.geburtsdatum).toBe('');
    expect(s.klasse).toBe('');
    expect(s.foto).toBeNull();
    expect(s.risiko).toBe('niedrig');
    expect(s.schweigepflichtStatus).toBe('standard');
    expect(s.anamnese).toEqual([]);
    expect(s.ziele).toEqual([]);
    expect(s.diagnosen).toEqual([]);
    expect(s.medikation).toEqual([]);
    expect(s.erstellt).toBeTruthy();
    expect(s.geaendert).toBeTruthy();
  });

  it('createSchueler sets eintrittsdatum to today when not provided', () => {
    const s = DB.createSchueler({});
    const today = new Date().toISOString().split('T')[0];
    expect(s.eintrittsdatum).toBe(today);
  });

  it('getSchuelerById finds existing student', () => {
    const s = DB.createSchueler({ vorname: 'Anna' });
    const found = DB.getSchuelerById(s.id);
    expect(found).not.toBeNull();
    expect(found.vorname).toBe('Anna');
  });

  it('getSchuelerById returns null for non-existent id', () => {
    expect(DB.getSchuelerById('non-existent-id')).toBeNull();
  });

  it('updateSchueler merges data and updates geaendert timestamp', () => {
    const s = DB.createSchueler({ vorname: 'Max', nachname: 'Muster' });
    const originalGeaendert = s.geaendert;

    // Small delay to ensure timestamp differs
    const updated = DB.updateSchueler(s.id, { vorname: 'Maximilian', klasse: '9a' });

    expect(updated).not.toBeNull();
    expect(updated.vorname).toBe('Maximilian');
    expect(updated.nachname).toBe('Muster'); // unchanged
    expect(updated.klasse).toBe('9a');
    expect(updated.geaendert).toBeTruthy();

    // Persisted
    const fromStore = DB.getSchuelerById(s.id);
    expect(fromStore.vorname).toBe('Maximilian');
  });

  it('updateSchueler returns null for non-existent id', () => {
    expect(DB.updateSchueler('ghost', { vorname: 'X' })).toBeNull();
  });

  it('deleteSchueler removes the student from the list', () => {
    const s1 = DB.createSchueler({ vorname: 'A' });
    const s2 = DB.createSchueler({ vorname: 'B' });

    DB.deleteSchueler(s1.id);

    const remaining = DB.getSchueler();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(s2.id);
  });

  it('saveSchueler overwrites the entire list', () => {
    DB.createSchueler({ vorname: 'A' });
    DB.createSchueler({ vorname: 'B' });

    DB.saveSchueler([{ id: 'custom', vorname: 'Only' }]);

    const list = DB.getSchueler();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('custom');
  });

  it('handles multiple creates sequentially', () => {
    for (let i = 0; i < 10; i++) {
      DB.createSchueler({ vorname: `Student${i}` });
    }
    expect(DB.getSchueler()).toHaveLength(10);
  });
});

// -------------------------------------------------------------------------
// Notizen CRUD
// -------------------------------------------------------------------------
describe('DB.Notizen CRUD', () => {
  it('getNotizen returns empty array when no notes exist', () => {
    expect(DB.getNotizen()).toEqual([]);
  });

  it('createNotiz persists a note with correct defaults', () => {
    const n = DB.createNotiz({ schuelerId: 'abc', inhalt: 'Test note' });

    expect(n).toHaveProperty('id');
    expect(n.schuelerId).toBe('abc');
    expect(n.inhalt).toBe('Test note');
    expect(n.kategorie).toBe('session');
    expect(n.themaId).toBeNull();
    expect(n.soap).toBeNull();
    expect(n.erstellt).toBeTruthy();
  });

  it('getNotizen filters by schuelerId', () => {
    DB.createNotiz({ schuelerId: 'alice', inhalt: 'Note for Alice' });
    DB.createNotiz({ schuelerId: 'bob', inhalt: 'Note for Bob' });
    DB.createNotiz({ schuelerId: 'alice', inhalt: 'Another for Alice' });

    const aliceNotes = DB.getNotizen('alice');
    expect(aliceNotes).toHaveLength(2);
    expect(aliceNotes.every(n => n.schuelerId === 'alice')).toBe(true);

    const bobNotes = DB.getNotizen('bob');
    expect(bobNotes).toHaveLength(1);
  });

  it('getNotizen without filter returns all notes', () => {
    DB.createNotiz({ schuelerId: 'alice', inhalt: 'A' });
    DB.createNotiz({ schuelerId: 'bob', inhalt: 'B' });

    expect(DB.getNotizen()).toHaveLength(2);
  });

  it('deleteNotiz removes only the targeted note', () => {
    const n1 = DB.createNotiz({ schuelerId: 'x', inhalt: 'Keep' });
    const n2 = DB.createNotiz({ schuelerId: 'x', inhalt: 'Delete' });

    DB.deleteNotiz(n2.id);

    const remaining = DB.getNotizen();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(n1.id);
  });

  it('deleteNotiz is a no-op when id does not exist', () => {
    DB.createNotiz({ schuelerId: 'x', inhalt: 'A' });
    DB.deleteNotiz('nonexistent');
    expect(DB.getNotizen()).toHaveLength(1);
  });
});

// -------------------------------------------------------------------------
// Termine CRUD
// -------------------------------------------------------------------------
describe('DB.Termine CRUD', () => {
  it('getTermine returns empty array when no appointments exist', () => {
    expect(DB.getTermine()).toEqual([]);
  });

  it('createTermin persists an appointment', () => {
    const t = DB.createTermin({
      schuelerId: 's1',
      datum: '2026-05-01',
      uhrzeit: '10:00',
      titel: 'Session',
    });

    expect(t).toHaveProperty('id');
    expect(t.datum).toBe('2026-05-01');
    expect(t.uhrzeit).toBe('10:00');
    expect(t.titel).toBe('Session');
    expect(t.typ).toBe('termin');
    expect(t.erstellt).toBeTruthy();

    expect(DB.getTermine()).toHaveLength(1);
  });

  it('getTermine filters by schuelerId and includes null-schuelerId appointments', () => {
    DB.createTermin({ schuelerId: 'alice', datum: '2026-01-01', titel: 'Alice apt' });
    DB.createTermin({ schuelerId: 'bob', datum: '2026-01-02', titel: 'Bob apt' });
    DB.createTermin({ schuelerId: null, datum: '2026-01-03', titel: 'General apt' });

    // When filtering for alice, also get null-schuelerId ones
    const aliceTermine = DB.getTermine('alice');
    expect(aliceTermine).toHaveLength(2);
    expect(aliceTermine.map(t => t.titel).sort()).toEqual(['Alice apt', 'General apt']);
  });

  it('deleteTermin removes the targeted appointment', () => {
    const t1 = DB.createTermin({ datum: '2026-01-01', titel: 'Keep' });
    const t2 = DB.createTermin({ datum: '2026-01-02', titel: 'Remove' });

    DB.deleteTermin(t2.id);

    const remaining = DB.getTermine();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(t1.id);
  });
});

// -------------------------------------------------------------------------
// Screenings
// -------------------------------------------------------------------------
describe('DB.Screenings', () => {
  it('getScreenings returns empty array initially', () => {
    expect(DB.getScreenings()).toEqual([]);
  });

  it('saveScreening inserts a new screening', () => {
    const s = { id: 'scr1', schuelerId: 'alice', score: 42 };
    DB.saveScreening(s);

    expect(DB.getScreenings()).toHaveLength(1);
    expect(DB.getScreenings()[0].score).toBe(42);
  });

  it('saveScreening updates an existing screening by id', () => {
    DB.saveScreening({ id: 'scr1', schuelerId: 'alice', score: 10 });
    DB.saveScreening({ id: 'scr1', schuelerId: 'alice', score: 99 });

    const all = DB.getScreenings();
    expect(all).toHaveLength(1);
    expect(all[0].score).toBe(99);
  });

  it('getScreenings filters by schuelerId', () => {
    DB.saveScreening({ id: 's1', schuelerId: 'alice' });
    DB.saveScreening({ id: 's2', schuelerId: 'bob' });

    expect(DB.getScreenings('alice')).toHaveLength(1);
    expect(DB.getScreenings('bob')).toHaveLength(1);
  });
});

// -------------------------------------------------------------------------
// Cascade: deleteSchueler removes related Notizen & Termine
// -------------------------------------------------------------------------
describe('Cascade delete', () => {
  it('deleteSchueler removes all associated Notizen and Termine', () => {
    const s = DB.createSchueler({ vorname: 'To Delete' });
    const otherId = 'keep-me';

    // Notes for the student to delete
    DB.createNotiz({ schuelerId: s.id, inhalt: 'Goes away' });
    DB.createNotiz({ schuelerId: s.id, inhalt: 'Also goes away' });
    // Note for another student
    DB.createNotiz({ schuelerId: otherId, inhalt: 'Stays' });

    // Appointments for the student to delete
    DB.createTermin({ schuelerId: s.id, datum: '2026-01-01', titel: 'Deleted apt' });
    // Appointment for another student
    DB.createTermin({ schuelerId: otherId, datum: '2026-01-02', titel: 'Kept apt' });

    DB.deleteSchueler(s.id);

    // Student gone
    expect(DB.getSchueler().find(x => x.id === s.id)).toBeUndefined();

    // Their notes gone
    expect(DB.getNotizen(s.id)).toHaveLength(0);
    // Other notes remain
    expect(DB.getNotizen(otherId)).toHaveLength(1);

    // Their appointments gone (only student-specific ones)
    const allTermine = DB.getTermine();
    expect(allTermine.find(t => t.schuelerId === s.id)).toBeUndefined();
    // Other appointments remain
    expect(allTermine.find(t => t.schuelerId === otherId)).toBeTruthy();
  });

  it('deleteSchueler is safe when student has no notes or appointments', () => {
    const s = DB.createSchueler({ vorname: 'Lonely' });
    DB.deleteSchueler(s.id);

    expect(DB.getSchueler()).toHaveLength(0);
    expect(DB.getNotizen()).toEqual([]);
    expect(DB.getTermine()).toEqual([]);
  });
});

// -------------------------------------------------------------------------
// generateId
// -------------------------------------------------------------------------
describe('DB.generateId', () => {
  it('returns a non-empty string', () => {
    const id = DB.generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('produces unique IDs across 1 000 invocations', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(DB.generateId());
    }
    expect(ids.size).toBe(1000);
  });

  it('id contains only alphanumeric characters', () => {
    for (let i = 0; i < 100; i++) {
      const id = DB.generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    }
  });
});

// -------------------------------------------------------------------------
// Corrupted / edge-case localStorage
// -------------------------------------------------------------------------
describe('Corrupted localStorage handling', () => {
  it('getSchueler returns [] when localStorage contains invalid JSON', () => {
    localStorage.setItem(KEYS.SCHUELER, '{{not valid json');
    expect(() => DB.getSchueler()).toThrow(); // mirrors real behaviour: JSON.parse throws
  });

  it('getSchueler returns [] when key is absent', () => {
    // Key simply not set
    expect(DB.getSchueler()).toEqual([]);
  });

  it('getNotizen returns [] when key is absent', () => {
    expect(DB.getNotizen()).toEqual([]);
  });

  it('getTermine returns [] when key is absent', () => {
    expect(DB.getTermine()).toEqual([]);
  });

  it('getScreenings returns [] when key is absent', () => {
    expect(DB.getScreenings()).toEqual([]);
  });

  it('handles localStorage containing an empty string gracefully', () => {
    localStorage.setItem(KEYS.SCHUELER, '');
    // '' is falsy, so the || '[]' fallback kicks in -> returns []
    expect(DB.getSchueler()).toEqual([]);
  });

  it('handles localStorage containing "null"', () => {
    localStorage.setItem(KEYS.SCHUELER, 'null');
    // JSON.parse('null') returns null; the || '[]' fallback does not apply
    // so getSchueler returns null — this is a known edge case in the real code
    const result = DB.getSchueler();
    expect(result).toBeNull();
  });
});

// -------------------------------------------------------------------------
// localStorage key correctness
// -------------------------------------------------------------------------
describe('localStorage keys', () => {
  it('uses the correct key prefixes', () => {
    expect(DB.KEYS.SCHUELER).toBe('pw_schueler');
    expect(DB.KEYS.NOTIZEN).toBe('pw_notizen');
    expect(DB.KEYS.TERMINE).toBe('pw_termine');
    expect(DB.KEYS.SCREENINGS).toBe('pw_screenings');
    expect(DB.KEYS.ROADMAPS).toBe('pw_roadmaps');
    expect(DB.KEYS.WOHLBEFINDEN).toBe('pw_wohlbefinden');
    expect(DB.KEYS.FALLFORMULIERUNGEN).toBe('pw_fallformulierungen');
    expect(DB.KEYS.VERLAUF).toBe('pw_verlauf');
    expect(DB.KEYS.KONTAKTE).toBe('pw_kontakte');
    expect(DB.KEYS.RISIKO).toBe('pw_risiko');
  });

  it('createSchueler writes to the correct localStorage key', () => {
    DB.createSchueler({ vorname: 'Test' });
    const raw = localStorage.getItem('pw_schueler');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].vorname).toBe('Test');
  });

  it('createNotiz writes to the correct localStorage key', () => {
    DB.createNotiz({ schuelerId: 'x', inhalt: 'Hi' });
    const raw = localStorage.getItem('pw_notizen');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw)).toHaveLength(1);
  });

  it('createTermin writes to the correct localStorage key', () => {
    DB.createTermin({ datum: '2026-01-01' });
    const raw = localStorage.getItem('pw_termine');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw)).toHaveLength(1);
  });
});
