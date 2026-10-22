/**
 * FEATURE: Statement of Faith page structure. The numbered sections, the sidebar contents
 *          list, and the scripture reference buttons stay consistent with each other.
 * COVERS:  beliefs.html (section.tenet, aside.toc, .ref buttons)
 * WHY:     Sections, their numbers, and the sidebar are all edited by hand. A reference
 *          button's data-ref (what gets looked up) must match its visible text.
 * UPDATE WHEN: sections are added or removed (edit SECTIONS) after leadership approves a change.
 * REMOVE WHEN: the Statement of Faith page is removed or rebuilt differently.
 */
const { test, expect } = require('./support/fixtures');

const SECTIONS = [
  ['god', 'God'], ['christ', 'Christ'], ['holy-spirit', 'Holy Spirit'], ['scripture', 'Scripture'],
  ['man', 'Man'], ['salvation', 'Salvation'], ['resurrection', 'Resurrection'], ['end-times', 'End Times'],
  ['judgment', 'Judgment'], ['satan', 'Satan'], ['church', 'Church'],
];

test.beforeEach(async ({ page }) => {
  await page.goto('beliefs.html');
});

test('sections are in order, numbered 01, 02, ... with matching headings', async ({ page }) => {
  const sections = page.locator('section.tenet');
  await expect(sections).toHaveCount(SECTIONS.length);
  for (const [i, [id, title]] of SECTIONS.entries()) {
    const s = sections.nth(i);
    await expect(s).toHaveAttribute('id', id);
    await expect(s.locator('.num')).toHaveText(String(i + 1).padStart(2, '0'));
    await expect(s.locator('h2')).toHaveText(title);
  }
});

test('sidebar lists every section in the same order and numbering', async ({ page }) => {
  const links = page.locator('aside.toc a');
  await expect(links).toHaveCount(SECTIONS.length);
  for (const [i, [id, title]] of SECTIONS.entries()) {
    await expect(links.nth(i)).toHaveAttribute('href', `#${id}`);
    await expect(links.nth(i)).toHaveText(`${i + 1}. ${title}`);
  }
});

test('every section has scripture references and one (hidden) passage panel', async ({ page }) => {
  for (const s of await page.locator('section.tenet').all()) {
    expect(await s.locator('.refs .ref').count()).toBeGreaterThan(0);
    await expect(s.locator('.passage')).toHaveCount(1);
    await expect(s.locator('.passage')).toBeHidden();
  }
});

test('each reference button looks up exactly what it shows', async ({ page }) => {
  const refs = await page.locator('.ref').evaluateAll((els) =>
    els.map((b) => ({ data: b.dataset.ref, text: b.textContent.replace(/\s+/g, ' ').trim(), expanded: b.getAttribute('aria-expanded'), type: b.type })));
  for (const r of refs) {
    expect(r.text, `button text should match data-ref "${r.data}"`).toBe(r.data);
    expect(r.expanded).toBe('false');
    expect(r.type).toBe('button');
  }
});
