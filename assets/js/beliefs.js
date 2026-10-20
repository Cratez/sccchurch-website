// Reading-progress bar + highlights the current section in the sidebar.
const bar = document.querySelector('.progress');
addEventListener('scroll', () => {
  const h = document.documentElement;
  bar.style.transform = `scaleX(${h.scrollTop / (h.scrollHeight - h.clientHeight)})`;
}, { passive: true });

const links = [...document.querySelectorAll('.toc a')];
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.hash === '#' + e.target.id));
  });
}, { rootMargin: '-20% 0px -70% 0px' });
document.querySelectorAll('.tenet').forEach(s => io.observe(s));

// ---- Scripture lookups (free, key-less API: https://bible-api.com) ----
const API = 'https://bible-api.com/';
const GATEWAY = { kjv: 'KJV', web: 'WEB' };
let tr = 'kjv';
const cache = new Map();

async function load(ref) {
  const key = tr + '|' + ref;
  if (cache.has(key)) return cache.get(key);
  const res = await fetch(API + ref.replace(/, /g, ',').replace(/ /g, '+') + '?translation=' + tr);
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  if (!data.verses || !data.verses.length) throw new Error('empty');
  cache.set(key, data);
  return data;
}

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
};

async function show(btn, panel) {
  const ref = btn.dataset.ref;
  panel.dataset.ref = ref;
  panel.hidden = false;
  panel.replaceChildren(el('p', 'pt', 'Loading…'));
  let content;
  try {
    const d = await load(ref);
    if (panel.dataset.ref !== ref || panel.hidden) return;
    const head = el('div', 'ph');
    head.append(el('h3', '', d.reference || ref));
    const close = el('button', 'x', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); });
    head.append(close);
    const body = el('p', 'pt');
    d.verses.forEach(v => {
      body.append(el('sup', '', String(v.verse)), document.createTextNode(v.text.trim().replace(/\s+/g, ' ') + ' '));
    });
    const foot = el('p', 'pf', [d.translation_name, d.translation_note].filter(Boolean).join(' · '));
    content = [head, body, foot];
  } catch (err) {
    if (panel.dataset.ref !== ref || panel.hidden) return;
    const msg = el('p', 'pt', 'We couldn’t load this passage. ');
    const a = el('a', '', 'Read it on Bible Gateway');
    a.href = 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=' + GATEWAY[tr];
    a.target = '_blank'; a.rel = 'noopener';
    msg.append(a, '.');
    content = [msg];
  }
  panel.replaceChildren(...content);
}

document.querySelectorAll('.key').forEach(box => {
  const panel = box.querySelector('.passage');
  box.querySelector('.refs').addEventListener('click', e => {
    const b = e.target.closest('.ref');
    if (!b) return;
    const wasOpen = b.getAttribute('aria-expanded') === 'true';
    box.querySelectorAll('.ref').forEach(x => x.setAttribute('aria-expanded', 'false'));
    if (wasOpen) { panel.hidden = true; return; }
    b.setAttribute('aria-expanded', 'true');
    show(b, panel);
  });
});

document.querySelectorAll('.tr button').forEach(b => b.addEventListener('click', () => {
  tr = b.dataset.tr;
  document.querySelectorAll('.tr button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  document.querySelectorAll('.ref[aria-expanded="true"]').forEach(r => show(r, r.closest('.key').querySelector('.passage')));
}));
