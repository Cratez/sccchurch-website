# Plan: Design overhaul ("PNW editorial") and Plan your visit page

Status: planned (October 2026). Written so an implementer with no other context can build it.

## Goal and scope

Make the site look less like a generic AI-generated site and more like a considered, local church site. The look is inspired by the ChurchCreation "Cornerstone" template (https://churchcreation.com/demo/cornerstone/): editorial structure, photo hero, ruled sections, small letter-spaced labels, a classic serif, square corners, no rounded "cards". It is recolored and re-imaged for the Pacific Northwest and tied to the church's original mountain logo.

In scope:
- A new visual system across **every page**: `index.html`, `sermons.html`, `beliefs.html`, and a **new `visit.html`** ("Plan your visit").
- New fonts, palette (light and dark), header with a phone **Menu** button, footer columns, a **light/dark toggle**.
- Home page: Mt. Hood photo hero, church name, **rotating verse**, quick-link bar, "When we gather" schedule, "Three ways to join", first-time teaser, latest service video.
- **Seasonal schedule** shown everywhere (school year and summer).
- New header/tab mark: three peaks with a small cross.
- Photos resized for the web with a one-off script.

Out of scope:
- Statement of Faith wording (must stay verbatim; see README).
- Sermon data job, sermon JSON format, summarize-services skill (only restyled on the page).
- Giving/donations, events calendar, staff pages (Cornerstone has these; not needed now).
- Automatic season switching (decided against; both schedules are always shown).

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Scope | Whole site + new `visit.html`, with a teaser on Home | User wants a site-wide refresh and liked Cornerstone's dedicated visit page. |
| Direction | "PNW editorial": Cornerstone's structure, recolored fir / mist / slate with a rare rose accent from the old logo | Looks local, not copied. |
| Fonts | **EB Garamond** (headings and reading text) + **Public Sans** (nav, labels, buttons, small UI). Inter is removed. | Bookish feel the user liked; Inter is a common "AI site" tell. |
| Home photo | Pexels, Aleksey Kuprikov, **Mt. Hood at sunset over forest** (`pexels-aleksey-kuprikov-1883853-3493805.jpg`, 6000x4000) | User-chosen; dark forest gives text contrast; mountain echoes the logo. |
| Visit page photo | Pexels, Aleksey Kuprikov, **Mt. Hood in Trillium Lake** (`pexels-aleksey-kuprikov-1883853-3551192.jpg`, 4000x6000, portrait), cropped wide | User-chosen; calm, welcoming. |
| Other pages | Sermons and What We Believe get a plain (no photo) page header in the new style | Photos only where they earn their place. |
| Photo processing | `sharp` (devDependency) + `scripts/images/build-photos.js`; only resized outputs committed; originals stay outside the repo (`D:\dev\picture_options`) | No 9 MB files in the repo; reproducible. |
| Hero text | Church name as H1; rotating KJV verse beneath | Visitors and search engines see the name first. |
| Verse rotation | Fades every ~10 s; **pause button**; no rotation with `prefers-reduced-motion` (shows the verse of the day instead); no-JS shows Psalm 122:1 | User choice; pause is required by WCAG 2.2.2 for auto-updating content longer than 5 s. |
| Schedule | **Both seasons shown everywhere**, compactly; full explanation on the visit page | Main service moves 10:30 → 9:30 in summer and Sunday School stops; dates move yearly, so always-correct beats auto-switching. |
| Season wording | School year: "September – early June". Summer: "Summer" (June – August, one service) | From the user: Sunday School runs September to roughly the first week of June. |
| Midweek | "1st & 3rd Thursdays, 6:30 pm: Men's and women's Bible studies. Ask us for the location." (links to phone) | From the user; separate buildings, so location is given on request. |
| Location | "Near Molalla, Oregon" + the existing Google Maps link as the primary way to find the church; no street address | User choice. |
| Nav | Plan your visit · Sermons · What we believe · Contact; phones fold the links into a **Menu** button | Fixes today's crowded phone header; "Join Us" is replaced by Plan your visit. |
| Contact | `#contact` block in the footer on every page; nav "Contact" links to it | The home "Get in touch" section becomes footer columns. |
| Mark | Three snowy peaks with a small cross on the tallest, single fir color, replaces `assets/favicon.svg` | Ties to the original logo; reads at 16 px. Footer easter egg (original watercolor logo) stays. |
| Dark mode | Follows the device **and** a light/dark toggle button in the footer that remembers the choice (`localStorage`), applied by an inline `<head>` script before paint | User choice; inline script prevents a flash of the wrong theme. |
| Sermons page | Same layout, editorial finish: video cards without boxes (photo + text, thin top rule, square corners), series as ruled rows that expand | User prefers the existing layout with a cleaner style. |
| Beliefs page | Same layout, editorial finish; scripture keys lose their box | Consistency. |
| Visit page | Photo banner; "What you're probably wondering" (wear, length, Sunday School); "What happens on a Sunday" numbered steps; "When we gather"; "Where we are"; other ways to join | User chose these questions and the walkthrough. |
| Photo credit | Footer small print: "Photos by Aleksey Kuprikov on Pexels" (not required by the Pexels license, but courteous) | Matches Cornerstone's practice. |

## Global constraints (apply to every task)

- Static site on GitHub Pages; plain HTML/CSS/JS, no build step for the site, relative links only.
- Follow `CLAUDE.md` testing rules: every task adds/updates Playwright tests with the FEATURE/COVERS/WHY/UPDATE WHEN/REMOVE WHEN header; normal tests import from `tests/support/fixtures.js`; outside services faked; `npm test` must pass on desktop and mobile. When a test is changed because the design changed on purpose, say so in the summary.
- Statement of Faith wording in `beliefs.html` must not change.
- Keep all existing behavior working: scripture lookups, sermons data rendering (incl. summary toggle, series expand, alignment), footer easter egg, video embed and its file:// fallback, sidebar highlighting, progress bar.
- Colors only through CSS custom properties defined in `assets/css/base.css` (`:root` for light, `[data-theme="dark"]` and the `prefers-color-scheme: dark` media query for dark, as specified below). No hard-coded colors elsewhere except inside the photo overlay gradient.
- Text color pairs must meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text ≥ 24px or ≥ 19px bold). The rose accent is for decoration and large text only.
- Pin any new npm dependency to an exact version released at least two weeks earlier.
- Fonts from Google Fonts only (the existing `<link>` pattern), with `display=swap`.
- Respect `prefers-reduced-motion` for all animation.
- No horizontal scrolling at 360px width on any page.

