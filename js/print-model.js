/*
 * Everything the client-facing quote shows, as plain data. print.js only lays it out,
 * so the content can be tested here and the design changed there independently.
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.printModel) and via require() in tests.
 */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const CONFIG = isNode ? require('./config.js') : root.CQ.CONFIG;
  const STRINGS = isNode ? require('./strings.he.js') : root.CQ.STRINGS;
  const calc = isNode ? require('./calc.js') : root.CQ.calc;
  const format = isNode ? require('./format.js') : root.CQ.format;
  const { format: fill } = isNode ? require('./validate.js') : root.CQ.validate;
  const { buildSummaryLines } = isNode ? require('./summary.js') : root.CQ.summary;

  const T = STRINGS.print;

  // Characters that aren't allowed in file names on phones/computers become spaces.
  function safeFileName(text) {
    return text.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /*
   * state: { quote, result, settings } — a valid quote from the quote form.
   */
  function buildPrintModel({ quote, result, settings }) {
    const { volumeDecimals } = CONFIG.rounding;
    const fileDate = format.formatDate(quote.client.date, 'DD-MM-YYYY');

    return {
      companyName: CONFIG.company.name,
      title: T.docTitle,
      dateText: format.formatDate(quote.client.date),
      clientName: quote.client.name,
      fileName: safeFileName(fill(T.fileName, { client: quote.client.name, date: fileDate })),

      areaColumns: ['index', 'name', 'area', 'thicknessCm', 'volume'].map((key) => T.columns[key]),
      areaRows: quote.areas.map((a, i) => [
        String(i + 1),
        a.name || fill(STRINGS.areaRow, { n: i + 1 }),
        format.formatNumber(a.area, 2),
        format.formatNumber(a.thicknessCm, 2),
        format.formatVolume(calc.round(calc.calcVolume(a.area, a.thicknessCm), volumeDecimals)),
      ]),
      totalVolume: format.formatVolume(result.netVolume),

      summaryLines: buildSummaryLines(result, settings),

      notes: T.notes.map((note) => fill(note, {
        waste: settings.wastePercent,
        validityDays: CONFIG.quote.validityDays,
      })),
    };
  }

  const printModel = { buildPrintModel };

  if (isNode) module.exports = printModel;
  else root.CQ = Object.assign(root.CQ || {}, { printModel });
})(this);
