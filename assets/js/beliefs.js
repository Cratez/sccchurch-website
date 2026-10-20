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
// bible-api.com only serves public-domain translations, so passages show in KJV.
// Copyrighted versions (NKJV, ESV, NIV) are offered as links to Bible Gateway.
const TRANSLATION = 'kjv';
const gateway = (ref, version) =>
  'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=' + version;
const cache = new Map();

async function load(ref) {
  if (cache.has(ref)) return cache.get(ref);
  const res = await fetch(API + ref.replace(/, /g, ',').replace(/ /g, '+') + '?translation=' + TRANSLATION);
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  if (!data.verses || !data.verses.length) throw new Error('empty');
  cache.set(ref, data);
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
    foot.append(' · Also on Bible Gateway: ');
    ['NKJV', 'ESV', 'NIV'].forEach((v, i) => {
      if (i) foot.append(', ');
      const link = el('a', '', v);
      link.href = gateway(ref, v); link.target = '_blank'; link.rel = 'noopener';
      foot.append(link);
    });
    content = [head, body, foot];
  } catch (err) {
    if (panel.dataset.ref !== ref || panel.hidden) return;
    const msg = el('p', 'pt', 'We couldn’t load this passage. ');
    const a = el('a', '', 'Read it on Bible Gateway');
    a.href = gateway(ref, 'NKJV');
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