## Design

### Design tokens (`assets/css/base.css`)

```css
:root {
  --bg: #EEF0EE;        /* mist */
  --surface: #F8F9F7;   /* raised areas, panels */
  --ink: #1C2420;       /* near-black green */
  --muted: #56625C;     /* slate (body-secondary text) */
  --brand: #2F4A3A;     /* douglas fir: links, labels, buttons */
  --brand-ink: #F8F9F7; /* text on brand */
  --accent: #B4687A;    /* logo rose: decoration, large text only */
  --line: #CBD2CD;      /* hairlines */
  --rule: #1C2420;      /* strong section rules */
  --serif: "EB Garamond", Georgia, "Times New Roman", serif;
  --sans: "Public Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --wrap: 1120px;
  --measure: 66ch;
}
/* Dark: applied when the visitor chose dark, or when the device prefers dark and no choice was saved */
:root[data-theme="dark"] { /* same values as below */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #121915; --surface: #1A231E; --ink: #E7ECE8; --muted: #A2AFA7;
  --brand: #93BA9F; --brand-ink: #121915; --accent: #D99AA9; --line: #2C3832; --rule: #E7ECE8;
} }
```

The implementer may adjust values slightly to meet the contrast rule; the contrast test (Task 2) is the judge. `body { background: var(--bg) }` must be explicit.

Type scale: body 18px/1.6 EB Garamond; UI text 15–16px Public Sans; H1 clamp(2.8rem, 7vw, 4.6rem) 600; H2 clamp(2rem, 4.5vw, 3.1rem) 600; H3 1.35–1.5rem 600; letter-spacing −0.01em on H1/H2. Labels ("eyebrows"): Public Sans 0.78rem, 600, uppercase, letter-spacing 0.14em, color `--brand`.

