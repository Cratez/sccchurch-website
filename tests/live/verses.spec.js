/**
 * LIVE CHECK (opt-in, contacts the real bible-api.com): npm run test:live
 *
 * FEATURE: The rotating verses in the home page hero are quoted correctly from the KJV.
 * COVERS:  the #hero-verses list in index.html (ref, text, partial)
 * WHY:     The verses are typed by hand; a wrong word or reference would misquote Scripture
 *          on the front page. Whitespace and punctuation are ignored (quotes, colons, etc. may
 *          differ); "partial": true verses must appear word for word inside the API's text.
 *          Paced like scripture-refs.spec.js to respect the API's rate limit.
 * UPDATE WHEN: the verse list format in index.html changes, or the lookup service changes.
 * REMOVE WHEN: the home page drops the rotating verses.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const html = fs.readFileSync(path.resolve(__dirname, '..', '..', 'index.html'), 'utf8');
const json = html.match(/<script type="application\/json" id="hero-verses">([\s\S]*?)<\/script>/);
const verses = json ? JSON.parse(json[1]) : [];

// Letters, digits, and single spaces only (case is kept, so "LORD" must match).
const normalize = (s) => s.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

test('every hero verse matches the KJV text from bible-api.com', async ({ request }) => {
  expect(verses.length).toBeGreaterThan(0);
  const failures = [];
  for (const v of verses) {
    const url = 'https://bible-api.com/' + v.ref.replace(/ /g, '+') + '?translation=kjv';
    const res = await request.get(url);
    const data = res.ok() ? await res.json() : null;
    if (!data || !data.text) {
      failures.push(`${v.ref}: no text (HTTP ${res.status()})`);
    } else {
      const want = normalize(v.text);
      const got = normalize(data.text);
      const ok = v.partial ? got.includes(want) : got === want;
      if (!ok) failures.push(`${v.ref}${v.partial ? ' (partial)' : ''}\n  site: ${want}\n  KJV:  ${got}`);
    }
    await new Promise((r) => setTimeout(r, 2100)); // bible-api.com allows about 15 requests per 30 seconds
  }
  expect(failures, 'these verses do not match the KJV').toEqual([]);
});
