/**
 * FEATURE: Sermon data job, full run. Calls the YouTube and Drive APIs (faked here), reads PDF
 *          headers with caching, validates, and writes data/sermons.json without ever leaving
 *          half-written data behind.
 * COVERS:  scripts/build-sermons/index.js, youtube.js, drive.js, pdf.js
 * WHY:     The job runs unattended on GitHub every day. A failure must leave the site's data
 *          untouched, and unchanged data must not create a new commit.
 * UPDATE WHEN: the APIs used, the cache format, or the failure policy change.
 * REMOVE WHEN: the sermon data job is removed.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('./support/fixtures');
const { run } = require('../scripts/build-sermons/index');
const { firstPageText } = require('../scripts/build-sermons/pdf');
const { validateSermons } = require('../scripts/build-sermons/validate');

test.skip(({ isMobile }) => isMobile, 'No browser needed; runs once in the desktop project.');

const PDF = fs.readFileSync(path.join(__dirname, 'fixtures', 'notes-james-1.pdf'));
const SERIES = {
  hiddenVideos: [],
  series: [{ id: 'james', title: 'James', folder: 'https://drive.google.com/drive/folders/JAMES', current: false, summary: null, overrides: {} }],
};

// A fake Google API. Records every URL requested; `fail` makes a matching URL return 403.
function fakeGoogle({ fail } = {}) {
  const calls = [];
  const json = (body, status = 200) => ({ ok: status < 400, status, statusText: '', json: async () => body });
  const fetchImpl = async (url) => {
    calls.push(url);
    if (fail && url.includes(fail)) return json({ error: { message: 'The caller does not have permission' } }, 403);
    const u = new URL(url);
    if (u.pathname.endsWith('/playlistItems')) {
      return u.searchParams.get('pageToken')
        ? json({ items: [{ contentDetails: { videoId: 'vid2' } }, { contentDetails: { videoId: 'upcoming' } }] })
        : json({ items: [{ contentDetails: { videoId: 'vid1' } }, { contentDetails: { videoId: 'upload' } }], nextPageToken: 'P2' });
    }
    if (u.pathname.endsWith('/videos')) {
      return json({ items: [
        { id: 'vid1', snippet: { title: 'SCCC 01/09/2022', publishedAt: '2022-01-09T20:00:00Z', liveBroadcastContent: 'none' },
          liveStreamingDetails: { actualStartTime: '2022-01-09T18:25:00Z', actualEndTime: '2022-01-09T19:50:00Z' } },
        { id: 'vid2', snippet: { title: 'SCCC 01/16/2022', publishedAt: '2022-01-16T20:00:00Z', liveBroadcastContent: 'none' },
          liveStreamingDetails: { actualStartTime: '2022-01-16T18:25:00Z', actualEndTime: '2022-01-16T19:50:00Z' } },
        { id: 'upcoming', snippet: { title: 'SCCC 01/23/2022', publishedAt: '2022-01-20T20:00:00Z', liveBroadcastContent: 'upcoming' },
          liveStreamingDetails: { scheduledStartTime: '2022-01-23T18:25:00Z' } },
        { id: 'upload', snippet: { title: 'A regular upload', publishedAt: '2022-01-12T20:00:00Z', liveBroadcastContent: 'none' } },
      ] });
    }
    if (u.pathname === '/drive/v3/files') {
      return json({ files: [
        { id: 'pdf1', name: '001 01-09-22.pdf', mimeType: 'application/pdf', modifiedTime: '2022-01-09T00:00:00Z' },
        { id: 'mp31', name: '001 01-09-22.mp3', mimeType: 'audio/mpeg', modifiedTime: '2022-01-09T00:00:00Z' },
        { id: 'doc', name: 'Series outline', mimeType: 'application/vnd.google-apps.document', modifiedTime: '2022-01-01T00:00:00Z' },
      ] });
    }
    if (u.pathname === '/drive/v3/files/pdf1') {
      return { ok: true, status: 200, arrayBuffer: async () => PDF.buffer.slice(PDF.byteOffset, PDF.byteOffset + PDF.length) };
    }
    return json({ error: { message: `unexpected ${url}` } }, 404);
  };
  return { fetchImpl, calls };
}

function tempSite() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sermons-'));
  fs.mkdirSync(path.join(root, 'data'));
  fs.writeFileSync(path.join(root, 'data', 'series.json'), JSON.stringify(SERIES));
  return root;
}
const readOut = (root) => JSON.parse(fs.readFileSync(path.join(root, 'data', 'sermons.json'), 'utf8'));
const quiet = () => {};

test('reads the first page of a real notes PDF', async () => {
  const text = await firstPageText(PDF);
  expect(text.split('\n').slice(0, 4)).toEqual(['James #1', 'You Can Have Joy No Matter What', 'January 9, 2022', 'Text: James 1:1-4']);
});

test('a full run writes valid data with streams matched to sermons', async () => {
  const root = tempSite();
  const { fetchImpl, calls } = fakeGoogle();
  const { warnings } = await run({ key: 'k', fetchImpl, rootDir: root, now: new Date('2026-10-21T22:00:00Z'), log: quiet });
  const data = readOut(root);

  expect(validateSermons(data)).toEqual([]);
  expect(data.generatedAt).toBe('2026-10-21T22:00:00.000Z');
  // Pagination followed; upcoming streams and regular uploads left out.
  expect(calls.filter((u) => u.includes('/playlistItems'))).toHaveLength(2);
  expect(data.recent.map((r) => r.videoId)).toEqual(['vid2', 'vid1']);
  expect(data.recent[1].sermon).toMatchObject({ seriesId: 'james', title: 'You Can Have Joy No Matter What', passage: 'James 1:1-4' });
  expect(data.series[0].sermons[0]).toMatchObject({
    title: 'You Can Have Joy No Matter What',
    notesUrl: 'https://drive.google.com/file/d/pdf1/view',
    audioUrl: 'https://drive.google.com/file/d/mp31/view',
    videoUrl: 'https://www.youtube.com/watch?v=vid1',
  });
  expect(warnings.some((w) => w.includes('Series outline'))).toBe(true);
  // The API key is sent to Google only, never written anywhere.
  expect(fs.readFileSync(path.join(root, 'data', 'sermons.json'), 'utf8')).not.toContain('key=');
});

test('a second run reuses cached PDF headers and keeps the timestamp when nothing changed', async () => {
  const root = tempSite();
  await run({ key: 'k', fetchImpl: fakeGoogle().fetchImpl, rootDir: root, now: new Date('2026-10-21T22:00:00Z'), log: quiet });
  const second = fakeGoogle();
  await run({ key: 'k', fetchImpl: second.fetchImpl, rootDir: root, now: new Date('2026-10-22T22:00:00Z'), log: quiet });

  expect(second.calls.some((u) => u.includes('/files/pdf1'))).toBe(false);
  expect(readOut(root).generatedAt).toBe('2026-10-21T22:00:00.000Z');
  expect(readOut(root).series[0].sermons[0].title).toBe('You Can Have Joy No Matter What');
});

for (const [name, fail] of [['a Drive folder is private', '/drive/v3/files?'], ['YouTube refuses the key', '/youtube/']]) {
  test(`when ${name}, the run fails and existing data is left untouched`, async () => {
    const root = tempSite();
    const out = path.join(root, 'data', 'sermons.json');
    fs.writeFileSync(out, 'previous data');
    await expect(run({ key: 'k', fetchImpl: fakeGoogle({ fail }).fetchImpl, rootDir: root, log: quiet }))
      .rejects.toThrow(/permission/);
    expect(fs.readFileSync(out, 'utf8')).toBe('previous data');
  });
}

test('a private folder error says which series and what to check', async () => {
  const root = tempSite();
  await expect(run({ key: 'k', fetchImpl: fakeGoogle({ fail: '/drive/v3/files?' }).fetchImpl, rootDir: root, log: quiet }))
    .rejects.toThrow(/James.*Anyone with the link can view/);
});

test('a missing API key gives a clear error', async () => {
  await expect(run({ key: '', rootDir: tempSite(), log: quiet })).rejects.toThrow(/GOOGLE_API_KEY is not set/);
});
