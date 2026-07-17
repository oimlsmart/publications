# OIML Publications — data and PDFs

This repository is a public archive of OIML (International Organization
of Legal Metrology) publications. It mirrors the bibliographic data and
PDFs of every OIML publication that OIML publishes as a downloadable
PDF on `oiml.org`, except for the OIML Bulletin (which is too large to
mirror here and lives in [`oimlsmart/bulletin-data`](https://github.com/oimlsmart/bulletin-data)).

It also hosts a static Astro site that lets you browse, search, and
preview every publication. The site is published at
**<https://oimlsmart.github.io/publications/>**.

## What's here

```
data/             5,707 relaton YAML files (22 MB) — bibliographic records
pdfs/             940 PDF files (751 MB) — the actual publications, mirrored from oiml.org
site/             Astro static-site source for the publications browser
scripts/          sync-from-relaton-data-oiml.sh — re-mirror from upstream
```

### Publication types

| Type | Count | Examples |
|------|-------|----------|
| Recommendations (R) | 973 | R 60 Load cells, R 76 Non-automatic weighing instruments |
| Basic Publications (B) | 155 | B 6 Directives for technical work, B 18 OIML-CS |
| Documents (D) | 153 | D 1 National metrology systems, D 11 Electronic instruments |
| Guides (G) | 90 | G 1-100 GUM, G 19 Measurement uncertainty |
| Translations | 127 | Arabic / Serbian / Ukrainian / Chinese editions |
| Expert Reports (E) | 34 | E 1, E 2, … |
| Seminar Reports (S) | 21 | S 1 – S 7 |
| Vocabularies (V) | 20 | V 1 VIML, V 2 VIM |

Bulletins (4,134 records) are excluded.

## Data sources

The bibliographic data under `data/` is mirrored verbatim from
[`relaton/relaton-data-oiml`](https://github.com/relaton/relaton-data-oiml),
the canonical relaton dataset for OIML publications. Each YAML file is
a single record (work, instance, or translation) and follows the
[relaton-bib](https://github.com/relaton/relaton-bib) schema.

The PDFs under `pdfs/` are mirrored from the same source, which in turn
fetches them from `oiml.org` and `oiml.caco3consulting.com`.

## Re-syncing from upstream

```sh
scripts/sync-from-relaton-data-oiml.sh /path/to/relaton-data-oiml
```

This rsyncs `data/` and `pdfs/` (excluding bulletins) from a local
checkout of `relaton-data-oiml`. Run it whenever upstream changes.

## Licensing

- **Bibliographic data** (`data/*.yaml`): mirrored from
  `relaton/relaton-data-oiml`. Open data; attribution to OIML.
- **PDFs** (`pdfs/*.pdf`): © OIML. These are publicly accessible
  documents that OIML distributes free of charge on
  <https://www.oiml.org>. They are mirrored here for archival,
  searchability, and machine readability. For any reuse beyond
  personal reference, contact OIML (<https://www.oiml.org>) for
  permission.
- **Site code** (`site/`, `scripts/`): MIT.

## The browser site

The static site under `site/` is built with Astro 7, Tailwind 4, and
pdf.js. It borrows the "Metrological Blueprint" design system from
[`oimlsmart/oimlsmart.github.io`](https://github.com/oimlsmart/oimlsmart.github.io).

Features:

- Browse all 1,573 work-level publications with filters by type, status,
  language, year, technical committee.
- Work-level pages (`/pub/<slug>/`) show all editions, parts, and
  language instances of a publication.
- Instance-level pages (`/pub/<slug>/<edition>/`) embed a pdf.js preview
  alongside the relaton metadata.
- Cross-linking between editions (superseded → current), parts ↔ series,
  and translations.
- Search via [Pagefind](https://pagefind.app).
- Machine-readable exports: raw YAML, normalized JSON, BibTeX, Schema.org
  JSON-LD, OpenGraph + citation meta tags.

See [`site/README.md`](site/README.md) for development instructions.

## See also

- [`relaton/relaton-data-oiml`](https://github.com/relaton/relaton-data-oiml) — canonical bibliographic data and upstream PDF mirror.
- [`oimlsmart/publications-private`](https://github.com/oimlsmart/publications-private) — internal pipeline that produces OCR, Glossarist term datasets, and Metanorma AsciiDoc from these PDFs.
- [`oimlsmart/oimlsmart.github.io`](https://github.com/oimlsmart/oimlsmart.github.io) — main OIML SMART site.
- [`oimlsmart/vocab`](https://github.com/oimlsmart/vocab) — OIML vocabulary (V 1 / V 2) datasets.
- [`oimlsmart/bulletin-data`](https://github.com/oimlsmart/bulletin-data) — OIML Bulletin archive.
