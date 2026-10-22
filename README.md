# South Clackamas Community Church Website

Static website for [South Clackamas Community Church](https://sccchurch.com), hosted on GitHub Pages. It replaces the old Wix site.

There is no framework, no build step, and nothing to install to run the site. The site is plain HTML, CSS, and a little JavaScript. Edit a file, refresh the browser, and you see the change. Only the automated tests and the daily sermon data job need an install (see "Testing" and "Sermon data").

## Pages

| Page | File | What it contains |
| --- | --- | --- |
| Home | `index.html` | Mt. Hood photo hero with rotating verse and quick links, "When we gather" times, ways to join (in person / radio / online), first-visit teaser, latest-service video with TV tip |
| Plan your visit | `visit.html` | Trillium Lake photo banner, common questions, what happens on a Sunday (step by step), Sunday School (the three classes), "When we gather" times, where we are (near Molalla, with a Google Maps link and phone), and ways to join if you can't come in person |
| Sermons | `sermons.html` | Trillium Lake photo banner, then the 6 most recent service recordings, and past sermon series with notes, audio, and video links (built from `data/sermons.json`; see "Sermon data") |
| What We Believe | `beliefs.html` | Mt. Hood summit photo banner, then the Statement of Faith, with clickable scripture references that load the verse text |

## Project structure

```
sccchurch-website/
├── index.html              Home page
├── sermons.html            Sermons page
├── beliefs.html            Statement of Faith
├── visit.html              Plan your visit
├── README.md               This file
├── CLAUDE.md               Rules for AI assistants working on the site (including testing rules)
├── LICENSE
├── package.json            Test tooling and the sermon data job; the site itself doesn't use it
├── playwright.config.js    Test settings
├── data/
│   ├── series.json         Hand-edited list of sermon series (see "Sermon data")
│   ├── sermons.json        Generated daily by the sermon data job; don't edit by hand
│   ├── video-notes.json    Service titles/summaries written from YouTube captions (editable)
│   │                       (copied into sermons.json by scripts/video-notes/apply.js)
│   └── cache/              Generated: titles already read from notes PDFs
├── scripts/build-sermons/  The sermon data job (reads YouTube and Google Drive)
├── scripts/video-notes/    Downloads service captions for the summarize-services skill
├── scripts/images/         build-photos.js: makes the website photos from the originals (see "Photos")
├── .claude/skills/         Claude Code skills for this repo (summarize-services)
├── plans/                  Design plans for larger features
├── .github/workflows/
│   ├── tests.yml           Runs the tests on GitHub for every push
│   └── update-sermons.yml  Runs the sermon data job daily
├── tests/                  Automated tests (see "Testing")
│   ├── support/            Shared test setup: local web server, fake outside services
│   ├── fixtures/           Sample data used by tests
│   ├── live/               Opt-in checks against real outside services
│   └── *.spec.js           One file per feature
└── assets/
    ├── favicon.svg         Mountain mark: three peaks and a cross (tab icon and header mark)
    ├── img/
    │   ├── photos/         Website photos (hood-sunset-*, trillium-*, hood-summit-*, trillium-kayak-*) and CREDITS.md
    │   ├── original-logo.webp   Original watercolor mountain logo (footer easter egg)
    │   └── new-logo-v1.jpg      Newer mountain + trees logo (kept for future use)
    ├── css/
    │   ├── base.css        Shared: color tokens (light and dark), fonts, header, buttons, headings, rows/columns, photo hero, footer (loaded on every page)
    │   ├── home.css        Home page only (verse, quick links, times, ways to join, video)
    │   ├── visit.css       Plan your visit page only
    │   ├── sermons.css     Sermons page only
    │   └── beliefs.css     Statement of Faith page only
    └── js/
        ├── season.js       Every page: THE SEASON SWITCH (school-year or summer service times)
        ├── site.js         Every page: phone menu, light/dark toggle, footer easter egg (original logo pop-up)
        ├── home.js         Home page: rotating hero verse, and a friendly fallback when the video can't play from a local file
        ├── sermons.js      Sermons page: builds the cards and series list from data/sermons.json
        └── beliefs.js      Reading-progress bar, sidebar highlighting, scripture lookups
```

Each page loads `base.css` plus its own stylesheet. The header and footer are repeated in each HTML file (see "Adding a page").

## Running locally

**Quickest:** double-click `index.html` to check layout and text. The embedded YouTube video will not play this way (YouTube blocks embeds on pages opened from a file and shows "Error 153"), so the page shows a link instead. Use a local server for the full experience.

**Recommended:** run a small local server, which behaves like the real site:

- **VS Code:** install the "Live Server" extension, right-click `index.html`, then "Open with Live Server". The page reloads when you save.
- **Python:** from this folder run `py -m http.server 8000` (Windows) or `python3 -m http.server 8000` (Mac/Linux), then open <http://localhost:8000>.

Scripture lookups, the YouTube video, and the Sermons page need an internet connection and a local server (not a double-clicked file).

## Testing

Automated tests open the site in a real browser (Chromium, via [Playwright](https://playwright.dev)) and check that it works: links point somewhere real, service times match everywhere, scripture lookups behave, the easter egg opens and closes, and nothing breaks on a phone-sized screen. Every test runs twice, once at desktop size and once at phone size.

**One-time setup** (needs [Node.js](https://nodejs.org)):

```
npm install
npx playwright install chromium
```

**Run the tests:**

| Command | What it does |
| --- | --- |
| `npm test` | Runs all normal tests (a few seconds). Outside services like bible-api.com and YouTube are faked, so these never fail because a service is down. |
| `npm run test:live` | Checks every scripture reference and every home page hero verse against the real bible-api.com (about 3 minutes), and, if `GOOGLE_API_KEY` is set, that every sermon series folder and the YouTube channel can be read. Run it after changing references or `data/series.json`. |
| `npm run test:report` | Opens the results of the last run in a browser, with screenshots of any failures. |

**On GitHub:** tests run automatically on every push (the "Tests" workflow in the repo's **Actions** tab). A red X next to a commit means a test failed; the run's page has a downloadable report.

**How tests are organized:** one file per feature in `tests/`. Each file starts with a header saying which feature it covers, which files it depends on, and when it should be updated or removed. When you change or remove a feature, check those headers so old tests get updated or deleted instead of failing for no good reason. The full rules are in `CLAUDE.md`.

**When a test fails:** read the message. It names what was expected and what the page actually did. Either the site has a bug, or the site changed on purpose and the test needs updating to match. Don't change a test just to make it pass.

## Making common edits

| I want to change... | Edit this |
| --- | --- |
| Service times / summer schedule | **Twice a year, flip the season:** open `assets/js/season.js` and change `SEASON` to `'summer'` (early June) or back to `'school-year'` (September), then commit and push. Every page then shows only that season's times: school year is the Church Service at 10:30 am with Sunday School at 9:30 am; summer is one Church Service at 9:30 am. To change the **times themselves**, edit them in every place they're written: `index.html` (the "Sundays" link in the hero's quick-link bar, the Sundays and Thursdays rows in `#gather`, and the "In person" column in `#join`), `visit.html` (the rows in `#gather` and the Sunday School answer in the questions list), and the footer "Sundays" column in **all four** pages. Season-specific text is marked `data-season-only="school-year"` or `data-season-only="summer"`; text without that marker shows in both seasons (like the Thursday Bible studies). Then update the `EXPECTED` object at the top of `tests/service-times.spec.js`; the test checks every place in both seasons. |
| Phone, Facebook, Google Maps links | Written by hand in several places, so change all of them. Phone: `visit.html` (the "Call" button in "Where we are", `#where`). Google Maps: `index.html` ("Get directions" in the "In person" column, `#join`) and `visit.html` (the "Open in Google Maps" button in `#where`). Phone, Facebook and Maps are also in the footer "Contact"/"Find us" columns of **all four** pages (`index.html`, `visit.html`, `sermons.html`, `beliefs.html`). Search the folder for the old number or address to be sure none are left. |
| Hero verses (the rotating verse on the home page) | `index.html`: the list in `<script type="application/json" id="hero-verses">` (KJV text; add `"partial": true` when quoting only part of a verse). The first one is also written into the `<figure class="verse">` above it, for visitors without JavaScript. Run `npm run test:live` (needs internet) to check every verse's wording against the KJV on bible-api.com; the normal `npm test` only checks that the rotation works. |
| Colors | The `:root { ... }` block at the top of `assets/css/base.css`. The color "tokens" (named colors such as `--brand` and `--bg` that the whole site uses) live here, so one change updates every page. The dark set is written twice just below it (`[data-theme="dark"]` for visitors who chose dark with the footer toggle, and the `prefers-color-scheme: dark` block for devices set to dark); keep the two the same. `tests/contrast.spec.js` checks that text stays readable in both light and dark mode, so run `npm test` after changing a color. |
| Fonts | The Google Fonts `<link>` in each page's `<head>`, plus `--serif` / `--sans` in `base.css` |
| Header / tab icon | Replace `assets/favicon.svg` (used for both the tab icon and the header mark) |
| Page photos | Home: the `<picture>` in `.home-hero` in `index.html`. Plan your visit, What We Believe and Sermons: the banner `<picture>` at the top of `visit.html`, `beliefs.html` and `sermons.html`. The dark overlay and fallback color are `.photo-hero`, and the inner-page banner size is `.photo-hero.banner`, both in `assets/css/base.css`. Which part of each photo shows (`object-position`) is set per page in `assets/css/home.css`, `visit.css`, `beliefs.css` and `sermons.css`. |
| Replace or add a photo | Put the originals in a folder on your computer and run `npm run photos -- <that folder>` (needs `npm install` once). It writes the resized WebP/JPG files into `assets/img/photos/`. The original file names it expects are listed in the `PHOTOS` list near the top of `scripts/images/build-photos.js`. Update `assets/img/photos/CREDITS.md` with the photographer and source, and `tests/photos.spec.js` (and `tests/page-banners.spec.js` for a banner) if file names or sizes change. The originals are not stored in the repo. |
| Plan your visit questions and steps | `visit.html`: the questions are the `<div><dt>…</dt><dd>…</dd></div>` rows in `#questions`; the Sunday steps are the list items in `#sunday`; the Sunday School description is the `#sunday-school` section (its first sentence has a school-year and a summer version). The short descriptions under each Sunday time in "When we gather" (on both Home and Plan your visit) link to these two sections. Copy a row to add one. If an answer mentions a time, see "Service times" above. Styles are in `assets/css/visit.css`. Then check `tests/visit.spec.js`. |
| Add or change a sermon series | `data/series.json` (see "Sermon data") |
| Sermons page look | `assets/css/sermons.css` for styling, `assets/js/sermons.js` for what each card shows. Then update `tests/sermons-page.spec.js`. |

### Statement of Faith

The wording in `beliefs.html` is taken **verbatim from the church's official Statement of Faith PDF**. Do not paraphrase, merge, or "clean up" it. Any wording change should be approved by church leadership first.

Each section looks like this:

```html
<section class="tenet" id="god">
  <span class="num">01</span>
  <h2>God</h2>
  <p class="body">We believe in one God, ...</p>
  <div class="key">
    <p class="label">Scripture</p>
    <ul class="refs">
      <li><button type="button" class="ref" aria-expanded="false" data-ref="Genesis 1:26">Genesis 1:26</button></li>
      ...
    </ul>
    <div class="passage" aria-live="polite" hidden></div>
  </div>
</section>
```

To add or change a scripture reference, edit both the `data-ref` value (what is looked up) and the visible text. To add a whole section, copy an existing `<section class="tenet">`, give it a unique `id`, update its `<span class="num">`, and add a matching numbered link to the sidebar list (`<aside class="toc">`). Inserting a section in the middle means renumbering the sections after it in both places. Also update the `SECTIONS` list in `tests/beliefs-structure.spec.js`, and run `npm run test:live` to confirm new references load.

## How the interactive parts work

### Scripture lookups
Clicking a reference on the Statement of Faith page fetches the passage from [bible-api.com](https://bible-api.com), a free service that needs no account or API key. Passages display in the **King James Version (KJV)**, because the free service only carries public-domain translations. Popular modern versions such as NKJV, ESV, and NIV are copyrighted, so they are not available this way. Instead, every passage panel has links to read the same passage in **NKJV, ESV, or NIV on Bible Gateway** (opens in a new tab).

- Results are cached for the visit, so reopening a passage does not make another request.
- If a passage cannot be loaded, the panel shows a "Read it on Bible Gateway" link instead.
- The service asks users not to abuse it. Normal visitor traffic is fine.
- Whole-chapter references (for example "John 3") load the full chapter in a scrolling panel.
- Showing NKJV, ESV, or NIV text directly on the page would require a licensed API key (the ESV API is free for non-commercial use). Keys must not be placed in this public repository, so it would need a small server-side proxy. Not worth it unless there is strong demand.

### Latest service video
The home page embeds the channel's **uploads playlist** (`UU1Svz8uLW3raCDDP9I1eg_A`, which is the channel ID `UC1Svz8uLW3raCDDP9I1eg_A` with `UC` changed to `UU`). The newest item plays first, so nothing needs updating each week. Past live streams are the sermon recordings.

- If the player shows **"Error 153"**, the page was probably opened as a local file or without a referrer. YouTube requires embeds to be loaded from a real web address. Test on the deployed site or a local server.
- If the video shows an old service, the channel has not had a newer upload or stream.
- A one-line tip below the player explains how to watch on a TV. If the player won't load, visitors can use the YouTube links in the hero bar and the "Online" column.

## Sermon data

The Sermons page reads `data/sermons.json`. A GitHub job ("Update sermon data", `.github/workflows/update-sermons.yml`) rebuilds that file **every day at about 3 pm Pacific**. The job:

1. Lists the channel's past **live streams** on YouTube (where each Sunday service is saved; titles like `SCCC 10/18/2026`).
2. Lists the files in each series' Google Drive folder from `data/series.json`.
3. Reads the **title and passage** from the top of each new notes PDF (only once per file; results are cached in `data/cache/`).
4. Matches each sermon to the stream from the **same date**, and builds the 6 newest services plus every series.
5. Commits `data/sermons.json` if anything changed. GitHub Pages then publishes it.

If anything goes wrong (a folder made private, a bad key, Google down), the job changes nothing. The site keeps showing the last good data, and GitHub emails the repo owner that the run failed.

### One-time setup

The job needs a free Google API key.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project (e.g. "sccchurch-website").
2. Under **APIs & Services, Library**, enable **YouTube Data API v3** and **Google Drive API**.
3. Under **APIs & Services, Credentials**, choose **Create credentials, API key**. Then edit the key, and under **API restrictions** restrict it to those two APIs.
4. In this GitHub repo: **Settings, Secrets and variables, Actions, New repository secret**. Name it `GOOGLE_API_KEY` and paste the key.
5. Open the repo's **Actions** tab, choose **Update sermon data**, and click **Run workflow**. When it finishes, the Sermons page fills in.

The key only reads public information, but still never put it in a file in this repo; it belongs only in the GitHub secret.

### Adding a sermon series

Add an entry to `data/series.json`:

```json
{
  "id": "acts",
  "title": "Acts",
  "folder": "https://drive.google.com/drive/folders/<folder id>",
  "current": true,
  "summary": null,
  "overrides": {}
}
```

- **`id`**: short lowercase name, words joined with dashes. Used in links like `sermons.html#series-acts`.
- **`folder`**: the series' Google Drive folder. It must be shared as **"Anyone with the link can view"**.
- **`current`**: `true` for the series being preached now. It's listed first, labeled "Current series", and its sermons show up on the recent service cards. Set it back to `false` when the series ends.
- **`summary`**: optional short description shown on the series card.
- **`overrides`**: optional fixes for a single sermon, keyed by its file name without the extension, e.g. `"003 01-23-22": { "title": "Correct title", "passage": "James 1:9-11" }`.

To hide a specific video from the Sermons page (e.g. a test stream), add its YouTube video ID to `"hiddenVideos"` at the top of the file.

### File naming in Drive

The job only understands files named **`NNN MM-DD-YY`** plus the extension, using the date of the sermon:

- `001 01-09-22.mp3`: audio (`.mp3`, `.m4a`, or `.wav`)
- `001 01-09-22.pdf`: notes
- In-between numbers like `001.5 01-31-21.pdf` are fine.
- One sermon spread over several Sundays: either a letter after the number (`032 A 12-04-22.pdf`, `032 B 12-11-22.pdf`, shown as #32A and #32B) or a part after the date (`024 07-24-22 (part 1).pdf`, shown as #24 (part 1)).
- Audio or PDF files with no number and date (e.g. `Intro to Author.pdf` and `Intro to Author.mp3`) are listed at the top of the series, titled by their file name.
- Small typos in the date (`05-29=22`, `02-27 -22`, extra spaces) are still understood, and the job suggests renaming those files in its warnings.

To fix a title with `overrides`, use the sermon's `key` exactly as it appears in `data/sermons.json` (e.g. `"032A 12-04-22"` or `"024 07-24-22 (part 1)"`).

For the title and passage to show, the notes PDF should start like this:

```
James #1
You Can Have Joy No Matter What
January 9, 2022
Text: James 1:1-4
```

Some PDFs have no title line (just `James #6`, the date, and `Text:`), and a few are scanned images with no readable text; those sermons show only their number, date, and links. `Text-` works as well as `Text:`. Add a title with `overrides` if you want one.

Other files (e.g. Word documents) are skipped. The job lists them as warnings on the run's page (Actions tab, open the run, see the summary), so a misnamed upload is easy to spot.

### Running it yourself

```
GOOGLE_API_KEY=your-key npm run sermons
```

(On Windows PowerShell: `$env:GOOGLE_API_KEY="your-key"; npm run sermons`.) This rewrites `data/sermons.json` locally; commit it if you want it published.

### Service titles from captions

YouTube names the streams only by date (`SCCC 10/18/2026`), so a recent service that doesn't match a sermon in Drive would just say "Sunday service". To give those a real title and a short summary, there's a Claude Code skill that reads YouTube's **automatic captions**:

1. Open this repo in Claude Code and run `/summarize-services` (or ask Claude to "summarize the recent services").
2. It downloads the captions for recent services that don't have notes yet (with [yt-dlp](https://github.com/yt-dlp/yt-dlp), on your computer), reads each transcript, saves a title and a 1-2 sentence summary to `data/video-notes.json`, and copies them into `data/sermons.json` (`node scripts/video-notes/apply.js`), so the page shows them right away.
3. Commit and push to put them on the live site. The daily job keeps them in place on every rebuild.

Things to know:

- **Only about half of the services have automatic captions.** The others stay as "Sunday service". Running the skill again later picks up any that gain captions.
- **A title from the sermon's notes PDF still wins.** The caption title is used only when there's no PDF title; the summary is shown either way. A title or summary in `data/series.json` `overrides` beats both.
- **Generated text can be wrong.** Edit or delete any entry in `data/video-notes.json` by hand, then run `node scripts/video-notes/apply.js` to update the page data (`npm test` reminds you if you forget). To regenerate one, ask Claude to redo it (the script takes `--video <id>`).
- **Why it runs locally:** YouTube usually blocks caption downloads from cloud servers like GitHub's, and running it in Claude Code means no extra API key or cost.
- **Setup:** yt-dlp must be installed (`winget install yt-dlp.yt-dlp`) and kept current (`yt-dlp -U`). Errors like "The page needs to be reloaded" mean it's out of date. Node.js is also needed (already required for the tests).

### Changing the data format

`data/sermons.json` is the contract between the job (`scripts/build-sermons/`) and the page (`assets/js/sermons.js`). The format is checked by `scripts/build-sermons/validate.js`. Change all of them together, with tests. The original design is in `plans/sermons-page.md`.

## Adding a page

1. Copy `beliefs.html` (or `index.html`) to a new file, e.g. `about.html`, and replace the content inside `<main>`.
2. Keep the small theme `<script>` in the `<head>` (it must stay before the stylesheets), the header, and the footer. Set `aria-current="page"` on that page's nav link, and remove it from the page you copied.
3. Add a link to the new page in the `<nav>` of **every** HTML file.
4. If the page needs its own styles, add `assets/css/about.css` and link it after `base.css`. Reuse `base.css` colors and spacing so the look stays consistent.
5. Add the new page to the page lists at the top of `tests/site-shell.spec.js` and `tests/easter-egg.spec.js`, and in the footer page list in `tests/service-times.spec.js`, and add tests for anything new the page does (see "Testing").

Because the header and footer are copied into each file, a nav change means editing every page. If the site grows beyond a handful of pages, consider a static site generator such as Astro or Eleventy, which keep the design but remove that repetition.

## Deployment (GitHub Pages)

The site is served directly from the `main` branch.

1. In GitHub, open the repo, then **Settings, Pages**.
2. Under **Build and deployment**, set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
3. After a minute the site is live at `https://cratez.github.io/sccchurch-website/`.
4. From then on, every push to `main` redeploys automatically (watch progress in the repo's **Actions** tab).

Links in this site are all relative (no leading `/`), so it works both at the `.../sccchurch-website/` address and on a custom domain.

### Moving sccchurch.com off Wix

**Current state (checked October 2026):** `sccchurch.com` is registered at **Wix** (expires 2028-12-12, transfer-locked), and Wix also hosts its DNS (`ns2/ns3.wixdns.net`). The domain still points at the old Wix site. **Church email runs on Google** (Gmail / Google Workspace), so the email records must come across exactly, or email stops working.

**The plan:** move DNS to **Cloudflare** first, point the domain at GitHub Pages, then transfer the registration to **Cloudflare Registrar** so Wix can be dropped entirely. `sccchurch.com` is the main address; `www.sccchurch.com` redirects to it.

Do this only when ready to cut over from Wix. The site switches over as soon as DNS changes take effect.

#### 1. Record what's there now
In Wix, open the domain's DNS records (Domains, then Manage DNS Records) and screenshot or copy **every** record. Records that can't be seen from outside (such as Google's DKIM email-signing record) only show up here. Known records include:

| Type | Name | Value | Keep? |
| --- | --- | --- | --- |
| MX | `@` | `aspmx.l.google.com` (10), `alt1`–`alt4.aspmx.l.google.com` (20–50) | **Yes**: email |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | **Yes**: email |
| TXT | `@` | `google-site-verification=...` | **Yes**: Google account verification |
| TXT | `google._domainkey` (if present) | `v=DKIM1; ...` | **Yes**: email |
| CNAME | `_dmarc` | `_dmarc.wixemails.com` | **Replace** (see step 2) |
| A | `@` | Wix IPs (`185.230.63.x`) | **No**: replaced by GitHub |
| CNAME | `www` | `cdn3.wixdns.net` | **No**: replaced by GitHub |

#### 2. Set up Cloudflare
1. Create a free Cloudflare account and add `sccchurch.com` (Free plan). Cloudflare imports the existing records.
2. Compare the imported list against step 1. Make sure every email record is there.
3. Delete the Wix `A` records for `@` and the `www` CNAME.
4. Replace the `_dmarc` CNAME (it points at Wix) with a TXT record: name `_dmarc`, value `v=DMARC1; p=none;`.
5. Add the GitHub Pages records. Set each one's proxy status to **DNS only** (grey cloud). Cloudflare's proxy gets in the way of GitHub issuing the HTTPS certificate.

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |
| CNAME | `www` | `cratez.github.io` |

6. **Verify the domain with GitHub** (protects it from being claimed by another GitHub account): GitHub profile **Settings, Pages, Add a domain**, enter `sccchurch.com`, and add the TXT record GitHub shows (named `_github-pages-challenge-cratez`) in Cloudflare.

#### 3. Switch nameservers
1. If DNSSEC is turned on at Wix, turn it off first.
2. In Wix, change the domain's nameservers to the two Cloudflare gives you.
3. Wait for Cloudflare to show the site as **Active** (usually minutes to a few hours).

#### 4. Point GitHub Pages at the domain
1. Repo **Settings, Pages, Custom domain**: enter `sccchurch.com` and save. GitHub commits a `CNAME` file to `main`, so `git pull` before your next change.
2. Once the DNS check passes and the certificate is issued (can take up to a day), turn on **Enforce HTTPS**.
3. Test: `https://sccchurch.com`, `https://www.sccchurch.com` (should redirect), and **send and receive a test email**.

#### 5. Transfer the registration to Cloudflare
1. In Wix, turn off the domain's transfer lock and get the **authorization (EPP) code**.
2. In Cloudflare, **Domain Registration, Transfer Domains**, select `sccchurch.com`, enter the code, and pay for one year (it's added to the current expiry).
3. Approve the transfer email if one arrives. Transfers take up to 5 days.
4. Only after the transfer completes and the site and email both work: cancel the Wix site plan and turn off Wix domain auto-renew.

Later DNS changes all happen in Cloudflare. See [GitHub's custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) for background.

## Design notes

- **Style:** pale mist background and douglas-fir green, with a rose accent taken from the original logo (decoration and large text only). EB Garamond (a classic book serif) for headings and reading text; Public Sans for labels, buttons, and menus. Square-cornered buttons and thin ruled lines instead of rounded cards.
- **Light/dark:** follows the visitor's device setting until they press the sun/moon button in the footer. Their choice is saved in the browser (`localStorage`) and applied by a tiny script in each page's `<head>` before the page draws, so there is no white flash.
- **Phone menu:** below 760px wide, the header links fold behind a "Menu" button. If JavaScript is off, the links simply stay visible.
- **Accessibility:** semantic HTML, keyboard focus outlines, `prefers-reduced-motion` respected, and light/dark contrast chosen deliberately. Check any new color combination for contrast.
- **Photos:** the home page uses a Mt. Hood sunset, Plan your visit uses Mt. Hood over Trillium Lake, What We Believe uses a close-up of Mt. Hood's summit, and Sermons uses Trillium Lake with a kayaker, all by Aleksey Kuprikov (Pexels; see `assets/img/photos/CREDITS.md`). A dark overlay keeps the white text readable, and if a photo fails to load the green background still keeps the text readable.
- **Rotating verse:** the home hero fades between King James verses about every 10 seconds, with a pause button. Visitors who ask their device for reduced motion see one verse per day instead of a rotation, and with JavaScript off they see the first verse (written into the page).
- **Logos:**
  - Header / tab icon: three-peak mountain mark with a small cross (`assets/favicon.svg`). In dark mode the header shows it on a light green square so it stays visible.
  - Original logo: watercolor three-peak mark (`assets/img/original-logo.webp`), shown by the footer easter egg.
  - Newer logo: modern mountain + trees illustration (`assets/img/new-logo-v1.jpg`). Kept in the repo for possible future use (e.g. about page, print materials, or a refined favicon). Not currently shown on the live pages.
- **Easter egg:** the small mountain icon after the copyright line in the footer opens a pop-up with the original logo (built in `assets/js/site.js`). It is intentionally unlabeled on screen; screen readers announce it as "See our original logo".
- **Responsive:** layouts collapse to a single column on phones.
- **Why plain CSS:** the site is small, one person can maintain it, and there is nothing to install or break. A utility framework such as Tailwind would add a build step without much benefit at this size.

## Known follow-ups

- Add the church's street address (the original site only linked to Google Maps).
- Possible typos in the official Statement of Faith PDF, left unchanged pending leadership review: "originalwritings" (missing hyphen), "plenary" (possibly "plenarily"), "It's mission" (possibly "Its"), and "the justified and the unjust" (possibly "the just and the unjust"). Fixed already: "Deuteronomy 64" is now 6:4 and "1 Corinthians 5:18-21" is now 2 Corinthians 5:18-21.
- **Sermon data job, first run:** after adding the `GOOGLE_API_KEY` secret and running "Update sermon data", confirm that the bot's commit also triggers a GitHub Pages deploy ("pages build and deployment" in the Actions tab). If it doesn't, switch Pages to deploy with GitHub Actions or add a deploy step to the workflow, and update this README.
- **Gospel of John series:** its Drive folder (`0B-mo4R1ry-JBakM1N3ZYUFAwams`) is private, so it isn't on the Sermons page. Make it "Anyone with the link can view" and add it to `data/series.json`. (Note: on the old Wix "Sermon Lists" page, each series' link pointed at the *next* series' folder. `data/series.json` uses the correct folders.)
- **Sermon summaries:** recent services can get summaries from their captions (see "Service titles from captions"). Older series sermons and the series themselves only have summaries if hand-written (series `summary` and per-sermon `overrides` in `data/series.json`).

## Privacy and security

Everything in this repository is public. Never commit passwords, API keys, private member information, or anything confidential. The summarize-services skill sends service transcripts to Claude (through your Claude Code session) to write titles and summaries; it's told to leave out names and private details from announcements and prayer requests. The site makes requests to these outside services: Google Fonts (fonts only), YouTube (`youtube.com`, and video thumbnails from `i.ytimg.com`), and bible-api.com. The Sermons page links to files on Google Drive. The light/dark choice from the footer toggle is saved only in the visitor's own browser (`localStorage`); it is never sent anywhere or seen by the church. The sermon data job uses a Google API key that is stored only as a GitHub secret (`GOOGLE_API_KEY`).

## License

MIT. See `LICENSE`.
