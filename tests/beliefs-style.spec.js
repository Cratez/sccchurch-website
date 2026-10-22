/**
 * FEATURE: Statement of Faith look. Scripture reference chips are readable in light and dark
 *          (also while open), are square-cornered outline chips, and the reading-progress
 *          bar uses the church's fir-green brand color.
 * COVERS:  .refs .ref, .progress and .passage in assets/css/beliefs.css; color tokens in assets/css/base.css
 * WHY:     The chips and bar take their colors from the shared tokens; a token change could
 *          leave the small chip text hard to read or bring back the old pink bar.
 * UPDATE WHEN: the chip or progress bar design changes on purpose.
 * REMOVE WHEN: the scripture chips and progress bar are removed.
 */
const { test, expect } = require('./support/fixtures');

test.skip(({ isMobile }) => isMobile, 'colors are the same on phones; measured once on desktop');

const lum = ([r, g, b]) => {
  const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
};
const ratio = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);

for (const theme of ['light', 'dark']) {
  test(`reference chips are readable and square in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('beliefs.html');
    const chip = page.locator('.ref').first();
    const read = () => chip.evaluate((el) => {
      const s = getComputedStyle(el);
      return { fg: s.color, bg: getComputedStyle(document.body).backgroundColor, own: s.backgroundColor, radius: s.borderRadius };
    });

    const closed = await read();
    expect(closed.radius).toBe('0px');
    expect(ratio(rgb(closed.fg), rgb(closed.bg))).toBeGreaterThanOrEqual(4.5);

    await chip.evaluate((el) => el.setAttribute('aria-expanded', 'true')); // look only; no lookup needed
    // the chip fades between colors for a moment, so wait for the final look
    await expect.poll(async () => { const o = await read(); return ratio(rgb(o.fg), rgb(o.own)); }).toBeGreaterThanOrEqual(4.5);
  });

  test(`progress bar uses the brand color in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('beliefs.html');
    const [bar, brand] = await page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--brand)';
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return [getComputedStyle(document.querySelector('.progress')).backgroundColor, c];
    });
    expect(bar).toBe(brand);
  });
}
