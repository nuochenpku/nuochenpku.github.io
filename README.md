# Minimal Academic Website Template

A clean, minimal academic website template, designed for researchers and PhD students. The design and source code are from [Yuhui Zhang](https://cs.stanford.edu/~yuhuiz/).

![Screenshot](images/demo.jpg)

## Features

- Minimalist, academic-focused design
- Responsive layout
- Easy to customize
- SEO-friendly meta tags
- Publication showcase support
- Weekly Google Scholar publication sync
- Statcounter visitor total in the footer

## Visitor statistics

The footer uses Statcounter project `13363945`. Enable a **visible counter**
with **Unique Visits** in that project's **Customize Counter** settings. Keep
detailed analytics private; a public dashboard is not needed. The public embed
security identifier in `scripts.js` is not an account password or API token.

The official tracking script loads once on `https://nuochenpku.github.io` only.
Local previews, other origins, and browsers requesting Do Not Track or Global
Privacy Control do not run tracking. The displayed image uses Statcounter's
documented `displayonly` endpoint, so Retry never records another visit. A slow,
blocked, or hidden counter shows a message instead of silently disappearing.
JavaScript-disabled browsers are not tracked by this integration.

Statistics start with the new project; old CounterAPI totals are not imported.
"Visitors" follows Statcounter's configured unique-visit/session definition,
not an exact lifetime count of people. New visits can take a moment to appear.
The site's code does not enable session replay; analytics features and data
collection are controlled in the owner's Statcounter account.

Run counter regression tests with `node --test scripts/statcounter.test.cjs`.

## Automatic Google Scholar updates

The `Update publications from Google Scholar` workflow runs every Monday and can
also be started manually from the repository's **Actions** tab. It compares the
profile against `.scholar/publication_ids.json`; newly discovered works are
prepended to `publications.json` while existing hand-curated entries are left
unchanged. The initial import added Scholar works that were missing from the
website. New entries are unselected by default and include paper and Scholar
links whenever Scholar provides them. The website opens on the eight most
recent publications and also provides Selected and All views; All is grouped
by year.

Google Scholar does not provide an official public profile API and may
occasionally block automated requests. In that case the workflow fails without
changing the publication data and retries at the next scheduled run.

## Quick Start

0. Clone this repository and `cd` into the directory
1. Run `python -m http.server` and visit `http://localhost:8000`
2. Replace placeholders marked with `[brackets]` in `index.html`
3. Update profile photo in `images/profile.jpeg`
4. Modify `publications.json` for your papers
5. Customize sections as needed (About, Research, News, etc.)

## File Structure

```
.
├── index.html          # Main webpage
├── styles.css          # CSS styling
├── scripts.js          # JavaScript for dynamic content
├── publications.json   # Publication data
└── images/            # Image assets
    └── profile.jpg
```

## License

MIT License

---

For a live example, visit [Yuhui Zhang's website](https://cs.stanford.edu/~yuhuiz/).
