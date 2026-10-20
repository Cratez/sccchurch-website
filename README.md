# South Clackamas Community Church Website

Static website for [South Clackamas Community Church](https://sccchurch.com), hosted on GitHub Pages. It replaces the old Wix site.

There is no framework, no build step, and nothing to install. The site is plain HTML, CSS, and a little JavaScript. Edit a file, refresh the browser, and you see the change.

## Pages

| Page | File | What it contains |
| --- | --- | --- |
| Home | `index.html` | Welcome verse, service times, ways to join (in person / radio / online), latest-service video, TV casting help, contact info |
| What We Believe | `beliefs.html` | The Statement of Faith, with clickable scripture references that load the verse text |

## Project structure

```
sccchurch-website/
├── index.html              Home page
├── beliefs.html            Statement of Faith
├── README.md               This file
├── LICENSE
└── assets/
    ├── favicon.svg         Simple cross mark (tab icon and header mark)
    ├── img/
    │   ├── original-logo.webp   Original watercolor mountain logo (footer easter egg)
    │   └── new-logo-v1.jpg      Newer mountain + trees logo (kept for future use)
    ├── css/
    │   ├── base.css        Shared: colors, fonts, header, buttons, footer (loaded on every page)
    │   ├── home.css        Home page only (hero sun glow + subtle mountain silhouette)
    │   └── beliefs.css     Statement of Faith page only
    └── js/
        ├── site.js         Every page: footer easter egg (original logo pop-up)
        ├── home.js         Home page: friendly fallback when the video can't play from a local file
        └── beliefs.js      Reading-progress bar, sidebar highlighting, scripture lookups
```

Each page loads `base.css` plus its own stylesheet. The header and footer are repeated in each HTML file (see "Adding a page").

## Running locally

**Quickest:** double-click `index.html` to check layout and text. The embedded YouTube video will not play this way (YouTube blocks embeds on pages opened from a file and shows "Error 153"), so the page shows a link instead. Use a local server for the full experience.

**Recommended:** run a small local server, which behaves like the real site:

- **VS Code:** install the "Live Server" extension, right-click `index.html`, then "Open with Live Server". The page reloads when you save.
- **Python:** from this folder run `py -m http.server 8000` (Windows) or `python3 -m http.server 8000` (Mac/Linux), then open <http://localhost:8000>.

Scripture lookups and the YouTube video need an internet connection and a local server (not a double-clicked file).

## Making common edits

| I want to change... | Edit this |
| --- | --- |
| Service times | `index.html`: the `.times` block in the hero, the "In person" card, and the footer. Also `beliefs.html`'s footer. |
| Phone, Facebook, Google Maps links | `index.html`, in the "Get in touch" list and the "In person" card |
| Welcome verse | `index.html`, the `<h1>` in the hero and the `.verse-ref` line under it |
| Colors | The `:root { ... }` block at the top of `assets/css/base.css`. There is also a dark-mode set in the `prefers-color-scheme: dark` block just below it. |
| Fonts | The Google Fonts `<link>` in each page's `<head>`, plus `--serif` / `--sans` in `base.css` |
| Header / tab icon | Replace `assets/favicon.svg` (used for both the tab icon and the header mark) |
| Hero mountain silhouette | `assets/css/home.css` — the `.hero::before` rule |

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

To add or change a scripture reference, edit both the `data-ref` value (what is looked up) and the visible text. To add a whole section, copy an existing `<section class="tenet">`, give it a unique `id`, and add a matching link to the sidebar list (`<aside class="toc">`).

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
- A "Watch on YouTube" link sits above the player as a backup.

## Adding a page

1. Copy `beliefs.html` (or `index.html`) to a new file, e.g. `about.html`, and replace the content inside `<main>`.
2. Keep the header and footer. Set `aria-current="page"` on that page's nav link, and remove it from the page you copied.
3. Add a link to the new page in the `<nav>` of **every** HTML file.
4. If the page needs its own styles, add `assets/css/about.css` and link it after `base.css`. Reuse `base.css` colors and spacing so the look stays consistent.

Because the header and footer are copied into each file, a nav change means editing every page. If the site grows beyond a handful of pages, consider a static site generator such as Astro or Eleventy, which keep the design but remove that repetition.

## Deployment (GitHub Pages)

The site is served directly from the `main` branch.

1. In GitHub, open the repo, then **Settings, Pages**.
2. Under **Build and deployment**, set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
3. After a minute the site is live at `https://cratez.github.io/sccchurch-website/`.
4. From then on, every push to `main` redeploys automatically (watch progress in the repo's **Actions** tab).

Links in this site are all relative (no leading `/`), so it works both at the `.../sccchurch-website/` address and on a custom domain.

### Using sccchurch.com later
1. Add a file named `CNAME` in the repo root containing just `sccchurch.com`.
2. At the domain registrar, point DNS to GitHub Pages (see [GitHub's custom domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. In Settings, Pages, enter the custom domain and enable **Enforce HTTPS**.

Do this only when ready to cut over from Wix. Check how email for the domain is set up first, since DNS changes can affect it.

## Design notes

- **Style:** warm cream and forest green with a copper accent, a serif for headings (Source Serif 4) and a clean sans for body text (Inter). Dark mode follows the visitor's system setting.
- **Accessibility:** semantic HTML, keyboard focus outlines, `prefers-reduced-motion` respected, and light/dark contrast chosen deliberately. Check any new color combination for contrast.
- **Hero:** a soft copper sun glow sits in the top-right. A faint mountain silhouette runs along the bottom of the hero (CSS-only SVG, low opacity, adapts to light/dark). Both are decorative only and stay behind the text.
- **Logos:**
  - Header / tab icon: simple cross (`assets/favicon.svg`).
  - Original logo: watercolor three-peak mark (`assets/img/original-logo.webp`), shown by the footer easter egg.
  - Newer logo: modern mountain + trees illustration (`assets/img/new-logo-v1.jpg`). Kept in the repo for possible future use (e.g. about page, print materials, or a refined favicon). Not currently shown on the live pages.
- **Easter egg:** the small mountain icon after the copyright line in the footer opens a pop-up with the original logo (built in `assets/js/site.js`). It is intentionally unlabeled on screen; screen readers announce it as "See our original logo".
- **Responsive:** layouts collapse to a single column on phones.
- **Why plain CSS:** the site is small, one person can maintain it, and there is nothing to install or break. A utility framework such as Tailwind would add a build step without much benefit at this size.

## Known follow-ups

- Add the church's street address (the original site only linked to Google Maps).
- Optionally replace the cross favicon with a simplified mountain mark derived from `new-logo-v1.jpg` or the original logo.
- Possible typos in the official Statement of Faith PDF, left unchanged pending leadership review: "originalwritings" (missing hyphen), "plenary" (possibly "plenarily"), "It's mission" (possibly "Its"), and "the justified and the unjust" (possibly "the just and the unjust"). Fixed already: "Deuteronomy 64" is now 6:4 and "1 Corinthians 5:18-21" is now 2 Corinthians 5:18-21.
- A dedicated Sermons page (the old Wix "Sermon Lists" page was not migrated). The "Sermons" and "Browse sermons" links currently go to the YouTube channel's **Streams** tab, because sermons are not uploaded as separate videos; each Sunday's past live stream is the sermon recording.

## Privacy and security

Everything in this repository is public. Never commit passwords, API keys, private member information, or anything confidential. The site makes requests to three outside services: Google Fonts, YouTube (`youtube.com`), and bible-api.com.

## License

MIT. See `LICENSE`.
