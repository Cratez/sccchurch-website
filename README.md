# South Clackamas Community Church Website

Static website for [South Clackamas Community Church](https://sccchurch.com), hosted on GitHub Pages. It replaces the old Wix site.

There is no framework, no build step, and nothing to install to run the site. The site is plain HTML, CSS, and a little JavaScript. Edit a file, refresh the browser, and you see the change. Automated tests are the only part that needs an install (see "Testing").

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
├── CLAUDE.md               Rules for AI assistants working on the site (including testing rules)
├── LICENSE
├── package.json            Test tooling only (Playwright); the site itself doesn't use it
├── playwright.config.js    Test settings
├── .github/workflows/
│   └── tests.yml           Runs the tests on GitHub for every push
├── tests/                  Automated tests (see "Testing")
│   ├── support/            Shared test setup: local web server, fake outside services
│   ├── live/               Opt-in checks against real outside services
│   └── *.spec.js           One file per feature
└── assets/
    ├── favicon.svg         Simple cross mark (tab icon and header mark)
    ├── img/
    │   ├── original-logo.webp   Original watercolor mountain logo (footer easter egg)
    │   └── new-logo-v1.jpg      Newer mountain + trees logo (kept for future use)
    ├── css/
    │   ├── base.css        Shared: colors, fonts, header, buttons, footer (loaded on every page)
    │   ├── home.css        Home page only (hero, join cards, video, contact)
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
| `npm run test:live` | Checks every scripture reference against the real bible-api.com (about 2.5 minutes). Run it after changing references. |
| `npm run test:report` | Opens the results of the last run in a browser, with screenshots of any failures. |

**On GitHub:** tests run automatically on every push (the "Tests" workflow in the repo's **Actions** tab). A red X next to a commit means a test failed; the run's page has a downloadable report.

**How tests are organized:** one file per feature in `tests/`. Each file starts with a header saying which feature it covers, which files it depends on, and when it should be updated or removed. When you change or remove a feature, check those headers so old tests get updated or deleted instead of failing for no good reason. The full rules are in `CLAUDE.md`.

**When a test fails:** read the message. It names what was expected and what the page actually did. Either the site has a bug, or the site changed on purpose and the test needs updating to match. Don't change a test just to make it pass.

## Making common edits

| I want to change... | Edit this |
| --- | --- |
| Service times | `index.html`: the `<meta name="description">` in the `<head>`, the `.times` block in the hero, the "In person" card, and the footer. Also `beliefs.html`'s footer. Then update `EXPECTED` at the top of `tests/service-times.spec.js`. |
| Phone, Facebook, Google Maps links | `index.html`, in the "Get in touch" list and the "In person" card |
| Welcome verse | `index.html`, the `<h1>` in the hero and the `.verse-ref` line under it |
| Colors | The `:root { ... }` block at the top of `assets/css/base.css`. There is also a dark-mode set in the `prefers-color-scheme: dark` block just below it. |
| Fonts | The Google Fonts `<link>` in each page's `<head>`, plus `--serif` / `--sans` in `base.css` |
| Header / tab icon | Replace `assets/favicon.svg` (used for both the tab icon and the header mark) |
| Hero sun glow | `assets/css/home.css`, the `.hero::after` rule |

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
- A "Watch on YouTube" link sits above the player as a backup.

## Adding a page

1. Copy `beliefs.html` (or `index.html`) to a new file, e.g. `about.html`, and replace the content inside `<main>`.
2. Keep the header and footer. Set `aria-current="page"` on that page's nav link, and remove it from the page you copied.
3. Add a link to the new page in the `<nav>` of **every** HTML file.
4. If the page needs its own styles, add `assets/css/about.css` and link it after `base.css`. Reuse `base.css` colors and spacing so the look stays consistent.

5. Add the new page to the page lists at the top of `tests/site-shell.spec.js` and `tests/easter-egg.spec.js`, and add tests for anything new the page does (see "Testing").

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

- **Style:** warm cream and forest green with a copper accent, a serif for headings (Source Serif 4) and a clean sans for body text (Inter). Dark mode follows the visitor's system setting.
- **Accessibility:** semantic HTML, keyboard focus outlines, `prefers-reduced-motion` respected, and light/dark contrast chosen deliberately. Check any new color combination for contrast.
- **Hero:** a soft copper sun glow sits in the top-right. It is decorative only and stays behind the text.
- **Logos:**
  - Header / tab icon: simple cross (`assets/favicon.svg`).
  - Original logo: watercolor three-peak mark (`assets/img/original-logo.webp`), shown by the footer easter egg.
  - Newer logo: modern mountain + trees illustration (`assets/img/new-logo-v1.jpg`). Kept in the repo for possible future use (e.g. about page, print materials, or a refined favicon). Not currently shown on the live pages.
- **Easter egg:** the small mountain icon after the copyright line in the footer opens a pop-up with the original logo (built in `assets/js/site.js`). It is intentionally unlabeled on screen; screen readers announce it as "See our original logo".
- **Responsive:** layouts collapse to a single column on phones.
- **Why plain CSS:** the site is small, one person can maintain it, and there is nothing to install or break. A utility framework such as Tailwind would add a build step without much benefit at this size.

## Known follow-ups

- Add the church's street address (the original site only linked to Google Maps).
- Hero artwork (for example a mountain illustration echoing the logos) is planned but not designed yet. The hero currently has only the sun glow.
- Optionally replace the cross favicon with a simplified mountain mark derived from `new-logo-v1.jpg` or the original logo.
- Possible typos in the official Statement of Faith PDF, left unchanged pending leadership review: "originalwritings" (missing hyphen), "plenary" (possibly "plenarily"), "It's mission" (possibly "Its"), and "the justified and the unjust" (possibly "the just and the unjust"). Fixed already: "Deuteronomy 64" is now 6:4 and "1 Corinthians 5:18-21" is now 2 Corinthians 5:18-21.
- A dedicated Sermons page (the old Wix "Sermon Lists" page was not migrated). The "Sermons" and "Browse sermons" links currently go to the YouTube channel's **Streams** tab, because sermons are not uploaded as separate videos; each Sunday's past live stream is the sermon recording.

## Privacy and security

Everything in this repository is public. Never commit passwords, API keys, private member information, or anything confidential. The site makes requests to three outside services: Google Fonts, YouTube (`youtube.com`), and bible-api.com.

## License

MIT. See `LICENSE`.
