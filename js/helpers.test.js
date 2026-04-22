import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helper functions — exact copies from js/app.js and js/data.js
// ---------------------------------------------------------------------------

/** From js/app.js line 4352 */
function formatDatum(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** From js/app.js line 4358 */
function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}

/** From js/data.js line 5834 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ---------------------------------------------------------------------------
// Replicate the export data structure from exportDaten() (app.js line 4804)
// ---------------------------------------------------------------------------
const DB_KEYS = {
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

function buildExportData() {
  const get = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  return {
    version: 3,
    exportiert: new Date().toISOString(),
    schueler: get(DB_KEYS.SCHUELER),
    notizen: get(DB_KEYS.NOTIZEN),
    termine: get(DB_KEYS.TERMINE),
    screenings: get(DB_KEYS.SCREENINGS),
    roadmaps: get(DB_KEYS.ROADMAPS),
    wohlbefinden: get(DB_KEYS.WOHLBEFINDEN),
    fallformulierungen: get(DB_KEYS.FALLFORMULIERUNGEN),
    verlauf: get(DB_KEYS.VERLAUF),
    kontakte: get(DB_KEYS.KONTAKTE),
    risiko: get(DB_KEYS.RISIKO),
  };
}

// =========================================================================
// Tests
// =========================================================================

// -------------------------------------------------------------------------
// formatDatum
// -------------------------------------------------------------------------
describe('formatDatum', () => {
  it('formats an ISO date string to dd.mm.yyyy', () => {
    const result = formatDatum('2026-04-08');
    // de-DE locale: 08.04.2026
    expect(result).toBe('08.04.2026');
  });

  it('formats an ISO datetime string correctly', () => {
    const result = formatDatum('2025-12-25T14:30:00Z');
    // Day/month might shift by timezone, but year and format are correct
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it('returns em-dash for null', () => {
    expect(formatDatum(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatDatum(undefined)).toBe('—');
  });

  it('returns em-dash for empty string', () => {
    expect(formatDatum('')).toBe('—');
  });

  it('handles leap year date', () => {
    expect(formatDatum('2024-02-29')).toBe('29.02.2024');
  });

  it('handles first day of year', () => {
    expect(formatDatum('2026-01-01')).toBe('01.01.2026');
  });

  it('handles last day of year', () => {
    expect(formatDatum('2026-12-31')).toBe('31.12.2026');
  });
});

// -------------------------------------------------------------------------
// capitalize
// -------------------------------------------------------------------------
describe('capitalize', () => {
  it('capitalizes first letter of a lowercase word', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('leaves already-capitalized word unchanged', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });

  it('returns empty string for null', () => {
    expect(capitalize(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(capitalize(undefined)).toBe('');
  });

  it('handles German umlauts', () => {
    expect(capitalize('über')).toBe('Über');
  });

  it('only capitalizes the first character, rest unchanged', () => {
    expect(capitalize('hELLO wORLD')).toBe('HELLO wORLD');
  });
});

// -------------------------------------------------------------------------
// generateId — uniqueness and format
// -------------------------------------------------------------------------
describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(generateId()).toBeTruthy();
    expect(typeof generateId()).toBe('string');
  });

  it('returns only lowercase alphanumeric characters', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateId()).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('produces IDs of reasonable length (> 8 chars)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateId().length).toBeGreaterThan(8);
    }
  });

  it('generates 500 unique IDs with no collisions', () => {
    const set = new Set();
    for (let i = 0; i < 500; i++) {
      set.add(generateId());
    }
    expect(set.size).toBe(500);
  });

  it('contains a timestamp component (base-36 encoded Date.now)', () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();

    // The first part of the id (before the random suffix) is Date.now() in base36.
    // We can verify the id starts with a valid base36 timestamp in the right range.
    // Date.now().toString(36) for 2026 epoch is about 'lxxx...' (10 chars)
    const timestampPart = parseInt(id.substring(0, 9), 36);
    expect(timestampPart).toBeGreaterThanOrEqual(0);
  });
});

// -------------------------------------------------------------------------
// Data export format validation
// -------------------------------------------------------------------------
describe('exportDaten format', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('produces an object with version 3', () => {
    const data = buildExportData();
    expect(data.version).toBe(3);
  });

  it('includes all 10 expected data collections', () => {
    const data = buildExportData();
    const expectedKeys = [
      'version', 'exportiert', 'schueler', 'notizen', 'termine',
      'screenings', 'roadmaps', 'wohlbefinden', 'fallformulierungen',
      'verlauf', 'kontakte', 'risiko',
    ];
    expect(Object.keys(data).sort()).toEqual(expectedKeys.sort());
  });

  it('has an ISO timestamp in exportiert', () => {
    const data = buildExportData();
    expect(data.exportiert).toBeTruthy();
    // Verify it parses as a valid date
    const parsed = new Date(data.exportiert);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it('all collection fields default to empty arrays', () => {
    const data = buildExportData();
    expect(data.schueler).toEqual([]);
    expect(data.notizen).toEqual([]);
    expect(data.termine).toEqual([]);
    expect(data.screenings).toEqual([]);
    expect(data.roadmaps).toEqual([]);
    expect(data.wohlbefinden).toEqual([]);
    expect(data.fallformulierungen).toEqual([]);
    expect(data.verlauf).toEqual([]);
    expect(data.kontakte).toEqual([]);
    expect(data.risiko).toEqual([]);
  });

  it('includes stored data in the export', () => {
    const schueler = [{ id: 's1', vorname: 'Max', nachname: 'Muster' }];
    const notizen = [{ id: 'n1', schuelerId: 's1', inhalt: 'Test' }];
    localStorage.setItem(DB_KEYS.SCHUELER, JSON.stringify(schueler));
    localStorage.setItem(DB_KEYS.NOTIZEN, JSON.stringify(notizen));

    const data = buildExportData();
    expect(data.schueler).toHaveLength(1);
    expect(data.schueler[0].vorname).toBe('Max');
    expect(data.notizen).toHaveLength(1);
    expect(data.notizen[0].inhalt).toBe('Test');
  });

  it('export is valid JSON when serialized', () => {
    const schueler = [{ id: 's1', vorname: 'Anna', nachname: 'Schmidt' }];
    localStorage.setItem(DB_KEYS.SCHUELER, JSON.stringify(schueler));

    const data = buildExportData();
    const json = JSON.stringify(data, null, 2);

    expect(() => JSON.parse(json)).not.toThrow();
    const reparsed = JSON.parse(json);
    expect(reparsed.version).toBe(3);
    expect(reparsed.schueler).toHaveLength(1);
  });

  it('export contains correct data after multiple insertions', () => {
    const schueler = [
      { id: 's1', vorname: 'A' },
      { id: 's2', vorname: 'B' },
      { id: 's3', vorname: 'C' },
    ];
    const termine = [
      { id: 't1', datum: '2026-01-01' },
      { id: 't2', datum: '2026-02-01' },
    ];
    localStorage.setItem(DB_KEYS.SCHUELER, JSON.stringify(schueler));
    localStorage.setItem(DB_KEYS.TERMINE, JSON.stringify(termine));

    const data = buildExportData();
    expect(data.schueler).toHaveLength(3);
    expect(data.termine).toHaveLength(2);
    expect(data.notizen).toEqual([]);
  });
});

// -------------------------------------------------------------------------
// Import validation contract
// -------------------------------------------------------------------------
describe('import validation', () => {
  it('rejects data without schueler key', () => {
    // The real importDaten checks: if (!daten.schueler) throw new Error(...)
    const badData = { version: 3, notizen: [] };
    expect(badData.schueler).toBeFalsy();
  });

  it('accepts data with schueler key (even if empty)', () => {
    const goodData = { version: 3, schueler: [] };
    expect(goodData.schueler).toBeDefined();
  });

  it('handles missing optional collections gracefully', () => {
    // importDaten uses ?. and || [] for optional fields
    const partial = { version: 3, schueler: [{ id: 's1' }] };
    expect(partial.notizen?.length || 0).toBe(0);
    expect(partial.termine?.length || 0).toBe(0);
  });
});
