/**
 * FEATURE: Photo banners at the top of the inner pages: Plan your visit (Trillium Lake), What We
 *          Believe (Mt. Hood summit) and Sermons (Trillium Lake with a kayaker), sharing one banner style.
 * COVERS:  .photo-hero.banner in assets/css/base.css; .visit-hero, .beliefs-hero and .sermons-hero in
 *          visit.css, beliefs.css and sermons.css; the banner markup in visit.html, beliefs.html and
 *          sermons.html; assets/img/photos/trillium-*, hood-summit-* and trillium-kayak-*
 * WHY:     The banners point at photo files by exact name and share sizing; a renamed photo or a
 *          page that drifts from the shared banner style would show a broken or mismatched header.
 * UPDATE WHEN: a banner photo is swapped, or a page gains or loses a banner.
 * REMOVE WHEN: the inner pages stop using photo banners.
 */
const { test, expect } = require('./support/fixtures');

const BANNERS = [
  { page: 'visit.html', photo: 'trillium', heading: 'What to expect on a Sunday morning' },
  { page: 'beliefs.html', photo: 'hood-summit', heading: 'Statement of Faith' },
  { page: 'sermons.html', photo: 'trillium-kayak', heading: 'Sermons' },
];

for (const b of BANNERS) {
  test(`${b.page} banner shows the ${b.photo} photo with the heading over it`, async ({ page }) => {
    await page.goto(b.page);
    const banner = page.locator('main > .photo-hero.banner');
    await expect(banner).toHaveCount(1);
    const img = banner.locator('img');
    await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
    expect(await img.evaluate((i) => i.currentSrc)).toMatch(new RegExp(`/${b.photo}-\\d+\\.(webp|jpg)$`));
    await expect(banner.getByRole('heading', { level: 1 })).toHaveText(b.heading);
  });
}

test('all banners use the same sizing (one shared style)', async ({ page }) => {
  const sizes = [];
  for (const b of BANNERS) {
    await page.goto(b.page);
    sizes.push(await page.locator('main > .photo-hero.banner').evaluate((el) => {
      const cs = getComputedStyle(el);
      const wrap = getComputedStyle(el.querySelector('.wrap'));
      return { minHeight: cs.minHeight, padTop: wrap.paddingTop, padBottom: wrap.paddingBottom };
    }));
  }
  for (const s of sizes.slice(1)) expect(s).toEqual(sizes[0]);
});
