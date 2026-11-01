/*
 * Entry point: wires the page sections together.
 */
(function (root) {
  const { CONFIG, STRINGS } = root.CQ;

  document.title = `${STRINGS.app.title} – ${CONFIG.company.name}`;
  document.getElementById('company-name').textContent = CONFIG.company.name;
  document.getElementById('app-title').textContent = STRINGS.app.title;

  const store = root.CQ.settings.createSettingsStore(root.CQ.settings.browserStorage());
  let quoteForm = null;

  const settingsPanel = root.CQ.initSettingsPanel(document.getElementById('settings'), store, (settings) => {
    if (quoteForm) quoteForm.onSettingsChange(settings);
  });

  quoteForm = root.CQ.initQuoteForm(
    document.getElementById('quote'),
    settingsPanel.getSettings,
    document.getElementById('total-bar'),
  );

  const print = root.CQ.initPrint(
    document.getElementById('print-actions'),
    document.getElementById('print-view'),
    quoteForm,
  );

  // Exposed for debugging in the browser console.
  root.CQ.app = { quoteForm, settingsPanel, print };
})(this);
