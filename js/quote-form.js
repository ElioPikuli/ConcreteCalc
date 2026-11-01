/*
 * The quote form: client details, area rows, crew size, and the live price summary.
 * All numbers come from CQ.calc, all checks from CQ.validate; this file only wires the DOM.
 *
 * Errors appear once a field has been left (or after revealAllErrors), so a fresh form
 * isn't covered in red before the user has typed anything.
 */
(function (root) {
  const { CONFIG, STRINGS, calc, validate, format, summary, fields } = root.CQ;
  const { el } = fields;
  const T = STRINGS.quote;

  // The fields of one area row, in display order. Add a field here to add it to every row.
  const ROW_FIELDS = [
    { field: 'name', build: (v, i) => fields.inputField('name', v, i) },
    { field: 'area', build: (v, i) => fields.numberField('area', v, i) },
    { field: 'thicknessCm', build: (v, i) => fields.numberField('thicknessCm', v, i) },
  ];
  const HELPER_FIELDS = ['length', 'width'];   // length × width fills in the area
  const CLIENT_FIELDS = ['clientName', 'date'];

  const emptyRow = () => ({ name: '', area: '', thicknessCm: '', length: '', width: '' });

  function todayISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function issueKey(field, index) {
    return `${field}:${index ?? ''}`;
  }

  /*
   * container:   element to render into
   * getSettings: returns the current validated settings
   * totalBar:    element for the sticky "total" bar on phones
   */
  function initQuoteForm(container, getSettings, totalBar) {
    const touched = new Set();
    let revealAll = false;
    let lastState = null;
    let lastMinWorkers = getSettings().minWorkers;

    // --- Build the static parts ---
    const clientFields = el('div', { class: 'field-grid' }, [
      fields.inputField('clientName', ''),
      fields.inputField('date', todayISO(), undefined, { type: 'date' }),
    ]);
    const rowsEl = el('div', { class: 'area-rows' });
    const addBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-add', text: T.addArea });
    const crewField = fields.numberField('workers', getSettings().minWorkers);
    const crewHint = el('p', { class: 'hint' });
    const totalsEl = el('div', { class: 'totals', 'aria-live': 'polite' });

    container.replaceChildren(
      el('section', { class: 'card' }, [el('h2', { class: 'card-title', text: T.clientTitle }), clientFields]),
      el('section', { class: 'card' }, [el('h2', { class: 'card-title', text: T.areasTitle }), rowsEl, addBtn]),
      el('section', { class: 'card' }, [el('h2', { class: 'card-title', text: T.crewTitle }), crewField, crewHint]),
      el('section', { class: 'card' }, [el('h2', { class: 'card-title', text: T.totalsTitle }), totalsEl]),
    );

    // --- Area rows ---
    function readRows() {
      return [...rowsEl.querySelectorAll('.area-row')].map((_, i) => ({ ...emptyRow(), ...fields.readRowValues(rowsEl, i) }));
    }

    function buildRow(values, index, total) {
      const rowLabel = validate.format(STRINGS.areaRow, { n: index + 1 });
      const removeBtn = el('button', {
        type: 'button',
        class: 'btn-link btn-remove',
        'data-remove': index,
        'aria-label': validate.format(T.removeAreaLabel, { row: rowLabel }),
        text: T.removeArea,
      });
      removeBtn.hidden = total === 1;   // a quote always keeps at least one area

      const helperOpen = Boolean(values.length || values.width);
      const helper = el('details', { class: 'lw-helper' }, [
        el('summary', { text: T.lengthWidthToggle }),
        el('div', { class: 'field-grid' }, HELPER_FIELDS.map((f) => fields.numberField(f, values[f], index))),
      ]);
      helper.open = helperOpen;

      return el('div', { class: 'area-row', 'data-row': index }, [
        el('div', { class: 'area-row-head' }, [el('span', { class: 'area-row-label', text: rowLabel }), removeBtn]),
        el('div', { class: 'field-grid field-grid-3' }, ROW_FIELDS.map(({ field, build }) => build(values[field], index))),
        helper,
        el('p', { class: 'row-volume' }),
      ]);
    }

    function renderRows(rows) {
      rowsEl.replaceChildren(...rows.map((r, i) => buildRow(r, i, rows.length)));
    }

    function addRow() {
      const rows = readRows();
      rows.push(emptyRow());
      renderRows(rows);
      recompute();
      const newRow = rowsEl.lastElementChild;
      newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      newRow.querySelector('input').focus({ preventScroll: true });
    }

    function removeRow(index) {
      const rows = readRows();
      rows.splice(index, 1);
      // Shift "touched" markers so rows after the removed one keep their state.
      const shifted = [...touched].flatMap((key) => {
        const [field, i] = key.split(':');
        if (i === '') return [key];
        const n = Number(i);
        if (n === index) return [];
        return [issueKey(field, n > index ? n - 1 : n)];
      });
      touched.clear();
      shifted.forEach((k) => touched.add(k));
      renderRows(rows);
      recompute();
    }

    // When both length and width are valid numbers, fill in the area for the user.
    function applyLengthWidth(index) {
      const v = fields.readRowValues(rowsEl, index);
      const length = validate.validateField(v.length, 'length').value;
      const width = validate.validateField(v.width, 'width').value;
      if (length && width) {
        const areaInput = rowsEl.querySelector(`[data-field="area"][data-index="${index}"] input`);
        areaInput.value = calc.round(length * width, CONFIG.rounding.volumeDecimals);
        touched.add(issueKey('area', index));
      }
    }

    // --- Reading, validating and showing ---
    function readRaw() {
      const client = fields.readValues(clientFields);
      return {
        areas: readRows().map(({ name, area, thicknessCm }) => ({ name, area, thicknessCm })),
        workers: crewField.querySelector('input').value,
        client: { name: client.clientName, date: client.date },
      };
    }

    // Length/width are optional helpers: only checked when the user typed something.
    function helperIssues() {
      const out = { errors: [], warnings: [] };
      readRows().forEach((row, index) => {
        for (const f of HELPER_FIELDS) {
          if (String(row[f]).trim() === '') continue;
          const r = validate.validateField(row[f], f, { index });
          out.errors.push(...r.errors);
          out.warnings.push(...r.warnings);
        }
      });
      return out;
    }

    function visible(issues) {
      return revealAll ? issues : issues.filter((i) => touched.has(issueKey(i.field, i.index)));
    }

    function renderRowVolumes(quote) {
      quote.areas.forEach((a, i) => {
        const line = rowsEl.querySelector(`[data-row="${i}"] .row-volume`);
        line.textContent = a.area && a.thicknessCm
          ? validate.format(T.rowVolume, { volume: format.formatVolume(calc.round(calc.calcVolume(a.area, a.thicknessCm), CONFIG.rounding.volumeDecimals)) })
          : '';
      });
    }

    function renderTotals(result, settings) {
      if (!result) {
        totalsEl.replaceChildren(el('p', { class: 'hint', text: T.incomplete }));
        crewHint.textContent = '';
        totalBar.hidden = true;
        return;
      }
      const lines = summary.buildSummaryLines(result, settings);
      totalsEl.replaceChildren(el('dl', { class: 'summary' }, lines.flatMap((line) => [
        el('div', { class: `summary-line ${line.emphasis ? `is-${line.emphasis}` : ''}`, 'data-key': line.key }, [
          el('dt', {}, [line.label, ...(line.detail ? [el('span', { class: 'summary-detail', text: line.detail })] : [])]),
          el('dd', { text: line.value }),
        ]),
      ])));
      crewHint.textContent = validate.format(T.crewHint, {
        workers: result.labor.workers,
        days: summary.formatDays(result.labor.days),
        perDay: format.formatNumber(settings.m3PerWorkerDay, 2),
      });
      totalBar.hidden = false;
      totalBar.replaceChildren(
        el('span', { text: T.totalBar }),
        el('strong', { text: format.formatMoney(result.total) }),
      );
    }

    function recompute() {
      const settings = getSettings();
      const raw = readRaw();
      const checked = validate.validateQuote(raw, settings);
      const helper = helperIssues();
      const errors = [...checked.errors, ...helper.errors];
      const warnings = [...checked.warnings, ...helper.warnings];

      fields.showIssues(container, visible(errors), visible(warnings));
      renderRowVolumes(checked.quote);

      // Client name and date only matter for the PDF; the price shows as soon as the job is valid.
      const priceErrors = errors.filter((e) => !CLIENT_FIELDS.includes(e.field));
      const result = priceErrors.length === 0 ? calc.computeQuote(checked.quote, settings) : null;
      renderTotals(result, settings);

      lastState = { ok: Boolean(result) && errors.length === 0, errors, warnings, quote: checked.quote, result, settings };
      return lastState;
    }

    // --- Events ---
    addBtn.addEventListener('click', addRow);

    container.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-remove]');
      if (btn) removeRow(Number(btn.dataset.remove));
    });

    container.addEventListener('input', (event) => {
      const wrapper = event.target.closest('.field');
      if (wrapper && HELPER_FIELDS.includes(wrapper.dataset.field)) applyLengthWidth(Number(wrapper.dataset.index));
      recompute();
    });

    // Leaving a field (or changing a date picker) is when its errors start to show.
    const markTouched = (event) => {
      const wrapper = event.target.closest('.field');
      if (!wrapper) return;
      touched.add(issueKey(wrapper.dataset.field, wrapper.dataset.index !== undefined ? Number(wrapper.dataset.index) : undefined));
      recompute();
    };
    container.addEventListener('focusout', markTouched);
    container.addEventListener('change', markTouched);

    renderRows([emptyRow()]);
    recompute();

    return {
      // Settings changed: keep the crew at the minimum unless the user chose a size.
      onSettingsChange(settings) {
        const workersInput = crewField.querySelector('input');
        if (!touched.has(issueKey('workers')) && Number(workersInput.value) === lastMinWorkers) {
          workersInput.value = settings.minWorkers;
        }
        lastMinWorkers = settings.minWorkers;
        recompute();
      },

      // Shows every error (e.g. before printing) and moves focus to the first one.
      revealAllErrors() {
        revealAll = true;
        const state = recompute();
        const first = container.querySelector('.field.is-error input');
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.focus({ preventScroll: true });
        }
        return state;
      },

      getState: () => lastState,
    };
  }

  root.CQ.initQuoteForm = initQuoteForm;
})(this);
