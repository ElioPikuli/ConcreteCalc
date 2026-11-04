// @ts-check
const { test, expect } = require('@playwright/test');

// Intl formatting may insert invisible direction marks and non-breaking spaces.
const clean = (s) => s.replace(/[‎‏‪-‮]/g, '').replace(/ /g, ' ').trim();

// Locators
const quoteField = (page, field) => page.locator(`#quote [data-field="${field}"]:not([data-index]) input`);
const rowField = (page, field, index) => page.locator(`#quote [data-field="${field}"][data-index="${index}"] input`);
const settingsField = (page, field) => page.locator(`#settings [data-field="${field}"] input`);
const fieldMsg = (page, field, index) => page.locator(index === undefined
  ? `#quote [data-field="${field}"]:not([data-index]) .field-msg`
  : `#quote [data-field="${field}"][data-index="${index}"] .field-msg`);
const summaryValue = async (page, key) => clean(await page.locator(`.summary-line[data-key="${key}"] dd`).innerText());

// Types like a user and leaves the field (that is when errors appear).
async function type(locator, value) {
  await locator.fill(value);
  await locator.blur();
}

async function fillArea(page, index, { name = '', area, thickness }) {
  if (name) await type(rowField(page, 'name', index), name);
  await type(rowField(page, 'area', index), area);
  await type(rowField(page, 'thicknessCm', index), thickness);
}

