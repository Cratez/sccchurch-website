// Copies saved service titles/summaries (data/video-notes.json) into data/sermons.json right away,
// so they show on the Sermons page without waiting for the daily "Update sermon data" job.
// Run by the summarize-services skill after saving notes: node scripts/video-notes/apply.js
//
// Same rules as the job (scripts/build-sermons/build.js): a title from a notes PDF or an override
// is never replaced; notes only fill a title/summary that's empty, or that came from an earlier
// version of the notes. data/cache/applied-video-notes.json records what was last applied (the job
// writes it too), so an edited or redone note replaces its old text, and a deleted note removes it.
const fs = require('fs');
const path = require('path');
const { validateSermons } = require('../build-sermons/validate');

const APPLIED = path.join('data', 'cache', 'applied-video-notes.json');

// Just the parts of each note that end up on the page.
const snapshot = (notes) => Object.fromEntries(Object.entries(notes).map(([id, n]) =>
  [id, { title: n.title ?? null, summary: n.summary ?? null }]));

// Returns the list of changes; updates `data` in place.
function applyVideoNotes(data, notes, previous = {}) {
  const changes = [];
  const ids = new Set([...Object.keys(snapshot(notes)), ...Object.keys(previous)]);
  const set = (obj, field, id, where) => {
    const value = (notes[id] && notes[id][field]) ?? null;
    const old = previous[id] ? previous[id][field] : undefined;
    const replaceable = obj[field] == null || (old != null && obj[field] === old);
    if (replaceable && obj[field] !== value) {
      changes.push(`${where} ${field}: ${JSON.stringify(obj[field])} -> ${JSON.stringify(value)}`);
      obj[field] = value;
    }
  };

  for (const id of ids) {
    const r = data.recent.find((v) => v.videoId === id);
    if (r) {
      set(r, 'title', id, `recent ${r.date}`);
      set(r, 'summary', id, `recent ${r.date}`);
      if (r.sermon) set(r.sermon, 'title', id, `recent ${r.date} sermon`);
    }
    for (const s of data.series) {
      for (const m of s.sermons) {
        if (m.videoUrl !== `https://www.youtube.com/watch?v=${id}`) continue;
        set(m, 'title', id, `${s.title} #${m.number}`);
        set(m, 'summary', id, `${s.title} #${m.number}`);
      }
    }
  }
  return changes;
}

function run({ rootDir = path.resolve(__dirname, '..', '..'), log = console.log } = {}) {
  const read = (p, fallback) => {
    const file = path.join(rootDir, p);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
  };
  const data = read(path.join('data', 'sermons.json'));
  const notes = read(path.join('data', 'video-notes.json'), {});
  const changes = applyVideoNotes(data, notes, read(APPLIED, {}));

  const errors = validateSermons(data);
  if (errors.length) throw new Error(`Result would be invalid:\n- ${errors.join('\n- ')}`);
  if (changes.length) fs.writeFileSync(path.join(rootDir, 'data', 'sermons.json'), JSON.stringify(data, null, 2) + '\n');
  fs.mkdirSync(path.join(rootDir, 'data', 'cache'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, APPLIED), JSON.stringify(snapshot(notes), null, 2) + '\n');

  log(changes.length ? `Updated data/sermons.json:\n- ${changes.join('\n- ')}` : 'data/sermons.json already up to date.');
  return changes;
}

module.exports = { applyVideoNotes, snapshot, run, APPLIED };

if (require.main === module) {
  try { run(); } catch (err) { console.error(err.message); process.exit(1); }
}
