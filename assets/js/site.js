// Easter egg: the small mountain in the footer opens the church's original logo.
(function () {
  const first = document.querySelector('footer.site .wrap span');
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
    '<p>Our original logo</p><button type="button" class="btn btn-ghost">Close</button>';

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
