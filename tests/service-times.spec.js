/**
 * FEATURE: Service times show the current season's schedule, the same way everywhere.
 *          assets/js/season.js holds the one setting ('school-year' or 'summer') that is flipped
 *          twice a year; text for the other season is hidden.
 * COVERS:  assets/js/season.js, the [data-season-only] rule in assets/css/base.css,
 *          index.html (hero quick-link bar, #gather "When we gather", #join "In person" and
 *          "Listen on 96.7 FM", meta description), visit.html #remote "Listen on 96.7 FM", visit.html (#gather, the Sunday School answer and
 *          the #sunday-school section),
 *          and the footer "Sundays" column on every page (index, beliefs, sermons, visit)
 * WHY:     The times are written in several places by hand, and only one season's times may
 *          show at once. Missing a place, or forgetting a data-season-only marker, would tell
 *          visitors the wrong time.
 *          Also: every clock time on every page is written with am or pm.
 * UPDATE WHEN: the times or frequency change (edit EXPECTED), or they move/are added elsewhere.
 * REMOVE WHEN: the site stops listing service times.
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./support/fixtures');

const EXPECTED = {
  schoolYear: { sundaySchool: '9:30', service: '10:30' },
  summer: { service: '9:30' },
  thursdays: { time: '6:30', label: '1st & 3rd Thursdays' },
  radio: '96.7',
};
const SEASONS = ['school-year', 'summer'];
const PAGES = ['index.html', 'beliefs.html', 'sermons.html', 'visit.html'];

// Serves a stand-in season.js so each season can be checked whatever the real setting is.
const goto = async (page, url, season) => {
  await page.route('**/assets/js/season.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: `document.documentElement.dataset.season = ${JSON.stringify(season)};`,
  }));
  await page.goto(url);
};
// Visible text only (hidden season text is left out by innerText).
const text = (locator) => locator.evaluate((el) => el.innerText.replace(/\s+/g, ' ').trim());

test('the real season setting is valid and applied on every page', async ({ page }) => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'season.js'), 'utf8');
  const season = /const SEASON = '([^']+)'/.exec(src)?.[1];
  expect(SEASONS, 'SEASON in assets/js/season.js').toContain(season);
  for (const p of PAGES) {
    await page.goto(p);
    await expect(page.locator('html'), p).toHaveAttribute('data-season', season);
  }
});

test('without JavaScript the school-year times show', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route(/fonts\.g|youtube|ytimg/, (r) => r.fulfill({ body: '' }));
  await page.goto('http://localhost:4173/index.html');
  expect(await text(page.locator('#gather .gather-group').first())).toContain(`${EXPECTED.schoolYear.service} am Church Service`);
  await expect(page.locator('#gather [data-season-only="summer"]')).toBeHidden();
  await context.close();
});

test('home page meta description is season-neutral', async ({ page }) => {
  await page.goto('index.html');
  const meta = await page.locator('meta[name="description"]').getAttribute('content');
  expect(meta).not.toMatch(/\d:\d\d/);
  expect(meta).toContain(`${EXPECTED.radio} FM`);
});

// The radio option reads the same on Home ("Three ways to join") and Plan your visit.
for (const [p, where] of [['index.html', '#join'], ['visit.html', '#remote']]) {
  test(`${p} radio option: "Listen on ${EXPECTED.radio} FM" and what the transmitter reaches`, async ({ page }) => {
    await page.goto(p);
    const col = page.locator(`${where} .cols > *`, { hasText: 'Listen on' });
    await expect(col.locator('h3')).toHaveText(`Listen on ${EXPECTED.radio} FM`);
    await expect(col.locator('p')).toHaveText('Our short-range transmitter reaches the parking lot and nearby buildings, so you can listen from your car.');
  });
}

