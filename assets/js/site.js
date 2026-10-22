// Shared by every page: phone menu, light/dark theme toggle, footer easter egg.
// Loaded at the end of <body>, after the header and footer exist.

// Tells the CSS that JavaScript is running, so the phone menu can hide its links
// behind the Menu button (without JavaScript the links stay visible). The script in
// each page's <head> already adds it before the page draws; this is a backstop.
document.documentElement.classList.add('js');

// Phone menu: the Menu button shows/hides the nav. Closes on Escape, on a link click,
// and on a click anywhere outside the header.
(function () {
  const header = document.querySelector('header.site');
  const btn = header && header.querySelector('.menu-toggle');
  if (!btn) return;
  const nav = header.querySelector('nav');

  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const setOpen = open => {
    btn.setAttribute('aria-expanded', String(open));
    header.classList.toggle('menu-open', open);
  };

  btn.addEventListener('click', () => setOpen(!isOpen()));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('click', e => { if (isOpen() && !header.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      btn.focus();
    }
  });
})();

// Theme toggle (footer). The page starts in the saved choice (applied by the small script
// in <head> before the page draws), else the device setting. The button offers the opposite.
(function () {
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  const root = document.documentElement;
  const deviceDark = matchMedia('(prefers-color-scheme: dark)');
  const effective = () => root.dataset.theme || (deviceDark.matches ? 'dark' : 'light');
  const label = () => btn.setAttribute('aria-label',
    effective() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');

  btn.addEventListener('click', () => {
    const next = effective() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    // Saving can fail (private browsing, blocked storage); the switch still works for this page.
    try { localStorage.setItem('theme', next); } catch (e) { /* not saved */ }
    label();
  });
  deviceDark.addEventListener('change', label);
  label();
})();

// Easter egg: the small mountain in the footer opens the church's original logo.
(function () {
  const first = document.querySelector('footer.site .foot-base span');
  if (!first) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'egg';
  btn.setAttribute('aria-label', 'See our original logo');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 20 L8.5 9 L12 14 L16 6 L22 20Z"/></svg>';

  const dlg = document.createElement('dialog');
  dlg.className = 'egg-dialog';
  dlg.innerHTML =
    '<img src="assets/img/original-logo.webp" width="233" height="46" ' +
    'alt="Original South Clackamas Community Church logo: three snow-capped mountains above the church name">' +
    '<p>Our original logo</p><button type="button" class="btn btn-outline">Close</button>';

  btn.addEventListener('click', () => dlg.showModal());
  // Close on the Close button, or on a click outside the box (the backdrop).
  // Clicks on the dialog's own padding also target the dialog, so check the position.
  dlg.addEventListener('click', e => {
    const r = dlg.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (e.target.tagName === 'BUTTON' || (e.target === dlg && outside)) dlg.close();
  });

  first.append(btn);
  document.body.append(dlg);
})();
