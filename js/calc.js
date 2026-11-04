/*
 * Pure pricing logic: no DOM, no storage. Every business rule is one small function
 * so a rule change is a one-function edit covered by tests/calc.test.js.
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.calc) and via require() in tests.
 */
(function (root) {
  const DEFAULT_CONFIG = typeof module !== 'undefined' && module.exports
    ? require('./config.js')
    : root.CQ.CONFIG;

  // Absorbs floating-point noise such as 30 × 0.1 = 3.0000000000000004.
  const EPSILON = 1e-9;

  // Rounds half up. The relative nudge fixes float noise (1.005 × 100 = 100.4999…) and,
  // unlike string tricks, works for any finite number (1e-7, 1e21).
  function round(value, decimals) {
    const factor = 10 ** decimals;
    const shifted = value * factor;
    if (Math.abs(shifted) >= 2 ** 52) return value;   // too large to have a fractional part
    return Math.round(shifted + Math.abs(shifted) * Number.EPSILON) / factor;
  }

  function calcVolume(areaM2, thicknessCm) {
    return areaM2 * thicknessCm / 100;
  }

  function applyWaste(volume, wastePercent) {
    return volume * (1 + wastePercent / 100);
  }

  // Partial days are billed as full days: 1.5 days → 2. Any pour takes at least one day.
  function calcLaborDays(volume, workers, m3PerWorkerDay) {
    return Math.max(1, Math.ceil(volume / (workers * m3PerWorkerDay) - EPSILON));
  }

  function calcLaborCost(workers, days, workerDayRate) {
    return workers * days * workerDayRate;
  }

  function calcVat(amount, vatPercent) {
    return amount * vatPercent / 100;
  }

  /*
   * quote:    { areas: [{ name, area, thicknessCm }], workers? }
   * settings: { pricePerM3, wastePercent, vatPercent, workerDayRate, m3PerWorkerDay, minWorkers }
   *
   * Volumes are computed at full precision and rounded once. Each money line is rounded
   * before summing so the printed lines always add up to the printed totals.
   */
  function computeQuote(quote, settings, config = DEFAULT_CONFIG) {
    const { volumeDecimals, moneyDecimals } = config.rounding;

    const areas = quote.areas.map((a) => ({
      ...a,
      volume: round(calcVolume(a.area, a.thicknessCm), volumeDecimals),
    }));

    const netVolumeExact = quote.areas.reduce((sum, a) => sum + calcVolume(a.area, a.thicknessCm), 0);
    const orderedVolumeExact = applyWaste(netVolumeExact, settings.wastePercent);
    const netVolume = round(netVolumeExact, volumeDecimals);
    const orderedVolume = round(orderedVolumeExact, volumeDecimals);

    // Charged on the rounded volume so "volume × price" on the quote matches the line total.
    const concreteCost = round(orderedVolume * settings.pricePerM3, moneyDecimals);

    const workers = quote.workers ?? settings.minWorkers;
    const laborVolume = config.labor.includeWaste ? orderedVolumeExact : netVolumeExact;
    const days = calcLaborDays(laborVolume, workers, settings.m3PerWorkerDay);
    const laborCost = round(calcLaborCost(workers, days, settings.workerDayRate), moneyDecimals);

    const subtotal = concreteCost + laborCost;
    const vat = round(calcVat(subtotal, settings.vatPercent), moneyDecimals);

    return {
      areas,
      netVolume,
      orderedVolume,
      concreteCost,
      labor: { workers, days, cost: laborCost },
      subtotal,
      vat,
      total: subtotal + vat,
    };
  }

  const calc = { round, calcVolume, applyWaste, calcLaborDays, calcLaborCost, calcVat, computeQuote };

  if (typeof module !== 'undefined' && module.exports) module.exports = calc;
  else root.CQ = Object.assign(root.CQ || {}, { calc });
})(this);
