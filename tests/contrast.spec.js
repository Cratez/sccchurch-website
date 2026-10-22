/**
 * FEATURE: Readable text colors. Every text color pair meets WCAG AA (4.5:1) in both themes.
 * COVERS:  the color tokens in assets/css/base.css (:root, [data-theme="dark"], and the
 *          prefers-color-scheme block), and the footer, .btn, .btn-outline and .eyebrow styles
 * WHY:     The colors were picked by eye; a small token change (or a dark value that drifts
 *          from the light one) can make text hard to read without anyone noticing.
 * UPDATE WHEN: the elements used below move or are renamed (they are measured on index.html).
 * REMOVE WHEN: never, as long as the site has text; update instead.
 */
const { test, expect } = require('./support/fixtures');

test.skip(({ isMobile }) => isMobile, 'colors are the same on phones; measured once on desktop');

// The real elements measured for each pair.
const PAIRS = [
  { name: 'body text on --bg', selector: 'footer.site .foot-cols p:not(.eyebrow) >> nth=0' },
  { name: 'muted text on --bg', selector: '#gather .desc >> nth=0' },
  { name: 'link (--brand) on --bg', selector: 'footer.site .foot-cols a >> nth=0' },
  { name: '.btn text on its background', selector: 'main a.btn:not(.btn-outline) >> nth=0' },
  { name: '.btn-outline text on --bg', selector: 'main a.btn-outline >> nth=0' },
  { name: 'eyebrow on --bg', selector: 'footer.site .eyebrow >> nth=0' },
];

const MODES = [
  { name: 'light (device default)', scheme: 'light' },
  { name: 'dark (device setting)', scheme: 'dark' },
  { name: 'dark (chosen with the toggle)', scheme: 'light', theme: 'dark' },
  { name: 'light (chosen with the toggle on a dark device)', scheme: 'dark', theme: 'light' },
];

// Runs in the page: the text color and the color actually behind it (the first ancestor
// with a non-transparent background, else the body's).
function measure(el) {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) throw new Error(`unexpected color format: ${c}`);
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const fg = parse(getComputedStyle(el).color);
  let bg = null;
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const c = parse(getComputedStyle(n).backgroundColor);
    if (c.a > 0) { bg = c; break; }
  }
  bg = bg || parse(getComputedStyle(document.body).backgroundColor);
  return { fg, bg };
}

const luminance = ({ r, g, b }) => {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

for (const mode of MODES) {
  test(`text meets 4.5:1 contrast in ${mode.name}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: mode.scheme });
    await page.goto('index.html');
    if (mode.theme) await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, mode.theme);
    // The home page has no outline button since the redesign, so add one to the main
    // content to measure that style on the page background.
    await page.evaluate(() => {
      const a = Object.assign(document.createElement('a'), { className: 'btn btn-outline', href: '#', textContent: 'Sample' });
      document.querySelector('main section').prepend(a);
    });
    // Measured ratios are attached to the test report, to help when adjusting colors.
    const report = [];
    for (const pair of PAIRS) {
      const { fg, bg } = await page.locator(pair.selector).evaluate(measure);
      expect(fg.a, `${pair.name}: text should be fully opaque`).toBe(1);
      const ratio = contrast(fg, bg);
      report.push(`${pair.name}: ${ratio.toFixed(2)}`);
      expect(ratio, `${pair.name} (${mode.name})`).toBeGreaterThanOrEqual(4.5);
    }
    await test.info().attach(`contrast ${mode.name}`, { body: report.join('\n') });
  });
}
