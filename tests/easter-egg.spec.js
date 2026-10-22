/**
 * FEATURE: Footer easter egg. A small mountain button after the copyright opens a pop-up
 *          showing the church's original logo.
 * COVERS:  assets/js/site.js, the .egg / .egg-dialog styles in assets/css/base.css,
 *          assets/img/original-logo.webp, and the <script> order at the bottom of every page
 * WHY:     The button was once missing on beliefs.html because site.js loaded before the
 *          footer existed. The pop-up also used to close when clicked inside its own padding.
 * UPDATE WHEN: a page is added (add it to PAGES).
 * REMOVE WHEN: the easter egg is removed.
 */
const { test, expect } = require('./support/fixtures');

const PAGES = ['index.html', 'beliefs.html'];

for (const path of PAGES) {
  test.describe(path, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('footer has the mountain button, labeled for screen readers', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'See our original logo' })).toBeVisible();
      await expect(page.locator('footer.site button.egg')).toHaveCount(1);
    });

    test('opens the original logo, and the image loads', async ({ page }) => {
      await page.getByRole('button', { name: 'See our original logo' }).click();
      const dialog = page.locator('dialog.egg-dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Our original logo');
      const loaded = await dialog.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0);
      expect(loaded).toBe(true);
    });

    test('stays open when clicking inside the pop-up (including its padding)', async ({ page }) => {
      await page.getByRole('button', { name: 'See our original logo' }).click();
      const dialog = page.locator('dialog.egg-dialog');
      await dialog.click({ position: { x: 5, y: 5 } }); // inside the 24px padding
      await dialog.locator('img').click();
      await expect(dialog).toBeVisible();
    });

    test('closes with the Close button, the backdrop, or Escape', async ({ page }) => {
      const open = () => page.getByRole('button', { name: 'See our original logo' }).click();
      const dialog = page.locator('dialog.egg-dialog');

      await open();
      await dialog.getByRole('button', { name: 'Close' }).click();
      await expect(dialog).toBeHidden();

      await open();
      await page.mouse.click(3, 3); // top-left corner of the screen: the dimmed backdrop
      await expect(dialog).toBeHidden();

      await open();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    });
  });
}
