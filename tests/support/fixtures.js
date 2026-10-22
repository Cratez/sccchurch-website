// Shared test setup. Every normal test imports `test` and `expect` from here instead of
// from '@playwright/test', so that:
//   - outside services (Google Fonts, YouTube and its thumbnails, bible-api.com) are faked and never contacted,
//   - the test fails if the page logs a JavaScript error or a local file is missing (404).
const base = require('@playwright/test');

// Canned bible-api.com response. Tests can override it with `bibleApi.respond(...)`.
function fakePassage(ref) {
  return {
    reference: ref,
    verses: [
      { verse: 1, text: 'In the beginning was the Word,\n' },
      { verse: 2, text: '  and the Word was with God. ' },
    ],
    translation_name: 'King James Version',
    translation_note: 'Public Domain',
  };
}

const test = base.test.extend({
  // Records every request to bible-api.com and lets a test change how it responds.
  bibleApi: async ({}, use) => {
    const api = {
      requests: [],
      handler: (url) => ({ status: 200, json: fakePassage(decodeURIComponent(url.pathname.slice(1)).replace(/\+/g, ' ')) }),
      respond(fn) { this.handler = fn; },
    };
    await use(api);
  },

  // Local URLs a test deliberately makes fail (e.g. to test an error message). Push a
  // regular expression here so the "missing local file" check ignores matching URLs.
  expectedLocalErrors: async ({}, use) => {
    await use([]);
  },

  page: async ({ page, bibleApi, expectedLocalErrors }, use) => {
    const problems = [];
    page.on('pageerror', (err) => problems.push(`JavaScript error: ${err.message}`));
    page.on('response', (res) => {
      if (res.url().startsWith('http://localhost') && res.status() >= 400
        && !expectedLocalErrors.some((re) => re.test(res.url()))) {
        problems.push(`Missing local file (${res.status()}): ${res.url()}`);
      }
    });

    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, body: '' }));
    // Video thumbnails (Sermons page): a 1x1 transparent GIF.
    await page.route(/i\.ytimg\.com/, (route) => route.fulfill({
      status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64'),
    }));
    await page.route(/youtube\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<p>fake player</p>' }));
    await page.route(/bible-api\.com/, async (route) => {
      const url = new URL(route.request().url());
      bibleApi.requests.push(url);
      const r = await bibleApi.handler(url);
      await route.fulfill({ status: r.status, json: r.json, body: r.body });
    });

    await use(page);
    base.expect(problems, 'page should have no JS errors or missing files').toEqual([]);
  },
});

module.exports = { test, expect: base.expect };
