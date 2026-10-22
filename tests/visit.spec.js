/**
 * FEATURE: The "Plan your visit" page (banner, questions, Sunday steps, Sunday School, where we are,
 *          other ways to join).
 * COVERS:  visit.html, assets/css/visit.css, assets/img/photos/trillium-*
 * WHY:     First-time visitors rely on this page. It is hand-written HTML, so a broken banner photo,
 *          a lost question, a reordered step or a wrong map/phone link would go unnoticed.
 *          (Service times on this page are checked in service-times.spec.js.)
 * UPDATE WHEN: the questions, steps or contact links change on purpose (edit the lists below).
 * REMOVE WHEN: the page is removed.
 */
const { test, expect } = require('./support/fixtures');

const MAPS = 'https://maps.google.com/?cid=1658989575399774330';

test.beforeEach(async ({ page }) => {
  await page.goto('visit.html');
});

test('banner photo loads and the heading is shown over it', async ({ page }) => {
  const img = page.locator('.photo-hero img');
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What to expect on a Sunday morning');
});

test('questions are the three expected, in order, each with an answer', async ({ page }) => {
  const rows = page.locator('dl.faq > div');
  await expect(rows).toHaveCount(3);
  await expect(rows.locator('dt')).toHaveText(['What should I wear?', 'How long is the service?', 'Is there Sunday School?']);
  for (let i = 0; i < 3; i++) {
    expect((await rows.nth(i).locator('dd').innerText()).trim().length).toBeGreaterThan(0);
  }
});

test('Sunday steps are an ordered list of five', async ({ page }) => {
  const steps = page.locator('ol.steps > li');
  await expect(steps).toHaveCount(5);
  await expect(steps.locator('h3')).toHaveText(['Welcome and prayer', 'Singing', 'Announcements and prayer', 'The sermon', 'Closing']);
});

test('Sunday School section comes right after the Sunday steps and describes the classes', async ({ page }) => {
  const ids = await page.locator('main > section').evaluateAll((s) => s.map((x) => x.id));
  expect(ids.indexOf('sunday-school')).toBe(ids.indexOf('sunday') + 1);
  const section = page.locator('#sunday-school');
  await expect(section.locator('h2')).toHaveText('Sunday School');
  await expect(section).toContainText('There are three classes: two for adults and one for children.');
  await expect(section).toContainText('a survey of the whole Bible, a study of one book');
  // The Sunday School answer in the questions links down to this section.
  await expect(page.locator('dl.faq dd a[href="#sunday-school"]:visible')).toHaveCount(1);
});

for (const [season, sentence] of [
  ['school-year', 'Sunday School meets at 9:30 am, the hour before the Church Service, from September to early June.'],
  ['summer', 'Sunday School takes a break over the summer and starts again in September.'],
]) {
  test(`Sunday School section opens with the ${season} sentence`, async ({ page }) => {
    await page.route('**/assets/js/season.js', (route) => route.fulfill({
      contentType: 'text/javascript', body: `document.documentElement.dataset.season = '${season}';`,
    }));
    await page.reload();
    const first = page.locator('#sunday-school .prose p:visible').first();
    await expect(first).toContainText(sentence);
  });
}

test('"Where we are" names Molalla and links to Maps and the phone', async ({ page }) => {
  const where = page.locator('#where');
  await expect(where).toContainText('Molalla');
  await expect(where.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute('href', MAPS);
  await expect(where.getByRole('link', { name: /Call \(503\) 651-3707/ })).toHaveAttribute('href', 'tel:+15036513707');
});

test('"Can\'t make it in person?" offers radio and a link to the Sermons page', async ({ page }) => {
  const remote = page.locator('#remote');
  await expect(remote.locator('.cols > *')).toHaveCount(2);
  await expect(remote).toContainText('96.7 FM');
  const watch = remote.locator('.cols > *', { hasText: 'Watch online' });
  await expect(watch.getByRole('link')).toHaveAttribute('href', 'sermons.html');
});

test('page does not scroll sideways', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
