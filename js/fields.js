/*
 * Shared DOM helpers for form fields: building inputs from CONFIG/STRINGS and showing
 * validation issues under the right input. Used by the settings panel and the quote form.
 */
(function (root) {
  const { CONFIG, STRINGS } = root.CQ;

  let nextId = 0;

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) node.append(child);
    return node;
  }

  /*
   * A labelled input with a message line under it. `index` marks fields inside an area row.
   * attrs are extra <input> attributes (type, inputmode, placeholder…).
   */
  function inputField(field, value, index, attrs = {}) {
    const id = `f-${field}-${nextId++}`;
    const placeholder = STRINGS.placeholders && STRINGS.placeholders[field];
    const input = el('input', {
      id,
      name: field,
      type: 'text',
      autocomplete: 'off',
      'aria-describedby': `${id}-msg`,
      ...(placeholder ? { placeholder } : {}),
      ...attrs,
    });
    input.value = value ?? '';
    const wrapper = el('div', { class: 'field', 'data-field': field }, [
      el('label', { for: id, text: STRINGS.fields[field] }),
      input,
      el('p', { id: `${id}-msg`, class: 'field-msg', 'aria-live': 'polite' }),
    ]);
    if (index !== undefined) wrapper.dataset.index = index;
    return wrapper;
  }

  // Integer fields get a digits-only phone keyboard; others get one with a decimal point.
  function numberField(field, value, index) {
    const integer = Boolean(CONFIG.limits[field] && CONFIG.limits[field].integer);
    return inputField(field, value, index, { inputmode: integer ? 'numeric' : 'decimal' });
  }

  function findField(container, issue) {
    const selector = issue.index !== undefined
      ? `[data-field="${issue.field}"][data-index="${issue.index}"]`
      : `[data-field="${issue.field}"]:not([data-index])`;
    return container.querySelector(selector);
  }

  // Clears old messages, then marks each field with its first error (or warning).
  function showIssues(container, errors = [], warnings = []) {
    for (const field of container.querySelectorAll('.field')) {
      field.classList.remove('is-error', 'is-warning');
      field.querySelector('.field-msg').textContent = '';
      const input = field.querySelector('input');
      if (input) input.removeAttribute('aria-invalid');
    }
    const apply = (issue, cls) => {
      const field = findField(container, issue);
      if (!field || field.classList.contains('is-error')) return;
      field.classList.add(cls);
      field.querySelector('.field-msg').textContent = issue.message;
      if (cls === 'is-error') field.querySelector('input')?.setAttribute('aria-invalid', 'true');
    };
    errors.forEach((e) => apply(e, 'is-error'));
    warnings.forEach((w) => apply(w, 'is-warning'));
  }

  // Reads { field: value } from the fields directly inside `container` (area-row fields excluded).
  function readValues(container) {
    const values = {};
    for (const field of container.querySelectorAll('.field:not([data-index])')) {
      const input = field.querySelector('input');
      if (input) values[field.dataset.field] = input.value;
    }
    return values;
  }

  // Same, for the fields of one area row.
  function readRowValues(container, index) {
    const values = {};
    for (const field of container.querySelectorAll(`.field[data-index="${index}"]`)) {
      values[field.dataset.field] = field.querySelector('input').value;
    }
    return values;
  }

  root.CQ.fields = { el, inputField, numberField, showIssues, readValues, readRowValues };
})(this);
