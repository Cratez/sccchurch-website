/**
 * FEATURE: Home page proportions: section spacing, and the "Coming for the first time?" teaser
 *          spaced like every other section (even gaps, with its own top rule).
 * COVERS:  the `section` padding rules in assets/css/base.css; .section-head.first-time
 *          in assets/css/home.css
 * WHY:     Spacing of 72px a side left large dead areas, especially around the short teaser.
 *          Removing the teaser's rule was tried and looked wrong; tucking it closer than other
 *          sections made the gaps uneven, which looked worse than the extra space.
 * UPDATE WHEN: the section spacing or the home page layout is redesigned.
 * REMOVE WHEN: the teaser is removed from the home page.
 */
const { test, expect } = require('./support/fixtures');

const px = (locator, prop) => locator.evaluate((el, p) => parseFloat(getComputedStyle(el)[p]), prop);

test('sections are spaced 44px on desktop and 40px on phones', async ({ page, isMobile }) => {
  await page.goto('index.html');
  const expected = isMobile ? 40 : 44;
  for (const id of ['gather', 'join', 'watch']) {
    expect(await px(page.locator(`#${id}`), 'paddingTop'), `#${id} top`).toBe(expected);
    expect(await px(page.locator(`#${id}`), 'paddingBottom'), `#${id} bottom`).toBe(expected);
  }
});

test('the gap above every section rule is the same, including the first-time teaser', async ({ page }) => {
  await page.goto('index.html');
  // The rule matters: without it the teaser looked unanchored.
  expect(await px(page.locator('#first-time .section-head'), 'borderTopWidth')).toBe(1);
  // Space from the end of each section's content to the next section's top rule.
  const gaps = await page.evaluate(() => {
    const ids = ['gather', 'join', 'first-time', 'watch'];
    const contentBottom = (sec) => Math.max(...[...sec.querySelector('.wrap').children]
      .map((c) => c.getBoundingClientRect().bottom));
    return ids.slice(1).map((id, i) => {
      const prev = document.getElementById(ids[i]);
      const rule = document.querySelector(`#${id} .section-head`).getBoundingClientRect().top;
      return Math.round(rule - contentBottom(prev));
    });
  });
  // An uneven gap (like the teaser sitting closer than the rest) reads as a mistake.
  expect(Math.max(...gaps) - Math.min(...gaps), `gaps: ${gaps.join(', ')}`).toBeLessThanOrEqual(2);
});

