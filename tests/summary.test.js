const test = require('node:test');
const assert = require('node:assert/strict');

const calc = require('../js/calc.js');
const validate = require('../js/validate.js');
const { buildSummaryLines } = require('../js/summary.js');

const SETTINGS = { pricePerM3: 450, wastePercent: 7, vatPercent: 18, workerDayRate: 900, m3PerWorkerDay: 8, minWorkers: 2 };

// Intl output can contain invisible direction marks / non-breaking spaces; compare plain text.
const plain = (s) => s.replace(/[‎‏‪-‮]/g, '').replace(/ /g, ' ');

function linesFor(quote) {
  const lines = buildSummaryLines(calc.computeQuote(quote, SETTINGS), SETTINGS);
  return Object.fromEntries(lines.map((l) => [l.key, { ...l, value: plain(l.value), detail: l.detail && plain(l.detail) }]));
}

test('summary lines come in a fixed order', () => {
  const lines = buildSummaryLines(calc.computeQuote({ areas: [{ area: 50, thicknessCm: 10 }] }, SETTINGS), SETTINGS);
  assert.deepEqual(lines.map((l) => l.key),
    ['netVolume', 'orderedVolume', 'concrete', 'labor', 'subtotal', 'vat', 'total']);
});

test('summary lines: worked example at 450₪', () => {
  const l = linesFor({ areas: [{ area: 50, thicknessCm: 10 }] });
  assert.equal(l.netVolume.value, '5 מ״ק');
  assert.equal(l.orderedVolume.label, 'נפח להזמנה (כולל 7% פחת)');
  assert.equal(l.orderedVolume.value, '5.35 מ״ק');
  assert.equal(l.concrete.detail, '5.35 מ״ק × 450 ₪');
  assert.equal(l.concrete.value, '2,408 ₪');            // 5.35 × 450 = 2407.5 → 2408
  assert.equal(l.labor.detail, '2 עובדים × יום אחד × 900 ₪');
  assert.equal(l.labor.value, '1,800 ₪');
  assert.equal(l.subtotal.value, '4,208 ₪');
  assert.equal(l.vat.label, 'מע״מ (18%)');
  assert.equal(l.vat.value, '757 ₪');                   // 757.44 → 757
  assert.equal(l.total.value, '4,965 ₪');
});

test('summary lines: plural days', () => {
  const l = linesFor({ areas: [{ area: 200, thicknessCm: 20 }] }); // 40 m³ → 3 days
  assert.equal(l.labor.detail, '2 עובדים × 3 ימים × 900 ₪');
});

test('summary lines: subtotal and total are emphasised', () => {
  const l = linesFor({ areas: [{ area: 50, thicknessCm: 10 }] });
  assert.equal(l.subtotal.emphasis, 'strong');
  assert.equal(l.total.emphasis, 'total');
  assert.equal(l.concrete.emphasis, undefined);
});

test('validateField checks a single input (used for length × width)', () => {
  assert.equal(validate.validateField('12.5', 'length').value, 12.5);
  const bad = validate.validateField('0', 'width');
  assert.equal(bad.value, null);
  assert.equal(bad.errors[0].message, 'רוחב (מ׳) חייב להיות גדול מ-0');
  assert.equal(validate.validateField('500', 'length').warnings.length, 1);
});
