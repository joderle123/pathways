/* ============================================================
   Pathways Core — Bridge
   ============================================================
   Verbindungs-Layer zwischen den Pathways-Apps:
   - BroadcastChannel: Live-Sync zwischen offenen Tabs
   - URL-Schema: Deep-Links beim App-Wechsel
   - storage-Event: Fallback (z.B. älteres iOS)

   Beispiel-Workflow:
     CASE öffnet DIAGNOSE:
       Bridge.openApp('diagnose', { schueler: 'abc123' });

     DIAGNOSE schickt Update:
       Bridge.notify('screening_completed', { schuelerId: 'abc123' });

     CASE empfängt:
       Bridge.subscribe('screening_completed', e => refreshKlient(e.schuelerId));

   API:
     Bridge.openApp(name, params)
     Bridge.deepLink(name, params)        → returns URL string
     Bridge.notify(typ, payload)
     Bridge.subscribe(typ, cb)            → returns unsubscribe fn
     Bridge.parseQuery(url?)              → liest URL-Parameter
     Bridge.currentApp()                  → 'case' | 'diagnose' | …
     Bridge.isAvailable()                 → bool (BroadcastChannel?)
   ============================================================ */

const Bridge = (function () {
  const CHANNEL_NAME = 'pathways';
  const STORAGE_FALLBACK_KEY = 'pw_bridge_event';

  // Detect if BroadcastChannel is available
  const hasBroadcast = typeof BroadcastChannel !== 'undefined';
  const channel = hasBroadcast ? new BroadcastChannel(CHANNEL_NAME) : null;

  const subscribers = new Map(); // typ → Set<callback>

  // Internal: deliver event to subscribers
  function _deliver(event) {
    if (!event || !event.typ) return;
    const set = subscribers.get(event.typ);
    if (set) set.forEach(cb => { try { cb(event); } catch (e) { console.error('[Bridge] subscriber error:', e); } });
    const wildcards = subscribers.get('*');
    if (wildcards) wildcards.forEach(cb => { try { cb(event); } catch (e) {} });
  }

  // Listen for incoming messages
  if (channel) {
    channel.onmessage = e => _deliver(e.data);
  } else {
    // Fallback: storage events (cross-tab)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', e => {
        if (e.key === STORAGE_FALLBACK_KEY && e.newValue) {
          try { _deliver(JSON.parse(e.newValue)); } catch (err) {}
        }
      });
    }
  }

  /**
   * Detect which app is currently running, based on URL path.
   * /case/ → 'case', /diagnose/ → 'diagnose', etc.
   * Default → 'unknown'.
   */
  function currentApp() {
    if (typeof location === 'undefined') return 'unknown';
    const m = location.pathname.match(/\/(hub|claro|via|codex|case|diagnose|roadmap|session|library|crisis|academy|parents|core)\//);
    return m ? m[1] : 'unknown';
  }

  /** Build a deep-link URL to another app. */
  function deepLink(app, params = {}) {
    const resolved = resolveApp(app);
    const base = `../${resolved}/`;
    const qs = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return qs ? `${base}?${qs}` : base;
  }

  const APP_ALIASES = {
    case: 'hub', diagnose: 'claro', roadmap: 'via', session: 'via',
    library: 'codex', crisis: 'hub', parents: 'codex',
  };

  function resolveApp(app) { return APP_ALIASES[app] || app; }

  /** Open another app in a new tab with deep-link. */
  function openApp(app, params = {}) {
    if (typeof window === 'undefined') return;
    const resolved = resolveApp(app);
    if (resolved !== app) console.info(`[Bridge] Alias: ${app} → ${resolved}`);
    if (app === 'session') params.mode = params.mode || 'sitzung';
    if (app === 'crisis') params.view = params.view || 'crisis';
    if (app === 'parents') params.section = params.section || 'infoblaetter';
    const url = deepLink(resolved, params);
    window.open(url, '_blank');
  }

  /** Send an event to all open Pathways tabs. */
  function notify(typ, payload = {}) {
    const event = {
      typ,
      from: currentApp(),
      ts: Date.now(),
      ...payload,
    };
    if (channel) {
      channel.postMessage(event);
    } else {
      // Storage-event fallback
      try {
        localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(event));
        // delete so future writes trigger event again
        setTimeout(() => localStorage.removeItem(STORAGE_FALLBACK_KEY), 50);
      } catch (e) {}
    }
    // Also deliver locally (own tab)
    _deliver(event);
  }

  /**
   * Subscribe to events of a given typ.
   * Use '*' to listen to all events.
   * Returns an unsubscribe function.
   */
  function subscribe(typ, cb) {
    if (!subscribers.has(typ)) subscribers.set(typ, new Set());
    subscribers.get(typ).add(cb);
    return () => subscribers.get(typ)?.delete(cb);
  }

  /** Read URL query parameters. */
  function parseQuery(url) {
    const u = url ? new URL(url, 'http://x') : new URL(location.href);
    const out = {};
    u.searchParams.forEach((v, k) => { out[k] = v; });
    return out;
  }

  function isAvailable() { return hasBroadcast; }

  return {
    currentApp,
    deepLink,
    openApp,
    notify,
    subscribe,
    parseQuery,
    isAvailable,
  };
})();

// CommonJS export (für Tools/Tests). Browser nutzt globale `Bridge`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Bridge };
}
