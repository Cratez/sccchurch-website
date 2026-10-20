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
