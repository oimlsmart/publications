// ─────────────────────────────────────────────────────────────────────
// Types — derived from the relaton YAML schema used in
// relaton/relaton-data-oiml. See:
//   https://github.com/relaton/relaton-data-oiml
//
// Every OIML publication is modeled at three levels:
//   1. Work       — the abstract publication (e.g. "OIML R 60:2021")
//   2. Part       — a numbered part of a multi-part work ("OIML R 60-1:2021")
//   3. Instance   — a language-specific realization of a work or part
//                   ("OIML R 60:2021 (E)")
//
// In relaton YAML, all three are flattened to records under data/ with
// id conventions:
//   work      → 'R60-2021'         (no language suffix)
//   instance  → 'R60-2021-E'       (suffix is the language code)
//
// We read those records, classify them, and build a navigable graph.
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

/** Human label + plural for each doctype. */
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
  'article',
  'issue',
  'section',
  'volume',
  'periodical',
])

export type Status =
  | 'in-force'
  | 'superseded'
  | 'withdrawn'
  | 'draft'
  | 'unknown'

export type Lang =
  | 'eng' | 'fra' | 'ara' | 'srp' | 'ukr'
  | 'zho' | 'deu' | 'rus' | 'pol' | 'por' | 'spa'

/** ISO 639-3 → display label. */
export const LANG_LABELS: Record<string, string> = {
  eng: 'English',
  fra: 'French',
  ara: 'Arabic',
  srp: 'Serbian',
  ukr: 'Ukrainian',
  zho: 'Chinese',
  deu: 'German',
  rus: 'Russian',
  pol: 'Polish',
  por: 'Portuguese',
  spa: 'Spanish',
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

export interface Contributor {
  role: string                  // 'publisher', 'author', 'editor'
  organization?: string         // 'OIML', 'TC9/SC2'
  name?: string                 // person name (rare in OIML pubs)
}

export interface PubWork {
  /** Relaton id, e.g. 'R60-2021'. */
  id: string
  /** URL-safe slug derived from id, e.g. 'r60-2021'. */
  slug: string
  /** Primary docidentifier, e.g. 'OIML R 60:2021'. */
  docid: string
  doctype: Doctype
  /** Numeric part of the docnumber, e.g. '60'. */
  docnumber: string
  /** For multi-part works, the part number (e.g. '1' for R 60-1). */
  part?: string
  /** Edition year, if known. */
  year?: number
  /** All known titles keyed by language. */
  title: Partial<Record<Lang, string>>
  /** Scope summary if present in `ext.scope`. */
  scope?: string
  status: Status
  /** Pubids this work supersedes (it replaces them). */
  replaces?: string[]
  /** Pubids that supersede this work. */
  replacedBy?: string[]
  /** TC and SC that authored the work, e.g. 'TC9/SC2'. */
  tc?: string
  sustainabilityFramework?: 'People' | 'Prosperity' | 'Planet'
  highPriority?: boolean
  doi?: string
  /** Publication date (ISO yyyy-mm-dd) if known. */
  publishedAt?: string
  /** All typed relations to other pubs. */
  relations: Relation[]
  /** Instance ids under this work, e.g. ['R60-2021-E', 'R60-2021-F']. */
  instances: string[]
  /** Part-of parent work id, if this is a part. */
  parentWorkId?: string
  /** Part work ids, if this is a series. */
  partWorkIds: string[]
}

export interface PubInstance extends PubWork {
  /** Language code from the id suffix. */
  language: Lang
  /** Upstream URL (oiml.org / caco3consulting.com / other). */
  sourceUrl: string
  /** Path under /publications/ to the local PDF, e.g. '/publications/pdfs/r60_2021/r060-e21.pdf'. */
  localPdfPath?: string
  /** Path under /publications/ to the local YAML file. */
  localYamlPath: string
  /** PDF file size in bytes, if local PDF present. */
  fileSize?: number
}

export interface Dataset {
  works: Map<string, PubWork>
  instances: Map<string, PubInstance>
  byDoctype: Record<Doctype, PubWork[]>
  byStatus: Record<Status, PubWork[]>
  stats: {
    totalWorks: number
    totalInstances: number
    totalPdfsWithFile: number
    byDoctype: Record<Doctype, number>
    byStatus: Record<Status, number>
    byLanguage: Record<string, number>
  }
}
