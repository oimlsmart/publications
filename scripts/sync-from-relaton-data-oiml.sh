#!/usr/bin/env bash
# Re-mirror data/ and pdfs/ from a local relaton-data-oiml checkout.
#
# Usage:
#   scripts/sync-from-relaton-data-oiml.sh /path/to/relaton-data-oiml
#
# Notes:
# - Bulletins (pdfs/bulletin_*/) are deliberately excluded — they are too
#   large for this public mirror and live in oimlsmart/bulletin-data instead.
# - The auto-generated index-v1.yaml and index-v2.yaml at the relaton-data-oiml
#   root are relaton-tooling internal and not copied.
# - The _caco3_downloads/ and _oiml_org_downloads/ subdirs under pdfs/ are
#   scratch space for the relaton crawler and are not copied.
set -euo pipefail

SRC="${1:?usage: $0 <relaton-data-oiml-path>}"
[ -d "${SRC}/data" ] || { echo "missing ${SRC}/data"; exit 1; }
[ -d "${SRC}/pdfs" ] || { echo "missing ${SRC}/pdfs"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

rsync -a --delete \
  --exclude='index-v*.yaml' \
  "${SRC}/data/" ./data/

rsync -a --delete \
  --exclude='bulletin_*' \
  --exclude='_caco3_downloads' \
  --exclude='_oiml_org_downloads' \
  --exclude='README.md' \
  "${SRC}/pdfs/" ./pdfs/

yaml_count=$(find data -name '*.yaml' | wc -l | tr -d ' ')
pdf_count=$(find pdfs -name '*.pdf' | wc -l | tr -d ' ')
pdf_size=$(du -sh pdfs | awk '{print $1}')

echo "Synced:"
echo "  data/: ${yaml_count} YAML files"
echo "  pdfs/: ${pdf_count} PDFs (${pdf_size})"
