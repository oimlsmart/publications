// ─────────────────────────────────────────────────────────────────────
// URLs — the only place the site's URL scheme is spelled out. Import
// pubUrl/apiUrl/pdfUrl/yamlUrl instead of concatenating BASE_PATH inline.
// ─────────────────────────────────────────────────────────────────────

// Astro base path (`base` in astro.config.mjs).
export const BASE_PATH = '/publications'

/** Page URL for any publication record slug (series, edition, part, instance). */
export function pubUrl(slug: string): string {
  return `${BASE_PATH}/pub/${slug}/`
}

/** JSON-LD/JSON record endpoint for a slug. */
export function apiUrl(slug: string): string {
  return `${BASE_PATH}/api/publications/${slug}`
}

/** Local PDF mirror URL from the pdfs/ relative path (e.g. 'r60_2021/r060-e21.pdf'). */
export function pdfUrl(pdfPath: string): string {
  return `${BASE_PATH}/pdfs/${pdfPath}`
}

/** Raw relaton YAML download URL from the data/ file name. */
export function yamlUrl(file: string): string {
  return `${BASE_PATH}/data/${file}`
}
