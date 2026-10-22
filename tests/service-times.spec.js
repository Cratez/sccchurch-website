/**
 * FEATURE: Service times and radio frequency are stated the same way everywhere.
 * COVERS:  index.html (meta description, hero .times, "In person" card, footer), beliefs.html (footer)
 * WHY:     The times are repeated in several places by hand. Changing one and missing another
 *          would tell visitors two different times.
 * UPDATE WHEN: the times or frequency change (edit EXPECTED), or they move/are added elsewhere.
 * REMOVE WHEN: the site stops listing service times.
 */
const { test, expect } = require('./support/fixtures');

const EXPECTED = { sundaySchool: '9:30', service: '10:30', radio: '96.7' };

test('home page hero, card, meta description, and footer agree', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('.hero .time b')).toHaveText([`${EXPECTED.sundaySchool}am`, `${EXPECTED.service}am`]);

  const meta = await page.locator('meta[name="description"]').getAttribute('content');
  const card = page.locator('.card', { hasText: 'In person' });
  for (const t of [EXPECTED.sundaySchool, EXPECTED.service]) {
    expect(meta).toContain(`${t} am`);
    await expect(card).toContainText(`${t} am`);
  }
  await expect(page.locator('.card', { hasText: 'On the radio' }).locator('.freq')).toHaveText(`${EXPECTED.radio} FM`);
});

for (const path of ['index.html', 'beliefs.html']) {
  test(`${path} footer lists the same times and frequency`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('footer.site')).toContainText(
      `Sunday School ${EXPECTED.sundaySchool} am · Service ${EXPECTED.service} am · ${EXPECTED.radio} FM`);
  });
}