### Shared components (`assets/css/base.css`)

- `.section-head`: 1px `--rule` top border, 20px padding-top, eyebrow `<p class="eyebrow">`, then `<h2>`. Optional intro `<p>` in `--muted`, max width `--measure`.
- `.rows`: ruled list (`<ul>`/`<dl>`), each row separated by 1px `--line`, columns via grid (e.g. time | name + detail | when). Collapses to stacked on phones.
- `.cols`: 3-column grid of items each with a 3px `--brand` top border, H3, text, and an arrow link ("Plan your visit →"). One column on phones.
- Buttons: square corners. `.btn` = fir fill, `--brand-ink` text; `.btn-outline` = 1px `--ink` border, transparent. Public Sans 600.
- Links in text: `--brand`, underline with `text-underline-offset: 3px`.
- `.page-head` (non-photo page header for Sermons/Beliefs): eyebrow + H1 + optional lead, with bottom `--line` rule.
- `.photo-hero` (Home, Visit): full-bleed `<picture>` (WebP + JPEG `srcset`, `sizes="100vw"`, `fetchpriority="high"` on Home, explicit width/height), dark gradient overlay (`linear-gradient(90deg, rgba(10,16,12,.72) 0%, rgba(10,16,12,.35) 55%, rgba(10,16,12,.15) 100%)` plus a bottom fade), white text. `object-position` chosen so the peak stays visible at all widths (Home: `50% 45%`; Visit: `50% 40%`).
- Remove: rounded `.card`s, `--r` radius usage on content blocks, copper `--accent` uses, the old `.hero::after` sun glow.

### Header (all pages)

```html
<header class="site">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="assets/favicon.svg" alt="" width="30" height="30"><span>South Clackamas Community Church</span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav id="site-nav" aria-label="Main">
      <ul>
        <li><a href="visit.html">Plan your visit</a></li>
        <li><a href="sermons.html">Sermons</a></li>
        <li><a href="beliefs.html">What we believe</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>
```

`aria-current="page"` on the current page's link. Desktop: links inline, Public Sans 15px. ≤ 760px: `.menu-toggle` visible, nav hidden until toggled; open state is a full-width list under the header; closes on Escape, on link click, and on outside click. On the Home page the header sits on the plain `--bg` above the photo (not overlaid), like Cornerstone. Sticky header kept (`position: sticky; top: 0`) with the existing blur.

### Footer (all pages)

```html
<footer class="site" id="contact">
  <div class="wrap">
    <div class="foot-cols">
      <section><p class="eyebrow">Find us</p><p>Near Molalla, Oregon</p><p><a href="https://maps.google.com/?cid=1658989575399774330">Open in Google Maps</a></p></section>
      <section><p class="eyebrow">Contact</p><p><a href="tel:+15036513707">(503) 651-3707</a></p><p><a href="https://www.facebook.com/South-Clackamas-Community-Church-301109009916380/">Facebook</a></p></section>
      <section><p class="eyebrow">Sundays</p><p>10:30 am worship · 9:30 am Sunday School<br><span class="muted">September – early June</span></p><p>Summer: 9:30 am worship</p><p>96.7 FM in the parking lot</p></section>
      <section><p class="eyebrow">Watch</p><p><a href="sermons.html">Sermons</a></p><p><a href="https://www.youtube.com/@southclackamascommunitychu1171/streams">YouTube</a></p></section>
    </div>
    <div class="foot-base">
      <span>© 2026 South Clackamas Community Church</span>   <!-- easter egg button is appended here by site.js -->
      <button class="theme-toggle" type="button" aria-label="Switch to dark theme">…icon…</button>
      <p class="credit">Photos by Aleksey Kuprikov on Pexels.</p>
    </div>
  </div>
</footer>
```

`site.js` must keep appending the easter egg to the copyright `<span>` (update its selector to `footer.site .foot-base span`, and keep scripts after the footer).

### Theme toggle

- Inline in every page's `<head>`, before the stylesheets:
  ```html
  <script>try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}</script>
  ```
