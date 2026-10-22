/**
 * FEATURE: Shared page shell (header nav, footer, links, mobile layout) on every page.
 * COVERS:  index.html, beliefs.html, sermons.html, visit.html (header and footer markup),
 *          assets/css/base.css
 * WHY:     The header and footer are copied into each HTML file by hand, so they can drift
 *          apart or link to something that no longer exists.
 * UPDATE WHEN: a page is added or removed (edit PAGES below), or the nav links change.
 *          (The phone menu itself is tested in nav-menu.spec.js.)
 * REMOVE WHEN: never, as long as the site has pages; update instead.
 */
const { test, expect } = require('./support/fixtures');

const PAGES = [
  { path: 'index.html', title: 'South Clackamas Community Church' },
  { path: 'visit.html', title: 'Plan your visit · South Clackamas Community Church', current: 'Plan your visit' },
  { path: 'beliefs.html', title: 'Statement of Faith · South Clackamas Community Church', current: 'What we believe' },
  { path: 'sermons.html', title: 'Sermons · South Clackamas Community Church', current: 'Sermons' },
];

const NAV = ['Plan your visit', 'Sermons', 'What we believe', 'Contact'];
const NAV_HREFS = ['visit.html', 'sermons.html', 'beliefs.html', '#contact'];

// The home page used to have a "Browse sermons" button; the redesigned home page reaches the
// Sermons page through the header nav and the footer "Watch" column.
test('home page footer "Watch" column links to the Sermons page', async ({ page }) => {
  await page.goto('index.html');
  const watch = page.locator('footer.site .foot-cols section', { hasText: 'Watch' });
  await expect(watch.getByRole('link', { name: 'Sermons', exact: true })).toHaveAttribute('href', 'sermons.html');
});

for (const p of PAGES) {
  test.describe(p.path, () => {
    test('loads with the right title, nav, and footer', async ({ page }) => {
      await page.goto(p.path);
      await expect(page).toHaveTitle(p.title);
      await expect(page.locator('header.site nav ul a')).toHaveText(NAV);
      for (const [i, href] of NAV_HREFS.entries()) {
        await expect(page.locator('header.site nav ul a').nth(i)).toHaveAttribute('href', href);
      }
      // "Contact" in the nav jumps to the footer, so every page needs footer#contact.
      await expect(page.locator('footer#contact.site')).toHaveCount(1);
      await expect(page.locator('footer.site')).toContainText('© 2026 South Clackamas Community Church');
    });

    test('marks the current page in the nav (and only that one)', async ({ page }) => {
      await page.goto(p.path);
      const current = page.locator('header.site a[aria-current="page"]');
      if (p.current) await expect(current).toHaveText(p.current);
      else await expect(current).toHaveCount(0);
    });

    test('every local link and image points to a file and section that exist', async ({ page, request }) => {
      await page.goto(p.path);
      const urls = await page.locator('a[href], img[src], link[href], script[src]').evaluateAll((els) =>
        els.map((e) => e.href || e.src).filter((u) => u.startsWith(location.origin)));
      for (const u of new Set(urls)) {
        const url = new URL(u);
        const res = await request.get(url.pathname);
        expect(res.status(), `${url.pathname} should exist`).toBe(200);
        if (url.hash) {
          const html = await res.text();
          expect(html, `${url.pathname} should contain id="${url.hash.slice(1)}"`).toContain(`id="${url.hash.slice(1)}"`);
        }
      }
    });

    test('does not scroll sideways (nothing wider than the screen)', async ({ page }) => {
      await page.goto(p.path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('does not scroll sideways at 360px wide, with the phone menu open', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(p.path);
      await page.getByRole('button', { name: 'Menu' }).click();
      await expect(page.locator('header.site nav')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    // The old "nav stays on one row and fits inside the header" test was replaced on purpose:
    // on phones the links now sit behind a Menu button (see nav-menu.spec.js).
  });
}
