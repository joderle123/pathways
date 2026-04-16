import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// escapeHtml — exact copy from js/app.js line 4362
// ---------------------------------------------------------------------------
function escapeHtml(text) {
  return (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// =========================================================================
// Tests
// =========================================================================

// -------------------------------------------------------------------------
// escapeHtml
// -------------------------------------------------------------------------
describe('escapeHtml', () => {
  it('escapes < and > to HTML entities', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;',
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('handles all three entity types in one string', () => {
    expect(escapeHtml('<b>M&M</b>')).toBe('&lt;b&gt;M&amp;M&lt;/b&gt;');
  });

  it('returns empty string for null input', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('leaves safe text untouched', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles multiple consecutive special characters', () => {
    expect(escapeHtml('<<<>>>&&&')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;&amp;&amp;&amp;');
  });

  it('does NOT escape single or double quotes (known limitation)', () => {
    // The real escapeHtml in app.js does NOT escape quotes.
    // This test documents that behaviour.
    expect(escapeHtml('"hello"')).toBe('"hello"');
    expect(escapeHtml("'hello'")).toBe("'hello'");
  });

  it('handles numeric input coerced to string via ||', () => {
    // (0 || '').replace(...) => ''
    expect(escapeHtml(0)).toBe('');
  });

  it('handles strings with newlines and tabs', () => {
    expect(escapeHtml('line1\n<br>\ttab')).toBe('line1\n&lt;br&gt;\ttab');
  });
});

// -------------------------------------------------------------------------
// DOMPurify integration (mock-based)
// The real app imports DOMPurify as a dependency. We test the expected
// sanitization contract: script tags and event handlers are removed.
// -------------------------------------------------------------------------
describe('DOMPurify-style sanitization contract', () => {
  // Lightweight mock replicating DOMPurify.sanitize core behaviour
  function sanitize(dirty) {
    const doc = new DOMParser().parseFromString(dirty, 'text/html');
    // Remove script elements
    doc.querySelectorAll('script').forEach(el => el.remove());
    // Remove event-handler attributes
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return doc.body.innerHTML;
  }

  it('strips <script> tags entirely', () => {
    const result = sanitize('<p>Hello</p><script>alert(1)</script>');
    expect(result).not.toContain('<script');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips inline event handlers like onclick', () => {
    const result = sanitize('<div onclick="alert(1)">Click me</div>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('strips onerror handlers on img tags', () => {
    const result = sanitize('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
  });

  it('preserves safe HTML', () => {
    const safe = '<p>This is <strong>bold</strong> and <em>italic</em></p>';
    const result = sanitize(safe);
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('handles empty string', () => {
    expect(sanitize('')).toBe('');
  });

  it('strips nested script tags', () => {
    const result = sanitize('<div><script>bad()</script><span>ok</span></div>');
    expect(result).not.toContain('script');
    expect(result).toContain('<span>ok</span>');
  });
});

// -------------------------------------------------------------------------
// localStorage data integrity
// The app stores all data in localStorage as JSON. This suite validates
// that data round-trips correctly through JSON serialization and that
// special characters in user input do not break storage.
// -------------------------------------------------------------------------
describe('localStorage data integrity', () => {
  it('round-trips a string containing HTML through JSON serialization', () => {
    const html = '<script>alert("xss")</script>';
    localStorage.setItem('test', JSON.stringify({ value: html }));
    const parsed = JSON.parse(localStorage.getItem('test'));
    expect(parsed.value).toBe(html);
  });

  it('round-trips unicode characters', () => {
    const text = 'Schüler mit Umlaut: äöüÄÖÜß emoji: 😊';
    localStorage.setItem('test', JSON.stringify({ value: text }));
    const parsed = JSON.parse(localStorage.getItem('test'));
    expect(parsed.value).toBe(text);
  });

  it('round-trips large strings', () => {
    const big = 'x'.repeat(100_000);
    localStorage.setItem('test', JSON.stringify({ value: big }));
    const parsed = JSON.parse(localStorage.getItem('test'));
    expect(parsed.value).toHaveLength(100_000);
  });

  it('round-trips nested objects', () => {
    const obj = {
      schueler: { id: '1', notizen: [{ id: 'n1', text: 'Hello' }] },
    };
    localStorage.setItem('test', JSON.stringify(obj));
    const parsed = JSON.parse(localStorage.getItem('test'));
    expect(parsed).toEqual(obj);
  });

  it('round-trips null values inside JSON', () => {
    const obj = { foto: null, themaId: null };
    localStorage.setItem('test', JSON.stringify(obj));
    const parsed = JSON.parse(localStorage.getItem('test'));
    expect(parsed.foto).toBeNull();
    expect(parsed.themaId).toBeNull();
  });
});
