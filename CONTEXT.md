# Context — OIML Publications archive

Public, static archive of every OIML publication: bibliographic data (relaton
YAML) plus mirrored PDFs, browsable and machine-readable. Astro 7 static site
(`site/`), deployed to GitHub Pages at `https://www.oimlsmart.org/publications/`.

## Domain model

The archive models publications in a four-level hierarchy, mirroring the
relaton YAMLs in the `relaton-data-oiml` submodule:

```
Series ──> Edition ──> Part ──> Instance (language PDF)
R 60       R 60:2021    R 60-1     R 60-1:2021 (E)
```

- **Series** — the abstract publication, one doctype + docnumber (e.g. R 60).
  No YAML exists at this level; series are synthesized by grouping editions.
- **Edition** — a year-specific publication (e.g. R 60:2021). Single-document
  editions carry instances directly; multi-part editions carry Parts.
- **Part** — a numbered sub-division of an edition (e.g. R 60-1:2021).
- **Instance** — a language-specific PDF (e.g. R 60-1:2021 (E)). The actual
  file. Language codes are ISO 639-3 (`eng`, `fra`, `ara`, …).

## Doctypes

OIML publishes seven doctypes, each with a letter used in docids, file names,
and DOI suffixes:

| Letter | Doctype | Example |
|--------|---------|---------|
| R | recommendation | OIML R 60 |
| D | document | OIML D 1 |
| G | guide | OIML G 19 |
| B | basic-publication | OIML B 6 |
| V | vocabulary | OIML V 2 |
| E | expert-report | OIML E 1 |
| S | seminar-report | OIML S 3 |

**Translations are not an OIML doctype.** relaton models `translation` as a
first-class doctype value; this archive maps it back to the parent OIML
doctype via the id's leading letter (e.g. `R4-1972-ara` → `r` →
recommendation). Translation-ness is a property of the instance's language
(anything outside eng/fra), not a doctype. See `site/src/data/publications.ts`
(`doctypeOf`) and the comment in `site/src/data/types.ts`.

Bulletin-internal doctypes (`article`, `issue`, `section`, `volume`,
`periodical`) are excluded from the archive index.

## Identifiers

- **DOI** — OIML owns prefix `10.63493`. Suffix pattern:
  `<letter><NNN>.<year>.en` where `NNN` is the docnumber zero-padded to 3
  digits and the language suffix is always `en` (DOIs are edition-level; all
  parts and language instances of an edition share one DOI). Derived for every
  record; `doiSource` distinguishes upstream-minted from derived values.
- **URN** — RFC 5141 ISO-std namespace, hierarchical:
  `urn:iso:std:oiml:<num>[:<year>[:<part>[:<lang>]]]` with ISO 639-1 language
  codes. Safe to derive for every record (no registration authority).

Both derivations live in **one module**: `site/src/data/identifiers.ts`. The
sync script (`scripts/sync-identifiers.mjs`) imports the same module — never
duplicate the patterns.

## Where things live

- `site/src/data/publications.ts` — loads all relaton YAMLs at build time,
  builds the Series→Edition→Part→Instance hierarchy, resolves mirrored PDF
  paths. One memoized `loadDataset()`.
- `site/src/data/types.ts` — the type model for the hierarchy.
- `site/src/data/identifiers.ts` — DOI/URN/language/doctype-letter derivation.
- `site/src/data/urls.ts` — URL construction (`pubUrl`, `apiUrl`, …). The only
  place the URL scheme is spelled out.
- `site/src/data/record.ts` — schema.org JSON-LD serialization for all four
  record levels, shared by page components and the per-pub API.
- `src/components/PageHero.astro` — the one owner of the blueprint page
  header (grid, §-anchor, serif title, lead, back-link). Every page uses it.
- `src/components/BrowseToolbar.astro` — shared browse filter/sort controls;
  owns the `.pub-card-wrapper` data-* DOM contract.
- `src/components/loadPdfJs.ts` — idempotent pdf.js loader (promise seam).
- `src/components/HighPriorityBadge.astro`, `PartBadge.astro` — micro-badges
  alongside DoctypeChip/StatusBadge; never hand-roll badge spans inline.
- `scripts/sync-identifiers.mjs` — idempotent YAML patcher that writes
  `ext.doi` + `docidentifier[type:urn]` into a local relaton-data-oiml
  checkout (for upstream contribution).
- `relaton-data-oiml/` — git submodule; the bibliographic source of truth.
- `pdfs/` — mirrored PDFs (bulletins excluded).
