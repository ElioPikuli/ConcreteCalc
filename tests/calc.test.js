const test = require('node:test');
const assert = require('node:assert/strict');

const CONFIG = require('../js/config.js');
const calc = require('../js/calc.js');

// Fixed settings so tests don't depend on whatever defaults the company picks later.
const SETTINGS = {
  pricePerM3: 400,
  wastePercent: 7,
  vatPercent: 18,
  workerDayRate: 900,
  m3PerWorkerDay: 8,
  minWorkers: 2,
};

test('calcVolume: m² × thickness in cm → m³', () => {
  assert.equal(calc.calcVolume(50, 10), 5);
  assert.equal(calc.calcVolume(12.5, 15), 1.875);
});

test('applyWaste adds the waste percentage', () => {
  assert.equal(calc.round(calc.applyWaste(5, 7), 2), 5.35);
  assert.equal(calc.applyWaste(10, 0), 10);
});

test('calcLaborDays rounds partial days up', () => {
  assert.equal(calc.calcLaborDays(5, 2, 8), 1);   // 0.3125 days → 1
  assert.equal(calc.calcLaborDays(40, 2, 8), 3);  // 2.5 days → 3
  assert.equal(calc.calcLaborDays(24, 2, 8), 2);  // 1.5 days → 2
});

test('calcLaborDays: exact multiples are not rounded up', () => {
  assert.equal(calc.calcLaborDays(16, 2, 8), 1);
  assert.equal(calc.calcLaborDays(32, 2, 8), 2);
  // 30 × 0.1 is 3.0000000000000004 in floating point; must still be exactly 1 day for 3 m³/day.
  assert.equal(calc.calcLaborDays(30 * 0.1, 1, 3), 1);
});

test('calcLaborCost = workers × days × day rate', () => {
  assert.equal(calc.calcLaborCost(2, 3, 900), 5400);
});

test('calcVat on the subtotal', () => {
  assert.equal(calc.calcVat(1000, 18), 180);
});

test('computeQuote: single area worked example', () => {
  const q = calc.computeQuote({ areas: [{ name: 'סלון', area: 50, thicknessCm: 10 }] }, SETTINGS);
  assert.equal(q.netVolume, 5);
  assert.equal(q.orderedVolume, 5.35);
  assert.equal(q.concreteCost, 2140);          // 5.35 × 400
  assert.equal(q.labor.workers, 2);            // defaults to the minimum crew
  assert.equal(q.labor.days, 1);
  assert.equal(q.labor.cost, 1800);
  assert.equal(q.subtotal, 3940);
  assert.equal(q.vat, 709);                    // 709.2 → 709
  assert.equal(q.total, 4649);
});

test('computeQuote: several areas are summed', () => {
  const q = calc.computeQuote({
    areas: [
      { name: 'קומה 1', area: 100, thicknessCm: 20 }, // 20 m³
      { name: 'קומה 2', area: 80, thicknessCm: 25 },  // 20 m³
    ],
  }, SETTINGS);
  assert.equal(q.areas.length, 2);
  assert.equal(q.areas[0].volume, 20);
  assert.equal(q.areas[1].volume, 20);
  assert.equal(q.netVolume, 40);
  assert.equal(q.orderedVolume, 42.8);
  assert.equal(q.concreteCost, 17120);
  assert.equal(q.labor.days, 3);               // 40 / 16 = 2.5 → 3
  assert.equal(q.labor.cost, 5400);
  assert.equal(q.subtotal, 22520);
  assert.equal(q.vat, 4054);                   // 4053.6 → 4054
  assert.equal(q.total, 26574);
});

test('computeQuote: a bigger crew shortens the job', () => {
  const q = calc.computeQuote({ areas: [{ area: 200, thicknessCm: 20 }], workers: 5 }, SETTINGS);
  assert.equal(q.netVolume, 40);
  assert.equal(q.labor.workers, 5);
  assert.equal(q.labor.days, 1);               // 40 / 40 = 1
  assert.equal(q.labor.cost, 4500);
});

test('computeQuote: printed numbers add up (subtotal + VAT = total)', () => {
  const q = calc.computeQuote({ areas: [{ area: 33.3, thicknessCm: 12 }] }, { ...SETTINGS, pricePerM3: 387 });
  assert.equal(q.subtotal, q.concreteCost + q.labor.cost);
  assert.equal(q.total, q.subtotal + q.vat);
  assert.ok(Number.isInteger(q.concreteCost) && Number.isInteger(q.vat) && Number.isInteger(q.total));
});

test('computeQuote: a price change flows through to the totals', () => {
  const area = { areas: [{ area: 50, thicknessCm: 10 }] };
  const cheap = calc.computeQuote(area, SETTINGS);
  const pricey = calc.computeQuote(area, { ...SETTINGS, pricePerM3: 500 });
  assert.equal(pricey.concreteCost - cheap.concreteCost, 535); // 5.35 m³ × 100₪
  assert.ok(pricey.total > cheap.total);
});

test('computeQuote: labor uses net volume unless config says otherwise', () => {
  // 15 m³ net → 16.05 m³ with waste. With 2 workers: net = 1 day, with waste = 2 days.
  const job = { areas: [{ area: 150, thicknessCm: 10 }] };
  assert.equal(calc.computeQuote(job, SETTINGS).labor.days, 1);
  assert.equal(calc.computeQuote(job, SETTINGS, { ...CONFIG, labor: { includeWaste: true } }).labor.days, 2);
});

test('round: half rounds up and handles float noise', () => {
  assert.equal(calc.round(1.005, 2), 1.01);
  assert.equal(calc.round(709.5, 0), 710);
});

// Regression: the old string-based round() returned NaN for 1e-7 and 1e21.
test('round works for very small and very large numbers', () => {
  assert.equal(calc.round(1e-7, 2), 0);
  assert.equal(calc.round(1e21, 0), 1e21);
  assert.equal(calc.round(2.675, 2), 2.68);
});

// Regression: a tiny pour must not come out as 0 labor days.
test('any pour takes at least one labor day', () => {
  assert.equal(calc.calcLaborDays(1e-7, 2, 8), 1);
  const q = calc.computeQuote({ areas: [{ area: 0.001, thicknessCm: 0.01 }] }, SETTINGS);
  assert.equal(q.labor.days, 1);
  assert.ok(Number.isFinite(q.total) && q.total === q.subtotal + q.vat);
});