- `site.js`: the toggle shows the opposite of the current effective theme (effective = saved choice, else `matchMedia('(prefers-color-scheme: dark)')`). Clicking sets `data-theme` and saves it. `aria-label` reads "Switch to dark theme" / "Switch to light theme". Wrap all `localStorage` use in try/catch.

### Mark (`assets/favicon.svg`)

Replace with a 32x32 SVG: three peaks (center tallest) as one solid fir (`#2F4A3A`) shape with two small white snowcap notches, and a small cross above/at the top of the center peak. No text. Must stay legible at 16px. Used in the header (30px) and as the tab icon.

### Home page (`index.html`, `assets/css/home.css`, `assets/js/home.js`)

Sections in order:

1. **Photo hero** (`.photo-hero`, min-height ~78vh desktop, ~70vh phone):
   - Eyebrow: `Non-denominational · Near Molalla, Oregon`
   - `<h1>South Clackamas Community Church</h1>`
   - Verse rotator (see below).
   - **Quick-link bar** across the bottom of the hero (3 cells, translucent dark, white text, 1px dividers):
     - "Plan your visit" / "What to expect" → `visit.html`
     - "Sundays 10:30 am" / "Summer 9:30 am" → `#gather`
     - "Watch the latest service" / "Live or recorded" → `#watch`
     On phones the bar stacks to 3 rows below the hero text.
2. **When we gather** (`id="gather"`, `.section-head` eyebrow "Sundays & Thursdays", `.rows`):
   | Time | What | When |
   | --- | --- | --- |
   | 10:30 am | Worship service | Sundays, September – early June |
   | 9:30 am | Sunday School (an hour, before the service) | September – early June |
   | 9:30 am | Worship service (no Sunday School) | Sundays in summer |
   | 6:30 pm | Men's and women's Bible studies ([ask us for the location](tel:+15036513707)) | 1st & 3rd Thursdays |
   Note line under the rows: "The service is also broadcast on 96.7 FM for listening from your car in the parking lot, and streamed live on YouTube."
