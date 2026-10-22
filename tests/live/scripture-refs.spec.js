/**
 * LIVE CHECK (opt-in, contacts the real bible-api.com): npm run test:live
 *
 * FEATURE: Every scripture reference on the Statement of Faith page resolves to real verses.
 * COVERS:  the data-ref values in beliefs.html, and the request format in assets/js/beliefs.js
 * WHY:     Catches typos like the old "Deuteronomy 64" that the faked normal tests cannot.
 *          Not run on every push because it is slow (about 2.5 minutes, to respect the
 *          API's rate limit) and fails whenever the service is down.
 * UPDATE WHEN: the lookup service or request format in beliefs.js changes.
 * REMOVE WHEN: scripture references stop loading text on the page.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const html = fs.readFileSync(path.resolve(__dirname, '..', '..', 'beliefs.html'), 'utf8');
const refs = [...html.matchAll(/data-ref="([^"]+)"/g)].map((m) => m[1]);

test('every reference on beliefs.html returns verses from bible-api.com', async ({ request }) => {
  expect(refs.length).toBeGreaterThan(0);
  const failures = [];
  for (const ref of refs) {
    // Same transformation as load() in assets/js/beliefs.js.
    const url = 'https://bible-api.com/' + ref.replace(/, /g, ',').replace(/ /g, '+') + '?translation=kjv';
    const res = await request.get(url);
    const data = res.ok() ? await res.json() : null;
    if (!data || !data.verses || !data.verses.length) failures.push(`${ref} (HTTP ${res.status()})`);
    await new Promise((r) => setTimeout(r, 2100)); // bible-api.com allows about 15 requests per 30 seconds
  }
  expect(failures, 'these references did not load').toEqual([]);
});
