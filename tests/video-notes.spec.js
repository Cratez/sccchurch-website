/**
 * FEATURE: Service titles and summaries from YouTube auto-captions. The local transcript script
 *          used by the summarize-services skill, and the saved notes file it fills.
 * COVERS:  scripts/video-notes/transcripts.js, data/video-notes.json,
 *          .claude/skills/summarize-services/SKILL.md (the format it tells Claude to write)
 * WHY:     Auto-caption files repeat every line and carry timing tags; the transcript must come
 *          out clean. data/video-notes.json is written by Claude and edited by hand, so a bad
 *          entry must be caught before the daily job reads it.
 * UPDATE WHEN: the caption download (yt-dlp options), the notes file format, or the skill's
 *              length rules change.
 * REMOVE WHEN: titles from captions are no longer used.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('./support/fixtures');
const { vttToText, pickTargets, fetchTranscript } = require('../scripts/video-notes/transcripts');

test.skip(({ isMobile }) => isMobile, 'No browser needed; runs once in the desktop project.');

const VTT = fs.readFileSync(path.join(__dirname, 'fixtures', 'auto-captions.en-orig.vtt'), 'utf8');

test('turns an auto-caption file into clean text, each line once', () => {
  expect(vttToText(VTT)).toBe('okay well good morning welcome to South Clackamas faith without works is dead & alone');
});

test.describe('pickTargets', () => {
  const sermons = { recent: [
    { videoId: 'live', date: '2026-10-25', live: true },
    { videoId: 'done', date: '2026-10-18', live: false },
    { videoId: 'new1', date: '2026-10-11', live: false },
  ] };

  test('picks recent services without notes, skipping one that is still live', () => {
    expect(pickTargets(sermons, { done: {} }).map((v) => v.videoId)).toEqual(['new1']);
  });

  test('with specific videos, picks exactly those (even if they have notes)', () => {
    expect(pickTargets(sermons, { done: {} }, ['done', 'older']).map((v) => v.videoId)).toEqual(['done', 'older']);
  });
});

test.describe('fetchTranscript', () => {
  const out = () => fs.mkdtempSync(path.join(os.tmpdir(), 'transcripts-test-'));
  // A fake yt-dlp: writes the given caption files where yt-dlp's -o template points.
  const fakeYtDlp = (files, extra = {}) => (cmd, args) => {
    const dir = path.dirname(args[args.indexOf('-o') + 1]);
    for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
    return { status: 0, stdout: '', stderr: '', cmd, args, ...extra };
  };

  test('downloads auto-captions, prefers the original track, and writes the transcript', () => {
    let seen;
    const dir = out();
    const run = (cmd, args) => { seen = { cmd, args }; return fakeYtDlp({ 'abc.en.vtt': 'WEBVTT\n\nprocessed copy', 'abc.en-orig.vtt': VTT })(cmd, args); };
    const r = fetchTranscript('abc', dir, run);
    expect(r).toMatchObject({ videoId: 'abc', status: 'ok', words: 15 });
    expect(fs.readFileSync(r.file, 'utf8')).toContain('faith without works is dead');
    expect(seen.cmd).toBe('yt-dlp');
    expect(seen.args).toEqual(expect.arrayContaining(['--skip-download', '--write-auto-subs', '--js-runtimes', 'node', 'https://www.youtube.com/watch?v=abc']));
  });

  test('reports a video with no captions', () => {
    expect(fetchTranscript('abc', out(), fakeYtDlp({}))).toEqual({ videoId: 'abc', status: 'no-captions' });
  });

  test('reports yt-dlp failures, with install help when it is missing', () => {
    const missing = () => ({ error: Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' }) });
    expect(fetchTranscript('abc', out(), missing)).toMatchObject({ status: 'error', error: expect.stringContaining('winget install yt-dlp') });
    const failed = fakeYtDlp({}, { status: 1, stderr: 'WARNING: x\nERROR: The page needs to be reloaded.' });
    expect(fetchTranscript('abc', out(), failed)).toEqual({ videoId: 'abc', status: 'error', error: 'ERROR: The page needs to be reloaded.' });
  });
});

test('data/video-notes.json entries are well-formed', () => {
  const notes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'video-notes.json'), 'utf8'));
  expect(typeof notes).toBe('object');
  const dates = [];
  for (const [id, n] of Object.entries(notes)) {
    expect(id, 'keys are YouTube video IDs').toMatch(/^[\w-]{11}$/);
    expect(n.date, `${id}: date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof n.title, `${id}: title`).toBe('string');
    expect(n.title.length, `${id}: title is short`).toBeLessThanOrEqual(80);
    expect(n.title, `${id}: no surrounding quotes`).not.toMatch(/^["“]|["”]$/);
    expect(typeof n.summary, `${id}: summary`).toBe('string');
    expect(n.summary.length, `${id}: summary under 300 characters`).toBeLessThanOrEqual(300);
    expect(n.source).toBe('youtube-auto-captions');
    dates.push(n.date);
  }
  expect(dates, 'newest first').toEqual([...dates].sort().reverse());
});

// Applying saved notes to data/sermons.json right away (scripts/video-notes/apply.js), so they
// show without waiting for the daily job. Same rules as the job: PDF/override titles win.
test.describe('applying notes to sermons.json', () => {
  const { applyVideoNotes, run } = require('../scripts/video-notes/apply');
  const { validateSermons } = require('../scripts/build-sermons/validate');
  const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'sermons.json'), 'utf8'));
  const note = (title, summary) => ({ date: '2026-10-11', title, summary, source: 'youtube-auto-captions' });
  const data = () => structuredClone(FIXTURE);
  const recent = (d, id) => d.recent.find((r) => r.videoId === id);

  test('fills an untitled service and its sermon in the series list', () => {
    const d = data();
    const changes = applyVideoNotes(d, { vid00001011: note('Waiting Well', 'On patience.') });
    expect(recent(d, 'vid00001011')).toMatchObject({ title: 'Waiting Well', summary: 'On patience.' });
    // Acts #1 is linked to that video and has no PDF title.
    expect(d.series[0].sermons[0]).toMatchObject({ title: 'Waiting Well', summary: 'On patience.' });
    expect(changes.length).toBeGreaterThan(0);
    expect(validateSermons(d)).toEqual([]);
  });

  test('never replaces a title from a notes PDF, but still adds the summary', () => {
    const d = data();
    recent(d, 'vid00001018').summary = null;
    applyVideoNotes(d, { vid00001018: note('Caption Title', 'Caption summary.') });
    expect(recent(d, 'vid00001018')).toMatchObject({ title: 'Waiting for the Promise', summary: 'Caption summary.' });
    expect(recent(d, 'vid00001018').sermon.title).toBe('Waiting for the Promise');
    expect(d.series[0].sermons[1].title).toBe('Waiting for the Promise');
  });

  test('an edited or redone note replaces its earlier text; a deleted note removes it', () => {
    const d = data();
    applyVideoNotes(d, { vid00001011: note('First Try', 'Old summary.') });
    applyVideoNotes(d, { vid00001011: note('Better Title', 'New summary.') }, { vid00001011: { title: 'First Try', summary: 'Old summary.' } });
    expect(recent(d, 'vid00001011')).toMatchObject({ title: 'Better Title', summary: 'New summary.' });
    applyVideoNotes(d, {}, { vid00001011: { title: 'Better Title', summary: 'New summary.' } });
    expect(recent(d, 'vid00001011')).toMatchObject({ title: null, summary: null });
    expect(d.series[0].sermons[0].title).toBeNull();
  });

  test('running it updates data/sermons.json and records what was applied', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-notes-'));
    fs.mkdirSync(path.join(root, 'data'));
    fs.writeFileSync(path.join(root, 'data', 'sermons.json'), JSON.stringify(FIXTURE));
    fs.writeFileSync(path.join(root, 'data', 'video-notes.json'), JSON.stringify({ vid00001004: note('Love One Another', 'On love.') }));
    run({ rootDir: root, log: () => {} });
    const out = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sermons.json'), 'utf8'));
    expect(recent(out, 'vid00001004')).toMatchObject({ title: 'Love One Another', summary: 'On love.' });
    expect(JSON.parse(fs.readFileSync(path.join(root, 'data', 'cache', 'applied-video-notes.json'), 'utf8')))
      .toEqual({ vid00001004: { title: 'Love One Another', summary: 'On love.' } });
  });
});

test('the committed data/sermons.json already includes every saved note', () => {
  const { applyVideoNotes } = require('../scripts/video-notes/apply');
  const read = (p, fb) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb);
  const root = path.join(__dirname, '..');
  const d = read(path.join(root, 'data', 'sermons.json'));
  const changes = applyVideoNotes(d, read(path.join(root, 'data', 'video-notes.json'), {}),
    read(path.join(root, 'data', 'cache', 'applied-video-notes.json'), {}));
  expect(changes, 'run: node scripts/video-notes/apply.js').toEqual([]);
});
