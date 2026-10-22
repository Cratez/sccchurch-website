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

  test('a service titled from its captions (no sermon match) shows that title', async ({ page }) => {
    const data = structuredClone(FIXTURE);
    Object.assign(data.recent[3], { title: 'Love One Another', summary: 'A sermon on love.' });
    await serve(page, data);
    await page.reload();
    const card = page.locator('#recent .video-card').nth(3);
    await expect(card.locator('h3')).toHaveText('Love One Another');
    await expect(card.locator('.summary')).toHaveText('A sermon on love.');
    await expect(card.locator('.links a')).toHaveText(['Watch on YouTube']);
  });

  // Summaries used to sit in the card and made every card in the grid as tall as the longest one.
  test('a summary stays hidden until "Summary" is clicked, and shows over the thumbnail', async ({ page }) => {
    const card = page.locator('#recent .video-card').nth(1);
    const panel = card.locator('.summary');
    const toggle = card.getByRole('button', { name: 'Summary' });
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveText('Paul greets the church and gives thanks.');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const [p, img] = [await panel.boundingBox(), await card.locator('img').boundingBox()];
    expect(Math.abs(p.y - img.y) + Math.abs(p.height - img.height), 'panel covers the thumbnail').toBeLessThanOrEqual(2);

    await toggle.click();
    await expect(panel).toBeHidden();
    await toggle.click();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('cards without a summary have no Summary button', async ({ page }) => {
    await expect(page.locator('#recent .video-card').nth(2).locator('.summary-toggle, .summary')).toHaveCount(0);
  });

  test('a summary doesn\'t make cards taller, open or closed', async ({ page, isMobile }) => {
    test.skip(isMobile, 'One column on phones: cards are naturally different heights.');
    const heights = () => page.locator('#recent .video-card').evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().height)));
    const load = async (summary) => {
      const data = structuredClone(FIXTURE);
      data.recent.forEach((r) => { r.summary = null; });
      data.recent[3].summary = summary;
      await serve(page, data);
      await page.reload();
      await page.locator('#recent .video-card').first().waitFor();
      return heights();
    };
    const without = await load(null);
    const withLong = await load('A long summary of the sermon. '.repeat(10).trim());
    expect(withLong, 'same card heights with and without a summary').toEqual(without);
    await page.locator('#recent .video-card').nth(3).getByRole('button', { name: 'Summary' }).click();
    expect(await heights(), 'opening it changes nothing either').toEqual(without);
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
    const rows = james.locator('.sermon-list li');
    await expect(rows).toHaveCount(2);
    // Undated extras (a series introduction) come first, with no number or date.
    await expect(rows.nth(0)).toHaveClass('extra');
    await expect(rows.nth(0).locator('.info')).toHaveText('Intro to Author');
    await expect(rows.nth(0).locator('.num, .when')).toHaveCount(0);
    await expect(rows.nth(0).locator('.links a')).toHaveText(['Notes', 'Audio']);
    await expect(rows.nth(1).locator('.info')).toHaveText(/#1\s*Jan 9, 2022\s*You Can Have Joy No Matter What\s*James 1:1-4/);
    await expect(rows.nth(1).locator('.links a')).toHaveText(['Notes', 'Audio']);

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

  // The badges are outlined (transparent) so their text sits on the page background; the
  // other muted/label text on this page is measured too, in both themes.
  for (const theme of ['light', 'dark']) {
    test(`badges and small labels meet 4.5:1 contrast in the ${theme} theme`, async ({ page }) => {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await page.locator('#series-james summary').click();
      const ratios = await page.evaluate(() => {
        const parse = (c) => c.match(/[\d.]+/g).map(Number);
        const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const backdrop = (el) => {
          for (let n = el; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor);
            if (c.length < 4 || c[3] > 0) return c;
          }
        };
        const out = {};
        for (const sel of ['.video-card .badge', '.series .badge', '.video-card .date', '.video-card .passage-ref', '.series .meta', '.sermon-list .when']) {
          const el = document.querySelector(sel);
          const [hi, lo] = [lum(parse(getComputedStyle(el).color)), lum(backdrop(el))].sort((x, y) => y - x);
          out[sel] = (hi + 0.05) / (lo + 0.05);
        }
        return out;
      });
      for (const [sel, ratio] of Object.entries(ratios)) expect(ratio, sel).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('does not scroll sideways', async ({ page }) => {
    await page.locator('#series-james summary').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

// Long titles and passages used to sit on one line and push the links onto a line of their own.
test('a sermon\'s passage sits under its title; links stay beside it on desktop and below it on phones', async ({ page, isMobile }) => {
  const data = structuredClone(FIXTURE);
  Object.assign(data.series[1].sermons[1], {
    title: '“… not my will, but Thine be done.” (Luke 22:42)',
    passage: 'James 4:13-15; Matt. 6:9-13; Matt. 12:46-50',
  });
  await serve(page, data);
  await page.goto('sermons.html#series-james');
  // Measure everything in one go: the page may still be smooth-scrolling to the series.
  const { num, title, passage, links } = await page.locator('#series-james .sermon-list li').nth(1).evaluate((li) => {
    const r = (sel) => li.querySelector(sel).getBoundingClientRect().toJSON();
    return { num: r('.num'), title: r('.title'), passage: r('.passage-ref'), links: r('.links') };
  });

  expect(passage.y, 'passage starts below the title').toBeGreaterThanOrEqual(title.y + title.height - 1);
  expect(Math.abs(passage.x - title.x), 'passage lines up with the title').toBeLessThanOrEqual(1);
  if (isMobile) {
    expect(links.y, 'links go below the passage on phones').toBeGreaterThanOrEqual(passage.y + passage.height - 1);
  } else {
    expect(Math.abs(links.y - num.y), 'links stay on the first line on desktop').toBeLessThanOrEqual(8);
    expect(links.x, 'links stay to the right of the title').toBeGreaterThanOrEqual(title.x + title.width);
  }
});

// Titles used to start right after each date, so "Jan 9, 2022" and "Feb 13, 2022" rows didn't line up.
test('titles and passages line up in one column, whatever the number or date width', async ({ page, isMobile }) => {
  const data = structuredClone(FIXTURE);
  const base = data.series[1].sermons[1];
  data.series[1].sermons.push(
    { ...base, key: '005 02-06-22', number: '5', date: '2022-02-06', title: null, passage: 'James 1:13' },
    { ...base, key: '006 02-13-22', number: '6', date: '2022-02-13', title: 'A title', passage: 'James 1:16-18' },
    { ...base, key: '024 07-24-22 (part 1)', number: '24 (part 1)', date: '2022-07-24', title: 'The Problem of War Within', passage: 'James 4:1-3' },
  );
  await serve(page, data);
  await page.goto('sermons.html#series-james');
  const { texts, links } = await page.locator('#series-james .sermon-list').evaluate((list) => {
    const rows = [...list.querySelectorAll('li:not(.extra)')];
    return {
      texts: rows.map((li) => Math.round(li.querySelector('.text').getBoundingClientRect().left)),
      links: rows.map((li) => Math.round(li.querySelector('.links').getBoundingClientRect().right)),
    };
  });
  expect(texts).toHaveLength(4);
  expect(new Set(texts).size, `title/passage left edges: ${texts.join(', ')}`).toBe(1);
  if (!isMobile) expect(new Set(links).size, `link right edges: ${links.join(', ')}`).toBe(1);
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
  ['the data is a newer, unknown format', JSON.stringify({ ...FIXTURE, version: 3 }), 200],
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

test('still reads version 1 data (from before undated extras existed)', async ({ page }) => {
  const v1 = { ...FIXTURE, version: 1, series: FIXTURE.series.map((s) => ({ ...s, sermons: s.sermons.filter((m) => m.date) })) };
  await serve(page, v1);
  await page.goto('sermons.html');
  await expect(page.locator('#recent .video-card')).toHaveCount(6);
  await expect(page.locator('#series details.series')).toHaveCount(3);
});

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
