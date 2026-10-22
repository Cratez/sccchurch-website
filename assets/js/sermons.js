// Sermons page: builds the recent-services cards and the sermon series list from
// data/sermons.json, which a daily GitHub job generates (see "Sermon data" in README.md).
const STREAMS = 'https://www.youtube.com/@southclackamascommunitychu1171/streams';
const MAX_RECENT = 6;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
};

const link = (text, href, cls) => {
  const a = el('a', cls, text);
  a.href = href;
  if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
};

// Dates arrive as "YYYY-MM-DD". Build them in UTC and format in UTC, so the day never shifts
// with the visitor's time zone (new Date("2026-03-01") would be Feb 28 in Oregon).
function formatDate(iso, style = 'long') {
  const [y, m, d] = iso.split('-').map(Number);
  const options = style === 'long'
    ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

// "Notes · Audio · Video" style row; skips links that aren't available.
function linkRow(items) {
  const row = el('p', 'links');
  items.filter(([, href]) => href).forEach(([text, href], i) => {
    if (i) row.append(' · ');
    row.append(link(text, href));
  });
  return row;
}

function videoCard(v) {
  const s = v.sermon;
  const card = el('article', 'video-card');

  const thumb = link('', v.url, 'thumb');
  thumb.setAttribute('aria-label', `Watch the ${formatDate(v.date)} service on YouTube`);
  const img = el('img');
  img.src = v.thumbnail; img.alt = ''; img.loading = 'lazy'; img.width = 480; img.height = 360;
  thumb.append(img);
  card.append(thumb);

  const date = el('p', 'date', formatDate(v.date));
  if (v.live) date.append(' ', el('span', 'badge', 'Live now'));
  card.append(date, el('h3', '', (s && s.title) || 'Sunday service'));

  if (s && s.passage) card.append(el('p', 'passage-ref', s.passage));
  if (s) {
    const from = el('p', 'from', 'From the ');
    from.append(link(`${s.seriesTitle} series`, `#series-${s.seriesId}`));
    card.append(from);
  }
  if (v.summary) card.append(el('p', 'summary', v.summary));
  card.append(linkRow([['Watch on YouTube', v.url], ['Notes', s && s.notesUrl], ['Audio', s && s.audioUrl]]));
  return card;
}

function seriesCard(s) {
  const box = el('details', 'series');
  box.id = `series-${s.id}`;
  if (s.current) box.open = true;

  const head = el('summary');
  const title = el('h3', '', s.title);
  if (s.current) title.append(' ', el('span', 'badge', 'Current series'));
  const count = `${s.sermons.length} ${s.sermons.length === 1 ? 'sermon' : 'sermons'}`;
  const range = s.firstDate && s.lastDate ? `${formatDate(s.firstDate, 'short')} – ${formatDate(s.lastDate, 'short')} · ` : '';
  head.append(title, el('p', 'meta', s.sermons.length ? range + count : 'No sermons listed yet'));
  box.append(head);

  const body = el('div', 'series-body');
  if (s.summary) body.append(el('p', 'summary', s.summary));
  body.append(link('Open the Drive folder ↗', s.folderUrl, 'folder'));
  const list = el('ol', 'sermon-list');
  for (const m of s.sermons) {
    const row = el('li');
    const info = el('div', 'info');
    info.append(el('span', 'num', `#${m.number}`), el('span', 'when', formatDate(m.date, 'short')));
    if (m.title) info.append(el('span', 'title', m.title));
    if (m.passage) info.append(el('span', 'passage-ref', m.passage));
    row.append(info, linkRow([['Notes', m.notesUrl], ['Audio', m.audioUrl], ['Video', m.videoUrl]]));
    list.append(row);
  }
  if (s.sermons.length) body.append(list);
  box.append(body);
  return box;
}

function showError(recentBox, seriesBox) {
  const msg = el('p', 'status', 'We couldn’t load recent services. ');
  msg.append(link('Watch them on YouTube', STREAMS), '.');
  recentBox.replaceChildren(msg);
  seriesBox.replaceChildren(el('p', 'status', 'We couldn’t load sermon series right now. Please try again later.'));
}

async function init() {
  const recentBox = document.querySelector('#recent .video-grid');
  const seriesBox = document.querySelector('#series .series-list');
  let data;
  try {
    const res = await fetch('data/sermons.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
    if (!data || data.version !== 1 || !Array.isArray(data.recent) || !Array.isArray(data.series)) throw new Error('format');
  } catch (err) {
    showError(recentBox, seriesBox);
    return;
  }

  if (data.recent.length) {
    recentBox.replaceChildren(...data.recent.slice(0, MAX_RECENT).map(videoCard));
  } else {
    const msg = el('p', 'status', 'No recent services yet. ');
    msg.append(link('Watch on YouTube', STREAMS), '.');
    recentBox.replaceChildren(msg);
  }

  seriesBox.replaceChildren(...(data.series.length ? data.series.map(seriesCard) : [el('p', 'status', 'No sermon series yet.')]));

  // Links like sermons.html#series-james (and "From the James series") open that series.
  const openFromHash = () => {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.matches('details.series')) {
      target.open = true;
      target.scrollIntoView();
    }
  };
  addEventListener('hashchange', openFromHash);
  openFromHash();
}

init();
