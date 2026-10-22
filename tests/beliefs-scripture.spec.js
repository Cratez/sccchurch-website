/**
 * FEATURE: Clickable scripture references on the Statement of Faith page. Clicking one loads
 *          the KJV text from bible-api.com into a panel with Bible Gateway links (NKJV/ESV/NIV).
 * COVERS:  assets/js/beliefs.js (load/show/click handling), the .passage styles in assets/css/beliefs.css
 * WHY:     This is the most complex code on the site: network requests, caching, error
 *          handling, and opening/closing panels. bible-api.com is faked here; the real API is
 *          checked by tests/live/scripture-refs.spec.js.
 * UPDATE WHEN: the lookup service, translation, or panel layout changes.
 * REMOVE WHEN: scripture references stop loading text on the page.
 */
const { test, expect } = require('./support/fixtures');

const godSection = (page) => page.locator('#god');
const refButton = (page, ref) => page.locator(`.ref[data-ref="${ref}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto('beliefs.html');
});

test('clicking a reference shows the passage with verse numbers and Bible Gateway links', async ({ page, bibleApi }) => {
  await refButton(page, 'Genesis 1:26').click();
  const panel = godSection(page).locator('.passage');

  await expect(panel).toBeVisible();
  await expect(panel.locator('h3')).toHaveText('Genesis 1:26');
  await expect(panel.locator('sup')).toHaveText(['1', '2']);
  // Extra whitespace from the API is cleaned up.
  await expect(panel.locator('.pt')).toContainText('In the beginning was the Word, 2and the Word was with God.');
  await expect(panel.locator('.pf')).toContainText('King James Version · Public Domain');
  await expect(refButton(page, 'Genesis 1:26')).toHaveAttribute('aria-expanded', 'true');

  const links = panel.locator('.pf a');
  await expect(links).toHaveText(['NKJV', 'ESV', 'NIV']);
  for (const v of ['NKJV', 'ESV', 'NIV']) {
    const link = panel.locator('.pf a', { hasText: v });
    await expect(link).toHaveAttribute('href', `https://www.biblegateway.com/passage/?search=Genesis%201%3A26&version=${v}`);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
  }

  expect(bibleApi.requests).toHaveLength(1);
  expect(bibleApi.requests[0].searchParams.get('translation')).toBe('kjv');
});

test('references with commas and spaces are sent in the format the API expects', async ({ page, bibleApi }) => {
  await refButton(page, 'John 1:14, 17,18').click();
  await expect(page.locator('#christ .passage h3')).toBeVisible();
  expect(bibleApi.requests[0].pathname).toBe('/John+1:14,17,18');
});

test('clicking the same reference again closes the panel', async ({ page }) => {
  const btn = refButton(page, 'Genesis 1:26');
  await btn.click();
  await expect(godSection(page).locator('.passage h3')).toBeVisible();
  await btn.click();
  await expect(godSection(page).locator('.passage')).toBeHidden();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
});

test('the Close button hides the panel and returns focus to the reference', async ({ page }) => {
  const btn = refButton(page, 'Genesis 1:26');
  await btn.click();
  await godSection(page).locator('.passage').getByRole('button', { name: 'Close' }).click();
  await expect(godSection(page).locator('.passage')).toBeHidden();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(btn).toBeFocused();
});

test('clicking a different reference in the same section switches the panel to it', async ({ page }) => {
  await refButton(page, 'Genesis 1:26').click();
  await refButton(page, 'Deuteronomy 6:4').click();
  await expect(godSection(page).locator('.passage h3')).toHaveText('Deuteronomy 6:4');
  await expect(refButton(page, 'Genesis 1:26')).toHaveAttribute('aria-expanded', 'false');
  await expect(refButton(page, 'Deuteronomy 6:4')).toHaveAttribute('aria-expanded', 'true');
});

test('a slow earlier lookup never overwrites the reference picked after it', async ({ page, bibleApi }) => {
  bibleApi.respond(async (url) => {
    const ref = decodeURIComponent(url.pathname.slice(1)).replace(/\+/g, ' ');
    if (ref === 'Genesis 1:26') await new Promise((r) => setTimeout(r, 800));
    return { status: 200, json: { reference: ref, verses: [{ verse: 1, text: ref }], translation_name: 'KJV' } };
  });
  await refButton(page, 'Genesis 1:26').click();
  await refButton(page, 'Deuteronomy 6:4').click();
  await expect(godSection(page).locator('.passage h3')).toHaveText('Deuteronomy 6:4');
  await page.waitForTimeout(1200); // let the slow Genesis response arrive
  await expect(godSection(page).locator('.passage h3')).toHaveText('Deuteronomy 6:4');
});

test('reopening a passage uses the saved copy instead of asking the API again', async ({ page, bibleApi }) => {
  const btn = refButton(page, 'Genesis 1:26');
  await btn.click();
  await expect(godSection(page).locator('.passage h3')).toBeVisible();
  await btn.click();
  await btn.click();
  await expect(godSection(page).locator('.passage h3')).toBeVisible();
  expect(bibleApi.requests).toHaveLength(1);
});

for (const [name, response] of [
  ['the API returns an error', { status: 500, body: 'oops' }],
  ['the API returns no verses', { status: 200, json: { verses: [] } }],
]) {
  test(`when ${name}, shows a Bible Gateway link instead`, async ({ page, bibleApi }) => {
    bibleApi.respond(() => response);
    await refButton(page, 'Genesis 1:26').click();
    const panel = godSection(page).locator('.passage');
    await expect(panel).toContainText('We couldn’t load this passage.');
    await expect(panel.getByRole('link', { name: 'Read it on Bible Gateway' }))
      .toHaveAttribute('href', 'https://www.biblegateway.com/passage/?search=Genesis%201%3A26&version=NKJV');
  });
}
