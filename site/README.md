# OIML Publications Browser

Static Astro site that powers the public archive at
**<https://oimlsmart.github.io/publications/>**.

## What this is

The browser site for [`oimlsmart/publications`](https://github.com/oimlsmart/publications).
It reads the relaton YAML under `../data/` at build time, classifies the
5,707 records into works vs instances, resolves PDF paths under
`../pdfs/`, and emits a static site with:

- `/` — landing with stats and search
- `/browse/` — all works, filterable
- `/browse/<doctype>/` — scoped list (e.g. Recommendations, Guides)
- `/pub/<slug>/` — work-level landing (or instance landing if the slug
   matches an instance)
- `/search/` — Pagefind full-text UI
- `/api/publications.json` — compact JSON index
- `/api/publications/<slug>.json` — per-pub JSON-LD

## Develop

```sh
npm install
npm run dev          # http://localhost:4321/publications/
npm run build        # build + pagefind index
npm run preview      # serve dist/
```

## Design

Uses the "Metrological Blueprint" design system from
[`oimlsmart/oimlsmart.github.io`](https://github.com/oimlsmart/oimlsmart.github.io)
(`src/styles/blueprint.css` and `app.css` are copied verbatim).

## PDF preview

[`PdfPreview.astro`](src/components/PdfPreview.astro) loads the
publication's PDF via [pdf.js](https://github.com/mozilla/pdf.js), served
from the same origin (`/publications/pdfs/<slug>/<file>.pdf`). All PDFs
are under 50 MB so they load reasonably fast; the worker is bundled
inline by Vite.
