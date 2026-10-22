/**
 * FEATURE: Phone menu. On narrow screens the header links hide behind a "Menu" button;
 *          on desktop the links are always shown.
 * COVERS:  the header markup in every page (.menu-toggle, nav#site-nav), the menu code in
 *          assets/js/site.js, and the header / .js rules in assets/css/base.css
 * WHY:     A menu that won't open (or won't close) hides the whole site's navigation on phones.
 *          Without JavaScript the links must stay visible, since the button can't work.
 * UPDATE WHEN: the header layout, the 760px breakpoint, or the menu behavior changes.
 * REMOVE WHEN: the site stops using a collapsible phone menu.
 */
const { test, expect } = require('./support/fixtures');

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone-only behavior');

  test.beforeEach(async ({ page }) => {
    await page.goto('sermons.html');
  });

  test('Menu button shows the links, and aria-expanded follows', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Menu' });
    const links = page.locator('#site-nav a');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(links.first()).toBeHidden();

    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    for (const a of await links.all()) await expect(a).toBeVisible();

    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(links.first()).toBeHidden();
  });

  test('Escape closes the menu and returns focus to the button', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Menu' });
    await btn.click();
    await page.keyboard.press('Escape');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#site-nav')).toBeHidden();
    await expect(btn).toBeFocused();
  });

  test('clicking a link closes the menu', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Menu' });
    await btn.click();
    await page.locator('#site-nav').getByRole('link', { name: 'Contact' }).click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#site-nav')).toBeHidden();
  });

  test('clicking outside the header closes the menu', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Menu' });
    await btn.click();
    await page.locator('footer.site .credit').click(); // plain text, not a link
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#site-nav')).toBeHidden();
  });
});

test.describe('phone without JavaScript', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone-only behavior');
  test.use({ javaScriptEnabled: false });

  test('links stay visible and the Menu button (which needs JavaScript) is hidden', async ({ page }) => {
    await page.goto('sermons.html');
    await expect(page.locator('.menu-toggle')).toBeHidden();
    for (const a of await page.locator('#site-nav a').all()) await expect(a).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop-only behavior');

  test('no Menu button; links are shown on one row inside the header', async ({ page }) => {
    await page.goto('sermons.html');
    await expect(page.locator('.menu-toggle')).toBeHidden();
    const header = await page.locator('header.site').boundingBox();
    const tops = new Set();
    for (const a of await page.locator('#site-nav a').all()) {
      await expect(a).toBeVisible();
      const box = await a.boundingBox();
      tops.add(Math.round(box.y));
      expect(box.y + box.height).toBeLessThanOrEqual(header.y + header.height);
    }
    expect(tops.size, 'links should sit on one row').toBe(1);
  });
});
