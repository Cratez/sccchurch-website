// YouTube refuses to play embedded videos on a page opened straight from disk (file://)
// and shows "Error 153". When that's the case, show a plain explanation instead.
if (location.protocol === 'file:') {
  const box = document.querySelector('.video');
  if (box) {
    const msg = document.createElement('p');
    msg.textContent = 'The video player only works on the live site or a local server (see the README). ';
    const link = document.createElement('a');
    link.href = 'https://www.youtube.com/@southclackamascommunitychu1171/streams';
    link.textContent = 'Watch on YouTube';
    msg.append(link, '.');
    box.classList.add('fallback');
    box.replaceChildren(msg);
  }
}

// Hero verse rotator. Without JavaScript, Psalm 122:1 (written in the page) stays put.
// With JavaScript it moves through the list in #hero-verses every 10 seconds, pausing while
// the visitor points at or keyboard-focuses the verse, while the tab is hidden, or when they
// press the pause button. Visitors who ask for less motion get one verse per day instead.
function startVerseRotator() {
  const fig = document.querySelector('.home-hero .verse');
  const data = document.getElementById('hero-verses');
  if (!fig || !data) return;
  let verses;
  try { verses = JSON.parse(data.textContent); } catch (e) { return; }
  if (!Array.isArray(verses) || !verses.length) return;

  const quote = fig.querySelector('blockquote p');
  const cite = fig.querySelector('figcaption');
  const btn = fig.querySelector('.verse-pause');
  const show = (v) => {
    quote.textContent = `“${v.text}”`;
    cite.textContent = v.ref;
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Same verse all day (local date), a different one tomorrow.
    const now = new Date();
    const days = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
    show(verses[days % verses.length]);
    return;
  }
  if (verses.length < 2 || !btn) return;

  const FADE = 400;     // must match the transition in home.css
  const EVERY = 10000;  // a new verse every 10 seconds
  let index = 0;
  let timer = null;
  const pausedBy = new Set(); // 'button', 'pointer', 'focus', 'tab'

  const next = () => {
    fig.classList.add('fading');
    timer = setTimeout(() => {
      index = (index + 1) % verses.length;
      show(verses[index]);
      fig.classList.remove('fading');
      schedule();
    }, FADE);
  };
  // Start a fresh 10 seconds (the fade-out begins just before, so the text changes on time).
  function schedule() {
    clearTimeout(timer);
    timer = pausedBy.size ? null : setTimeout(next, EVERY - FADE);
  }
  const setPaused = (reason, on) => {
    if (pausedBy.has(reason) === on) return;
    if (on) pausedBy.add(reason); else pausedBy.delete(reason);
    if (on) fig.classList.remove('fading'); // never leave the verse invisible
    schedule();
  };

  btn.hidden = false;
  btn.addEventListener('click', () => {
    const paused = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(paused));
    btn.setAttribute('aria-label', paused ? 'Play verses' : 'Pause verses');
    btn.textContent = paused ? '▶︎' : '❚❚'; // ︎: show ▶ as text, not an emoji
    setPaused('button', paused);
  });
  fig.addEventListener('pointerenter', () => setPaused('pointer', true));
  fig.addEventListener('pointerleave', () => setPaused('pointer', false));
  // Only keyboard focus counts: a mouse click on the button also focuses it, and the
  // pointer pause already covers that case (otherwise "Play" would seem to do nothing).
  fig.addEventListener('focusin', (e) => setPaused('focus', e.target.matches(':focus-visible')));
  fig.addEventListener('focusout', (e) => { if (!fig.contains(e.relatedTarget)) setPaused('focus', false); });
  document.addEventListener('visibilitychange', () => setPaused('tab', document.hidden));
  if (document.hidden) pausedBy.add('tab');
  schedule();
}

startVerseRotator();
