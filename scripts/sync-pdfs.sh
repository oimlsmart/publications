#!/usr/bin/env bash
# Re-mirror PDFs from a local relaton-data-oiml checkout into ./pdfs/.
# Bulletins, scratch dirs, and the README are excluded.
#
# Usage: scripts/sync-pdfs.sh /path/to/relaton-data-oiml
set -euo pipefail
SRC="${1:?usage: $0 <relaton-data-oiml-path>}"
[ -d "${SRC}/pdfs" ] || { echo "missing ${SRC}/pdfs"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
rsync -a --delete \
  --exclude='bulletin_*' \
  --exclude='_caco3_downloads' \
  --exclude='_oiml_org_downloads' \
  --exclude='README.md' \
  "${SRC}/pdfs/" ./pdfs/
echo "Synced $(find pdfs -name '*.pdf' | wc -l) PDFs ($(du -sh pdfs | awk '{print $1}'))."
