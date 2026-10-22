/**
 * FEATURE: Shared page shell (header nav, footer, links, mobile layout) on every page.
 * COVERS:  index.html, beliefs.html, assets/css/base.css
 * WHY:     The header and footer are copied into each HTML file by hand, so they can drift
 *          apart or link to something that no longer exists.
 * UPDATE WHEN: a page is added or removed (edit PAGES below), or the nav links change.
 * REMOVE WHEN: never, as long as the site has pages; update instead.
 */
const { test, expect } = require('./support/fixtures');

const PAGES = [
  { path: 'index.html', title: 'South Clackamas Community Church' },
  { path: 'beliefs.html', title: 'Statement of Faith · South Clackamas Community Church', current: 'What We Believe' },
];

const NAV = ['Join Us', 'Sermons', 'What We Believe', 'Contact'];

for (const p of PAGES) {
  test.describe(p.path, () => {
    test('loads with the right title, nav, and footer', async ({ page }) => {
      await page.goto(p.path);
      await expect(page).toHaveTitle(p.title);
      await expect(page.locator('header.site nav ul a')).toHaveText(NAV);
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

    test('nav stays on one row and fits inside the header', async ({ page }) => {
      await page.goto(p.path);
      const nav = await page.locator('header.site nav').boundingBox();
      for (const a of await page.locator('header.site nav ul a').all()) {
        const box = await a.boundingBox();
        expect(box.y + box.height, `"${await a.textContent()}" should fit in the header`).toBeLessThanOrEqual(nav.y + nav.height);
        expect(box.x + box.width).toBeLessThanOrEqual(nav.x + nav.width + 1);
      }
    });
  });
}
