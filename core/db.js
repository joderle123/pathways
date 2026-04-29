/* ============================================================
   Pathways Core — DB
   ============================================================
   Reine localStorage-CRUD-API. Keine DOM-Bezüge.
   Alle Pathways-Apps importieren dieses Modul (über <script> oder ESM).

   Abhängigkeiten:
   - ROADMAP_PHASEN (aus core/constants.js, in createRoadmap genutzt)
   - DB.onQuotaError (optional, von App gesetzt → für Toast-Anzeige)

   API (Auszug):
     DB.getSchueler() · DB.createSchueler(data) · DB.updateSchueler(id, data)
     DB.getNotizen([schuelerId]) · DB.createNotiz(data) · DB.deleteNotiz(id)
     DB.getScreenings([schuelerId]) · DB.saveScreening(s) · DB.createScreening(schuelerId)
     DB.getRoadmap(schuelerId) · DB.saveRoadmap(r) · DB.createRoadmap(schuelerId)
     DB.exportAll() · DB.importMerge(json)
   ============================================================ */

const DB = {
  KEYS: {
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
    HELFER: 'pw_helfer',
    ZEIT: 'pw_zeit',
    KONFERENZEN: 'pw_konferenzen',
    AUFGABEN: 'pw_aufgaben',
    PERSNOTIZEN: 'pw_persnotizen',
  },

  /**
   * App kann optional einen Callback registrieren,
   * der bei QuotaExceeded angezeigt wird (z.B. Toast).
   * Beispiel: DB.onQuotaError = (key) => showToast('Speicher voll');
   */
  onQuotaError: null,

  // Safe localStorage wrapper with quota protection
  _save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        if (typeof this.onQuotaError === 'function') {
          this.onQuotaError(key);
        }
        console.error('localStorage quota exceeded for key:', key);
      }
      throw e;
    }
  },

  // Storage usage info
  getStorageUsage() {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += localStorage.getItem(key).length * 2; // UTF-16
      }
    }
    return { usedBytes: total, usedMB: (total / 1024 / 1024).toFixed(2) };
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Schüler
  getSchueler() {
    return JSON.parse(localStorage.getItem(this.KEYS.SCHUELER) || '[]');
  },
  saveSchueler(schuelerListe) {
    this._save(this.KEYS.SCHUELER, schuelerListe);
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
    const notizen = this.getNotizen().filter(n => n.schuelerId !== id);
    this._save(this.KEYS.NOTIZEN, notizen);
    const termine = this.getTermine().filter(t => t.schuelerId !== id);
    this._save(this.KEYS.TERMINE, termine);
  },

  // Notizen
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
    this._save(this.KEYS.NOTIZEN, alle);
    return neu;
  },
  deleteNotiz(id) {
    const alle = this.getNotizen().filter(n => n.id !== id);
    this._save(this.KEYS.NOTIZEN, alle);
  },

  // Termine / Kalender
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
      anwesenheit: daten.anwesenheit || null,
      erstellt: new Date().toISOString(),
    };
    alle.push(neu);
    this._save(this.KEYS.TERMINE, alle);
    return neu;
  },
  updateTermin(id, daten) {
    const alle = this.getTermine();
    const idx = alle.findIndex(t => t.id === id);
    if (idx === -1) return null;
    alle[idx] = { ...alle[idx], ...daten, geaendert: new Date().toISOString() };
    this._save(this.KEYS.TERMINE, alle);
    return alle[idx];
  },
  deleteTermin(id) {
    const alle = this.getTermine().filter(t => t.id !== id);
    this._save(this.KEYS.TERMINE, alle);
  },

  // Screenings
  getScreenings(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.SCREENINGS) || '[]');
    return schuelerId ? alle.filter(s => s.schuelerId === schuelerId) : alle;
  },
  saveScreening(data) {
    const alle = this.getScreenings();
    const idx = alle.findIndex(s => s.id === data.id);
    if (idx >= 0) { alle[idx] = data; } else { alle.push(data); }
    this._save(this.KEYS.SCREENINGS, alle);
    return data;
  },
  createScreening(schuelerId) {
    const neu = {
      id: this.generateId(),
      schuelerId,
      datum: new Date().toISOString(),
      antworten: {},
      scores: {},
      flaggedAreas: [],
      comorbidityPattern: [],
      worksheetRecommendations: [],
      severity: 'low',
      clinicalNotes: '',
      followUpDate: '',
      abgeschlossen: false,
      erstellt: new Date().toISOString(),
      geaendert: new Date().toISOString(),
    };
    const alle = this.getScreenings();
    alle.push(neu);
    this._save(this.KEYS.SCREENINGS, alle);
    return neu;
  },
  deleteScreening(id) {
    const alle = this.getScreenings().filter(s => s.id !== id);
    this._save(this.KEYS.SCREENINGS, alle);
  },

  // Roadmaps
  getRoadmaps(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.ROADMAPS) || '[]');
    return schuelerId ? alle.filter(r => r.schuelerId === schuelerId) : alle;
  },
  getRoadmap(schuelerId) {
    const all = this.getRoadmaps(schuelerId);
    return all.length ? all.sort((a, b) => b.erstellt.localeCompare(a.erstellt))[0] : null;
  },
  saveRoadmap(roadmap) {
    const alle = this.getRoadmaps();
    const idx = alle.findIndex(r => r.id === roadmap.id);
    roadmap.geaendert = new Date().toISOString();
    if (idx >= 0) { alle[idx] = roadmap; } else { alle.push(roadmap); }
    this._save(this.KEYS.ROADMAPS, alle);
    return roadmap;
  },
  createRoadmap(schuelerId) {
    // Erwartet: globale ROADMAP_PHASEN aus core/constants.js
    const phasen = (typeof ROADMAP_PHASEN !== 'undefined' ? ROADMAP_PHASEN : []);
    return {
      id: this.generateId(),
      schuelerId,
      screeningId: null,
      phasen: phasen.map(p => ({
        nr: p.nr,
        status: p.nr === 0 ? 'aktiv' : 'offen',
        startDatum: p.nr === 0 ? new Date().toISOString().split('T')[0] : null,
        endDatum: null,
        themen: [],
        notizen: '',
      })),
      erstellt: new Date().toISOString(),
      geaendert: new Date().toISOString(),
    };
  },
  deleteRoadmap(id) {
    const alle = this.getRoadmaps().filter(r => r.id !== id);
    this._save(this.KEYS.ROADMAPS, alle);
  },

  // Wohlbefinden
  getWohlbefinden(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.WOHLBEFINDEN) || '[]');
    return schuelerId ? alle.filter(w => w.schuelerId === schuelerId) : alle;
  },
  addWohlbefinden(schuelerId, score, notiz, who5Items) {
    const alle = this.getWohlbefinden();
    const eintrag = {
      id: this.generateId(),
      schuelerId,
      datum: new Date().toISOString(),
      score,
      notiz: notiz || '',
    };
    if (who5Items && typeof who5Items === 'object') {
      eintrag.who5Items = who5Items;
      const rohsumme = Object.values(who5Items).reduce((s, v) => s + (Number(v) || 0), 0);
      eintrag.who5Score = rohsumme * 4;
      eintrag.who5DepressionScreening = eintrag.who5Score <= 28;
    }
    alle.push(eintrag);
    this._save(this.KEYS.WOHLBEFINDEN, alle);
  },
  deleteWohlbefinden(id) {
    const alle = this.getWohlbefinden().filter(w => w.id !== id);
    this._save(this.KEYS.WOHLBEFINDEN, alle);
  },

  // Fallformulierungen (5P)
  getFallformulierungen(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.FALLFORMULIERUNGEN) || '[]');
    return schuelerId ? alle.filter(f => f.schuelerId === schuelerId) : alle;
  },
  getFallformulierung(schuelerId) {
    const all = this.getFallformulierungen(schuelerId);
    return all.length ? all.sort((a, b) => b.erstellt.localeCompare(a.erstellt))[0] : null;
  },
  saveFallformulierung(ff) {
    const alle = this.getFallformulierungen();
    const idx = alle.findIndex(f => f.id === ff.id);
    ff.geaendert = new Date().toISOString();
    if (idx >= 0) { alle[idx] = ff; } else { alle.push(ff); }
    this._save(this.KEYS.FALLFORMULIERUNGEN, alle);
    return ff;
  },
  createFallformulierung(schuelerId) {
    return {
      id: this.generateId(),
      schuelerId,
      presenting: [],
      predisposing: [],
      precipitating: [],
      perpetuating: [],
      protective: [],
      hypothese: '',
      erstellt: new Date().toISOString(),
      geaendert: new Date().toISOString(),
    };
  },
  deleteFallformulierung(id) {
    const alle = this.getFallformulierungen().filter(f => f.id !== id);
    this._save(this.KEYS.FALLFORMULIERUNGEN, alle);
  },

  // Verlaufs-Tracker
  getVerlauf(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.VERLAUF) || '[]');
    return schuelerId ? alle.filter(v => v.schuelerId === schuelerId) : alle;
  },
  addVerlauf(schuelerId, werte) {
    const alle = this.getVerlauf();
    const eintrag = {
      id: this.generateId(),
      schuelerId,
      datum: new Date().toISOString(),
      werte,
    };
    alle.push(eintrag);
    this._save(this.KEYS.VERLAUF, alle);
    return eintrag;
  },
  deleteVerlauf(id) {
    const alle = this.getVerlauf().filter(v => v.id !== id);
    this._save(this.KEYS.VERLAUF, alle);
  },

  // Kontaktlog
  getKontakte(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.KONTAKTE) || '[]');
    return schuelerId ? alle.filter(k => k.schuelerId === schuelerId) : alle;
  },
  addKontakt(daten) {
    const alle = this.getKontakte();
    const neu = {
      id: this.generateId(),
      schuelerId: daten.schuelerId,
      kontaktperson: daten.kontaktperson || '',
      art: daten.art || 'telefon',
      datum: daten.datum || new Date().toISOString().split('T')[0],
      dauer: daten.dauer || '',
      inhalt: daten.inhalt || '',
      vereinbarungen: daten.vereinbarungen || '',
      nachfassDatum: daten.nachfassDatum || '',
      erstellt: new Date().toISOString(),
    };
    alle.push(neu);
    this._save(this.KEYS.KONTAKTE, alle);
    return neu;
  },
  deleteKontakt(id) {
    const alle = this.getKontakte().filter(k => k.id !== id);
    this._save(this.KEYS.KONTAKTE, alle);
  },

  // Risiko-Monitor
  getRisiko(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.RISIKO) || '[]');
    return schuelerId ? alle.filter(r => r.schuelerId === schuelerId) : alle;
  },
  addRisiko(schuelerId, werte) {
    const alle = this.getRisiko();
    const eintrag = {
      id: this.generateId(),
      schuelerId,
      datum: new Date().toISOString(),
      werte,
    };
    alle.push(eintrag);
    this._save(this.KEYS.RISIKO, alle);
    return eintrag;
  },

  // Helfersystem (Professionelles Netzwerk)
  getHelfer(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.HELFER) || '[]');
    return schuelerId ? alle.filter(h => h.schuelerId === schuelerId) : alle;
  },
  addHelfer(daten) {
    const alle = this.getHelfer();
    const neu = {
      id: this.generateId(),
      schuelerId: daten.schuelerId,
      name: daten.name || '',
      rolle: daten.rolle || '',
      institution: daten.institution || '',
      telefon: daten.telefon || '',
      email: daten.email || '',
      kategorie: daten.kategorie || 'therapie',
      notiz: daten.notiz || '',
      letzterKontakt: daten.letzterKontakt || '',
      aktiv: daten.aktiv !== false,
      erstellt: new Date().toISOString(),
    };
    alle.push(neu);
    this._save(this.KEYS.HELFER, alle);
    return neu;
  },
  updateHelfer(id, daten) {
    const alle = this.getHelfer();
    const idx = alle.findIndex(h => h.id === id);
    if (idx >= 0) { Object.assign(alle[idx], daten); this._save(this.KEYS.HELFER, alle); }
  },
  deleteHelfer(id) {
    const alle = this.getHelfer().filter(h => h.id !== id);
    this._save(this.KEYS.HELFER, alle);
  },

  // Zeiterfassung
  getZeit(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.ZEIT) || '[]');
    return schuelerId ? alle.filter(z => z.schuelerId === schuelerId) : alle;
  },
  addZeit(daten) {
    const alle = this.getZeit();
    const neu = {
      id: this.generateId(),
      schuelerId: daten.schuelerId || null,
      datum: daten.datum || new Date().toISOString().split('T')[0],
      dauer: daten.dauer || 0,
      kategorie: daten.kategorie || 'sitzung',
      beschreibung: daten.beschreibung || '',
      erstellt: new Date().toISOString(),
    };
    alle.push(neu);
    this._save(this.KEYS.ZEIT, alle);
    return neu;
  },
  deleteZeit(id) {
    const alle = this.getZeit().filter(z => z.id !== id);
    this._save(this.KEYS.ZEIT, alle);
  },

  // Hilfeplankonferenzen
  getKonferenzen(schuelerId = null) {
    const alle = JSON.parse(localStorage.getItem(this.KEYS.KONFERENZEN) || '[]');
    return schuelerId ? alle.filter(k => k.schuelerId === schuelerId) : alle;
  },
  addKonferenz(daten) {
    const alle = this.getKonferenzen();
    const neu = {
      id: this.generateId(),
      schuelerId: daten.schuelerId,
      datum: daten.datum || new Date().toISOString().split('T')[0],
      titel: daten.titel || 'Hilfeplankonferenz',
      teilnehmer: daten.teilnehmer || [],
      anlass: daten.anlass || '',
      themen: daten.themen || '',
      beschluesse: daten.beschluesse || '',
      aufgaben: daten.aufgaben || [],
      naechsterTermin: daten.naechsterTermin || '',
      erstellt: new Date().toISOString(),
    };
    alle.push(neu);
    this._save(this.KEYS.KONFERENZEN, alle);
    return neu;
  },
  deleteKonferenz(id) {
    const alle = this.getKonferenzen().filter(k => k.id !== id);
    this._save(this.KEYS.KONFERENZEN, alle);
  },

  // Aufgaben (persönliche Todo-Liste)
  getAufgaben() {
    return JSON.parse(localStorage.getItem(this.KEYS.AUFGABEN) || '[]');
  },
  addAufgabe(daten) {
    const alle = this.getAufgaben();
    alle.push({ id: this.generateId(), ...daten, erstellt: new Date().toISOString() });
    this._save(this.KEYS.AUFGABEN, alle);
  },
  updateAufgabe(id, daten) {
    const alle = this.getAufgaben().map(a => a.id === id ? { ...a, ...daten } : a);
    this._save(this.KEYS.AUFGABEN, alle);
  },
  deleteAufgabe(id) {
    const alle = this.getAufgaben().filter(a => a.id !== id);
    this._save(this.KEYS.AUFGABEN, alle);
  },

  // Persönliche Notizen (OneNote-style)
  getPersNotizen() {
    return JSON.parse(localStorage.getItem(this.KEYS.PERSNOTIZEN) || '[]');
  },
  addPersNotiz(daten) {
    const alle = this.getPersNotizen();
    alle.push({ id: this.generateId(), ...daten, erstellt: new Date().toISOString(), geaendert: new Date().toISOString() });
    this._save(this.KEYS.PERSNOTIZEN, alle);
  },
  updatePersNotiz(id, daten) {
    const alle = this.getPersNotizen().map(n => n.id === id ? { ...n, ...daten, geaendert: new Date().toISOString() } : n);
    this._save(this.KEYS.PERSNOTIZEN, alle);
  },
  deletePersNotiz(id) {
    const alle = this.getPersNotizen().filter(n => n.id !== id);
    this._save(this.KEYS.PERSNOTIZEN, alle);
  },

  // ─── Export / Import ──────────────────────────────────────────────────────
  exportAll() {
    return {
      version: 3,
      exportedAt: new Date().toISOString(),
      schueler: this.getSchueler(),
      notizen: this.getNotizen(),
      termine: this.getTermine(),
      screenings: this.getScreenings(),
      roadmaps: this.getRoadmaps(),
      wohlbefinden: this.getWohlbefinden(),
      fallformulierungen: this.getFallformulierungen(),
      verlauf: this.getVerlauf(),
      kontakte: this.getKontakte(),
      risiko: this.getRisiko(),
      helfer: this.getHelfer(),
      zeit: this.getZeit(),
      konferenzen: this.getKonferenzen(),
      aufgaben: this.getAufgaben(),
      persNotizen: this.getPersNotizen(),
    };
  },

  importMerge(daten) {
    if (!daten || typeof daten !== 'object') throw new Error('Ungültiges Import-Format');

    // Schüler: Zeitstempel-basiert (neuere gewinnt)
    if (Array.isArray(daten.schueler)) {
      const lokal = this.getSchueler();
      const map = new Map(lokal.map(s => [s.id, s]));
      daten.schueler.forEach(s => {
        const existing = map.get(s.id);
        if (!existing || (s.geaendert && s.geaendert > (existing.geaendert || ''))) {
          map.set(s.id, s);
        }
      });
      this.saveSchueler([...map.values()]);
    }

    // Alle anderen: ID-basiert (Duplikate vermeiden)
    const mergeById = (key, neu) => {
      if (!Array.isArray(neu)) return;
      const lokal = JSON.parse(localStorage.getItem(key) || '[]');
      const ids = new Set(lokal.map(x => x.id));
      const merged = [...lokal, ...neu.filter(x => !ids.has(x.id))];
      this._save(key, merged);
    };
    mergeById(this.KEYS.NOTIZEN, daten.notizen);
    mergeById(this.KEYS.TERMINE, daten.termine);
    mergeById(this.KEYS.SCREENINGS, daten.screenings);
    mergeById(this.KEYS.ROADMAPS, daten.roadmaps);
    mergeById(this.KEYS.WOHLBEFINDEN, daten.wohlbefinden);
    mergeById(this.KEYS.FALLFORMULIERUNGEN, daten.fallformulierungen);
    mergeById(this.KEYS.VERLAUF, daten.verlauf);
    mergeById(this.KEYS.KONTAKTE, daten.kontakte);
    mergeById(this.KEYS.RISIKO, daten.risiko);
    mergeById(this.KEYS.HELFER, daten.helfer);
    mergeById(this.KEYS.ZEIT, daten.zeit);
    mergeById(this.KEYS.KONFERENZEN, daten.konferenzen);
    mergeById(this.KEYS.AUFGABEN, daten.aufgaben);
    mergeById(this.KEYS.PERSNOTIZEN, daten.persNotizen);
  },

  // ─── Migration: cdse_* → pw_* (legacy keys) ───────────────────────────────
  migrateLegacyKeys() {
    const map = {
      cdse_schueler: this.KEYS.SCHUELER,
      cdse_notizen: this.KEYS.NOTIZEN,
      cdse_termine: this.KEYS.TERMINE,
      cdse_screenings: this.KEYS.SCREENINGS,
    };
    let migrated = 0;
    Object.entries(map).forEach(([oldKey, newKey]) => {
      const old = localStorage.getItem(oldKey);
      if (old && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, old);
        localStorage.removeItem(oldKey);
        migrated++;
      }
    });
    if (migrated > 0) console.log(`[DB] Migrated ${migrated} legacy keys`);
    return migrated;
  },

  getStaerken(schuelerId) {
    try {
      const all = JSON.parse(localStorage.getItem('pw_staerken') || '{}');
      return all[schuelerId] || null;
    } catch { return null; }
  },
};

// Auto-Migrate beim Laden
if (typeof localStorage !== 'undefined') {
  try { DB.migrateLegacyKeys(); } catch (e) { console.warn('[DB] migration skipped:', e); }
}

// CommonJS export (für Tools/Tests). Browser nutzt globale `DB`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DB };
}
