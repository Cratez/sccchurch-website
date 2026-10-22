/**
 * FEATURE: Sermons page. Recent-service cards and expandable sermon series, built in the
 *          browser from data/sermons.json.
 * COVERS:  sermons.html, assets/js/sermons.js, assets/css/sermons.css
 *          (uses tests/fixtures/sermons.json instead of the real data, so results don't change
 *          when the daily job updates data/sermons.json)
 * WHY:     The page is built entirely from data; missing fields, date handling, and failed loads
 *          must all still produce a sensible page.
 * UPDATE WHEN: the page layout or the sermons.json format changes (update the fixture too).
 * REMOVE WHEN: the Sermons page is removed.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./support/fixtures');

const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sermons.json'), 'utf8'));
const serve = (page, body, status = 200) => page.route('**/data/sermons.json', (route) =>
  route.fulfill({ status, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) }));

test.describe('with data', () => {
  test.beforeEach(async ({ page }) => {
    await serve(page, FIXTURE);
    await page.goto('sermons.html');
  });

  test('shows the 6 recent services newest first, with dates that never shift a day', async ({ page }) => {
    const cards = page.locator('#recent .video-card');
    await expect(cards).toHaveCount(6);
    await expect(cards.locator('.date')).toHaveText([
      /^Sunday, October 25, 2026/, 'Sunday, October 18, 2026', 'Sunday, October 11, 2026',
      'Sunday, October 4, 2026', 'Sunday, September 27, 2026', 'Sunday, March 1, 2026',
    ]);
    await expect(cards.first().locator('.thumb')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=live0000001');
    await expect(cards.first().locator('img')).toHaveAttribute('src', 'https://i.ytimg.com/vi/live0000001/hqdefault.jpg');
  });

  test('a live stream gets a "Live now" badge', async ({ page }) => {
    const cards = page.locator('#recent .video-card');
    await expect(cards.nth(0).locator('.badge')).toHaveText('Live now');
    await expect(cards.nth(1).locator('.badge')).toHaveCount(0);
  });

  test('a service matched to a sermon shows its title, passage, series, notes, and audio', async ({ page }) => {
    const card = page.locator('#recent .video-card').nth(1);
    await expect(card.locator('h3')).toHaveText('Waiting for the Promise');
    await expect(card.locator('.passage-ref')).toHaveText('Acts 1:4-8');
    await expect(card.locator('.from a')).toHaveAttribute('href', '#series-acts');
    await expect(card.locator('.summary')).toHaveText('Paul greets the church and gives thanks.');
    const links = card.locator('.links a');
    await expect(links).toHaveText(['Watch on YouTube', 'Notes', 'Audio']);
    await expect(links.nth(1)).toHaveAttribute('href', 'https://drive.google.com/file/d/acts2pdf/view');
    await expect(links.nth(1)).toHaveAttribute('target', '_blank');
    await expect(links.nth(1)).toHaveAttribute('rel', 'noopener');
  });

  test('an unmatched service shows "Sunday service" and only the YouTube link', async ({ page }) => {
    const card = page.locator('#recent .video-card').nth(2);
    await expect(card.locator('h3')).toHaveText('Sunday service');
    await expect(card.locator('.links a')).toHaveText(['Watch on YouTube']);
    await expect(card.locator('.summary, .passage-ref, .from')).toHaveCount(0);
  });

  test('series appear in data order; the current one is first, labeled, and open', async ({ page }) => {
    const series = page.locator('#series details.series');
    await expect(series.locator('summary h3')).toHaveText(['Acts Current series', 'James', 'Jude']);
    await expect(series.nth(0)).toHaveAttribute('open', '');
    await expect(series.nth(1)).not.toHaveAttribute('open', '');
    await expect(series.nth(0).locator('.meta')).toHaveText('Oct 11, 2026 – Oct 18, 2026 · 2 sermons');
    await expect(series.nth(1).locator('.meta')).toHaveText('Jan 9, 2022 – Jan 9, 2022 · 1 sermon');
    await expect(series.nth(2).locator('.meta')).toHaveText('No sermons listed yet');
  });

  test('expanding a series lists its sermons with only the links that exist', async ({ page }) => {
    const james = page.locator('#series-james');
    await expect(james.locator('.sermon-list')).toBeHidden();
    await james.locator('summary').click();
    await expect(james.locator('.summary')).toHaveText('A practical letter about living out real faith.');
    await expect(james.locator('.folder')).toHaveAttribute('href', 'https://drive.google.com/drive/folders/JAMES');
    const row = james.locator('.sermon-list li');
    await expect(row.locator('.info')).toHaveText(/#1\s*Jan 9, 2022\s*You Can Have Joy No Matter What\s*James 1:1-4/);
    await expect(row.locator('.links a')).toHaveText(['Notes', 'Audio']);

    const acts = page.locator('#series-acts .sermon-list li');
    await expect(acts.nth(0).locator('.links a')).toHaveText(['Notes', 'Video']);
    await expect(acts.nth(0).locator('.title, .passage-ref')).toHaveCount(0);
  });

  test('"From the ... series" opens that series', async ({ page }) => {
    await page.locator('#series-acts summary').click(); // close it first
    await expect(page.locator('#series-acts')).not.toHaveAttribute('open', '');
    await page.locator('#recent .video-card').nth(1).locator('.from a').click();
    await expect(page.locator('#series-acts')).toHaveAttribute('open', '');
  });

  test('does not scroll sideways', async ({ page }) => {
    await page.locator('#series-james summary').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('a link straight to a series opens it', async ({ page }) => {
  await serve(page, FIXTURE);
  await page.goto('sermons.html#series-james');
  await expect(page.locator('#series-james')).toHaveAttribute('open', '');
  await expect(page.locator('#series-james')).toBeInViewport();
});

for (const [name, body, status] of [
  ['the data fails to load', 'Server error', 500],
  ['the data is not valid JSON', '{ not json', 200],
  ['the data is a newer, unknown format', JSON.stringify({ ...FIXTURE, version: 2 }), 200],
]) {
  test(`when ${name}, shows friendly messages and a YouTube link`, async ({ page, expectedLocalErrors }) => {
    expectedLocalErrors.push(/data\/sermons\.json/);
    await serve(page, body, status);
    await page.goto('sermons.html');
    await expect(page.locator('#recent .status')).toContainText('We couldn’t load recent services.');
    await expect(page.locator('#recent .status a')).toHaveAttribute('href', FIXTURE.streamsUrl);
    await expect(page.locator('#series .status')).toContainText('We couldn’t load sermon series');
  });
}

test('with no services or series yet, shows empty-state messages', async ({ page }) => {
  await serve(page, { ...FIXTURE, recent: [], series: [] });
  await page.goto('sermons.html');
  await expect(page.locator('#recent .status')).toContainText('No recent services yet.');
  await expect(page.locator('#recent .status a')).toHaveText('Watch on YouTube');
  await expect(page.locator('#series .status')).toHaveText('No sermon series yet.');
});

test('the real data/sermons.json loads without errors', async ({ page }) => {
  await page.goto('sermons.html');
  await expect(page.locator('#recent .status, #recent .video-card').first()).toBeVisible();
  await expect(page.locator('#recent')).not.toContainText('Loading');
  await expect(page.locator('#recent')).not.toContainText('couldn’t load');
});
