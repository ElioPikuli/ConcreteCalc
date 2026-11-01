/*
 * Turns a computed quote into display lines. The screen and the PDF both render these,
 * so adding or rewording a line happens once, here and in STRINGS.summary.
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.summary) and via require() in tests.
 */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const STRINGS = isNode ? require('./strings.he.js') : root.CQ.STRINGS;
  const format = isNode ? require('./format.js') : root.CQ.format;
  const { format: fill } = isNode ? require('./validate.js') : root.CQ.validate;

  const T = STRINGS.summary;
  const m3 = (v) => `${format.formatVolume(v)} ${STRINGS.units.m3}`;
  const days = (n) => (n === 1 ? T.oneDay : fill(T.days, { n }));

  /*
   * Each line: { key, label, value, detail?, emphasis? }
   * emphasis: 'strong' for the subtotal, 'total' for the final amount.
   */
  function buildSummaryLines(result, settings) {
    return [
      { key: 'netVolume', label: T.netVolume, value: m3(result.netVolume) },
      { key: 'orderedVolume', label: fill(T.orderedVolume, { waste: settings.wastePercent }), value: m3(result.orderedVolume) },
      {
        key: 'concrete',
        label: T.concrete,
        detail: fill(T.concreteDetail, { volume: format.formatVolume(result.orderedVolume), price: format.formatMoney(settings.pricePerM3) }),
        value: format.formatMoney(result.concreteCost),
      },
      {
        key: 'labor',
        label: T.labor,
        detail: fill(T.laborDetail, { workers: result.labor.workers, days: days(result.labor.days), rate: format.formatMoney(settings.workerDayRate) }),
        value: format.formatMoney(result.labor.cost),
      },
      { key: 'subtotal', label: T.subtotal, value: format.formatMoney(result.subtotal), emphasis: 'strong' },
      { key: 'vat', label: fill(T.vat, { vat: settings.vatPercent }), value: format.formatMoney(result.vat) },
      { key: 'total', label: T.total, value: format.formatMoney(result.total), emphasis: 'total' },
    ];
  }

  const summary = { buildSummaryLines, formatDays: days };

  if (isNode) module.exports = summary;
  else root.CQ = Object.assign(root.CQ || {}, { summary });
})(this);
