/*
 * Number display for the screen and the PDF. Locale and currency come from CONFIG.
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.format) and via require() in tests.
 */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const CONFIG = isNode ? require('./config.js') : root.CQ.CONFIG;

  function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat(CONFIG.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function formatMoney(value) {
    return `${formatNumber(value, CONFIG.rounding.moneyDecimals)} ${CONFIG.currency}`;
  }

  function formatVolume(value) {
    return formatNumber(value, CONFIG.rounding.volumeDecimals);
  }

  // "2026-10-25" → CONFIG.quote.dateFormat, e.g. "25/10/2026". No Date object, so no time-zone shifts.
  function formatDate(iso, pattern = CONFIG.quote.dateFormat) {
    const [YYYY, MM, DD] = iso.split('-');
    return pattern.replace('YYYY', YYYY).replace('MM', MM).replace('DD', DD);
  }

  const format = { formatNumber, formatMoney, formatVolume, formatDate };

  if (isNode) module.exports = format;
  else root.CQ = Object.assign(root.CQ || {}, { format });
})(this);
