/*
 * Turns raw form input (strings) into clean numbers, or into Hebrew error messages.
 * Pure: no DOM. Rules come from CONFIG.limits, wording from STRINGS.
 *
 * Every error/warning has the shape { field, index?, rowLabel?, code, message }
 * so the UI can show it under the right input, or in a list.
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.validate) and via require() in tests.
 */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const CONFIG = isNode ? require('./config.js') : root.CQ.CONFIG;
  const STRINGS = isNode ? require('./strings.he.js') : root.CQ.STRINGS;

  const NUMBER_PATTERN = /^-?(\d+\.?\d*|\.\d+)$/;
  const THOUSANDS_PATTERN = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;   // the format <input type="date"> produces

  function format(template, params) {
    return template.replace(/\{(\w+)\}/g, (_, key) => (key in params ? params[key] : `{${key}}`));
  }

  // Accepts "12.5", "12,5" (comma decimal) and "1,250" (thousands). Anything else → NaN.
  function parseNumber(raw) {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
    if (typeof raw !== 'string') return NaN;
    let text = raw.trim();
    if (THOUSANDS_PATTERN.test(text)) text = text.replace(/,/g, '');
    else if ((text.match(/,/g) || []).length === 1) text = text.replace(',', '.');
    return NUMBER_PATTERN.test(text) ? Number(text) : NaN;
  }

  function isBlank(raw) {
    return raw === undefined || raw === null || String(raw).trim() === '';
  }

  function makeIssue(kind, code, field, params, where) {
    const label = STRINGS.fields[field] || field;
    const issue = { field, code, message: format(STRINGS[kind][code], { field: label, ...params }) };
    if (where && where.index !== undefined) {
      issue.index = where.index;
      issue.rowLabel = format(STRINGS.areaRow, { n: where.index + 1 });
    }
    return issue;
  }

  /*
   * Checks one numeric field. Stops at the first problem so the user sees one clear message.
   * Returns the parsed value, or null when it is invalid.
   */
  function checkNumber(raw, field, out, where, extra = {}) {
    const rule = CONFIG.limits[field] || {};
    const fail = (code, params) => { out.errors.push(makeIssue('errors', code, field, params, where)); return null; };

    if (isBlank(raw)) return fail('required');
    const value = parseNumber(raw);
    if (Number.isNaN(value)) return fail('notNumber');
    if (value <= 0) return fail('notPositive');
    if (rule.integer && !Number.isInteger(value)) return fail('notInteger');
    if (extra.min !== undefined && value < extra.min) return fail(extra.minCode, { min: extra.min });

    if (rule.warnAbove !== undefined && value > rule.warnAbove) {
      out.warnings.push(makeIssue('warnings', 'unusuallyHigh', field, { value }, where));
    }
    return value;
  }

  function isRealDate(text) {
    if (!DATE_PATTERN.test(text)) return false;
    const [y, m, d] = text.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }

  /*
   * raw:      { areas: [{ name, area, thicknessCm }], workers, client: { name, date } }
   * settings: already-validated settings (needed for minWorkers)
   * Returns { ok, errors, warnings, quote } where quote holds parsed numbers.
   */
  function validateQuote(raw, settings) {
    const out = { errors: [], warnings: [] };
    const areas = raw.areas || [];

    if (areas.length === 0) out.errors.push(makeIssue('errors', 'noAreas', 'areas'));

    const parsedAreas = areas.map((a, index) => ({
      name: (a.name || '').trim(),
      area: checkNumber(a.area, 'area', out, { index }),
      thicknessCm: checkNumber(a.thicknessCm, 'thicknessCm', out, { index }),
    }));

    const workers = checkNumber(raw.workers, 'workers', out, undefined,
      { min: settings.minWorkers, minCode: 'belowMinWorkers' });

    const client = raw.client || {};
    const clientName = (client.name || '').trim();
    const date = (client.date || '').trim();
    if (!clientName) out.errors.push(makeIssue('errors', 'required', 'clientName'));
    if (!date) out.errors.push(makeIssue('errors', 'required', 'date'));
    else if (!isRealDate(date)) out.errors.push(makeIssue('errors', 'invalidDate', 'date'));

    return {
      ok: out.errors.length === 0,
      errors: out.errors,
      warnings: out.warnings,
      quote: { areas: parsedAreas, workers, client: { name: clientName, date } },
    };
  }

  // Validates every field listed in CONFIG.defaults, so a new setting only needs adding there.
  function validateSettings(raw) {
    const out = { errors: [], warnings: [] };
    const settings = {};
    for (const field of Object.keys(CONFIG.defaults)) {
      settings[field] = checkNumber(raw[field], field, out);
    }
    return { ok: out.errors.length === 0, errors: out.errors, warnings: out.warnings, settings };
  }

  // One numeric input on its own, e.g. the length × width helper. `where` marks an area row.
  function validateField(raw, field, where) {
    const out = { errors: [], warnings: [] };
    const value = checkNumber(raw, field, out, where);
    return { value, errors: out.errors, warnings: out.warnings };
  }

  const validate = { format, parseNumber, validateQuote, validateSettings, validateField };

  if (isNode) module.exports = validate;
  else root.CQ = Object.assign(root.CQ || {}, { validate });
})(this);
