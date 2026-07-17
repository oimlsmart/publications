# OIML Publications — data, PDFs, and browser

Public archive of OIML publications: bibliographic data, PDFs, and a
static Astro site for browsing them.

## What's here

```
relaton-data-oiml/   git submodule — bibliographic YAML (5,707 files)
                     from relaton/relaton-data-oiml. Data IS committed
                     in that repo; PDFs are gitignored there.
pdfs/                890 PDF files (697 MB), mirrored from oiml.org via
                     relaton-data-oiml's crawler. Excludes the OIML
                     Bulletin (too large — lives in
                     oimlsmart/bulletin-data instead).
site/                Astro 7 static site that reads relaton-data-oiml/
                     and pdfs/ at build time.
scripts/             sync helpers.
LICENSE              data: ODC-BY 1.0; PDFs: © OIML mirrored for
                     public access; site code: MIT.
```

## Updating the data

```sh
# Update the submodule (latest relaton data):
git submodule update --remote relaton-data-oiml

# Re-mirror PDFs from a local relaton-data-oiml checkout:
scripts/sync-pdfs.sh /path/to/relaton-data-oiml
```

## Running the site locally

```sh
cd site
npm install
npm run dev          # http://localhost:4321/publications/
```

See [`site/README.md`](site/README.md) for more.

## Deployment

GitHub Actions workflow at `.github/workflows/build.yml` builds the
site on push to `main` and deploys to GitHub Pages at
**<https://www.oimlsmart.org/publications/>**.

The workflow:
1. Checks out the repo WITH submodules
2. Builds the Astro site
3. rsyncs `pdfs/` and `relaton-data-oiml/data/` into `site/dist/`
4. Uploads the artifact and deploys to GitHub Pages

## See also

- [`relaton/relaton-data-oiml`](https://github.com/relaton/relaton-data-oiml) — canonical bibliographic data upstream.
- [`oimlsmart/publications-private`](https://github.com/oimlsmart/publications-private) — internal pipeline that produces OCR, Glossarist term datasets, and Metanorma AsciiDoc from these PDFs.
- [`oimlsmart/oimlsmart.github.io`](https://github.com/oimlsmart/oimlsmart.github.io) — main OIML SMART site.
