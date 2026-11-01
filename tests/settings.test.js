const test = require('node:test');
const assert = require('node:assert/strict');

const CONFIG = require('../js/config.js');
const { createSettingsStore } = require('../js/settings.js');

// In-memory stand-in for localStorage.
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    raw: data,
  };
}

// Simulates private browsing / blocked storage, where every access throws.
const brokenStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};

const KEY = CONFIG.storage.settingsKey;

test('first run: load returns the defaults', () => {
  const store = createSettingsStore(memoryStorage());
  assert.deepEqual(store.load(), CONFIG.defaults);
});

test('save then load keeps the new price', () => {
  const storage = memoryStorage();
  const store = createSettingsStore(storage);
  const result = store.save({ ...CONFIG.defaults, pricePerM3: '480' });
  assert.equal(result.ok, true);
  assert.equal(result.persisted, true);
  assert.equal(createSettingsStore(storage).load().pricePerM3, 480); // a fresh store, like reopening the app
});

test('invalid settings are not saved and return Hebrew errors', () => {
  const storage = memoryStorage();
  const store = createSettingsStore(storage);
  const result = store.save({ ...CONFIG.defaults, pricePerM3: '0' });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].field, 'pricePerM3');
  assert.equal(result.errors[0].message, 'מחיר בטון למ״ק חייב להיות גדול מ-0');
  assert.equal(storage.getItem(KEY), null);
});

test('reset brings back the defaults and clears storage', () => {
  const storage = memoryStorage();
  const store = createSettingsStore(storage);
  store.save({ ...CONFIG.defaults, pricePerM3: '480' });
  assert.deepEqual(store.reset(), CONFIG.defaults);
  assert.equal(storage.getItem(KEY), null);
  assert.deepEqual(store.load(), CONFIG.defaults);
});

test('a setting added to config later gets its default for existing users', () => {
  // Stored before workerDayRate existed.
  const { workerDayRate, ...older } = { ...CONFIG.defaults, pricePerM3: 480 };
  const store = createSettingsStore(memoryStorage({ [KEY]: JSON.stringify(older) }));
  const s = store.load();
  assert.equal(s.pricePerM3, 480);
  assert.equal(s.workerDayRate, CONFIG.defaults.workerDayRate);
});

test('corrupted or invalid stored data falls back to defaults', () => {
  for (const stored of ['not json', '{"pricePerM3": -5}', 'null', '[]']) {
    const store = createSettingsStore(memoryStorage({ [KEY]: stored }));
    assert.deepEqual(store.load(), CONFIG.defaults, stored);
  }
});

test('one bad stored field does not wipe the good ones', () => {
  const stored = JSON.stringify({ ...CONFIG.defaults, pricePerM3: 480, vatPercent: 'oops' });
  const s = createSettingsStore(memoryStorage({ [KEY]: stored })).load();
  assert.equal(s.pricePerM3, 480);
  assert.equal(s.vatPercent, CONFIG.defaults.vatPercent);
});

test('blocked storage: the app still works for this visit', () => {
  const store = createSettingsStore(brokenStorage);
  assert.deepEqual(store.load(), CONFIG.defaults);
  const result = store.save({ ...CONFIG.defaults, pricePerM3: '480' });
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.equal(store.load().pricePerM3, 480);   // kept in memory until the page closes
  assert.deepEqual(store.reset(), CONFIG.defaults);
});

test('no storage at all (e.g. tests, old browsers)', () => {
  const store = createSettingsStore(null);
  assert.deepEqual(store.load(), CONFIG.defaults);
  assert.equal(store.save({ ...CONFIG.defaults }).persisted, false);
});
