/**
 * FEATURE: Statement of Faith reading aids. The thin reading-progress bar at the top of the
 *          screen, and the sidebar highlighting the section you're reading (desktop only;
 *          the sidebar is hidden on narrow screens).
 * COVERS:  assets/js/beliefs.js (progress bar + section highlighting on scroll), .progress / .toc in assets/css/beliefs.css
 * WHY:     Scroll-driven behavior is easy to break when the layout or markup changes. On tall
 *          screens the last section (Church) once never lit up, because the page ran out of
 *          scroll before its heading reached the highlight line.
 * UPDATE WHEN: the sidebar breakpoint (860px) or highlight style changes.
 * REMOVE WHEN: the progress bar or sidebar is removed.
 */
const { test, expect } = require('./support/fixtures');

test.beforeEach(async ({ page }) => {
  await page.goto('beliefs.html');
});

test('progress bar is empty at the top and full at the bottom', async ({ page }) => {
  const bar = page.locator('.progress');
  const scaleX = () => bar.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

  expect(await scaleX()).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect.poll(scaleX).toBeCloseTo(1, 2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(scaleX).toBe(0);
});

test('sidebar highlights the section being read', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sidebar is hidden on narrow screens.');
  await page.locator('#salvation').evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  await expect(page.locator('aside.toc a.on')).toHaveText('6. Salvation');
  await page.locator('#church').evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  await expect(page.locator('aside.toc a.on')).toHaveText('11. Church');
});

test('last section is highlighted at the bottom of the page, even on a tall screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The sidebar is hidden on narrow screens.');
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect(page.locator('aside.toc a.on')).toHaveText('11. Church');
});

test('sidebar is hidden on narrow screens', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Only applies to narrow screens.');
  await expect(page.locator('aside.toc')).toBeHidden();
});
