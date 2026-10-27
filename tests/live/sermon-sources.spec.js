/**
 * LIVE CHECK (opt-in, contacts the real Google and Microsoft services): npm run test:live
 *
 * FEATURE: The sermon data job's real sources are reachable: every series folder in
 *          data/series.json (Google Drive or OneDrive) is public and listable, OneDrive links
 *          open for a signed-out visitor, and the channel's streams load.
 * COVERS:  data/series.json, scripts/build-sermons/drive.js, scripts/build-sermons/onedrive.js,
 *          scripts/build-sermons/youtube.js
 * WHY:     Catches a folder that was made private or renamed, a wrong folder link, or a broken API
 *          key before the daily job fails. OneDrive is read the way its website reads a share for
 *          signed-out visitors, which Microsoft doesn't document and could change. The Google
 *          checks are skipped when GOOGLE_API_KEY isn't set; the OneDrive ones need no key.
 * UPDATE WHEN: the APIs, the OneDrive link format, or the series list format change.
 * REMOVE WHEN: the sermon data job is removed.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { folderId, listFolder } = require('../../scripts/build-sermons/drive');
const { isOneDriveLink, oneDrive } = require('../../scripts/build-sermons/onedrive');
const { listStreams } = require('../../scripts/build-sermons/youtube');
const { parseFileName } = require('../../scripts/build-sermons/build');

const key = process.env.GOOGLE_API_KEY;
const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'data', 'series.json'), 'utf8'));
const needsKey = () => test.skip(!key, 'Set GOOGLE_API_KEY to run the Google API checks.');
const od = oneDrive();

for (const s of config.series) {
  if (isOneDriveLink(s.folder)) {
    test(`OneDrive folder for ${s.title} is public and has sermon files`, async () => {
      const { files } = await od.listFolder(s.folder, s.subfolder, s.title);
      expect(files.filter((f) => parseFileName(f.name)).length).toBeGreaterThan(0);
    });
  } else {
    test(`Drive folder for ${s.title} is public and has sermon files`, async () => {
      needsKey();
      const files = await listFolder(folderId(s.folder), key, fetch, s.title);
      expect(files.filter((f) => parseFileName(f.name)).length).toBeGreaterThan(0);
    });
  }
}

test('OneDrive notes, audio, and folder links open without signing in', async ({ page }) => {
  const s = config.series.find((x) => isOneDriveLink(x.folder));
  test.skip(!s, 'No OneDrive series configured.');
  const { files, folderUrl } = await od.listFolder(s.folder, s.subfolder, s.title);
  const pdf = files.find((f) => /\.pdf$/i.test(f.name));
  const mp3 = files.find((f) => /\.mp3$/i.test(f.name));
  // The page title names the item OneDrive is showing; a sign-in page would say "Sign in".
  for (const [url, name] of [[pdf.url, pdf.name], [mp3.url, mp3.name], [folderUrl, s.subfolder]]) {
    await page.goto(url);
    await expect(page).toHaveURL(/onedrive\.live\.com/, { timeout: 30000 });
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 30000 });
  }
});

test('YouTube returns the channel\'s past live streams', async () => {
  needsKey();
  const streams = await listStreams(key);
  expect(streams.length).toBeGreaterThan(0);
});
