const test = require('node:test');
const assert = require('node:assert/strict');

const CONFIG = require('../js/config.js');
const validate = require('../js/validate.js');

const SETTINGS = { ...CONFIG.defaults };

// A valid quote exactly as the form would send it: numbers arrive as strings.
function rawQuote(overrides = {}) {
  return {
    areas: [{ name: 'סלון', area: '50', thicknessCm: '10' }],
    workers: '2',
    client: { name: 'ישראל ישראלי', date: '2026-10-25' },
    ...overrides,
  };
}

function codes(result) {
  return result.errors.map((e) => e.code);
}

test('parseNumber accepts normal input', () => {
  assert.equal(validate.parseNumber('12.5'), 12.5);
  assert.equal(validate.parseNumber(' 7 '), 7);
  assert.equal(validate.parseNumber('12,5'), 12.5);    // comma as decimal point
  assert.equal(validate.parseNumber('1,250'), 1250);   // comma as thousands separator
  assert.equal(validate.parseNumber('1,250.5'), 1250.5);
  assert.equal(validate.parseNumber('.5'), 0.5);
  assert.equal(validate.parseNumber(-3), -3);
  assert.equal(validate.parseNumber('-3'), -3);
});

test('parseNumber rejects non-numbers', () => {
  for (const bad of ['abc', '5abc', '1e3', '0x10', '1.2.3', '', '  ', null, undefined, NaN, Infinity]) {
    assert.ok(Number.isNaN(validate.parseNumber(bad)), `expected NaN for ${String(bad)}`);
  }
});

test('valid quote passes and returns parsed numbers', () => {
  const r = validate.validateQuote(rawQuote(), SETTINGS);
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.quote.areas[0], { name: 'סלון', area: 50, thicknessCm: 10 });
  assert.equal(r.quote.workers, 2);
  assert.deepEqual(r.quote.client, { name: 'ישראל ישראלי', date: '2026-10-25' });
});

test('zero, negative, empty and text thickness are each rejected with the right code', () => {
  const cases = { '0': 'notPositive', '-5': 'notPositive', '': 'required', 'abc': 'notNumber' };
  for (const [input, code] of Object.entries(cases)) {
    const r = validate.validateQuote(rawQuote({ areas: [{ area: '50', thicknessCm: input }] }), SETTINGS);
    assert.equal(r.ok, false);
    assert.deepEqual(r.errors.map((e) => [e.field, e.index, e.code]), [['thicknessCm', 0, code]], `input "${input}"`);
  }
});

test('error messages are Hebrew and name the field', () => {
  const r = validate.validateQuote(rawQuote({ areas: [{ area: '0', thicknessCm: '10' }] }), SETTINGS);
  assert.equal(r.errors[0].message, 'שטח (מ״ר) חייב להיות גדול מ-0');
  assert.equal(r.errors[0].rowLabel, 'שטח 1');
});

test('errors are reported per row', () => {
  const r = validate.validateQuote(rawQuote({
    areas: [
      { area: '50', thicknessCm: '10' },
      { area: '-1', thicknessCm: 'x' },
    ],
  }), SETTINGS);
  assert.deepEqual(r.errors.map((e) => [e.index, e.field, e.code]), [
    [1, 'area', 'notPositive'],
    [1, 'thicknessCm', 'notNumber'],
  ]);
  assert.equal(r.errors[0].rowLabel, 'שטח 2');
});

test('at least one area is required', () => {
  const r = validate.validateQuote(rawQuote({ areas: [] }), SETTINGS);
  assert.deepEqual(codes(r), ['noAreas']);
});

test('workers must be a whole number at or above the minimum', () => {
  assert.deepEqual(codes(validate.validateQuote(rawQuote({ workers: '1' }), SETTINGS)), ['belowMinWorkers']);
  assert.deepEqual(codes(validate.validateQuote(rawQuote({ workers: '2.5' }), SETTINGS)), ['notInteger']);
  assert.deepEqual(codes(validate.validateQuote(rawQuote({ workers: '0' }), SETTINGS)), ['notPositive']);
  assert.equal(validate.validateQuote(rawQuote({ workers: '3' }), SETTINGS).ok, true);
});

test('below-minimum message names the minimum', () => {
  const r = validate.validateQuote(rawQuote({ workers: '1' }), { ...SETTINGS, minWorkers: 3 });
  assert.equal(r.errors[0].message, 'מספר העובדים המינימלי הוא 3');
});

test('client name and date are required', () => {
  const r = validate.validateQuote(rawQuote({ client: { name: '  ', date: '' } }), SETTINGS);
  assert.deepEqual(r.errors.map((e) => [e.field, e.code]), [['clientName', 'required'], ['date', 'required']]);
});

test('impossible dates are rejected', () => {
  for (const date of ['2026-02-30', '25/10/2026', 'tomorrow']) {
    const r = validate.validateQuote(rawQuote({ client: { name: 'א', date } }), SETTINGS);
    assert.deepEqual(codes(r), ['invalidDate'], date);
  }
});

test('unusually high values warn but do not block', () => {
  const r = validate.validateQuote(rawQuote({ areas: [{ area: '50', thicknessCm: '150' }] }), SETTINGS);
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 1);
  assert.equal(r.warnings[0].field, 'thicknessCm');
  assert.match(r.warnings[0].message, /150/);
});

test('area name is optional', () => {
  const r = validate.validateQuote(rawQuote({ areas: [{ area: '50', thicknessCm: '10' }] }), SETTINGS);
  assert.equal(r.ok, true);
  assert.equal(r.quote.areas[0].name, '');
});

test('validateSettings: defaults are valid', () => {
  const r = validate.validateSettings(SETTINGS);
  assert.equal(r.ok, true);
  assert.deepEqual(r.settings, SETTINGS);
});

test('validateSettings: rejects zero, negative and text, per field', () => {
  const r = validate.validateSettings({ ...SETTINGS, pricePerM3: '0', vatPercent: '-18', workerDayRate: 'abc', minWorkers: '1.5' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors.map((e) => [e.field, e.code]), [
    ['pricePerM3', 'notPositive'],
    ['vatPercent', 'notPositive'],
    ['workerDayRate', 'notNumber'],
    ['minWorkers', 'notInteger'],
  ]);
});

test('validateSettings: a new price as typed text is accepted', () => {
  const r = validate.validateSettings({ ...SETTINGS, pricePerM3: '480' });
  assert.equal(r.ok, true);
  assert.equal(r.settings.pricePerM3, 480);
});

// Regression: thickness typed in meters (0.1 instead of 10 cm) used to price silently at 1/100.
test('thickness that looks like meters warns about the unit', () => {
  const r = validate.validateQuote(rawQuote({ areas: [{ area: '100', thicknessCm: '0.1' }] }), SETTINGS);
  assert.equal(r.ok, true);                       // a warning, not a block
  assert.equal(r.warnings[0].field, 'thicknessCm');
  assert.equal(r.warnings[0].code, 'unusuallyLow');
  assert.equal(r.warnings[0].message, 'עובי (ס״מ): הערך 0.1 נמוך מהרגיל. האם הוזן ביחידה הנכונה?');
});

test('normal thickness and area give no low-value warning', () => {
  const r = validate.validateQuote(rawQuote({ areas: [{ area: '1', thicknessCm: '3' }] }), SETTINGS);
  assert.deepEqual(r.warnings, []);
});