test.beforeEach(async ({ page }) => {
  // window.print would open a dialog; count calls instead.
  await page.addInitScript(() => {
    window.__printCalls = 0;
    window.print = () => { window.__printCalls += 1; };
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('opens in Hebrew, right-to-left, with sensible defaults and no errors', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  await expect(page.locator('#company-name')).toHaveText('Your Company');
  await expect(quoteField(page, 'workers')).toHaveValue('2');
  const today = await page.evaluate(() => {
    const d = new Date(); const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  await expect(quoteField(page, 'date')).toHaveValue(today);
  await expect(page.locator('.is-error')).toHaveCount(0);
  await expect(page.locator('#total-bar')).toBeHidden();
});

test('no sideways scrolling on a phone screen', async ({ page }) => {
  await fillArea(page, 0, { name: 'סלון ארוך מאוד עם שם ארוך', area: '12345.67', thickness: '25' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('several areas: live totals match the hand calculation', async ({ page }) => {
  await fillArea(page, 0, { name: 'סלון', area: '50', thickness: '10' });
  await page.getByRole('button', { name: '+ הוספת שטח' }).click();
  await fillArea(page, 1, { name: 'מרפסת', area: '150', thickness: '20' });

  // 5 + 30 = 35 m³ net; 37.45 with 7% waste; 2 workers → 35/16 = 2.19 → 3 days.
  expect(await summaryValue(page, 'netVolume')).toBe('35 מ״ק');
  expect(await summaryValue(page, 'orderedVolume')).toBe('37.45 מ״ק');
  expect(await summaryValue(page, 'concrete')).toBe('16,853 ₪');
  expect(await summaryValue(page, 'labor')).toBe('5,400 ₪');
  expect(await summaryValue(page, 'subtotal')).toBe('22,253 ₪');
  expect(await summaryValue(page, 'vat')).toBe('4,006 ₪');
  expect(await summaryValue(page, 'total')).toBe('26,259 ₪');
  await expect(page.locator('#total-bar')).toContainText('26,259');
});

test('a bigger crew finishes in fewer (whole) days', async ({ page }) => {
  await fillArea(page, 0, { area: '200', thickness: '20' });           // 40 m³
  await type(quoteField(page, 'workers'), '4');                        // 40/32 = 1.25 → 2 days
  expect(await summaryValue(page, 'labor')).toBe('7,200 ₪');
  await expect(page.locator('.summary-line[data-key="labor"] .summary-detail')).toContainText('4 עובדים × 2 ימים');
});

test('removing an area updates totals; the last area cannot be removed', async ({ page }) => {
  await fillArea(page, 0, { area: '50', thickness: '10' });
  await page.getByRole('button', { name: '+ הוספת שטח' }).click();
  await fillArea(page, 1, { area: '150', thickness: '20' });
  await page.getByRole('button', { name: 'הסרת שטח 2' }).click();
  await expect(page.locator('.area-row')).toHaveCount(1);
  expect(await summaryValue(page, 'netVolume')).toBe('5 מ״ק');
  await expect(page.getByRole('button', { name: 'הסרת שטח 1' })).toBeHidden();
});

test('length × width fills in the area', async ({ page }) => {
  await page.locator('.lw-helper summary').first().click();
  await type(rowField(page, 'length', 0), '10');
  await type(rowField(page, 'width', 0), '12.5');
  await expect(rowField(page, 'area', 0)).toHaveValue('125');
});

test('zero, negative, empty and text inputs show clear Hebrew errors', async ({ page }) => {
  const cases = [
    ['0', 'עובי (ס״מ) חייב להיות גדול מ-0'],
    ['-5', 'עובי (ס״מ) חייב להיות גדול מ-0'],
    ['abc', 'עובי (ס״מ) חייב להיות מספר (לדוגמה 12.5)'],
    ['', 'נא למלא עובי (ס״מ)'],
  ];
  await type(rowField(page, 'area', 0), '50');
  for (const [input, message] of cases) {
    await type(rowField(page, 'thicknessCm', 0), input);
    await expect(fieldMsg(page, 'thicknessCm', 0)).toHaveText(message);
    await expect(rowField(page, 'thicknessCm', 0)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.totals')).toContainText('הסיכום יוצג כשכל השדות תקינים');
  }
  await type(rowField(page, 'thicknessCm', 0), '10');
  await expect(page.locator('.is-error')).toHaveCount(0);
});

test('fewer workers than the minimum is rejected', async ({ page }) => {
  await type(quoteField(page, 'workers'), '1');
  await expect(fieldMsg(page, 'workers')).toHaveText('מספר העובדים המינימלי הוא 2');
});

test('unusually thick floor warns but still prices the job', async ({ page }) => {
  await fillArea(page, 0, { area: '10', thickness: '150' });
  await expect(page.locator('#quote .field.is-warning')).toHaveCount(1);
  expect(await summaryValue(page, 'netVolume')).toBe('15 מ״ק');
});

test('changing the concrete price updates totals and is remembered', async ({ page }) => {
  await fillArea(page, 0, { area: '50', thickness: '10' });
  expect(await summaryValue(page, 'concrete')).toBe('2,408 ₪');   // 5.35 × 450

  await page.locator('#settings summary').click();
  await settingsField(page, 'pricePerM3').fill('500');
  await page.getByRole('button', { name: 'שמירת הגדרות' }).click();
  await expect(page.locator('#settings .status')).toHaveText('ההגדרות נשמרו');
  expect(await summaryValue(page, 'concrete')).toBe('2,675 ₪');   // 5.35 × 500

  await page.reload();
  await expect(settingsField(page, 'pricePerM3')).toHaveValue('500');
});

test('invalid settings are refused with an error', async ({ page }) => {
  await page.locator('#settings summary').click();
  await settingsField(page, 'pricePerM3').fill('0');
  await page.getByRole('button', { name: 'שמירת הגדרות' }).click();
  await expect(page.locator('#settings .status')).toHaveText('יש לתקן את השדות המסומנים באדום');
  await expect(page.locator('#settings [data-field="pricePerM3"] .field-msg')).toHaveText('מחיר בטון למ״ק חייב להיות גדול מ-0');
});

test.describe('PDF quote', () => {
  test('is blocked until the form is valid, and points at the problem', async ({ page }) => {
    await fillArea(page, 0, { area: '50', thickness: '10' });          // client name still empty
    await page.getByRole('button', { name: 'הפקת הצעת מחיר (PDF)' }).click();
    await expect(page.locator('.print-actions .status')).toHaveText('לא ניתן להפיק הצעה: יש לתקן את השדות המסומנים באדום');
    await expect(fieldMsg(page, 'clientName')).toHaveText('נא למלא שם הלקוח');
    await expect(quoteField(page, 'clientName')).toBeFocused();
    expect(await page.evaluate(() => window.__printCalls)).toBe(0);
  });

  test('header: company name on top, then date, then client; date and client follow the form', async ({ page }) => {
    await type(quoteField(page, 'clientName'), 'יעל לוי');
    await quoteField(page, 'date').fill('2027-01-03');
    await fillArea(page, 0, { name: 'סלון', area: '50', thickness: '10' });
    await page.getByRole('button', { name: 'הפקת הצעת מחיר (PDF)' }).click();
    expect(await page.evaluate(() => window.__printCalls)).toBe(1);

    const header = page.locator('#print-view .pq-header');
    const order = await header.evaluate((h) => [...h.querySelectorAll('.pq-company, .pq-meta dt, .pq-meta dd')].map((n) => n.textContent));
    expect(order).toEqual(['Your Company', 'תאריך', '03/01/2027', 'לכבוד', 'יעל לוי']);

    await expect(page).toHaveTitle('הצעת מחיר - יעל לוי - 03-01-2027');   // becomes the PDF file name
    await expect(page.locator('#print-view .pq-areas tbody tr')).toHaveCount(1);
    await expect(page.locator('#print-view .pq-price tr.is-total')).toContainText('4,965');

    // A second quote for another client replaces the first.
    await type(quoteField(page, 'clientName'), 'משה כהן');
    await page.getByRole('button', { name: 'הפקת הצעת מחיר (PDF)' }).click();
    await expect(page.locator('#print-view .pq-meta')).toContainText('משה כהן');
    await expect(page.locator('#print-view .pq-meta')).not.toContainText('יעל לוי');
  });

  test('when printing, only the quote is on the page', async ({ page }) => {
    await type(quoteField(page, 'clientName'), 'משה כהן');
    await fillArea(page, 0, { area: '50', thickness: '10' });
    await page.getByRole('button', { name: 'הפקת הצעת מחיר (PDF)' }).click();

    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#print-view')).toBeVisible();
    await expect(page.locator('.app-header')).toBeHidden();
    await expect(page.locator('.app-main')).toBeHidden();
    await expect(page.locator('#total-bar')).toBeHidden();

    await page.emulateMedia({ media: 'screen' });
    await expect(page.locator('#print-view')).toBeHidden();
  });

  // Regression: the browser's own print menu printed a blank page, or an outdated quote.
  test("the browser's own print menu prints the current quote, or a clear notice", async ({ page }) => {
    const firePrintMenu = () => page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));

    await firePrintMenu();                                          // nothing filled in yet
    await expect(page.locator('#print-view .pq-not-ready')).toContainText('ההצעה עדיין לא מוכנה');

    await type(quoteField(page, 'clientName'), 'משה כהן');
    await fillArea(page, 0, { area: '50', thickness: '10' });
    await firePrintMenu();                                          // without pressing the button
    await expect(page.locator('#print-view .pq-price tr.is-total')).toContainText('4,965');

    await type(rowField(page, 'area', 0), '100');                   // edit after printing once
    await firePrintMenu();
    await expect(page.locator('#print-view .pq-price tr.is-total')).not.toContainText('4,965');
    await expect(page.locator('#print-view .pq-areas tbody')).toContainText('100');
  });

  test('produces a real PDF file (Chrome only)', async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'page.pdf() is only available in Chromium');
    await type(quoteField(page, 'clientName'), 'משה כהן');
    await quoteField(page, 'date').fill('2026-10-25');
    await fillArea(page, 0, { name: 'סלון', area: '50', thickness: '10' });
    await page.getByRole('button', { name: '+ הוספת שטח' }).click();
    await fillArea(page, 1, { name: 'מרפסת', area: '150', thickness: '20' });
    await page.getByRole('button', { name: 'הפקת הצעת מחיר (PDF)' }).click();

    const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(10_000);
    // Saved so a person can open and review the real output.
    require('node:fs').writeFileSync(testInfo.outputPath('quote.pdf'), pdf);
  });
});

// Regression: an area filled in by the helper went stale when width was cleared.
test('clearing length or width clears an area the helper filled in, not one typed by hand', async ({ page }) => {
  await page.locator('.lw-helper summary').first().click();
  await type(rowField(page, 'length', 0), '10');
  await type(rowField(page, 'width', 0), '5');
  await expect(rowField(page, 'area', 0)).toHaveValue('50');
  await type(rowField(page, 'width', 0), '');
  await expect(rowField(page, 'area', 0)).toHaveValue('');

  await type(rowField(page, 'area', 0), '42');                 // typed by hand
  await type(rowField(page, 'length', 0), '3');
  await expect(rowField(page, 'area', 0)).toHaveValue('42');
});

// Regression: unsaved settings edits were silently ignored.
test('unsaved settings edits are flagged and not used until saved', async ({ page }) => {
  await fillArea(page, 0, { area: '50', thickness: '10' });
  await page.locator('#settings summary').click();
  await settingsField(page, 'pricePerM3').fill('500');
  await expect(page.locator('#settings .status')).toContainText('יש שינויים שלא נשמרו');
  await expect(page.locator('.settings-summary')).toContainText('לא נשמר');
  expect(await summaryValue(page, 'concrete')).toBe('2,408 ₪');   // still the saved 450

  await page.getByRole('button', { name: 'שמירת הגדרות' }).click();
  await expect(page.locator('.settings-summary')).not.toContainText('לא נשמר');
  expect(await summaryValue(page, 'concrete')).toBe('2,675 ₪');
});

test('user guide opens from the header and links back', async ({ page }) => {
  await page.getByRole('link', { name: 'מדריך שימוש' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('מדריך שימוש');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('link', { name: '→ חזרה למחשבון' }).first().click();
  await expect(page.locator('#app-title')).toHaveText('מחשבון הצעת מחיר');
});

test('home-screen manifest and icons are served', async ({ page, request }) => {
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(`/${manifestHref}`)).json();
  expect(manifest.dir).toBe('rtl');
  for (const icon of [...manifest.icons.map((i) => i.src), 'icons/apple-touch-icon.png']) {
    expect((await request.get(`/${icon}`)).status(), icon).toBe(200);
  }
});