for (const season of SEASONS) {
  const school = season === 'school-year';
  const s = EXPECTED.schoolYear;

  test.describe(`${season} schedule`, () => {
    for (const p of ['index.html', 'visit.html']) {
      test(`${p} "When we gather": Sundays, then Thursdays`, async ({ page }) => {
        await goto(page, p, season);
        const groups = page.locator('#gather .gather-group');
        await expect(groups).toHaveCount(2);
        await expect(groups.nth(0).locator('h3')).toHaveText('Sundays');
        await expect(groups.nth(1).locator('h3')).toHaveText('Thursdays');

        // Each Sunday row: time + name, then a short description with a link to more detail
        // (on the visit page the links jump within the page).
        const more = p === 'visit.html' ? '' : 'visit.html';
        const sundays = groups.nth(0).locator('.rows > li:visible');
        const row = async (i) => {
          const li = sundays.nth(i);
          return {
            name: await li.evaluate((el) => `${el.querySelector('.time').textContent} ${el.querySelector('.what').firstChild.textContent}`.trim()),
            desc: await text(li.locator('.desc')),
            href: await li.locator('.desc a').getAttribute('href'),
          };
        };
        const school_ = { name: `${s.sundaySchool} am Sunday School`, href: `${more}#sunday-school`, desc: /^Two adult classes and a children’s class, each working through a Bible study\. More about Sunday School$/ };
        const service = (time) => ({ name: `${time} am Church Service`, href: `${more}#sunday`, desc: /^Singing, prayer, and a sermon from the Bible\. What to expect$/ });
        const expected = school ? [school_, service(s.service)] : [service(EXPECTED.summer.service)];
        await expect(sundays).toHaveCount(expected.length);
        for (const [i, e] of expected.entries()) {
          const r = await row(i);
          expect(r.name).toBe(e.name);
          expect(r.desc).toMatch(e.desc);
          expect(r.href).toBe(e.href);
        }

        // Thursday row: same shape as the Sunday rows (time + name, then the gray note line).
        const thursday = groups.nth(1).locator('.rows > li');
        await expect(thursday).toHaveCount(1);
        expect(await thursday.evaluate((el) => `${el.querySelector('.time').textContent} ${el.querySelector('.what').firstChild.textContent}`.trim()))
          .toBe(`${EXPECTED.thursdays.time} pm Men’s and Women’s Bible Studies`);
        expect(await text(thursday.locator('.desc')))
          .toBe(`${EXPECTED.thursdays.label} of the month. Location varies; ask in person.`);
        await expect(thursday.locator('.when')).toHaveCount(0);
        expect(await text(page.locator('#gather .rows-note'))).toContain(`${EXPECTED.radio} FM`);
      });
    }

    test('home hero bar shows this season\'s Sunday times', async ({ page }) => {
      await goto(page, 'index.html', season);
      const cell = await text(page.locator('.home-hero nav.quick a[href="#gather"]'));
      expect(cell).toBe(school
        ? `Church Service ${s.service} am Sunday School ${s.sundaySchool} am`
        : `Church Service ${EXPECTED.summer.service} am Summer schedule`);
    });

    test('home "In person" column states this season\'s times', async ({ page }) => {
      await goto(page, 'index.html', season);
      const col = await text(page.locator('#join .cols > *', { hasText: 'In person' }).locator('p'));
      expect(col).toBe(school
        ? `There is seating inside. Sunday School starts at ${s.sundaySchool} am and the Church Service at ${s.service} am.`
        : `There is seating inside. The Church Service starts at ${EXPECTED.summer.service} am.`);
    });

    test('visit page Sunday School answer matches the season', async ({ page }) => {
      await goto(page, 'visit.html', season);
      const answer = await text(page.locator('#questions dt', { hasText: 'Sunday School' }).locator('xpath=following-sibling::dd'));
      expect(answer).toMatch(school ? /^Yes\. It meets for an hour at 9:30 am, before the 10:30 am Church Service\./ : /^Not over the summer\. The building can get warm, so for now the service moves to 9:30 am and we get out earlier\./);
    });

    // Every clock time a visitor reads says am or pm (scripture references like John 3:16 are skipped).
    for (const p of PAGES) {
      test(`${p} writes every time with am or pm`, async ({ page }) => {
        await goto(page, p, season);
        const visible = await page.locator('body').evaluate((body) => {
          const copy = body.cloneNode(true);
          copy.querySelectorAll('.ref, .passage-ref, figure, cite, blockquote, script').forEach((el) => el.remove());
          // innerText on a detached copy ignores CSS, so drop the other season's text by hand.
          const season = document.documentElement.dataset.season;
          copy.querySelectorAll('[data-season-only]').forEach((el) => { if (el.dataset.seasonOnly !== season) el.remove(); });
          return copy.textContent.replace(/\s+/g, ' ');
        });
        // A number right after a capitalized word is a verse (sermon titles quote them, e.g. "Luke 22:42").
        const bare = [...visible.matchAll(/(?<![A-Z][a-z]+\.? )\b\d{1,2}:\d{2}\b(?!\s*[ap]m)/g)].map((m) => visible.slice(Math.max(0, m.index - 30), m.index + 15));
        expect(bare, 'times without am/pm').toEqual([]);
      });
    }

    for (const p of PAGES) {
      test(`${p} footer shows this season's Sunday times`, async ({ page }) => {
        await goto(page, p, season);
        // The visible lines under the "Sundays" label (the label itself is styled in capitals).
        const lines = await page.locator('footer.site .foot-cols section', { hasText: 'Sundays' })
          .locator('p:not(.eyebrow)')
          .evaluateAll((ps) => ps.filter((p) => p.checkVisibility()).map((p) => p.innerText.trim()));
        expect(lines).toEqual(school
          ? [`${s.sundaySchool} am Sunday School`, `${s.service} am Church Service`]
          : [`${EXPECTED.summer.service} am Church Service`]);
      });
    }
  });
}
