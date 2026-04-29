/* ============================================================
   Pathways Core — SecureStorage + PinLock
   ============================================================
   Verschlüsselung sensibler Daten via Web Crypto API (AES-256-GCM)
   und PIN-basiertes Session-Management.

   Unverändert übernommen aus js/data.js Z. 8-143.

   API:
     SecureStorage.init(pin) · .encrypt(s) · .decrypt(s) · .isEnabled()
     PinLock.isSetup() · .setPin(p) · .verifyPin(p) · .unlock(p) · .lock()
     PinLock.isSessionValid() · .removePin()

   Hinweis: `salt` ist statisch ('pathways-salt-v1'). Für Production-Hardening
   sollte ein zufälliger, gespeicherter Salt verwendet werden.
   Tracking siehe TODO im Plan: Sprint A erweitert dies bei Bedarf.
   ============================================================ */

// ============================================================
// SECURE STORAGE — AES-256 Encryption Wrapper (Web Crypto API)
// ============================================================
const SecureStorage = {
  _key: null,
  _enabled: false,

  // Initialize with user PIN — derives AES key via PBKDF2
  async init(pin) {
    if (!pin) { this._enabled = false; return; }
    try {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
      );
      const salt = enc.encode('pathways-salt-v1');
      this._key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      this._enabled = true;
    } catch (e) {
      console.warn('SecureStorage init failed:', e);
      this._enabled = false;
    }
  },

  async encrypt(data) {
    if (!this._enabled || !this._key) return data;
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this._key,
        enc.encode(data)
      );
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      return 'ENC:' + btoa(String.fromCharCode(...combined));
    } catch (e) {
      console.warn('Encryption failed:', e);
      return data;
    }
  },

  async decrypt(data) {
    if (!this._enabled || !this._key) return data;
    if (!data || !data.startsWith('ENC:')) return data;
    try {
      const raw = atob(data.slice(4));
      const bytes = new Uint8Array([...raw].map(c => c.charCodeAt(0)));
      const iv = bytes.slice(0, 12);
      const ciphertext = bytes.slice(12);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this._key,
        ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.warn('Decryption failed:', e);
      return data;
    }
  },

  isEnabled() { return this._enabled; },
};

// ============================================================
// PIN LOCK SYSTEM
// ============================================================
const PinLock = {
  STORAGE_KEY: 'pathways_pin_hash',
  SESSION_KEY: 'pathways_session',
  SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 hours

  async hashPin(pin) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode('pathways:' + pin));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async isSetup() {
    return !!localStorage.getItem(this.STORAGE_KEY);
  },

  async setPin(pin) {
    const hash = await this.hashPin(pin);
    localStorage.setItem(this.STORAGE_KEY, hash);
    this._createSession();
  },

  async verifyPin(pin) {
    const hash = await this.hashPin(pin);
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return hash === stored;
  },

  removePin() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SESSION_KEY);
  },

  isSessionValid() {
    const session = localStorage.getItem(this.SESSION_KEY);
    if (!session) return false;
    try {
      const { expires } = JSON.parse(session);
      return Date.now() < expires;
    } catch { return false; }
  },

  _createSession() {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({
      created: Date.now(),
      expires: Date.now() + this.SESSION_DURATION,
    }));
  },

  async unlock(pin) {
    const ok = await this.verifyPin(pin);
    if (ok) {
      this._createSession();
      await SecureStorage.init(pin);
    }
    return ok;
  },

  lock() {
    localStorage.removeItem(this.SESSION_KEY);
    SecureStorage._enabled = false;
    SecureStorage._key = null;
  },
};

// CommonJS export (für Tools/Tests). Browser nutzt globale `SecureStorage`/`PinLock`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SecureStorage, PinLock };
}
