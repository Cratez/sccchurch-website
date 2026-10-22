/**
 * FEATURE: Service times and radio frequency are stated the same way everywhere.
 * COVERS:  index.html (meta description, hero quick-link bar, #gather "When we gather" rows,
 *          #join "In person" and "On the radio" columns),
 *          visit.html times rows (once Task 4 of the design overhaul adds them), and the footer
 *          "Sundays" column on every page (index, beliefs, sermons, visit)
 * WHY:     The times are repeated in several places by hand. Changing one and missing another
 *          would tell visitors two different times.
 * UPDATE WHEN: the times or frequency change (edit EXPECTED), or they move/are added elsewhere.
 * REMOVE WHEN: the site stops listing service times.
 */
const { test, expect } = require('./support/fixtures');

const EXPECTED = {
  schoolYear: { service: '10:30', sundaySchool: '9:30', label: 'September – early June' },
  summer: { service: '9:30' },
  thursdays: { time: '6:30', label: '1st & 3rd Thursdays' },
  radio: '96.7',
};

test('home page meta description states the times and frequency', async ({ page }) => {
  await page.goto('index.html');
  const meta = await page.locator('meta[name="description"]').getAttribute('content');
  expect(meta).toContain(`Sundays ${EXPECTED.schoolYear.service} am`);
  expect(meta).toContain(`Sunday School ${EXPECTED.schoolYear.sundaySchool} am, ${EXPECTED.schoolYear.label}`);
  expect(meta).toContain(`summer ${EXPECTED.summer.service} am`);
  expect(meta).toContain(`${EXPECTED.radio} FM`);
});

test('home page hero bar shows the Sunday and summer times', async ({ page }) => {
  await page.goto('index.html');
  const cell = page.locator('.home-hero nav.quick a[href="#gather"]');
  await expect(cell).toContainText(`Sundays ${EXPECTED.schoolYear.service} am`);
  await expect(cell).toContainText(`Summer ${EXPECTED.summer.service} am`);
});

test('home page "When we gather" rows list every time', async ({ page }) => {
  await page.goto('index.html');
  const rows = page.locator('#gather .rows > li');
  await expect(rows).toHaveCount(4);
  const s = EXPECTED.schoolYear;
  await expect(rows.nth(0)).toContainText(`${s.service} am`);
  await expect(rows.nth(0)).toContainText('Worship service');
  await expect(rows.nth(0)).toContainText(s.label);
  await expect(rows.nth(1)).toContainText(`${s.sundaySchool} am`);
  await expect(rows.nth(1)).toContainText('Sunday School');
  await expect(rows.nth(1)).toContainText(s.label);
  await expect(rows.nth(2)).toContainText(`${EXPECTED.summer.service} am`);
  await expect(rows.nth(2)).toContainText('summer');
  await expect(rows.nth(3)).toContainText(`${EXPECTED.thursdays.time} pm`);
  await expect(rows.nth(3)).toContainText(EXPECTED.thursdays.label);
  await expect(page.locator('#gather .note')).toContainText(`${EXPECTED.radio} FM`);
});

test('home page "In person" column states the same times', async ({ page }) => {
  await page.goto('index.html');
  const col = page.locator('#join .cols > *', { hasText: 'In person' });
  await expect(col).toContainText(`${EXPECTED.schoolYear.service} am`);
  await expect(col).toContainText(`Sunday School at ${EXPECTED.schoolYear.sundaySchool} am`);
  await expect(col).toContainText(EXPECTED.schoolYear.label);
  await expect(col).toContainText(`In summer, worship starts at ${EXPECTED.summer.service} am`);
  await expect(page.locator('#join .cols > *', { hasText: 'On the radio' }).locator('.freq')).toHaveText(`${EXPECTED.radio} FM`);
});

// TODO(Task 4 of the design overhaul): visit.html is still a placeholder. Task 4 adds its
// times rows; it removes this skip and adjusts the selectors to its markup.
test.skip('visit page rows list the same times', async ({ page }) => {
  await page.goto('visit.html');
  const rows = page.locator('main .rows');
  const s = EXPECTED.schoolYear;
  await expect(rows).toContainText(`${s.service} am`);
  await expect(rows).toContainText(`${s.sundaySchool} am`);
  await expect(rows).toContainText(s.label);
  await expect(rows).toContainText(`${EXPECTED.summer.service} am`);
  await expect(rows).toContainText(`${EXPECTED.thursdays.time} pm`);
  await expect(rows).toContainText(EXPECTED.thursdays.label);
});

// Footer "Sundays" column (the same on every page).
for (const path of ['index.html', 'beliefs.html', 'sermons.html', 'visit.html']) {
  test(`${path} footer lists the same times and frequency`, async ({ page }) => {
    await page.goto(path);
    const s = EXPECTED.schoolYear;
    const sundays = page.locator('footer.site .foot-cols section', { hasText: 'Sundays' });
    await expect(sundays).toContainText(`${s.service} am worship · ${s.sundaySchool} am Sunday School`);
    await expect(sundays).toContainText(s.label);
    await expect(sundays).toContainText(`Summer: ${EXPECTED.summer.service} am worship`);
    await expect(sundays).toContainText(`${EXPECTED.radio} FM in the parking lot`);
  });
}
