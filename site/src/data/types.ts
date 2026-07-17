// ─────────────────────────────────────────────────────────────────────
// Types — derived from the relaton YAML schema used in
// relaton/relaton-data-oiml. See:
//   https://github.com/relaton/relaton-data-oiml
//
// OIML publishes in a 4-level hierarchy (mirroring the OIML website at
// https://oiml.caco3consulting.com/recommendations/):
//
//   Series    →   Edition    →   Part    →   Instance (language PDF)
//   R 60          R 60:2021      R 60-1     R 60-1:2021 (E)
//
// A "series" is the abstract publication (one docnumber). It has one
// or more "editions" (one per year). Each edition is either a single
// document or a multi-part collection. Each part (or the whole edition,
// if single-doc) has one or more language "instances" that are the
// actual PDFs.
//
// relaton YAMLs:
//   - One per edition work     e.g. R60-2021        (has hasPart + hasInstance)
//   - One per part work        e.g. R60-1-2021      (has hasInstance + partOf)
//   - One per language instance e.g. R60-1-2021-E   (carries the PDF URL)
//
// There is no series-level YAML — series are synthesized by grouping
// editions on (doctype, docnumber).
// ─────────────────────────────────────────────────────────────────────

export type Doctype =
  | 'recommendation'
  | 'basic-publication'
  | 'document'
  | 'guide'
  | 'expert-report'
  | 'seminar-report'
  | 'vocabulary'
  | 'translation'

export const ALL_DOCTYPES: readonly Doctype[] = [
  'recommendation',
  'basic-publication',
  'document',
  'guide',
  'expert-report',
  'seminar-report',
  'vocabulary',
  'translation',
] as const

export const DOCTYPE_LABELS: Record<Doctype, { singular: string; plural: string }> = {
  'recommendation':    { singular: 'Recommendation',     plural: 'Recommendations' },
  'basic-publication': { singular: 'Basic Publication',  plural: 'Basic Publications' },
  'document':          { singular: 'Document',           plural: 'Documents' },
  'guide':             { singular: 'Guide',              plural: 'Guides' },
  'expert-report':     { singular: 'Expert Report',      plural: 'Expert Reports' },
  'seminar-report':    { singular: 'Seminar Report',     plural: 'Seminar Reports' },
  'vocabulary':        { singular: 'Vocabulary',         plural: 'Vocabularies' },
  'translation':       { singular: 'Translation',        plural: 'Translations' },
}

/** Doctypes that are explicitly out-of-scope (filtered from the index). */
export const EXCLUDED_DOCTYPES = new Set([
  'article', 'issue', 'section', 'volume', 'periodical',
])

export type Status =
  | 'in-force'
  | 'superseded'
  | 'withdrawn'
  | 'draft'
  | 'unknown'

export type Lang =
  | 'eng' | 'fra' | 'ara' | 'srp' | 'ukr'
  | 'zho' | 'deu' | 'rus' | 'pol' | 'por' | 'spa' | 'fas' | 'ron'

export const LANG_LABELS: Record<string, string> = {
  eng: 'English',  fra: 'French',   ara: 'Arabic',
  srp: 'Serbian',  ukr: 'Ukrainian', zho: 'Chinese',
  deu: 'German',   rus: 'Russian',  pol: 'Polish',
  por: 'Portuguese', spa: 'Spanish', fas: 'Persian', ron: 'Romanian',
}

export interface Relation {
  type:
    | 'hasPart' | 'partOf' | 'hasInstance' | 'instanceOf'
    | 'updates' | 'updatedBy' | 'revises' | 'revisedBy'
    | 'amends' | 'amendedBy' | 'successorOf' | 'hasSuccessor'
    | 'predecessorOf' | 'hasPredecessor' | 'adoptedFrom' | 'adoptedBy'
    | 'manifestationOf' | 'hasManifestation' | 'translationOf' | 'hasTranslation'
    | 'related' | 'other'
  /** The other pub's docid (e.g. "OIML R 60:2021 (E)"). */
  target: string
}

/** A language-specific PDF (the actual file). */
export interface Instance {
  /** Relaton id, e.g. 'R60-1-2021-E'. */
  id: string
  /** URL-safe slug, e.g. 'r60-1-2021-e'. */
  slug: string
  /** Display docidentifier, e.g. 'OIML R 60-1:2021 (E)'. */
  docid: string
  language: Lang
  /** Upstream URL on oiml.org. */
  sourceUrl: string
  /** Path under BASE_PATH to the local PDF mirror, if any. */
  localPdfPath?: string
  /** Path under BASE_PATH to the local relaton YAML. */
  localYamlPath: string
  /** PDF size in bytes, if local PDF present. */
  fileSize?: number
  /** Date string from `date.published.from`, if present. */
  publishedAt?: string
  doi?: string
  /** Raw relations from the YAML (cross-language, cross-edition, etc.). */
  relations: Relation[]
}

/** A "part" is a numbered sub-division of an edition (e.g. R 60-1:2021). */
export interface Part {
  /** Relaton id, e.g. 'R60-1-2021'. */
  id: string
  slug: string
  docid: string
  /** Part number as a string, e.g. '1'. */
  partNumber: string
  /** Title (English preferred). */
  title: Partial<Record<Lang, string>>
  scope?: string
  /** Language instances of this part (PDFs). */
  instances: Instance[]
  status: Status
  doi?: string
  relations: Relation[]
}

/**
 * An "edition" is a year-specific publication (e.g. R 60:2021). May
 * either be single-document (instances directly under it) or multi-part
 * (parts under it, each with their own instances).
 */
export interface Edition {
  id: string
  slug: string
  docid: string
  year: number
  title: Partial<Record<Lang, string>>
  scope?: string
  status: Status
  tc?: string
  sustainabilityFramework?: 'People' | 'Prosperity' | 'Planet'
  highPriority?: boolean
  doi?: string
  publishedAt?: string
  /** Parts (empty if single-document). */
  parts: Part[]
  /** Direct language instances (non-empty if single-document). */
  instances: Instance[]
  /** Raw relations from the edition YAML. */
  relations: Relation[]
  /** All language codes available across parts and direct instances. */
  languages(): Lang[]
}

/** A "series" is the abstract publication across all editions (e.g. R 60). */
export interface Series {
  /** Composite key: doctype-docnumber, e.g. 'recommendation-60'. */
  key: string
  /** URL-safe slug, e.g. 'r60'. */
  slug: string
  /** Display, e.g. 'R 60'. */
  docid: string
  doctype: Doctype
  docnumber: string
  /** Title (English preferred, derived from most recent in-force edition). */
  title: Partial<Record<Lang, string>>
  /** Scope (from most recent in-force edition). */
  scope?: string
  /** All editions of this series, sorted newest first. */
  editions: Edition[]
  /** Whether any edition is high-priority. */
  highPriority?: boolean
  /** The most recent in-force edition, or the newest edition if none in force. */
  currentEdition?: Edition
  /** TC/SC from the current edition. */
  tc?: string
}

export interface Dataset {
  series: Series[]
  seriesByKey: Map<string, Series>
  byDoctype: Record<Doctype, Series[]>
  stats: {
    totalSeries: number
    totalEditions: number
    totalParts: number
    totalInstances: number
    totalPdfsWithFile: number
    byDoctype: Record<Doctype, number>
    byStatus: Record<Status, number>
    byLanguage: Record<string, number>
  }
}
