const test = require('node:test');
const assert = require('node:assert/strict');

const CONFIG = require('../js/config.js');
const calc = require('../js/calc.js');
const format = require('../js/format.js');
const { buildPrintModel } = require('../js/print-model.js');

const SETTINGS = { ...CONFIG.defaults };

const plain = (s) => String(s).replace(/[‎‏‪-‮]/g, '').replace(/ /g, ' ');

function model(overrides = {}) {
  const quote = {
    areas: [
      { name: 'סלון', area: 50, thicknessCm: 10 },
      { name: '', area: 150, thicknessCm: 20 },
    ],
    workers: 2,
    client: { name: 'משה כהן', date: '2026-10-25' },
    ...overrides,
  };
  return buildPrintModel({ quote, result: calc.computeQuote(quote, SETTINGS), settings: SETTINGS });
}

test('header: fixed company name, then date and client name', () => {
  const m = model();
  assert.equal(m.companyName, CONFIG.company.name);
  assert.equal(m.dateText, '25/10/2026');
  assert.equal(m.clientName, 'משה כהן');
});

test('date and client change per quote; company name does not', () => {
  const m = model({ client: { name: 'יעל לוי', date: '2027-01-03' } });
  assert.equal(m.companyName, CONFIG.company.name);
  assert.equal(m.dateText, '03/01/2027');
  assert.equal(m.clientName, 'יעל לוי');
});

test('file name includes client and date (no characters that break file names)', () => {
  assert.equal(model().fileName, 'הצעת מחיר - משה כהן - 25-10-2026');
  assert.equal(model({ client: { name: 'א/ב: "ג"', date: '2026-10-25' } }).fileName, 'הצעת מחיר - א ב ג - 25-10-2026');
});

test('area rows: numbered, unnamed areas get a default name, volumes per row', () => {
  const rows = model().areaRows.map((r) => r.map(plain));
  assert.deepEqual(rows, [
    ['1', 'סלון', '50', '10', '5'],
    ['2', 'שטח 2', '150', '20', '30'],
  ]);
  assert.equal(plain(model().totalVolume), '35');
});

test('price lines are the shared summary lines', () => {
  const lines = model().summaryLines;
  assert.equal(lines.at(-1).key, 'total');
  assert.equal(plain(lines.at(-1).value), format.formatMoney(calc.computeQuote({
    areas: [{ area: 50, thicknessCm: 10 }, { area: 150, thicknessCm: 20 }], workers: 2,
  }, SETTINGS).total).replace(/ /g, ' '));
});

test('notes are filled from settings and config', () => {
  const notes = model().notes;
  assert.ok(notes.includes('נפח הבטון להזמנה כולל 7% פחת.'));
  assert.ok(notes.includes(`ההצעה בתוקף ל-${CONFIG.quote.validityDays} ימים מתאריך ההצעה.`));
});

test('formatDate follows the configured pattern', () => {
  assert.equal(format.formatDate('2026-03-07'), '07/03/2026');
});
