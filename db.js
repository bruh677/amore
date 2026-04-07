/**
 * Amore — Database Module (db.js)
 * ================================
 * Centralized localStorage-backed "database" for the Amore app.
 * All reads/writes go through this module so switching to a real
 * backend (IndexedDB, Supabase, etc.) only requires changes here.
 *
 * Usage:
 *   <script src="db.js"></script>
 *   AmoreDB.init(userId);           // call once after login
 *   AmoreDB.get('water', 0);        // read with default
 *   AmoreDB.set('water', 5);        // write
 *   AmoreDB.remove('water');        // delete key
 *   AmoreDB.all();                  // dump entire user store
 *   AmoreDB.clearUser();            // wipe current user data
 *   AmoreDB.export();               // JSON string of all user data
 *   AmoreDB.import(jsonStr);        // restore from JSON string
 */

(function (global) {
  'use strict';

  let _uid = null;   // current user id (null = guest)

  // ─────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────
  function _key(k) {
    return _uid ? `amore_${_uid}_${k}` : `amore_guest_${k}`;
  }

  function _rawGet(storageKey, def) {
    try {
      const v = localStorage.getItem(storageKey);
      return v !== null ? JSON.parse(v) : def;
    } catch (e) {
      return def;
    }
  }

  function _rawSet(storageKey, value) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[AmoreDB] Write failed:', e);
      return false;
    }
  }

  // ─────────────────────────────────────────
  // User / session helpers (shared store)
  // ─────────────────────────────────────────
  function getUsers() {
    try { return JSON.parse(localStorage.getItem('amore_users') || '{}'); }
    catch (e) { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem('amore_users', JSON.stringify(users));
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem('amore_session')); }
    catch (e) { return null; }
  }

  function saveSession(uid, name) {
    localStorage.setItem('amore_session', JSON.stringify({ uid, name }));
  }

  function clearSession() {
    localStorage.removeItem('amore_session');
  }

  // ─────────────────────────────────────────
  // Chat history (RAG knowledge base)
  // ─────────────────────────────────────────
  function getChatHistory(limit) {
    const all = _rawGet(_key('chat_history'), []);
    return limit ? all.slice(-limit) : all;
  }

  function appendChatMessage(role, content) {
    const history = getChatHistory();
    history.push({ role, content, ts: Date.now() });
    // keep last 200 messages to avoid unbounded growth
    _rawSet(_key('chat_history'), history.slice(-200));
  }

  function clearChatHistory() {
    _rawSet(_key('chat_history'), []);
  }

  // ─────────────────────────────────────────
  // RAG: build context snapshot from user data
  // ─────────────────────────────────────────
  function buildRAGContext() {
    if (!_uid) return '';

    const water    = _rawGet(_key('water'), 0);
    const habits   = _rawGet(_key('habits'), []);
    const moodLog  = _rawGet(_key('mood_log'), []).slice(0, 10);
    const streak   = _rawGet(_key('streak'), 0);
    const meta     = _rawGet(_key('journal_meta'), { count: 0 });
    const today    = new Date().toDateString();
    const journal  = _rawGet(_key('journal_' + today), '');
    const gratitude= _rawGet(_key('gratitude_today'), []);
    const skin     = _rawGet(_key('skin'), []);
    const skinSteps= ['Cleanse', 'Toner', 'Vitamin C Serum', 'Moisturizer', 'SPF'];
    const periodKey= new Date().toISOString().slice(0, 7);
    const period   = _rawGet(_key('period_' + periodKey), []);

    const habitsDone  = habits.filter(h => h.done).length;
    const habitsTotal = habits.length;
    const skinDone    = skin.length;
    const recentMoods = moodLog.slice(0, 3).map(e => `${e.mood} (${e.date})`).join(', ') || 'none';
    const gratText    = gratitude.map(g => g.text).filter(Boolean).join('; ') || 'none';

    return `[User context — today is ${today}]
- Water: ${water}/8 glasses today
- Habits: ${habitsDone}/${habitsTotal} done today; habits list: ${habits.map(h => h.name + (h.done ? ' ✓' : '')).join(', ') || 'none'}
- Mood log (recent): ${recentMoods}
- Journal entries total: ${meta.count}; today's entry: ${journal ? '"' + journal.slice(0, 120) + (journal.length > 120 ? '…' : '') + '"' : 'not written yet'}
- Gratitude today: ${gratText}
- Skincare routine: ${skinDone}/${skinSteps.length} steps done (${skinSteps.filter((_, i) => skin.includes(i)).join(', ') || 'none'})
- Day streak: ${streak}
- Period days logged this month: ${period.length}`;
  }

  // ─────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────
  const AmoreDB = {

    /** Must be called after login / on boot */
    init(uid) {
      _uid = uid || null;
    },

    /** Read a value (namespaced to current user) */
    get(key, defaultValue) {
      return _rawGet(_key(key), defaultValue);
    },

    /** Write a value (namespaced to current user) */
    set(key, value) {
      return _rawSet(_key(key), value);
    },

    /** Delete a key */
    remove(key) {
      localStorage.removeItem(_key(key));
    },

    /** Dump all user-namespaced keys as object */
    all() {
      const prefix = _uid ? `amore_${_uid}_` : 'amore_guest_';
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          try { result[k.replace(prefix, '')] = JSON.parse(localStorage.getItem(k)); }
          catch (e) { result[k.replace(prefix, '')] = localStorage.getItem(k); }
        }
      }
      return result;
    },

    /** Export all user data as JSON string (for backup) */
    export() {
      return JSON.stringify(this.all(), null, 2);
    },

    /** Import user data from JSON string (restore) */
    import(jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        Object.entries(data).forEach(([k, v]) => _rawSet(_key(k), v));
        return true;
      } catch (e) {
        console.error('[AmoreDB] Import failed:', e);
        return false;
      }
    },

    /** Wipe all data for the current user */
    clearUser() {
      const prefix = _uid ? `amore_${_uid}_` : 'amore_guest_';
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) toDelete.push(k);
      }
      toDelete.forEach(k => localStorage.removeItem(k));
    },

    // ── Auth helpers (shared, not user-namespaced) ──
    users: { get: getUsers, save: saveUsers },
    session: { get: getSession, save: saveSession, clear: clearSession },

    // ── Chat / RAG helpers ──
    chat: {
      getHistory:    getChatHistory,
      append:        appendChatMessage,
      clear:         clearChatHistory,
      buildRAGContext: buildRAGContext,
    },
  };

  // Expose globally
  global.AmoreDB = AmoreDB;

})(window);
