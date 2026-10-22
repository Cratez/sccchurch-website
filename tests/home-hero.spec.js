/**
 * FEATURE: Home page photo hero: Mt. Hood photo, church name, rotating Bible verse (with a
 *          pause button), and the quick-link bar along its bottom edge.
 * COVERS:  index.html (.home-hero, figure.verse, #hero-verses, nav.quick),
 *          the verse rotator in assets/js/home.js, the hero styles in assets/css/home.css
 * WHY:     The verse must not move for visitors who ask for less motion, must be pausable,
 *          and must still show (Psalm 122:1) without JavaScript. The photo must actually load
 *          (in the small WebP format), and the quick links must go somewhere real.
 * UPDATE WHEN: the hero layout, quick links, verse list format, or rotation timing changes.
 * REMOVE WHEN: the home page drops the photo hero or the rotating verse.
 */
const { test, expect } = require('./support/fixtures');

const verseText = (page) => page.locator('.home-hero .verse blockquote p');
const verseRef = (page) => page.locator('.home-hero .verse figcaption');
const pauseBtn = (page) => page.locator('.home-hero .verse-pause');

// Moves the mouse well away from the verse (top-left corner of the page).
const pointAway = (page) => page.mouse.move(1, 1);

test('the hero photo loads, using a WebP file', async ({ page }) => {
  await page.goto('index.html');
  const img = page.locator('.home-hero picture img');
  await expect(img).toHaveAttribute('alt', '');
  await expect(img).toHaveAttribute('fetchpriority', 'high');
  await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  expect(await img.evaluate((el) => el.currentSrc)).toMatch(/hood-sunset-\d+\.webp$/);
});

test('the main heading is the church name', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('South Clackamas Community Church');
});

test('the quick-link bar goes to the visit page, the times, and the video', async ({ page }) => {
  await page.goto('index.html');
  const links = page.locator('.home-hero nav.quick a');
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toHaveAttribute('href', 'visit.html');
  await expect(links.nth(1)).toHaveAttribute('href', '#gather');
  await expect(links.nth(2)).toHaveAttribute('href', '#watch');
  await expect(links.nth(0)).toContainText('Plan your visit');
});

test.describe('verse rotation', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.goto('index.html');
    await pointAway(page);
    await expect(verseRef(page)).toHaveText('Psalm 122:1');
  });

  test('shows the next verse every 10 seconds, in list order', async ({ page }) => {
    const verses = JSON.parse(await page.locator('#hero-verses').textContent());
    await page.clock.runFor(10_000);
    await expect(verseRef(page)).toHaveText(verses[1].ref);
    await expect(verseText(page)).toHaveText(`“${verses[1].text}”`);
    await page.clock.runFor(10_000);
    await expect(verseRef(page)).toHaveText(verses[2].ref);
  });

  test('the pause button stops it, and pressing it again starts it', async ({ page }) => {
    const btn = pauseBtn(page);
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(btn).toHaveAttribute('aria-label', 'Pause verses');

    await btn.click();
    await pointAway(page);
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(btn).toHaveAttribute('aria-label', 'Play verses');
    await expect(btn).toHaveText('▶︎'); // play triangle, drawn as text (not an emoji)
    await page.clock.runFor(30_000);
    await expect(verseRef(page)).toHaveText('Psalm 122:1');

    await btn.click();
    await pointAway(page);
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(btn).toHaveAttribute('aria-label', 'Pause verses');
    await page.clock.runFor(10_000);
    await expect(verseRef(page)).not.toHaveText('Psalm 122:1');
  });

  test('pointing at the verse pauses it until the pointer leaves', async ({ page }) => {
    await verseText(page).hover();
    await page.clock.runFor(30_000);
    await expect(verseRef(page)).toHaveText('Psalm 122:1');
    await pointAway(page);
    await page.clock.runFor(10_000);
    await expect(verseRef(page)).not.toHaveText('Psalm 122:1');
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows the verse for the day, with no pause button', async ({ page }) => {
    // 15 March 2026 (local time): day 20527 since 1 Jan 1970, so verse 20527 % 10 = 7.
    await page.clock.install({ time: new Date(2026, 2, 15, 12, 0, 0) });
    await page.goto('index.html');
    const verses = JSON.parse(await page.locator('#hero-verses').textContent());
    const day = Date.UTC(2026, 2, 15) / 86400000;
    const expected = verses[day % verses.length];
    expect(expected.ref).not.toBe('Psalm 122:1'); // make sure the check means something
    await expect(verseRef(page)).toHaveText(expected.ref);
    await expect(verseText(page)).toHaveText(`“${expected.text}”`);
    await expect(pauseBtn(page)).toBeHidden();
    await page.clock.runFor(30_000);
    await expect(verseRef(page)).toHaveText(expected.ref);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows Psalm 122:1 and no pause button', async ({ page }) => {
    await page.goto('index.html');
    await expect(verseRef(page)).toHaveText('Psalm 122:1');
    await expect(verseText(page)).toContainText('I was glad when they said unto me');
    await expect(pauseBtn(page)).toBeHidden();
  });
});
