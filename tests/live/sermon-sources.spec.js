/**
 * LIVE CHECK (opt-in, contacts the real Google APIs): GOOGLE_API_KEY=... npm run test:live
 *
 * FEATURE: The sermon data job's real sources are reachable with the API key: every series
 *          folder in data/series.json is public and listable, and the channel's streams load.
 * COVERS:  data/series.json, scripts/build-sermons/drive.js, scripts/build-sermons/youtube.js
 * WHY:     Catches a folder that was made private, a wrong folder link, or a broken API key
 *          before the daily job fails. Skipped when GOOGLE_API_KEY isn't set.
 * UPDATE WHEN: the APIs or the series list format change.
 * REMOVE WHEN: the sermon data job is removed.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { folderId, listFolder } = require('../../scripts/build-sermons/drive');
const { listStreams } = require('../../scripts/build-sermons/youtube');
const { parseFileName } = require('../../scripts/build-sermons/build');

const key = process.env.GOOGLE_API_KEY;
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'data', 'series.json'), 'utf8'));

test.skip(!key, 'Set GOOGLE_API_KEY to run the Google API checks.');

for (const s of config.series) {
  test(`Drive folder for ${s.title} is public and has sermon files`, async () => {
    const files = await listFolder(folderId(s.folder), key, fetch, s.title);
    expect(files.filter((f) => parseFileName(f.name)).length).toBeGreaterThan(0);
  });
}

test('YouTube returns the channel\'s past live streams', async () => {
  const streams = await listStreams(key);
  expect(streams.length).toBeGreaterThan(0);
});
