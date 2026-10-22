// Builds data/sermons.json from YouTube and Google Drive. Run with: npm run sermons
// Needs the GOOGLE_API_KEY environment variable (see "Sermon data" in README.md).
// If any source fails, nothing is written, so the site keeps its last good data.
const fs = require('fs');
const path = require('path');
const { listStreams } = require('./youtube');
const { folderId, listFolder, download } = require('./drive');
const { firstPageText } = require('./pdf');
const { assemble, parseFileName, parseNotesHeader, HEADER_PARSER_VERSION } = require('./build');
const { validateSermons } = require('./validate');
const { snapshot } = require('../video-notes/apply');

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw err;
  }
};
const writeJson = (file, obj) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
};

async function run({ key, fetchImpl = fetch, rootDir = path.resolve(__dirname, '..', '..'), now = new Date(), log = console.log }) {
  if (!key) throw new Error('GOOGLE_API_KEY is not set. See "Sermon data" in README.md.');
  const dataDir = path.join(rootDir, 'data');
  const outFile = path.join(dataDir, 'sermons.json');
  const cacheFile = path.join(dataDir, 'cache', 'pdf-headers.json');

  const config = readJson(path.join(dataDir, 'series.json'));
  const cache = readJson(cacheFile, {});
  const videoNotes = readJson(path.join(dataDir, 'video-notes.json'), {});
  const warnings = [];

  const streams = await listStreams(key, fetchImpl);
  const folders = {};
  for (const s of config.series) folders[s.id] = await listFolder(folderId(s.folder), key, fetchImpl, s.title);

  // Read titles/passages from notes PDFs that are new or changed since the last run.
  const newCache = {};
  for (const s of config.series) {
    for (const f of folders[s.id]) {
      const parsed = parseFileName(f.name);
      if (!parsed || parsed.kind !== 'notes') continue;
      const cached = cache[f.id];
      if (cached && cached.modifiedTime === f.modifiedTime && cached.parser === HEADER_PARSER_VERSION) {
        newCache[f.id] = cached;
        continue;
      }
      let header = { title: null, passage: null };
      try {
        header = parseNotesHeader(await firstPageText(await download(f.id, key, fetchImpl)));
      } catch (err) {
        warnings.push(`Couldn't read "${f.name}" in ${s.title}: ${err.message}`);
      }
      newCache[f.id] = { modifiedTime: f.modifiedTime, parser: HEADER_PARSER_VERSION, ...header };
    }
  }

  const built = assemble({ config, streams, folders, headers: newCache, videoNotes });
  warnings.push(...built.warnings);

  // Keep the old timestamp when nothing else changed, so the daily run doesn't commit for nothing.
  const order = ['version', 'generatedAt', 'streamsUrl', 'recent', 'series'];
  const ordered = (d) => Object.fromEntries(order.map((k) => [k, d[k]]));
  const withoutTime = (d) => JSON.stringify({ ...ordered(d), generatedAt: null });
  let previous = null;
  try { previous = readJson(outFile, null); } catch { /* unreadable old file: treat as changed */ }
  const same = previous && withoutTime(previous) === withoutTime(built.data);
  const output = ordered({ ...built.data, generatedAt: same ? previous.generatedAt : now.toISOString() });

  const errors = validateSermons(output);
  if (errors.length) throw new Error(`Built data is invalid:\n- ${errors.join('\n- ')}`);

  writeJson(outFile, output);
  writeJson(cacheFile, newCache);
  // Record which video notes this data includes (see scripts/video-notes/apply.js).
  writeJson(path.join(dataDir, 'cache', 'applied-video-notes.json'), snapshot(videoNotes));

  log(`Wrote ${path.relative(rootDir, outFile)}: ${output.recent.length} recent services, `
    + `${output.series.map((s) => `${s.title} (${s.sermons.length})`).join(', ')}`);
  for (const w of warnings) log(`Warning: ${w}`);
  if (process.env.GITHUB_STEP_SUMMARY && warnings.length) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Sermon data warnings\n\n${warnings.map((w) => `- ${w}`).join('\n')}\n`);
  }
  return { data: output, warnings };
}

module.exports = { run };

if (require.main === module) {
  run({ key: process.env.GOOGLE_API_KEY }).catch((err) => {
    console.error(`Sermon data was not updated: ${err.message}`);
    process.exit(1);
  });
}
