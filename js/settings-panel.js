/*
 * The collapsible "הגדרות מחירים" panel. Its fields are generated from CONFIG.defaults,
 * so adding a setting there adds it here automatically.
 */
(function (root) {
  const { CONFIG, STRINGS, format, fields } = root.CQ;
  const { el } = fields;
  const T = STRINGS.settings;

  function summaryText(s) {
    return root.CQ.validate.format(T.summary, {
      price: format.formatMoney(s.pricePerM3),
      rate: format.formatMoney(s.workerDayRate),
    });
  }

  /*
   * store:    from CQ.settings.createSettingsStore
   * onChange: called with the new settings after a successful save or reset
   */
  function initSettingsPanel(container, store, onChange = () => {}) {
    let current = store.load();

    const summaryLine = el('span', { class: 'settings-summary' });
    const status = el('p', { class: 'status', role: 'status' });
    const grid = el('div', { class: 'field-grid' },
      Object.keys(CONFIG.defaults).map((field) => fields.numberField(field, current[field])));
    const saveBtn = el('button', { type: 'submit', class: 'btn btn-primary', text: T.save });
    const resetBtn = el('button', { type: 'button', class: 'btn btn-secondary', text: T.reset });
    const form = el('form', { novalidate: '' }, [grid, el('div', { class: 'actions' }, [saveBtn, resetBtn]), status]);

    const details = el('details', { class: 'card settings' }, [
      el('summary', {}, [el('span', { class: 'card-title', text: T.title }), summaryLine]),
      form,
    ]);
    container.replaceChildren(details);

    function setStatus(text, kind) {
      status.textContent = text;
      status.className = `status ${kind ? `status-${kind}` : ''}`;
    }

    let dirty = false;

    function refresh() {
      summaryLine.textContent = dirty ? `${summaryText(current)} · ${T.unsavedBadge}` : summaryText(current);
      details.classList.toggle('has-unsaved', dirty);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = store.save(fields.readValues(grid));
      fields.showIssues(grid, result.errors, result.warnings);
      if (!result.ok) {
        setStatus(T.fixErrors, 'error');
        return;
      }
      current = result.settings;
      dirty = false;
      refresh();
      setStatus(result.persisted ? T.saved : T.savedNotPersisted, result.persisted ? 'ok' : 'warning');
      onChange(current);
    });

    resetBtn.addEventListener('click', () => {
      if (!root.confirm(T.resetConfirm)) return;
      current = store.reset();
      for (const field of Object.keys(current)) {
        grid.querySelector(`[data-field="${field}"] input`).value = current[field];
      }
      fields.showIssues(grid);
      dirty = false;
      refresh();
      setStatus(T.resetDone, 'ok');
      onChange(current);
    });

    // Edits only apply after "Save", so say clearly that they are not in use yet.
    grid.addEventListener('input', () => {
      dirty = true;
      refresh();
      setStatus(T.unsaved, 'warning');
    });

    refresh();
    return { getSettings: () => ({ ...current }) };
  }

  root.CQ.initSettingsPanel = initSettingsPanel;
})(this);
