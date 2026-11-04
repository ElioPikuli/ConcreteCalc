/*
 * All business numbers and fixed details live here. Change behaviour by editing this
 * file, never by hunting for numbers in the logic.
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.CONFIG) and via require() in tests.
 */
(function (root) {
  const CONFIG = {
    company: {
      // Fixed on every quote; not editable from the UI.
      name: 'Your Company',
    },

    // Starting values for the editable settings screen. The user can change these on the device.
    defaults: {
      pricePerM3: 450,      // ₪ per m³ before VAT. Only the starting value: the user edits it in the app.
      wastePercent: 7,
      vatPercent: 18,
      workerDayRate: 900,   // ₪ per worker per day
      m3PerWorkerDay: 8,    // how much one worker pours in a day
      minWorkers: 2,
    },

    labor: {
      // Workers pour the net volume; waste is only extra concrete ordered.
      // Set to true if labor should be priced on the ordered (with waste) volume.
      includeWaste: false,
    },

    /*
     * Input rules. Every number must be greater than 0. `integer` rejects fractions.
     * `warnAbove` / `warnBelow` don't block; they flag a likely typo or wrong unit
     * (e.g. 150 cm instead of 15 cm, or 0.1 typed in meters instead of 10 cm).
     */
    limits: {
      area:           { warnBelow: 1, warnAbove: 5000 },  // m²
      length:         { warnAbove: 200 },   // m
      width:          { warnAbove: 200 },   // m
      thicknessCm:    { warnBelow: 3, warnAbove: 100 },
      workers:        { integer: true, warnAbove: 30 },
      pricePerM3:     { warnAbove: 2000 },
      wastePercent:   { warnAbove: 20 },
      vatPercent:     { warnAbove: 30 },
      workerDayRate:  { warnAbove: 5000 },
      m3PerWorkerDay: { warnAbove: 50 },
      minWorkers:     { integer: true, warnAbove: 30 },
    },

    rounding: {
      volumeDecimals: 2,    // m³ shown and charged to 2 decimals
      moneyDecimals: 0,     // whole shekels
    },

    storage: {
      // Bump the version if the settings format ever changes incompatibly.
      settingsKey: 'concrete-quote.settings.v1',
    },

    quote: {
      validityDays: 14,        // shown in the notes of the client quote
      dateFormat: 'DD/MM/YYYY',
    },

    currency: '₪',
    locale: 'he-IL',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else root.CQ = Object.assign(root.CQ || {}, { CONFIG });
})(this);
