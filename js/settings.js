/*
 * Editable settings (prices, rates), saved on the device.
 *
 * Storage is passed in so tests can use a fake, and every access is wrapped in try/catch:
 * private browsing or blocked storage must never break the calculator, it just means
 * changes last until the page is closed.
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.settings) and via require() in tests.
 */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const CONFIG = isNode ? require('./config.js') : root.CQ.CONFIG;
  const validate = isNode ? require('./validate.js') : root.CQ.validate;

  const KEY = CONFIG.storage.settingsKey;

  function readStored(storage) {
    try {
      const parsed = JSON.parse(storage.getItem(KEY));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  // Keeps each valid stored field; anything missing or broken falls back to its default.
  function mergeWithDefaults(stored) {
    const result = validate.validateSettings({ ...CONFIG.defaults, ...stored });
    const settings = { ...result.settings };
    for (const error of result.errors) settings[error.field] = CONFIG.defaults[error.field];
    return settings;
  }

  function createSettingsStore(storage) {
    // Last saved values for this visit; used when storage is unavailable.
    let inMemory = null;

    function tryStorage(action) {
      if (!storage) return false;
      try { action(); return true; } catch (e) { return false; }
    }

    return {
      load() {
        if (inMemory) return { ...inMemory };
        return storage ? mergeWithDefaults(readStored(storage)) : { ...CONFIG.defaults };
      },

      // raw values come straight from the form. Returns the validation result plus `persisted`.
      save(raw) {
        const result = validate.validateSettings(raw);
        if (!result.ok) return { ...result, persisted: false };
        const persisted = tryStorage(() => storage.setItem(KEY, JSON.stringify(result.settings)));
        inMemory = persisted ? null : result.settings;
        return { ...result, persisted };
      },

      reset() {
        inMemory = null;
        tryStorage(() => storage.removeItem(KEY));
        return { ...CONFIG.defaults };
      },
    };
  }

  // localStorage itself can throw on access in some privacy modes.
  function browserStorage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  const settings = { createSettingsStore, browserStorage };

  if (isNode) module.exports = settings;
  else root.CQ = Object.assign(root.CQ || {}, { settings });
})(this);
