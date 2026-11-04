/*
 * The "הפקת הצעת מחיר (PDF)" button and the printable quote.
 *
 * Uses the browser's own print → "Save as PDF" (on phones: print → share/save). This keeps
 * Hebrew text and right-to-left layout exactly as on screen, with no PDF library to maintain.
 * The page's <title> is set to the file name while printing, which browsers use for the PDF name.
 */
(function (root) {
  const { STRINGS, printModel, fields } = root.CQ;
  const { el } = fields;
  const T = STRINGS.print;

  function renderQuote(m) {
    const table = (cls, head, rows, foot) => el('table', { class: cls }, [
      el('thead', {}, el('tr', {}, head.map((h) => el('th', { text: h })))),
      el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', { text: c }))))),
      ...(foot ? [el('tfoot', {}, el('tr', {}, foot.map((c) => el('td', c))))] : []),
    ]);

    const priceRows = m.summaryLines.map((line) => el('tr', { class: line.emphasis ? `is-${line.emphasis}` : '' }, [
      el('td', {}, [line.label, ...(line.detail ? [el('span', { class: 'pq-detail', text: line.detail })] : [])]),
      el('td', { class: 'pq-amount', text: line.value }),
    ]));

    return el('article', { class: 'pq' }, [
      el('header', { class: 'pq-header' }, [
        el('div', { class: 'pq-company', text: m.companyName }),
        el('dl', { class: 'pq-meta' }, [
          el('div', {}, [el('dt', { text: T.date }), el('dd', { text: m.dateText })]),
          el('div', {}, [el('dt', { text: T.client }), el('dd', { text: m.clientName })]),
        ]),
      ]),
      el('h1', { class: 'pq-title', text: m.title }),

      el('section', { class: 'pq-section' }, [
        el('h2', { text: T.areasTitle }),
        table('pq-table pq-areas', m.areaColumns, m.areaRows,
          [{ colspan: m.areaColumns.length - 1, text: T.totalVolume }, { text: m.totalVolume }]),
      ]),

      el('section', { class: 'pq-section' }, [
        el('h2', { text: T.priceTitle }),
        el('table', { class: 'pq-table pq-price' }, el('tbody', {}, priceRows)),
      ]),

      el('section', { class: 'pq-section pq-notes' }, [
        el('h2', { text: T.notesTitle }),
        el('ul', {}, m.notes.map((n) => el('li', { text: n }))),
      ]),

      el('footer', { class: 'pq-footer' }, [el('span', { text: T.closing }), el('strong', { text: m.companyName })]),
    ]);
  }

  /*
   * actionsContainer: where the button goes
   * printRoot:        element that holds the printable quote (hidden on screen)
   * quoteForm:        from CQ.initQuoteForm
   */
  function initPrint(actionsContainer, printRoot, quoteForm) {
    const status = el('p', { class: 'status', role: 'status' });
    const button = el('button', { type: 'button', class: 'btn btn-primary btn-print', text: T.button });
    actionsContainer.replaceChildren(el('section', { class: 'card print-actions' }, [
      button,
      el('p', { class: 'hint', text: T.buttonHint }),
      status,
    ]));

    const screenTitle = document.title;

    // Fills the printable area from the form as it is right now. Returns false if not ready.
    function prepare(state) {
      if (!state.ok) {
        printRoot.replaceChildren(el('p', { class: 'pq-not-ready', text: T.notReady }));
        return false;
      }
      const model = printModel.buildPrintModel(state);
      printRoot.replaceChildren(renderQuote(model));
      document.title = model.fileName;
      return true;
    }

    // The browser's own print menu (⌘P, Share → Print) must never print a blank or outdated quote.
    root.addEventListener('beforeprint', () => prepare(quoteForm.getState()));
    root.addEventListener('afterprint', () => { document.title = screenTitle; });

    button.addEventListener('click', () => {
      const state = quoteForm.revealAllErrors();
      if (!state.ok) {
        status.textContent = T.fixFirst;
        status.className = 'status status-error';
        return;
      }
      status.textContent = '';
      if (prepare(state)) root.print();
    });

    // Typing again clears the "fix first" message.
    root.document.getElementById('quote').addEventListener('input', () => { status.textContent = ''; });

    return { renderQuote };
  }

  root.CQ.initPrint = initPrint;
})(this);
