/**
 * FEATURE: Light/dark theme. The site follows the device setting until the visitor presses
 *          the footer toggle; their choice is saved and applied before the page draws.
 * COVERS:  the inline theme <script> in every page's <head>, the theme code in
 *          assets/js/site.js, the .theme-toggle in every footer, and the :root /
 *          [data-theme] / prefers-color-scheme tokens in assets/css/base.css
 * WHY:     Older Safari (13 and earlier) has no matchMedia().addEventListener; the theme code
 *          must not throw there, or the easter egg after it never gets set up.
 *          If the saved choice were applied late, dark-mode visitors would see a white flash
 *          on every page. If storage is blocked (private browsing), the toggle must still work.
 * UPDATE WHEN: the toggle's labels, the storage key ("theme"), or the --bg colors change.
 * REMOVE WHEN: the site drops the theme toggle.
 */
const { test, expect } = require('./support/fixtures');

const LIGHT_BG = 'rgb(238, 240, 238)'; // --bg light (#EEF0EE)
const DARK_BG = 'rgb(18, 25, 21)';     // --bg dark (#121915)

const bodyBg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const toggle = (page) => page.locator('footer.site .theme-toggle');

test('follows a light device setting when nothing is saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('index.html');
  expect(await theme(page)).toBeUndefined();
  expect(await bodyBg(page)).toBe(LIGHT_BG);
  await expect(toggle(page)).toHaveAttribute('aria-label', 'Switch to dark theme');
});

test('follows a dark device setting when nothing is saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('index.html');
  expect(await theme(page)).toBeUndefined();
  expect(await bodyBg(page)).toBe(DARK_BG);
  await expect(toggle(page)).toHaveAttribute('aria-label', 'Switch to light theme');
});

test('the toggle switches the theme and its label, both ways', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('sermons.html');
  await toggle(page).click();
  expect(await theme(page)).toBe('dark');
  expect(await bodyBg(page)).toBe(DARK_BG);
  await expect(toggle(page)).toHaveAttribute('aria-label', 'Switch to light theme');

  await toggle(page).click();
  expect(await theme(page)).toBe('light');
  expect(await bodyBg(page)).toBe(LIGHT_BG);
  await expect(toggle(page)).toHaveAttribute('aria-label', 'Switch to dark theme');
});

test('a saved light choice overrides a dark device', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('beliefs.html');
  await toggle(page).click();
  expect(await bodyBg(page)).toBe(LIGHT_BG);
  await page.reload();
  expect(await theme(page)).toBe('light');
  expect(await bodyBg(page)).toBe(LIGHT_BG);
});

test('the choice persists across reloads and pages', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('index.html');
  await toggle(page).click();
  await page.reload();
  expect(await theme(page)).toBe('dark');
  expect(await bodyBg(page)).toBe(DARK_BG);
  await page.goto('visit.html');
  expect(await theme(page)).toBe('dark');
  await expect(toggle(page)).toHaveAttribute('aria-label', 'Switch to light theme');
});

test('the saved choice is applied before the page draws', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('index.html');
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  // Record data-theme the moment <body> is created (before any body content or site.js
  // runs) and again at DOMContentLoaded.
  await page.addInitScript(() => {
    new MutationObserver((_, obs) => {
      if (document.body) {
        window.__themeAtBody = document.documentElement.dataset.theme;
        obs.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      window.__themeAtDOMContentLoaded = document.documentElement.dataset.theme;
    });
  });
  await page.reload();
  expect(await page.evaluate(() => window.__themeAtBody)).toBe('dark');
  expect(await page.evaluate(() => window.__themeAtDOMContentLoaded)).toBe('dark');
});

test('still works when storage is blocked (no JavaScript errors)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
    });
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('index.html');
  expect(await bodyBg(page)).toBe(LIGHT_BG);
  await toggle(page).click();
  expect(await theme(page)).toBe('dark');
  expect(await bodyBg(page)).toBe(DARK_BG);
  await expect(toggle(page)).toHaveAttribute('aria-label', 'Switch to light theme');
  // The fixture fails the test if any JavaScript error was logged.
});

test('an old browser without matchMedia().addEventListener (Safari 13) still works', async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q) => {
      const mql = real(q);
      return {
        matches: mql.matches, media: mql.media,
        addListener() {}, removeListener() {},
      };
    };
  });
  await page.goto('index.html');
  await toggle(page).click();
  await expect(toggle(page)).toBeVisible();
  // site.js kept running past the theme code, so the easter egg button was still built.
  await expect(page.getByRole('button', { name: 'See our original logo' })).toBeVisible();
  // The fixture fails the test if any JavaScript error was logged.
});
