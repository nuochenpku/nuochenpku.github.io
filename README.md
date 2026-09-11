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

## Automatic Google Scholar updates

The `Update publications from Google Scholar` workflow runs every Monday and can
also be started manually from the repository's **Actions** tab. It compares the
profile against `.scholar/publication_ids.json`; newly discovered works are
prepended to `publications.json` while existing hand-curated entries are left
unchanged. New entries are unselected by default and link to their Scholar page.

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
