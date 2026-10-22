// Downloads YouTube's automatic captions for recent services that don't have saved notes yet,
// and writes each one as a plain-text transcript. Used by the "summarize-services" Claude skill
// (.claude/skills/summarize-services/SKILL.md), which reads the transcripts and writes titles and
// summaries into data/video-notes.json. Runs locally (YouTube often blocks caption downloads from
// cloud servers such as GitHub Actions).
//
// Usage: node scripts/video-notes/transcripts.js [--out DIR] [--video VIDEO_ID ...]
//   --out    where to write <videoId>.txt transcripts (default: a temp folder)
//   --video  only these videos, even if they already have notes (to redo them)
// Prints a JSON report: [{ videoId, date, status: "ok" | "no-captions" | "error", file, words, error }]
// Needs yt-dlp (https://github.com/yt-dlp/yt-dlp) on the PATH, kept up to date (`yt-dlp -U`).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

// Auto-caption VTT repeats each line across overlapping cues and carries word-timing tags.
// Keep the text only, once.
function vttToText(vtt) {
  const lines = [];
  for (const raw of String(vtt).split(/\r?\n/)) {
    const line = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    if (!line || line.includes('-->') || /^(WEBVTT|Kind:|Language:|NOTE\b)/.test(line) || /^\d+$/.test(line)) continue;
    if (lines[lines.length - 1] !== line) lines.push(line);
  }
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

// Recent services without saved notes (or exactly the requested videos).
function pickTargets(sermons, notes, only = []) {
  if (only.length) return sermons.recent.filter((v) => only.includes(v.videoId)).concat(
    only.filter((id) => !sermons.recent.some((v) => v.videoId === id)).map((videoId) => ({ videoId, date: null })));
  return sermons.recent.filter((v) => !v.live && !notes[v.videoId]);
}

// Downloads one video's auto-captions and returns a report entry. `run` is spawnSync (swappable in tests).
function fetchTranscript(videoId, outDir, run = spawnSync) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'captions-'));
  const result = run('yt-dlp', [
    '--js-runtimes', 'node', '--skip-download', '--write-auto-subs',
    '--sub-langs', 'en-orig,en', '--sub-format', 'vtt',
    '-o', path.join(work, '%(id)s.%(ext)s'),
    `https://www.youtube.com/watch?v=${videoId}`,
  ], { encoding: 'utf8' });
  if (result.error) {
    const missing = result.error.code === 'ENOENT';
    return { videoId, status: 'error', error: missing ? 'yt-dlp is not installed (winget install yt-dlp.yt-dlp)' : result.error.message };
  }
  // Prefer the original speech-recognition track ("en-orig") over YouTube's processed copy.
  const files = fs.readdirSync(work).filter((f) => f.endsWith('.vtt'));
  const vtt = files.find((f) => f.includes('.en-orig.')) || files.find((f) => f.includes('.en.')) || files[0];
  if (!vtt) {
    if (result.status !== 0) return { videoId, status: 'error', error: (result.stderr || '').trim().split('\n').pop() };
    return { videoId, status: 'no-captions' };
  }
  const text = vttToText(fs.readFileSync(path.join(work, vtt), 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${videoId}.txt`);
  fs.writeFileSync(file, text + '\n');
  fs.rmSync(work, { recursive: true, force: true });
  return { videoId, status: 'ok', file, words: text.split(' ').length };
}

function main(argv) {
  const args = { out: path.join(os.tmpdir(), 'sccc-transcripts'), only: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
    else if (argv[i] === '--video') args.only.push(argv[++i]);
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  const sermons = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sermons.json'), 'utf8'));
  const notesFile = path.join(ROOT, 'data', 'video-notes.json');
  const notes = fs.existsSync(notesFile) ? JSON.parse(fs.readFileSync(notesFile, 'utf8')) : {};
  const report = pickTargets(sermons, notes, args.only).map((v) => ({ date: v.date, ...fetchTranscript(v.videoId, args.out) }));
  console.log(JSON.stringify(report, null, 2));
}

module.exports = { vttToText, pickTargets, fetchTranscript };

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exit(1); }
}