3. **Three ways to join** (`id="join"`, `.cols`): In person (seating inside, times, "Get directions →" Maps), On the radio (short-range 96.7 FM, large "96.7 FM" in serif), Online ("Watch live or catch a past service" → YouTube channel). Same facts as today.
4. **First time?** (teaser): eyebrow "Plan your visit", H2 "Coming for the first time?", one or two sentences ("Here's what to wear, how long the service runs, and what happens on a Sunday morning."), `.btn` "Plan your visit" → `visit.html`.
5. **Latest service** (`id="watch"`): as today (uploads playlist embed, "Watch on YouTube" link, file:// fallback from `home.js` kept), plus one-line tip replacing the old green band: "Watching on a TV? Open the service in the YouTube app on your Chromecast, Roku, or Apple TV."
6. Footer.

Remove: the old `.times` blocks, `.band`, "Get in touch" section (moved to footer), `.hero::after` glow.

`<meta name="description">`: "Non-denominational church near Molalla, Oregon. Sundays 10:30 am (Sunday School 9:30 am, September – early June); summer 9:30 am. In person, on 96.7 FM, or online."

### Verse rotator (`assets/js/home.js`)

Markup in the hero:

```html
<figure class="verse" aria-live="off">
  <blockquote><p>“I was glad when they said unto me, Let us go into the house of the LORD.”</p></blockquote>
  <figcaption>Psalm 122:1</figcaption>
  <button class="verse-pause" type="button" aria-pressed="false" aria-label="Pause verses">❚❚</button>
</figure>
<script type="application/json" id="hero-verses">[ { "ref": "Psalm 122:1", "text": "…" }, … ]</script>
```

Behavior:
- No JS: the static Psalm 122:1 shows; the pause button is hidden by default (`hidden`) and only revealed by JS when rotation runs.
- With JS and motion allowed: every 10 s, fade out (400 ms opacity), swap text/ref, fade in. Order: the list order, starting with Psalm 122:1.
- Pause button toggles rotation (`aria-pressed`, label "Pause verses"/"Play verses"). Rotation also pauses while the pointer is over the verse or focus is inside it, and while the tab is hidden (`visibilitychange`).
- `prefers-reduced-motion: reduce`: no rotation and no pause button; show the verse for today: `index = daysSinceEpoch % list.length` (local date).
- Text is KJV; "LORD" in small caps is optional (plain "LORD" is fine).

Draft verse list (KJV; **user to review**; implementer must verify every text against bible-api.com with the live test in Task 3):

1. Psalm 122:1: I was glad when they said unto me, Let us go into the house of the LORD.
2. Psalm 121:1-2: I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.
3. Psalm 95:6: O come, let us worship and bow down: let us kneel before the LORD our maker.
4. Psalm 100:4: Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.
5. Matthew 11:28: Come unto me, all ye that labour and are heavy laden, and I will give you rest.
6. Psalm 133:1: Behold, how good and how pleasant it is for brethren to dwell together in unity!
7. Isaiah 2:3 (first part): Come ye, and let us go up to the mountain of the LORD, to the house of the God of Jacob; and he will teach us of his ways, and we will walk in his paths.
8. Psalm 34:8: O taste and see that the LORD is good: blessed is the man that trusteth in him.
9. Romans 15:7: Wherefore receive ye one another, as Christ also received us to the glory of God.
10. Hebrews 10:24-25 (24 and first part of 25): And let us consider one another to provoke unto love and to good works: Not forsaking the assembling of ourselves together.

Partial verses must be marked in the data (`"partial": true`) so the live test checks them as a prefix/substring.

### Plan your visit page (`visit.html`, `assets/css/visit.css`)

Title: `Plan your visit · South Clackamas Community Church`. Meta description: "What to expect on your first Sunday at South Clackamas Community Church near Molalla, Oregon." Nav link `Plan your visit` has `aria-current="page"`.

1. **Photo banner** (`.photo-hero` shorter, ~46vh): eyebrow "Plan your visit", H1 "What to expect on a Sunday morning", lead: "We're a small, friendly, non-denominational church. Come as you are; here's what a Sunday looks like so nothing catches you off guard."
2. **What you're probably wondering** (eyebrow "The practical questions"; `<dl class="faq">`: question left in serif 600, answer right in `--muted`, ruled rows, stacked on phones). Draft answers (**user to review**):
   - *What should I wear?* Whatever you're comfortable in. You'll see jeans and you'll see Sunday best, and nobody is checking.
   - *How long is the service?* About an hour and a half: singing, a time of prayer together, and a sermon from the Bible.
   - *Is there Sunday School?* Yes, from September to early June. It meets for an hour at 9:30, before the 10:30 service. In summer there's no Sunday School and the service moves to 9:30.
3. **What happens on a Sunday** (eyebrow "Step by step"; numbered `<ol class="steps">`, big serif numerals in `--brand`). Draft steps (**user to review**):
   1. *Welcome and prayer.* We start with a welcome and open in prayer.
   2. *Singing.* The music team leads a mix of choruses and hymns. Stand and sing along, or just listen.
   3. *Announcements and prayer.* After a few announcements, anyone can share a prayer request or something to praise God for, and we pray for them together.
   4. *The sermon.* Kids head to junior church, and the sermon is taught straight from the Bible, often working through a book verse by verse. Some Sundays include communion.
   5. *Closing.* We finish with prayer and a song. Stay for coffee and conversation afterward if you can.
4. **When we gather**: same `.rows` content as Home (shared markup copied; the service-times test keeps them consistent).
5. **Where we are**: "We're near Molalla, Oregon." `.btn` "Open in Google Maps" + `.btn-outline` "Call (503) 651-3707".
6. **Can't make it in person?**: short `.cols` of two: "Listen on 96.7 FM" (from your car in the parking lot) and "Watch online" (YouTube live and past services → `sermons.html`).
7. Footer.

### Sermons page (`sermons.html`, `assets/css/sermons.css`, `assets/js/sermons.js`)

Keep all behavior and the JSON contract. Restyle only:
- `.page-head` instead of `.page-hero`; sections use `.section-head` (eyebrows "Recent services" / "Sermon series").
- Video cards: no background box or radius; thumbnail with square corners; 1px `--rule` top rule above the text; date as eyebrow-style label; title serif; links in Public Sans. Summary overlay keeps covering the thumbnail and keeps equal card heights. "Live now" / "Current series" badges: `--accent` background with `--ink`-on-light or white text only if contrast passes; otherwise outline style.
- Series: `details.series` become ruled rows (1px `--line` between, no surface box, no radius); the summary row shows title (serif), meta (Public Sans muted), and a `+`/`−` indicator instead of the chevron. The subgrid sermon list (number | date | title+passage | links) stays exactly as is functionally.
- Existing sermons-page tests must keep passing except where they assert removed styling; adjust those and say so.

### What We Believe page (`beliefs.html`, `assets/css/beliefs.css`)

- `.page-head` (eyebrow "South Clackamas Community Church", H1 "Statement of Faith").
- Tenets: number in Public Sans eyebrow style (`01`), H2 serif, body text at reading size; `.key` loses its box (top `--line` rule instead); reference buttons become small square-cornered outline chips; passage panel keeps its left rule (in `--brand`).
- TOC sidebar and progress bar recolored (progress bar `--brand`).

### Photos (`scripts/images/build-photos.js`)

- Dev dependency: `sharp` (exact version ≥ two weeks old).
- `npm run photos -- <source folder>` reads the two originals by file name and writes to `assets/img/photos/`:
  - `hood-sunset-{960,1600,2400}.webp` and `hood-sunset-1600.jpg` (fallback), from `pexels-aleksey-kuprikov-1883853-3493805.jpg`, no crop (3:2).
  - `trillium-{960,1600,2400}.webp` and `trillium-1600.jpg`, from `pexels-aleksey-kuprikov-1883853-3551192.jpg`, cropped to 16:9 around the peak and reflection (crop box: full width, vertical center at ~47% of the height; tune by eye).
  - WebP quality ~72, JPEG quality ~78, strip metadata. Target: largest file < 450 KB.
- A `assets/img/photos/CREDITS.md` lists source URLs (pexels.com photo pages for IDs 3493805 and 3551192), photographer, license (Pexels License), and which output came from which original.
- The originals are not committed.

## Implementation steps

Each task refers to "Design → …" sections of this file (`plans/design-overhaul.md`). An implementer working from a single task must read the Design sections and the Global constraints that its task references; they hold the exact markup, tokens, copy, and behavior.

### Task 1: Photo pipeline and assets

**Files:** create `scripts/images/build-photos.js`, `assets/img/photos/*` (generated), `assets/img/photos/CREDITS.md`, `tests/photos.spec.js`; edit `package.json`.

1. Add `sharp` as an exact-pinned devDependency (released ≥ 2 weeks ago) and script `"photos": "node scripts/images/build-photos.js"`.
2. Implement the script per "Design → Photos": takes the source folder as its first argument; fails clearly if an original is missing; writes the listed files; prints sizes.
3. Run it with `D:\dev\picture_options` (the user's folder holding the two Pexels originals). Look at the outputs (open them) and adjust the Trillium crop so the peak and its reflection are both in frame.
4. Write `CREDITS.md`.
5. Tests (`tests/photos.spec.js`, node-only/desktop): every expected output exists, is non-empty, and is under 450 KB; widths match the filename (read with `sharp` metadata); CREDITS.md mentions both Pexels IDs and the photographer.

**Verify:** `npm test` passes; the images look right.

### Task 2: Design system, header, footer, theme toggle (all existing pages)

**Files:** rewrite `assets/css/base.css`; edit `assets/js/site.js`, `assets/favicon.svg`, `index.html`, `sermons.html`, `beliefs.html` (head, header, footer only in this task); tests: update `tests/site-shell.spec.js`, `tests/easter-egg.spec.js`, `tests/service-times.spec.js` (footer part), add `tests/theme.spec.js`, `tests/contrast.spec.js`, `tests/nav-menu.spec.js`.

1. Replace the Google Fonts link on every page with EB Garamond (400, 500, 600, 400 italic) + Public Sans (400, 500, 600).
2. Add the inline theme `<script>` to every `<head>` (before stylesheets).
3. Rewrite `base.css` with the tokens, type scale, shared components, header, footer, buttons, `[hidden]` rule, focus styles (3px `--brand` outline, offset 3px), reduced-motion rule, easter egg styles (recolored, kept).
4. Replace header and footer markup on all three pages per "Design → Header/Footer" (nav now Plan your visit / Sermons / What we believe / Contact; `visit.html` is created in Task 4, so the link will 404 until then: create a minimal placeholder `visit.html` with header/footer and an H1 so link tests pass, to be filled in Task 4).
5. `site.js`: easter egg selector update; mobile menu (toggle, Escape, outside click, link click closes, `aria-expanded`); theme toggle per "Design → Theme toggle".
6. New mark in `assets/favicon.svg`.
7. Tests:
   - `site-shell.spec.js`: PAGES gains `visit.html`; NAV = `['Plan your visit', 'Sermons', 'What we believe', 'Contact']` with hrefs `['visit.html', 'sermons.html', 'beliefs.html', '#contact']`; every page has `footer#contact`; the old "nav stays on one row" test is replaced by the menu tests (say so).
   - `nav-menu.spec.js` (mobile project): Menu button visible, links hidden until opened, Escape and link click close it, `aria-expanded` updates; desktop: no Menu button, links visible.
   - `theme.spec.js`: default follows `colorScheme` (emulate light and dark); toggle switches `data-theme` and the label; choice persists across reload; saved choice is applied before first paint (assert `document.documentElement.dataset.theme` is set when `DOMContentLoaded` fires, via an init script that records it); works when `localStorage` throws (no JS errors).
   - `contrast.spec.js` (desktop): in both light and dark, compute contrast for these pairs from computed styles of real elements: body text on `--bg`, muted text on `--bg`, link (`--brand`) on `--bg`, `.btn` text on its background, eyebrow on `--bg`; assert ≥ 4.5.
   - `easter-egg.spec.js`: PAGES gains `visit.html`; still passes.
   - `service-times.spec.js`: footer assertions updated to the new footer text (Task 3 finishes this file).

**Verify:** `npm test` passes; header/footer look right on desktop and at 360px in both themes.

### Task 3: Home page

**Files:** rewrite `index.html` main content, `assets/css/home.css`, `assets/js/home.js`; tests: rewrite `tests/service-times.spec.js`, update `tests/home-video.spec.js`, add `tests/home-hero.spec.js`, `tests/live/verses.spec.js`.

1. Build the sections per "Design → Home page", using `.photo-hero` with `<picture>` (WebP srcset 960/1600/2400 + JPEG 1600 fallback, `width="2400" height="1600"`, `alt=""` since it's decorative, `fetchpriority="high"`).
2. Verse rotator per "Design → Verse rotator" (data in `<script type="application/json" id="hero-verses">`).
3. Keep `home.js`'s file:// video fallback.
4. Update the meta description.
5. Tests:
   - `service-times.spec.js` (rewrite): one `EXPECTED` object (`schoolYear: { service: '10:30', sundaySchool: '9:30', label: 'September – early June' }`, `summer: { service: '9:30' }`, `thursdays: { time: '6:30', label: '1st & 3rd Thursdays' }`, `radio: '96.7'`); checks the meta description, hero bar, Home "When we gather" rows, Visit page rows (once Task 4 exists; until then skip with a TODO that Task 4 removes), and every page's footer.
   - `home-hero.spec.js`: hero image loads (naturalWidth > 0) and uses a WebP source; H1 is the church name; quick-bar links go to `visit.html`, `#gather`, `#watch`; verse rotation with `page.clock` (install clock, advance 10 s, verse text changes; pause button stops it; `aria-pressed` toggles); hovering pauses; with `reducedMotion: 'reduce'` no pause button and the verse equals the day's index (set the clock to a fixed date); no-JS (`javaScriptEnabled: false` context) shows Psalm 122:1.
   - `home-video.spec.js`: "Watch the latest service" now lives in the hero bar; keep the embed and file:// tests.
   - `tests/live/verses.spec.js` (opt-in): every verse in `#hero-verses` matches bible-api.com KJV text (normalize whitespace and punctuation; `partial: true` entries checked as a prefix of the API text), paced like the scripture live test.

**Verify:** `npm test` passes; `npm run test:live` passes (verses); visual check desktop and 360px, both themes.

### Task 4: Plan your visit page

**Files:** fill in `visit.html`, create `assets/css/visit.css`; tests: add `tests/visit.spec.js`; update `tests/service-times.spec.js` (remove the Task 3 skip), `tests/site-shell.spec.js` (title for visit.html: `Plan your visit · South Clackamas Community Church`, current link "Plan your visit").

1. Build per "Design → Plan your visit page" with the Trillium banner.
2. Use the draft FAQ and steps text verbatim unless the user has edited this plan.
3. Tests (`visit.spec.js`): banner image loads; FAQ has exactly the three questions in order with non-empty answers; steps are an ordered list of 5; "Where we are" says "Molalla" and links to the Maps URL and `tel:+15036513707`; the "Watch online" item links to `sermons.html`; no horizontal scroll.

**Verify:** `npm test` passes; visual check.

### Task 5: Sermons page restyle

**Files:** `sermons.html`, `assets/css/sermons.css`, `assets/js/sermons.js` (only if markup hooks need changing); tests: `tests/sermons-page.spec.js` adjustments.

Per "Design → Sermons page". All behavior tests (rendering, dates, badges, summary toggle and equal heights, series open/close, hash links, alignment of titles/links, error and empty states) must still pass; change only assertions tied to removed styling and list them in the summary.

**Verify:** `npm test` passes; visual check with real data (`data/sermons.json`) desktop and 360px, both themes.

### Task 6: What We Believe restyle

**Files:** `beliefs.html` (markup outside the tenet text only), `assets/css/beliefs.css`; tests: existing beliefs tests must pass unchanged (structure, scripture, navigation).

Per "Design → What We Believe page". Do not change any tenet wording or scripture references.

**Verify:** `npm test` passes; `git diff beliefs.html` shows no changes inside `<p class="body">` or `data-ref` values.

### Task 7: Documentation and cleanup

**Files:** `README.md`, `CLAUDE.md` (if needed), `assets/img/new-logo-v1.jpg` (keep), remove unused CSS.

README updates: pages table (add Plan your visit), project structure (visit.html, visit.css, photos, scripts/images), "Making common edits" (service times now include both seasons and Thursdays: list every place + the `EXPECTED` object; verses: edit `#hero-verses` in `index.html` and run `npm run test:live`; photos: `npm run photos -- <folder>` and CREDITS.md; colors: tokens in `base.css` and the contrast test; the visit page FAQ/steps), design notes (new direction, fonts, dark mode toggle, mark), privacy (theme choice stored in the visitor's browser only), known follow-ups (remove "Header on phones" item: fixed; remove "Hero artwork" item: resolved by the photo; keep others).

**Verify:** README describes everything that exists and nothing that doesn't; `npm test` passes.

## Edge cases and error handling

- Photo fails to load: hero falls back to `--brand` background color with the same white text (set `background-color` on `.photo-hero`).
- Very narrow screens (≤ 360px): hero H1 wraps to 3 lines max; quick bar stacks; rows stack; no horizontal scroll.
- JavaScript disabled: nav must still be usable on phones (render links visible when `.menu-toggle` can't run: the toggle is shown and the nav hidden only once `site.js` adds a `js` class to `<html>`); verse shows Psalm 122:1; theme follows the device.
- `localStorage` blocked: theme toggle still works for the current page; no errors.
- Reduced motion: no verse fading, no button hover lifts, instant smooth-scroll.
- Dark mode photos: overlay is the same; text stays white.
- Print: hide header nav, toggle, verse pause button, video; show URLs is not required.

## Testing and verification

- `npm test` (desktop + mobile) after every task; new specs listed per task; existing behavior specs stay green.
- `npm run test:live` after Task 3 (verses) and whenever references or verses change.
- Manual visual pass per task: desktop 1280px and phone 360-412px, light and dark, comparing against the Cornerstone demo's spacing/feel (not its colors).

## Open items

- **User review of draft copy** before or during implementation: FAQ answers, walkthrough steps, verse list, hero eyebrow wording.
- Exact end of Sunday School season ("first week or so of June") is shown as "early June"; adjust if the church sets a firm date.
- Whether the Thursday studies continue in summer (assumed year-round).
- Consider later: a giving page, an events/"What's on" section, real photos of the congregation.
