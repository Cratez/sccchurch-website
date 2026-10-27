/**
 * FEATURE: Sermon data job, core logic. Turns YouTube streams and Drive files into
 *          data/sermons.json: file-name parsing, grouping, PDF header parsing, Pacific dates,
 *          matching videos to sermons, ordering.
 * COVERS:  scripts/build-sermons/build.js (and the contract in scripts/build-sermons/validate.js)
 * WHY:     This is where the naming conventions ("001 01-09-22.mp3", the "James #1" PDF header)
 *          and the date matching live. Mistakes here show wrong links on the Sermons page.
 * UPDATE WHEN: the Drive file naming, PDF header format, or ordering/matching rules change.
 * REMOVE WHEN: the sermon data job is removed.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./support/fixtures');
const { parseFileName, groupFiles, parseNotesHeader, videoDate, assemble } = require('../scripts/build-sermons/build');
const { validateSermons } = require('../scripts/build-sermons/validate');

test.skip(({ isMobile }) => isMobile, 'No browser needed; runs once in the desktop project.');

test.describe('parseFileName', () => {
  test('reads number, date, and kind', () => {
    expect(parseFileName('001 01-09-22.mp3')).toEqual({ key: '001 01-09-22', number: '1', date: '2022-01-09', kind: 'audio', typo: false });
    expect(parseFileName('001.5 01-31-21.pdf')).toEqual({ key: '001.5 01-31-21', number: '1.5', date: '2021-01-31', kind: 'notes', typo: false });
    expect(parseFileName('010 08-01-21.M4A').kind).toBe('audio');
  });

  // Real names from the James folder (first sermon data run, October 2026).
  test('accepts a letter for a sermon split over two Sundays, with or without a space', () => {
    expect(parseFileName('032 A 12-04-22.pdf')).toMatchObject({ key: '032A 12-04-22', number: '32A', date: '2022-12-04', typo: false });
    expect(parseFileName('032B 12-11-22.mp3')).toMatchObject({ key: '032B 12-11-22', number: '32B', date: '2022-12-11', typo: false });
  });

  test('accepts a "(part N)" suffix', () => {
    expect(parseFileName('024 07-24-22 (part 1).pdf')).toMatchObject({ key: '024 07-24-22 (part 1)', number: '24 (part 1)', date: '2022-07-24', typo: false });
    expect(parseFileName('028 10-02-22 (Part 2).mp3')).toMatchObject({ key: '028 10-02-22 (part 2)', number: '28 (part 2)' });
  });

  test('reads small typos in the date, and flags them', () => {
    expect(parseFileName('019 05-29=22.mp3')).toMatchObject({ key: '019 05-29-22', date: '2022-05-29', typo: true });
    expect(parseFileName('008 02-27 -22.mp3')).toMatchObject({ key: '008 02-27-22', date: '2022-02-27', typo: true });
    expect(parseFileName('028  01-10-21.pdf')).toMatchObject({ key: '028 01-10-21', typo: true });
  });

  test('rejects names that do not follow "NNN MM-DD-YY.ext"', () => {
    for (const name of ['notes.docx', '001 13-40-22.pdf', '001 1-9-22.pdf', '001 02-30-22.mp3', 'James 01-09-22.pdf', '001 01-09-22.docx', 'Intro to Author.pdf']) {
      expect(parseFileName(name), name).toBeNull();
    }
  });
});

test.describe('groupFiles', () => {
  const f = (id, name, modifiedTime = '2022-01-01T00:00:00Z') => ({ id, name, modifiedTime });

  test('pairs audio and notes by name, and allows notes-only sermons', () => {
    const { sermons, warnings } = groupFiles([f('a', '001 01-09-22.mp3'), f('b', '001 01-09-22.pdf'), f('c', '001.5 01-16-22.pdf')], 'James');
    expect(warnings).toEqual([]);
    expect(sermons.get('001 01-09-22')).toMatchObject({ audioFile: { id: 'a' }, notesFile: { id: 'b' } });
    expect(sermons.get('001.5 01-16-22').audioFile).toBeUndefined();
  });

  test('skips and warns about files that are not audio or PDF', () => {
    const { sermons, warnings } = groupFiles([f('a', 'Sermon notes.docx'), f('b', 'Series outline')], 'James');
    expect(sermons.size).toBe(0);
    expect(warnings[0]).toContain('Skipped "Sermon notes.docx" in James');
    expect(warnings).toHaveLength(2);
  });

  test('keeps undated audio/PDF files (like a series introduction) as extras, paired by name', () => {
    const { sermons, warnings } = groupFiles([f('a', 'Intro to Author.pdf'), f('b', 'Intro to  Author.mp3')], 'James');
    expect(warnings).toEqual([]);
    expect(sermons.get('Intro to Author')).toMatchObject({ number: null, date: null, notesFile: { id: 'a' }, audioFile: { id: 'b' } });
  });

  test('pairs a misspelled file with its correctly named partner, and suggests renaming it', () => {
    const { sermons, warnings } = groupFiles([f('a', '008 02-27 -22.mp3'), f('b', '008 02-27-22.pdf')], 'James');
    expect(sermons.size).toBe(1);
    expect(sermons.get('008 02-27-22')).toMatchObject({ audioFile: { id: 'a' }, notesFile: { id: 'b' } });
    expect(warnings).toEqual(['Read "008 02-27 -22.mp3" in James as "008 02-27-22". Consider renaming it.']);
  });

  test('keeps the most recently changed duplicate and warns', () => {
    const { sermons, warnings } = groupFiles([
      f('old', '001 01-09-22.pdf', '2022-01-01T00:00:00Z'),
      f('new', '001 01-09-22.PDF', '2022-02-01T00:00:00Z'),
      f('older', '001 01-09-22.pdf', '2021-12-01T00:00:00Z'),
    ], 'James');
    expect(sermons.get('001 01-09-22').notesFile.id).toBe('new');
    expect(warnings).toHaveLength(2);
  });
});

test.describe('parseNotesHeader', () => {
  const header = fs.readFileSync(path.join(__dirname, 'fixtures', 'notes-header-james-1.txt'), 'utf8');

  test('reads the title and passage from a standard header', () => {
    expect(parseNotesHeader(header)).toEqual({ title: 'You Can Have Joy No Matter What', passage: 'James 1:1-4' });
  });

  test('passage is null without a "Text:" line', () => {
    expect(parseNotesHeader('James #2\nCount It All Joy\nJanuary 16, 2022\nI. Outline')).toEqual({ title: 'Count It All Joy', passage: null });
  });

  test('title is null without a "#" line, or when the line after it is the passage', () => {
    expect(parseNotesHeader('Some notes\nText: James 1:5').title).toBeNull();
    expect(parseNotesHeader('James #3\nJanuary 23, 2022\nText: James 1:5-8\nI. An outline point')).toEqual({ title: null, passage: 'James 1:5-8' });
  });

  // Variants seen in real notes (James #9, James #6).
  test('accepts "Text-" and a numeric date like "3-6-22"', () => {
    expect(parseNotesHeader('James #9\nPure and Undefiled Religion\n3-6-22\nText- James 1:26-27\nI. Doers'))
      .toEqual({ title: 'Pure and Undefiled Religion', passage: 'James 1:26-27' });
    expect(parseNotesHeader('James #9\n3-6-22\nText- James 1:26-27\nI. Doers')).toEqual({ title: null, passage: 'James 1:26-27' });
  });

  test('handles empty input', () => {
    expect(parseNotesHeader('')).toEqual({ title: null, passage: null });
  });
});

test.describe('videoDate', () => {
  test('uses the stream start in Pacific time, so Sunday evening stays Sunday', () => {
    expect(videoDate({ actualStartTime: '2026-10-19T02:30:00Z' })).toBe('2026-10-18');
    expect(videoDate({ actualStartTime: '2026-10-18T17:25:00Z' })).toBe('2026-10-18');
  });

  test('falls back to the date in the title, then the publish time', () => {
    expect(videoDate({ title: 'SCCC 10/18/2026', publishedAt: '2026-10-20T00:00:00Z' })).toBe('2026-10-18');
    expect(videoDate({ title: 'SCCC 3/1/2026' })).toBe('2026-03-01');
    expect(videoDate({ title: 'Special service', publishedAt: '2026-10-19T03:00:00Z' })).toBe('2026-10-18');
  });
});

test.describe('assemble', () => {
  const file = (id, name) => ({ id, name, mimeType: 'x', modifiedTime: '2022-01-01T00:00:00Z' });
  const stream = (videoId, day, extra = {}) => ({
    videoId, title: `SCCC ${day}`, publishedAt: `${day}T20:00:00Z`, actualStartTime: `${day}T17:25:00Z`, live: false, ...extra,
  });
  const config = {
    hiddenVideos: ['hidden1'],
    series: [
      { id: 'james', title: 'James', folder: 'https://drive.google.com/drive/folders/J', overrides: { '002 01-16-22': { title: 'Override title' } } },
      { id: 'jude', title: 'Jude', folder: 'https://drive.google.com/drive/folders/U', summary: 'A short letter.' },
      { id: 'acts', title: 'Acts', folder: 'https://drive.google.com/drive/folders/A', current: true },
      { id: 'empty', title: 'Empty', folder: 'https://drive.google.com/drive/folders/E' },
    ],
  };
  const folders = {
    james: [file('j1a', '001 01-09-22.mp3'), file('j1n', '001 01-09-22.pdf'), file('j2n', '002 01-16-22.pdf')],
    jude: [file('u1n', '001 08-01-21.pdf')],
    acts: [file('a1n', '001 10-11-26.pdf'), file('a1a', '001 10-11-26.mp3')],
    empty: [],
  };
  const headers = {
    j1n: { title: 'You Can Have Joy No Matter What', passage: 'James 1:1-4' },
    j2n: { title: 'Parsed title', passage: 'James 1:5-8' },
    a1n: { title: 'The Promise of Power', passage: 'Acts 1:1-8' },
  };
  const streams = [
    stream('v0109', '2022-01-09'),
    stream('v1004', '2026-10-04'), stream('v1011', '2026-10-11'), stream('v1018', '2026-10-18'),
    stream('v0927', '2026-09-27'), stream('v0920', '2026-09-20'), stream('v0913', '2026-09-13'),
    stream('hidden1', '2026-10-19'),
    stream('live1', '2026-10-25', { live: true, actualStartTime: '2026-10-25T17:25:00Z' }),
  ];
  const build = () => assemble({ config, streams, folders, headers });

  test('produces valid data', () => {
    const { data } = build();
    expect(validateSermons({ ...data, generatedAt: 'x' })).toEqual([]);
  });

  test('orders series: current first, then newest, and fills date ranges', () => {
    const { series } = build().data;
    expect(series.map((s) => s.id)).toEqual(['acts', 'james', 'jude', 'empty']);
    expect(series[1]).toMatchObject({ firstDate: '2022-01-09', lastDate: '2022-01-16' });
    expect(series[3]).toMatchObject({ firstDate: null, lastDate: null, sermons: [] });
    expect(series[2].summary).toBe('A short letter.');
  });

  test('builds sermon entries with parsed headers, overrides, and links', () => {
    const james = build().data.series.find((s) => s.id === 'james');
    expect(james.sermons[0]).toEqual({
      key: '001 01-09-22', number: '1', date: '2022-01-09',
      title: 'You Can Have Joy No Matter What', passage: 'James 1:1-4',
      notesUrl: 'https://drive.google.com/file/d/j1n/view', audioUrl: 'https://drive.google.com/file/d/j1a/view',
      videoUrl: 'https://www.youtube.com/watch?v=v0109', summary: null,
    });
    expect(james.sermons[1]).toMatchObject({ title: 'Override title', passage: 'James 1:5-8', audioUrl: null, videoUrl: null });
  });

  test('recent: 6 newest, hidden videos left out, live flagged, matched sermon attached', () => {
    const { recent } = build().data;
    expect(recent.map((r) => r.videoId)).toEqual(['live1', 'v1018', 'v1011', 'v1004', 'v0927', 'v0920']);
    expect(recent[0].live).toBe(true);
    expect(recent[1].live).toBe(false);
    expect(recent[1].sermon).toBeNull();
    expect(recent[2].sermon).toEqual({
      seriesId: 'acts', seriesTitle: 'Acts', number: '1', title: 'The Promise of Power', passage: 'Acts 1:1-8',
      notesUrl: 'https://drive.google.com/file/d/a1n/view', audioUrl: 'https://drive.google.com/file/d/a1a/view',
    });
    expect(recent[2]).toMatchObject({ url: 'https://www.youtube.com/watch?v=v1011', thumbnail: 'https://i.ytimg.com/vi/v1011/hqdefault.jpg', date: '2026-10-11' });
  });

  test('a sermon links to the earliest stream on its date', () => {
    const { data } = assemble({
      config, folders, headers,
      streams: [stream('late', '2022-01-09', { actualStartTime: '2022-01-10T02:00:00Z' }), stream('early', '2022-01-09')],
    });
    expect(data.series.find((s) => s.id === 'james').sermons[0].videoUrl).toBe('https://www.youtube.com/watch?v=early');
  });

  test('undated extras come first, are titled by file name, and don\'t affect dates or matching', () => {
    const { data } = assemble({
      config, headers, streams,
      folders: {
        ...folders,
        james: [...folders.james, file('ia', 'Intro to Author.mp3'), file('in', 'Intro to Author.pdf'),
          file('pa', '024 07-31-22 (part 2).pdf'), file('pb', '024 07-24-22 (part 1).pdf'), file('ca', '032 A 12-04-22.pdf')],
      },
    });
    expect(validateSermons({ ...data, generatedAt: 'x' })).toEqual([]);
    const james = data.series.find((s) => s.id === 'james');
    expect(james.sermons.map((s) => s.number)).toEqual([null, '1', '2', '24 (part 1)', '24 (part 2)', '32A']);
    expect(james.sermons[0]).toMatchObject({
      key: 'Intro to Author', date: null, title: 'Intro to Author', videoUrl: null,
      notesUrl: 'https://drive.google.com/file/d/in/view', audioUrl: 'https://drive.google.com/file/d/ia/view',
    });
    expect(james).toMatchObject({ firstDate: '2022-01-09', lastDate: '2022-12-04' });
  });

  // Titles/summaries written from YouTube auto-captions (data/video-notes.json).
  test('video notes: a notes-PDF title wins, captions fill a missing title, and the summary is always used', () => {
    const videoNotes = {
      v0109: { title: 'Caption title for James 1', summary: 'Joy in trials.' }, // sermon has a PDF title
      v1011: { title: 'Caption title for Acts 1', summary: 'Waiting on the Spirit.' }, // PDF title too
      v1018: { title: 'Love One Another', summary: 'A sermon on love.' }, // no sermon match
    };
    const noTitle = { ...headers, j1n: { title: null, passage: 'James 1:1-4' } };
    const { data } = assemble({ config, streams, folders, headers: noTitle, videoNotes });
    expect(validateSermons({ ...data, generatedAt: 'x' })).toEqual([]);

    const james1 = data.series.find((s) => s.id === 'james').sermons[0];
    expect(james1).toMatchObject({ title: 'Caption title for James 1', summary: 'Joy in trials.' }); // PDF had no title
    const r1011 = data.recent.find((r) => r.videoId === 'v1011');
    expect(r1011).toMatchObject({ title: 'The Promise of Power', summary: 'Waiting on the Spirit.' }); // PDF title kept
    const r1018 = data.recent.find((r) => r.videoId === 'v1018');
    expect(r1018).toMatchObject({ title: 'Love One Another', summary: 'A sermon on love.', sermon: null });
    expect(data.recent.find((r) => r.videoId === 'v1004')).toMatchObject({ title: null, summary: null });

    // An override in data/series.json still beats both.
    const withOverride = structuredClone(config);
    withOverride.series[0].overrides = { '001 01-09-22': { title: 'Hand title', summary: 'Hand summary' } };
    const j1 = assemble({ config: withOverride, streams, folders, headers: noTitle, videoNotes }).data.series.find((s) => s.id === 'james').sermons[0];
    expect(j1).toMatchObject({ title: 'Hand title', summary: 'Hand summary' });
  });
});
