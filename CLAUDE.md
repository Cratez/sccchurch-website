# Project instructions

Static website for South Clackamas Community Church, hosted on GitHub Pages (see README.md). Plain HTML, CSS, and JavaScript with no build step. The owner is not a web developer, so explain web-specific choices in plain terms.

## Testing rules (required for all work)

Every change that adds or changes behavior, content structure, or layout must come with tests, unless it truly cannot be tested (say so explicitly if that's the case). Tests use Playwright and live in `tests/`.

1. **Write or update tests in the same change.** New feature: new tests. Changed feature: update its tests. Bug fix: add a test that fails without the fix (check this by temporarily undoing the fix).
2. **Every test file starts with a header comment** in this format, so anyone can tell later whether the tests still apply:
   ```js
   /**
    * FEATURE: What the feature is, in plain words.
    * COVERS:  The files and parts of files the tests depend on.
    * WHY:     Why the tests exist (what could break, past bugs).
    * UPDATE WHEN: Changes that mean these tests need editing.
    * REMOVE WHEN: Changes that make these tests obsolete.
    */
   ```
   Keep one feature per file, and name the file after the feature (e.g. `easter-egg.spec.js`).
3. **When changing or removing a feature, check the headers.** Search `tests/` for the files you touched (they're listed under COVERS). Update tests whose feature changed; delete test files whose REMOVE WHEN condition is now true. Mention any updated or removed tests in your summary.
4. **Never weaken a test just to make it pass.** If a test fails, find out whether the site or the test is wrong. Only change the test when the intended behavior changed.
5. **Outside services are faked in normal tests.** Import `test`/`expect` from `tests/support/fixtures.js` (not directly from `@playwright/test`). It fakes Google Fonts, YouTube, and bible-api.com, and fails a test on any JavaScript error or missing local file. Checks against real services go in `tests/live/` and run only with `npm run test:live`.
6. **Run `npm test` before finishing** and report the result honestly. It runs every test on a desktop and a phone-sized screen. Run `npm run test:live` too when scripture references or the lookup code change.
7. **Keep README.md accurate.** When a change affects anything the README describes, update it in the same change.

Commands: `npm install` and `npx playwright install chromium` once; then `npm test`, `npm run test:live`, `npm run test:report` (opens the last results in a browser). Tests also run on GitHub for every push (`.github/workflows/tests.yml`).
