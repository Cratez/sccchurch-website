// Pure functions that turn raw YouTube/Drive data into sermons.json. No network access here,
// so everything can be tested with plain inputs. The output shape is checked by validate.js.
const { MAX_RECENT } = require('./validate');

const STREAMS_URL = 'https://www.youtube.com/@southclackamascommunitychu1171/streams';
const FILE_NAME = /^(\d+(?:\.\d+)?)\s+(\d{2})-(\d{2})-(\d{2})\.(mp3|m4a|wav|pdf)$/i;
const AUDIO = new Set(['mp3', 'm4a', 'wav']);
const pacificDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' });

const driveFileUrl = (id) => `https://drive.google.com/file/d/${id}/view`;
const videoUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

// "001 01-09-22.mp3" -> { key: "001 01-09-22", number: "1", date: "2022-01-09", kind: "audio" }
function parseFileName(name) {
  const m = FILE_NAME.exec(name);
  if (!m) return null;
  const [, num, mm, dd, yy, ext] = m;
  const date = `20${yy}-${mm}-${dd}`;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return null; // e.g. 13-40-22
  return {
    key: name.slice(0, name.lastIndexOf('.')),
    number: num.replace(/^0+(?=\d)/, ''),
    date,
    kind: AUDIO.has(ext.toLowerCase()) ? 'audio' : 'notes',
  };
}

// Groups a folder's files into sermons by their "NNN MM-DD-YY" name.
function groupFiles(files, seriesTitle) {
  const sermons = new Map();
  const warnings = [];
  for (const f of files) {
    const p = parseFileName(f.name);
    if (!p) {
      warnings.push(`Skipped "${f.name}" in ${seriesTitle}: name doesn't match "NNN MM-DD-YY.ext"`);
      continue;
    }
    if (!sermons.has(p.key)) sermons.set(p.key, { key: p.key, number: p.number, date: p.date });
    const s = sermons.get(p.key);
    const slot = p.kind === 'audio' ? 'audioFile' : 'notesFile';
    if (s[slot]) {
      warnings.push(`Two ${p.kind} files for "${p.key}" in ${seriesTitle}; using the most recently changed one`);
      if ((f.modifiedTime || '') <= (s[slot].modifiedTime || '')) continue;
    }
    s[slot] = f;
  }
  return { sermons, warnings };
}

// Reads the title and passage from the top of a notes PDF, e.g.
//   James #1 / You Can Have Joy No Matter What / January 9, 2022 / Text: James 1:1-4
function parseNotesHeader(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const textLine = lines.find((l) => /^Text:\s*\S/i.test(l));
  const passage = textLine ? textLine.replace(/^Text:\s*/i, '').trim() : null;

  // The title sits between the "James #1" line and the "Text:" line (or within the next
  // few lines), skipping the date. Anything further down is the outline, not a title.
  let title = null;
  const numberLine = lines.findIndex((l) => /#\s*\d/.test(l));
  if (numberLine !== -1) {
    const textIndex = textLine ? lines.indexOf(textLine) : -1;
    const end = textIndex > numberLine ? textIndex : numberLine + 3;
    const isDate = (l) => /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(l);
    const candidate = lines.slice(numberLine + 1, end).find((l) => !isDate(l));
    if (candidate && candidate.length <= 120) title = candidate;
  }
  return { title, passage };
}

// The service date of a stream, in Pacific time (a Sunday stream must not become Monday in UTC).
function videoDate(video) {
  if (video.actualStartTime) return pacificDay.format(new Date(video.actualStartTime));
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(video.title || '');
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return pacificDay.format(new Date(video.publishedAt));
}

const startTime = (v) => v.actualStartTime || v.publishedAt || '';

// Builds the sermons.json object (without generatedAt) and returns any warnings.
//   config:  parsed data/series.json
//   streams: [{ videoId, title, publishedAt, actualStartTime, live }]
//   folders: { [seriesId]: [{ id, name, mimeType, modifiedTime }] }
//   headers: { [pdfFileId]: { title, passage } }
function assemble({ config, streams, folders, headers }) {
  const warnings = [];
  const hidden = new Set(config.hiddenVideos || []);
  const videos = streams
    .filter((v) => !hidden.has(v.videoId))
    .map((v) => ({ ...v, date: videoDate(v), url: videoUrl(v.videoId) }))
    .sort((a, b) => startTime(b).localeCompare(startTime(a)));

  // A sermon links to the earliest stream on its date (a later one is usually a special service).
  const videoByDate = new Map();
  for (const v of [...videos].reverse()) if (!videoByDate.has(v.date)) videoByDate.set(v.date, v);

  const series = config.series.map((cfg, order) => {
    const grouped = groupFiles(folders[cfg.id] || [], cfg.title);
    warnings.push(...grouped.warnings);
    const overrides = cfg.overrides || {};
    const sermons = [...grouped.sermons.values()].map((s) => {
      const header = (s.notesFile && headers[s.notesFile.id]) || {};
      const o = overrides[s.key] || {};
      const video = videoByDate.get(s.date);
      return {
        key: s.key,
        number: s.number,
        date: s.date,
        title: o.title ?? header.title ?? null,
        passage: o.passage ?? header.passage ?? null,
        notesUrl: s.notesFile ? driveFileUrl(s.notesFile.id) : null,
        audioUrl: s.audioFile ? driveFileUrl(s.audioFile.id) : null,
        videoUrl: video ? video.url : null,
        summary: o.summary ?? null,
      };
    }).sort((a, b) => a.date.localeCompare(b.date) || parseFloat(a.number) - parseFloat(b.number));

    return {
      order,
      id: cfg.id,
      title: cfg.title,
      current: !!cfg.current,
      folderUrl: cfg.folder,
      summary: cfg.summary ?? null,
      firstDate: sermons.length ? sermons[0].date : null,
      lastDate: sermons.length ? sermons[sermons.length - 1].date : null,
      sermons,
    };
  });

  // Current series first, then newest series first; ties keep the config order.
  series.sort((a, b) => (b.current - a.current)
    || (b.lastDate || '').localeCompare(a.lastDate || '')
    || a.order - b.order);

  const findSermon = (date) => {
    for (const s of series) {
      const m = s.sermons.find((x) => x.date === date);
      if (m) return { seriesId: s.id, seriesTitle: s.title, number: m.number, title: m.title,
        passage: m.passage, notesUrl: m.notesUrl, audioUrl: m.audioUrl, summary: m.summary };
    }
    return null;
  };

  const recent = videos.slice(0, MAX_RECENT).map((v) => {
    const match = findSermon(v.date);
    const sermon = match && { ...match };
    if (sermon) delete sermon.summary;
    return {
      videoId: v.videoId,
      url: v.url,
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      date: v.date,
      youtubeTitle: v.title || '',
      live: !!v.live,
      summary: match ? match.summary : null,
      sermon,
    };
  });

  return {
    data: {
      version: 1,
      streamsUrl: STREAMS_URL,
      recent,
      series: series.map(({ order, ...s }) => s),
    },
    warnings,
  };
}

module.exports = { parseFileName, groupFiles, parseNotesHeader, videoDate, assemble, driveFileUrl, STREAMS_URL };
