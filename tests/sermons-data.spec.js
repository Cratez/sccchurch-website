/**
 * FEATURE: Sermon data files and their contract. The hand-edited series list, the generated
 *          sermons.json (checked against the shared validator), and the daily update workflow.
 * COVERS:  data/series.json, data/sermons.json, scripts/build-sermons/validate.js,
 *          .github/workflows/update-sermons.yml
 * WHY:     data/series.json is edited by hand; a typo would break the daily job. sermons.json is
 *          what the Sermons page reads, so a malformed commit would break the page.
 * UPDATE WHEN: the data format (version) or the workflow changes.
 * REMOVE WHEN: the sermon data job is removed.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./support/fixtures');
const { validateSermons } = require('../scripts/build-sermons/validate');

test.skip(({ isMobile }) => isMobile, 'No browser needed; runs once in the desktop project.');

const root = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

test('data/series.json is well-formed', () => {
  const config = readJson('data/series.json');
  expect(Array.isArray(config.hiddenVideos)).toBe(true);
  const ids = config.series.map((s) => s.id);
  expect(new Set(ids).size, 'series ids must be unique').toBe(ids.length);
  for (const s of config.series) {
    expect(s.id, 'ids are lowercase words joined by dashes').toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(typeof s.title).toBe('string');
    if (/^https:\/\/1drv\.ms\//.test(s.folder)) {
      expect(typeof s.subfolder, `${s.title} needs the name of its OneDrive "subfolder"`).toBe('string');
    } else {
      expect(s.folder, `${s.title} needs a Drive folder or OneDrive share link`).toMatch(/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+/);
    }
    if ('current' in s) expect(typeof s.current).toBe('boolean');
    if (s.overrides) {
      for (const key of Object.keys(s.overrides)) expect(key, 'override keys are file names without extension').toMatch(/^\d+(\.\d+)? \d{2}-\d{2}-\d{2}$/);
    }
  }
});

test('the committed data/sermons.json is valid and lists every configured series', () => {
  const data = readJson('data/sermons.json');
  expect(validateSermons(data)).toEqual([]);
  expect(data.series.map((s) => s.id).sort()).toEqual(readJson('data/series.json').series.map((s) => s.id).sort());
});

test.describe('validateSermons catches broken data', () => {
  const good = () => ({
    version: 2, generatedAt: 'x', streamsUrl: 'https://www.youtube.com/x',
    recent: [{ videoId: 'v', url: 'https://youtu.be/v', thumbnail: 'https://i.ytimg.com/v', date: '2026-10-18', youtubeTitle: 'SCCC', title: null, live: false, summary: null, sermon: null }],
    series: [{ id: 'a', title: 'A', current: false, folderUrl: 'https://drive.google.com/x', summary: null, firstDate: null, lastDate: null,
      sermons: [{ key: '001 01-09-22', number: '1', date: '2022-01-09', title: null, passage: null, notesUrl: null, audioUrl: null, videoUrl: null, summary: null }] }],
  });

  test('accepts good data', () => {
    expect(validateSermons(good())).toEqual([]);
  });

  test('rejects a bad date, missing key, too many recent items, duplicate ids, and non-https links', () => {
    const cases = [
      [(d) => { d.recent[0].date = '10/18/2026'; }, /recent\[0\]\.date/],
      [(d) => { delete d.series[0].sermons[0].notesUrl; }, /notesUrl is missing/],
      [(d) => { d.recent = Array(7).fill(d.recent[0]); }, /at most 6/],
      [(d) => { d.series.push({ ...d.series[0] }); }, /used more than once/],
      [(d) => { d.series[0].folderUrl = 'http://drive.google.com/x'; }, /folderUrl should be an https URL/],
      [(d) => { d.version = 3; }, /version/],
    ];
    for (const [breakIt, message] of cases) {
      const d = good();
      breakIt(d);
      expect(validateSermons(d).join('\n')).toMatch(message);
    }
  });
});

test('the daily workflow runs the job with the key from GitHub secrets', () => {
  const yml = fs.readFileSync(path.join(root, '.github/workflows/update-sermons.yml'), 'utf8');
  expect(yml).toContain('npm run sermons');
  expect(yml).toContain('GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}');
  expect(yml).toContain('workflow_dispatch');
  expect(yml).toMatch(/contents: write/);
});
