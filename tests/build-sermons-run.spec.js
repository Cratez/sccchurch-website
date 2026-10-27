/**
 * FEATURE: Sermon data job, full run. Calls the YouTube, Google Drive, and OneDrive APIs (faked
 *          here), reads PDF headers with caching, validates, and writes data/sermons.json without
 *          ever leaving half-written data behind.
 * COVERS:  scripts/build-sermons/index.js, youtube.js, drive.js, onedrive.js, pdf.js
 * WHY:     The job runs unattended on GitHub every day. A failure must leave the site's data
 *          untouched, and unchanged data must not create a new commit. OneDrive links must be ones
 *          a signed-out visitor can open (the API's own links ask visitors to sign in).
 * UPDATE WHEN: the APIs used, the OneDrive link format, the cache format, or the failure policy change.
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

const SHARE = 'https://1drv.ms/f/c/abc/SHARE?e=x';
const pdfResponse = () => ({ ok: true, status: 200, arrayBuffer: async () => PDF.buffer.slice(PDF.byteOffset, PDF.byteOffset + PDF.length) });

// A fake Google and OneDrive API. Records every URL requested (and the OneDrive auth headers);
// `fail` makes a matching URL return 403.
function fakeGoogle({ fail } = {}) {
  const calls = [];
  const authHeaders = [];
  const json = (body, status = 200) => ({ ok: status < 400, status, statusText: '', json: async () => body });
  const fetchImpl = async (url, opts = {}) => {
    calls.push(url);
    if (fail && url.includes(fail)) return json({ error: { message: 'The caller does not have permission' } }, 403);
    const u = new URL(url);
    if (u.hostname === 'api-badgerp.svc.ms') return json({ token: 'GUEST', authScheme: 'Badger' });
    if (u.hostname === 'my.microsoftpersonalcontent.com') {
      authHeaders.push(opts.headers && opts.headers.Authorization);
      if (u.pathname.includes('/shares/')) return json({ id: 'ROOT', name: 'SCCC Sermons', parentReference: { driveId: 'CID' } });
      if (u.pathname.endsWith('/items/ROOT/children')) {
        // Two pages, to check "next page" links are followed.
        return u.searchParams.get('page')
          ? json({ value: [{ id: 'TITUS', name: 'Titus', folder: { childCount: 2 } }] })
          : json({ value: [{ id: 'Y2025', name: '2025', folder: { childCount: 9 } }],
            '@odata.nextLink': 'https://my.microsoftpersonalcontent.com/_api/v2.0/drives/CID/items/ROOT/children?page=2' });
      }
      if (u.pathname.endsWith('/items/TITUS/children')) {
        return json({ value: [
          { id: 'CID!t1pdf', name: '001 01-09-22.PDF', file: { mimeType: 'application/pdf' }, lastModifiedDateTime: '2022-01-09T00:00:00Z',
            '@content.downloadUrl': 'https://download.example/t1pdf' },
          { id: 'CID!t1mp3', name: '001 01-09-22 .mp3', file: { mimeType: 'audio/mpeg' }, lastModifiedDateTime: '2022-01-09T00:00:00Z',
            '@content.downloadUrl': 'https://download.example/t1mp3' },
        ] });
      }
    }
    if (url === 'https://download.example/t1pdf') return pdfResponse();
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
    if (u.pathname === '/drive/v3/files/pdf1') return pdfResponse();
    return json({ error: { message: `unexpected ${url}` } }, 404);
  };
  return { fetchImpl, calls, authHeaders };
}

function tempSite(series = SERIES) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sermons-'));
  fs.mkdirSync(path.join(root, 'data'));
  fs.writeFileSync(path.join(root, 'data', 'series.json'), JSON.stringify(series));
  return root;
}
const withTitus = (subfolder = 'Titus') => ({
  ...SERIES,
  series: [...SERIES.series, { id: 'titus', title: 'Titus', folder: SHARE, subfolder, current: true, summary: null, overrides: {} }],
});
// What a visitor's link points at: the share it opens and the item it shows.
const opened = (link) => {
  const u = new URL(link);
  return { host: u.host, share: Buffer.from(u.searchParams.get('redeem'), 'base64').toString(), item: u.searchParams.get('id') };
};
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

test('merges saved video notes and records which ones it applied', async () => {
  const root = tempSite();
  fs.writeFileSync(path.join(root, 'data', 'video-notes.json'), JSON.stringify({
    vid2: { date: '2022-01-16', title: 'Count It All Joy', summary: 'On trials.', source: 'youtube-auto-captions' },
  }));
  await run({ key: 'k', fetchImpl: fakeGoogle().fetchImpl, rootDir: root, log: quiet });
  expect(readOut(root).recent[0]).toMatchObject({ videoId: 'vid2', title: 'Count It All Joy', summary: 'On trials.' });
  expect(JSON.parse(fs.readFileSync(path.join(root, 'data', 'cache', 'applied-video-notes.json'), 'utf8')))
    .toEqual({ vid2: { title: 'Count It All Joy', summary: 'On trials.' } });
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

test('PDFs read by an older version of the header reader are read again', async () => {
  const root = tempSite();
  fs.mkdirSync(path.join(root, 'data', 'cache'));
  fs.writeFileSync(path.join(root, 'data', 'cache', 'pdf-headers.json'), JSON.stringify({
    pdf1: { modifiedTime: '2022-01-09T00:00:00Z', title: null, passage: null }, // no "parser" version: old
  }));
  const { fetchImpl, calls } = fakeGoogle();
  await run({ key: 'k', fetchImpl, rootDir: root, log: quiet });
  expect(calls.some((u) => u.includes('/files/pdf1'))).toBe(true);
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

test.describe('OneDrive series', () => {
  test('are read with a guest token, with links a signed-out visitor can open', async () => {
    const root = tempSite(withTitus());
    const fake = fakeGoogle();
    await run({ key: 'k', fetchImpl: fake.fetchImpl, rootDir: root, log: quiet });
    const data = readOut(root);
    const titus = data.series.find((s) => s.id === 'titus');

    expect(validateSermons(data)).toEqual([]);
    expect(fake.authHeaders.every((h) => h === 'Badger GUEST')).toBe(true);
    // Notes PDF read for its title; file name quirks (".PDF", a space before ".mp3") still pair up.
    expect(titus.sermons).toHaveLength(1);
    expect(titus.sermons[0]).toMatchObject({ title: 'You Can Have Joy No Matter What', passage: 'James 1:1-4' });
    // Links go through the share (so no sign-in is needed) to the right file or folder.
    expect(opened(titus.sermons[0].notesUrl)).toEqual({ host: 'onedrive.live.com', share: SHARE, item: 'CID!t1pdf' });
    expect(opened(titus.sermons[0].audioUrl)).toEqual({ host: 'onedrive.live.com', share: SHARE, item: 'CID!t1mp3' });
    expect(opened(titus.folderUrl)).toEqual({ host: 'onedrive.live.com', share: SHARE, item: 'TITUS' });
    // Drive series still work alongside.
    expect(data.series.find((s) => s.id === 'james').sermons[0].notesUrl).toBe('https://drive.google.com/file/d/pdf1/view');
    // The guest token is never written anywhere.
    expect(fs.readFileSync(path.join(root, 'data', 'sermons.json'), 'utf8')).not.toContain('GUEST');
  });

  test('a renamed subfolder fails the run with a clear message and leaves data untouched', async () => {
    const root = tempSite(withTitus('Tituss'));
    const out = path.join(root, 'data', 'sermons.json');
    fs.writeFileSync(out, 'previous data');
    await expect(run({ key: 'k', fetchImpl: fakeGoogle().fetchImpl, rootDir: root, log: quiet }))
      .rejects.toThrow(/folder "Tituss" for Titus/);
    expect(fs.readFileSync(out, 'utf8')).toBe('previous data');
  });

  for (const [name, fail, message] of [
    ['the share is no longer public', '/shares/', /Titus.*Anyone with the link can view/],
    ['Microsoft refuses the guest token', 'api-badgerp', /guest token/],
  ]) {
    test(`when ${name}, the run fails with a clear message`, async () => {
      await expect(run({ key: 'k', fetchImpl: fakeGoogle({ fail }).fetchImpl, rootDir: tempSite(withTitus()), log: quiet }))
        .rejects.toThrow(message);
    });
  }
});
