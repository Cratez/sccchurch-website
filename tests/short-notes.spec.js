/**
 * FEATURE: Short one-sentence notes stay on one line on desktop (no width limit forcing an
 *          early line break): the note under "When we gather" and the "Coming for the first
 *          time?" sentence.
 * COVERS:  .rows-note in assets/css/base.css (index.html and visit.html #gather),
 *          .section-head.first-time in assets/css/home.css (index.html #first-time)
 * WHY:     The reading-width limit (--measure) used for long text broke these short notes in
 *          the middle of the line on wide screens.
 * UPDATE WHEN: the note text gets long enough that wrapping is expected, or the layout changes.
 * REMOVE WHEN: these notes are removed.
 */
const { test, expect } = require('./support/fixtures');

test.skip(({ isMobile }) => isMobile, 'Wrapping is expected on narrow screens.');

// Number of rendered lines, from the element's height and its line height.
const lineCount = (locator) => locator.evaluate((el) => {
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  return Math.round(el.getBoundingClientRect().height / lh);
});

for (const [name, url, selector] of [
  ['"When we gather" note (home)', 'index.html', '#gather .rows-note'],
  ['"When we gather" note (visit)', 'visit.html', '#gather .rows-note'],
  ['"Coming for the first time?" sentence', 'index.html', '#first-time .section-head p:not(.eyebrow)'],
]) {
  test(`${name} fits on one line at 1280px`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url);
    const note = page.locator(selector);
    // Tests use a fallback font (Google Fonts are faked), which is wider than the real
    // EB Garamond, so a width limit in "ch" units can pass here and still wrap on the real
    // site. Check the cause directly: no width limit at all.
    expect(await note.evaluate((el) => getComputedStyle(el).maxWidth)).toBe('none');
    expect(await lineCount(note)).toBe(1);
  });
}
