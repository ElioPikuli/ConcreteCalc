# Concrete Quote Calculator

A Hebrew (RTL), mobile-first web tool that prices concrete jobs and produces a PDF quote for the client.
Plain HTML/CSS/JavaScript: no build step, no server code, no dependencies at runtime.

- **Users:** see the Hebrew guide in [help.html](help.html) (also linked from the app header).
- **Version:** 1.0. Saved quote history is planned for 2.0.

## How the price is calculated

| Item | Rule | Where |
|---|---|---|
| Volume | area (m²) × thickness (cm) ÷ 100, summed over all areas | `calcVolume` in `js/calc.js` |
| Concrete | (volume + waste %) × price per m³ | `applyWaste` |
| Labor days | net volume ÷ (workers × m³ per worker per day), **rounded up** to whole days | `calcLaborDays` |
| Labor cost | workers × days × day rate (min. workers enforced) | `calcLaborCost` |
| VAT | % of (concrete + labor) | `calcVat` |

Money is rounded to whole shekels per line, so printed lines always add up to the printed totals.
Volumes are rounded to 2 decimals.

## Where to change things

| To change… | Edit |
|---|---|
| Company name on the quote | `company.name` in `js/config.js` |
| Default prices, waste, VAT, day rate, m³/worker/day, min. workers | `defaults` in `js/config.js` (users can also edit them in the app) |
| Whether labor includes waste volume | `labor.includeWaste` in `js/config.js` |
| Typo-warning thresholds, integer-only fields | `limits` in `js/config.js` |
| Quote validity days, date format | `quote` in `js/config.js` |
| Any Hebrew wording (labels, errors, PDF notes) | `js/strings.he.js` |
| A pricing rule | the matching small function in `js/calc.js` (and its test) |
| Lines in the price summary (screen + PDF) | `js/summary.js` |
| Fields in each area row | `ROW_FIELDS` in `js/quote-form.js` |
| PDF layout and look | `js/print.js` and the "Client quote (PDF)" section of `css/style.css` |
| Colors, sizes | the `:root` tokens at the top of `css/style.css` |

Adding a new setting (e.g. a pump fee): add it to `defaults` (and `limits`), add its label in `strings.he.js`,
use it in `calc.js`, and add a line in `summary.js`. The settings screen and validation pick it up automatically.

## Project layout

```
index.html            app page (scripts load in order; plain scripts so it also works from a local file)
help.html             Hebrew user guide
manifest.webmanifest  "Add to home screen" support; icons in icons/
css/style.css         mobile-first styles + A4 print styles for the PDF
js/config.js          all numbers and fixed details
js/strings.he.js      all Hebrew text
js/calc.js            pure pricing logic
js/validate.js        input parsing and Hebrew errors/warnings
js/settings.js        load/save/reset settings (localStorage, safe when blocked)
js/format.js          number, money and date display
js/summary.js         price summary lines (shared by screen and PDF)
js/print-model.js     content of the client quote
js/fields.js          shared form-field DOM helpers
js/settings-panel.js  settings UI
js/quote-form.js      quote form UI and live totals
js/print.js           PDF button and quote layout
js/app.js             wires everything together
tests/*.test.js       unit tests (node --test)
tests/e2e/            Playwright tests on iPhone (WebKit) and Android (Chromium) profiles
```

## Running and testing

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Tests (Node 20+):

```bash
npm install
npx playwright install chromium webkit
npm run test:all
```

- `npm test`: unit tests (calculation, validation, settings, summary, PDF content).
- `npm run test:e2e`: browser tests at phone size. The Chrome run also saves a sample PDF under `test-results/`.

## Deploying

It's a static site, so any static host works.

**Vercel:** import this repository at vercel.com/new and press Deploy. `vercel.json` tells Vercel there is
nothing to install or build and to serve the folder as-is. Every push to `main` redeploys automatically.

**GitHub Pages:**

```bash
gh repo create my-quote-calculator --public --source . --push
gh api -X POST repos/{owner}/my-quote-calculator/pages -f "source[branch]=main" -f "source[path]=/"
```

The site appears at `https://<user>.github.io/my-quote-calculator/` within a minute or two.
The test files and `package.json` are harmless on the live site (they are never loaded by the app).

## Notes

- Settings are stored per device/browser (localStorage). A price change must be made on each phone.
- The PDF uses the browser's print → "Save as PDF" / share, which keeps Hebrew text and RTL layout exact.
