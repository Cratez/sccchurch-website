// Pure functions that turn raw YouTube/Drive/OneDrive data into sermons.json. No network access here,
// so everything can be tested with plain inputs. The output shape is checked by validate.js.
const { MAX_RECENT, DATA_VERSION } = require('./validate');

const STREAMS_URL = 'https://www.youtube.com/@southclackamascommunitychu1171/streams';
// "NNN MM-DD-YY.ext", also accepting what's actually in the folders:
//   a letter for a sermon split over two Sundays ("032 A 12-04-22", "032B 12-11-22"),
//   a part suffix ("024 07-24-22 (part 1)"), and small date typos ("05-29=22", "02-27 -22").
const FILE_NAME = /^(\d+(?:\.\d+)?)\s*([A-Za-z])?\s+(\d{2})\s*[-=]\s*(\d{2})\s*[-=]\s*(\d{2})\s*(?:\(\s*part\s*(\d+)\s*\))?\s*\.(mp3|m4a|wav|pdf)$/i;
const MEDIA = /\.(mp3|m4a|wav|pdf)$/i;
const AUDIO = new Set(['mp3', 'm4a', 'wav']);
const pacificDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' });

const driveFileUrl = (id) => `https://drive.google.com/file/d/${id}/view`;
// OneDrive files come with their own link for visitors (see onedrive.js); Drive files don't.
const fileUrl = (f) => f.url || driveFileUrl(f.id);
const videoUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
const baseName = (name) => name.replace(MEDIA, '').replace(/\s+/g, ' ').trim();
const kindOf = (name) => (AUDIO.has(MEDIA.exec(name)[1].toLowerCase()) ? 'audio' : 'notes');

// "001 01-09-22.mp3" -> { key: "001 01-09-22", number: "1", date: "2022-01-09", kind: "audio", typo: false }
// The key is the cleaned-up name, so "008 02-27 -22.mp3" pairs with "008 02-27-22.pdf".
// `typo` is true when the name had to be cleaned up (worth renaming in Drive).
function parseFileName(name) {
  const m = FILE_NAME.exec(name);
  if (!m) return null;
  const [, num, letter, mm, dd, yy, part, ext] = m;
  const date = `20${yy}-${mm}-${dd}`;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) return null; // e.g. 13-40-22
  const tag = (letter || '').toUpperCase();
  const partText = part ? ` (part ${Number(part)})` : '';
  const key = `${num}${tag} ${mm}-${dd}-${yy}${partText}`;
  return {
    key,
    number: num.replace(/^0+(?=\d)/, '') + tag + partText,
    date,
    kind: AUDIO.has(ext.toLowerCase()) ? 'audio' : 'notes',
    typo: !name.includes(`${mm}-${dd}-${yy}`) || /\s{2,}/.test(name),
  };
}

// Groups a folder's files into sermons by their "NNN MM-DD-YY" name. Audio/notes files without
// a number and date (e.g. "Intro to Author.pdf") become undated extras, listed before the sermons.
function groupFiles(files, seriesTitle) {
  const sermons = new Map();
  const warnings = [];
  for (const f of files) {
    let p = parseFileName(f.name);
    if (!p && MEDIA.test(f.name)) {
      p = { key: baseName(f.name), number: null, date: null, kind: kindOf(f.name), typo: false };
    }
    if (!p) {
      warnings.push(`Skipped "${f.name}" in ${seriesTitle}: not an audio or PDF file`);
      continue;
    }
    if (p.typo) warnings.push(`Read "${f.name}" in ${seriesTitle} as "${p.key}". Consider renaming it.`);
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

// Bump when parseNotesHeader changes, so PDFs read by an older version are read again.
const HEADER_PARSER_VERSION = 2;

// Reads the title and passage from the top of a notes PDF, e.g.
//   James #1 / You Can Have Joy No Matter What / January 9, 2022 / Text: James 1:1-4
// Many PDFs have no title line (James #6: "James #6 / February 13, 2022 / Text: ..."); then title is null.
function parseNotesHeader(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const TEXT = /^Text\s*[:\-–—]\s*/i; // "Text:" or "Text-"
  const textLine = lines.find((l) => TEXT.test(l) && l.replace(TEXT, '').trim());
  const passage = textLine ? textLine.replace(TEXT, '').trim() : null;

  // The title sits between the "James #1" line and the "Text:" line (or within the next
  // few lines), skipping the date. Anything further down is the outline, not a title.
  let title = null;
  const numberLine = lines.findIndex((l) => /#\s*\d/.test(l));
  if (numberLine !== -1) {
    const textIndex = textLine ? lines.indexOf(textLine) : -1;
    const end = textIndex > numberLine ? textIndex : numberLine + 3;
    // "January 9, 2022" or "3-6-22" / "3/6/2022"
    const isDate = (l) => /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(l) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(l);
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
//   folders: { [seriesId]: [{ id, name, mimeType, modifiedTime, url? }] }
//   folderUrls: { [seriesId]: link to show for the folder }, when it differs from the configured one
//   headers: { [pdfFileId]: { title, passage } }
//   videoNotes: parsed data/video-notes.json, { [videoId]: { title, summary } } written from
//               auto-captions by the summarize-services skill. A notes-PDF title still wins.
function assemble({ config, streams, folders, folderUrls = {}, headers, videoNotes = {} }) {
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
      const video = s.date && videoByDate.get(s.date);
      const notes = (video && videoNotes[video.videoId]) || {};
      return {
        key: s.key,
        number: s.number,
        date: s.date,
        // Undated extras ("Intro to Author") are titled by their file name.
        title: o.title ?? header.title ?? notes.title ?? (s.date ? null : s.key),
        passage: o.passage ?? header.passage ?? null,
        notesUrl: s.notesFile ? fileUrl(s.notesFile) : null,
        audioUrl: s.audioFile ? fileUrl(s.audioFile) : null,
        videoUrl: video ? video.url : null,
        summary: o.summary ?? notes.summary ?? null,
      };
    }).sort((a, b) => {
      if (!a.date || !b.date) return (a.date ? 1 : 0) - (b.date ? 1 : 0) || a.key.localeCompare(b.key); // extras first
      return a.date.localeCompare(b.date) || parseFloat(a.number) - parseFloat(b.number) || a.key.localeCompare(b.key);
    });

    const dated = sermons.filter((s) => s.date);
    return {
      order,
      id: cfg.id,
      title: cfg.title,
      current: !!cfg.current,
      folderUrl: folderUrls[cfg.id] || cfg.folder,
      summary: cfg.summary ?? null,
      firstDate: dated.length ? dated[0].date : null,
      lastDate: dated.length ? dated[dated.length - 1].date : null,
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
    const notes = videoNotes[v.videoId] || {};
    const sermon = match && { ...match };
    if (sermon) delete sermon.summary;
    return {
      videoId: v.videoId,
      url: v.url,
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      date: v.date,
      youtubeTitle: v.title || '',
      title: (match && match.title) ?? notes.title ?? null,
      live: !!v.live,
      summary: (match && match.summary) ?? notes.summary ?? null,
      sermon,
    };
  });

  return {
    data: {
      version: DATA_VERSION,
      streamsUrl: STREAMS_URL,
      recent,
      series: series.map(({ order, ...s }) => s),
    },
    warnings,
  };
}

module.exports = {
  parseFileName, groupFiles, parseNotesHeader, videoDate, assemble, driveFileUrl, STREAMS_URL, HEADER_PARSER_VERSION,
};
