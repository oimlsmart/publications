// ─────────────────────────────────────────────────────────────────────
// Publications loader — reads every relaton YAML under ../../data/ at
// Astro build time, classifies into Series → Edition → Part → Instance,
// resolves PDF paths, and produces a typed Dataset.
//
// One function: `loadDataset()`. Memoized so all pages share one parse.
// ─────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type {
  Dataset, Series, Edition, Part, Instance,
  Doctype, Status, Lang, Relation,
} from './types'
import { ALL_DOCTYPES, EXCLUDED_DOCTYPES } from './types'

const ROOT = join(process.cwd(), '..')
const DATA_DIR = join(ROOT, 'relaton-data-oiml', 'data')
const PDFS_DIR = join(ROOT, 'pdfs')

// Astro base path (`base` in astro.config.mjs).
export const BASE_PATH = '/publications'

// ─── id/slug helpers ─────────────────────────────────────────────────

// Match language suffix on relaton id: -E, -F (old) or -eng, -fra, -ara, etc.
const LANG_SUFFIX_RE = /-(E|F|A|Sr|Uk|Eng|Fra|Ara|Deu|Rus|Pol|Por|Spa|Zho|Chi|Fa|Cn|Ua|Ro|eng|fra|ara|srp|ukr|deu|rus|pol|por|spa|zho|chi)$/i

const LANG_CODE_MAP: Record<string, Lang> = {
  e: 'eng', f: 'fra', a: 'ara',
  eng: 'eng', fra: 'fra', ara: 'ara',
  sr: 'srp', srp: 'srp',
  ukr: 'ukr', uk: 'ukr', ua: 'ukr',
  zho: 'zho', chi: 'zho', cn: 'zho',
  deu: 'deu', rus: 'rus', pol: 'pol', por: 'por',
  spa: 'spa', sp: 'spa', fa: 'fas', fara: 'fas', ro: 'ron',
}

function languageFromId(id: string): Lang | undefined {
  const m = id.match(LANG_SUFFIX_RE)
  if (!m) return undefined
  return LANG_CODE_MAP[m[1].toLowerCase()] ?? ('unknown' as Lang)
}

function slugify(id: string): string {
  return id.toLowerCase().replace(/[+]/g, '-').replace(/[^a-z0-9-]/g, '-')
}

// ─── YAML parsing helpers ────────────────────────────────────────────

function doctypeOf(yaml: any): Doctype | 'excluded' | 'unknown' {
  const raw = yaml?.ext?.doctype
  let s: string | undefined
  if (typeof raw === 'string') s = raw
  else if (raw && typeof raw === 'object') s = raw.content
  if (!s) return 'unknown'
  if (EXCLUDED_DOCTYPES.has(s)) return 'excluded'
  if (ALL_DOCTYPES.includes(s as Doctype)) return s as Doctype
  return 'unknown'
}

function statusOf(yaml: any): Status {
  const stage = yaml?.status?.stage?.content
  if (!stage) {
    if (yaml?.status?.stage?._deleted) return 'withdrawn'
    return 'unknown'
  }
  if (stage.includes('in-force') || stage.includes('published')) return 'in-force'
  if (stage.includes('supersed') || stage.includes('replaced')) return 'superseded'
  if (stage.includes('withdrawn') || stage.includes('cancelled')) return 'withdrawn'
  if (stage.includes('draft') || stage.includes('proposal')) return 'draft'
  return 'unknown'
}

function titlesOf(yaml: any): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {}
  for (const t of yaml?.title ?? []) {
    if (!t?.content) continue
    const lang = t.language
    if (lang) (out as any)[lang] = t.content
  }
  return out
}

function tcOf(yaml: any): string | undefined {
  const c = yaml?.contributor?.find((c: any) => c.role?.includes('author'))
  const subdiv = c?.organization?.subdivision?.[0]
  if (!subdiv) return c?.organization?.abbreviation?.content
  const tc = subdiv.identifier?.find((i: any) => i.type === 'technical-committee')?.content
  const sc = subdiv.identifier?.find((i: any) => i.type === 'subcommittee')?.content
  return [tc, sc].filter(Boolean).join('/') || subdiv.name?.[0]?.content
}

const RELATION_TYPES = new Set([
  'hasPart', 'partOf',
  'hasInstance', 'instanceOf',
  'updates', 'updatedBy', 'isUpdatedBy',
  'revises', 'revisedBy', 'isRevisedBy',
  'amends', 'amendedBy', 'isAmendedBy',
  'successorOf', 'hasSuccessor',
  'predecessorOf', 'hasPredecessor',
  'adoptedFrom', 'adoptedBy',
  'manifestationOf', 'hasManifestation',
  'translationOf', 'hasTranslation',
  'related',
])

function relationsOf(yaml: any): Relation[] {
  const out: Relation[] = []
  const seen = new Set<string>()
  const push = (type: Relation['type'], target: string) => {
    target = target.trim()
    if (!target) return
    const key = `${type}|${target}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ type, target })
  }
  for (const r of yaml?.relation ?? []) {
    const t = r?.type
    if (!t) continue
    const target = r?.bibitem?.docidentifier?.[0]?.content
      ?? r?.bibitem?.docid?.[0]?.id
      ?? r?.bibitem?.id
    if (!target) continue
    if (RELATION_TYPES.has(t)) push(t as Relation['type'], target)
    else push('other', target)
  }
  const succ = yaml?.status?.relation?.bibitem?.docidentifier?.[0]?.content
  const succType = yaml?.status?.relation?.subtype
  if (succ && succType === 'supersedes') push('hasSuccessor', succ)
  return out
}

// ─── PDF path resolution ─────────────────────────────────────────────

const PDF_BASENAME_INDEX = new Map<string, string>()

function buildPdfIndex() {
  if (PDF_BASENAME_INDEX.size > 0) return
  const stack: string[] = ['']
  while (stack.length > 0) {
    const rel = stack.pop()!
    const abs = join(PDFS_DIR, rel)
    let entries: string[]
    try { entries = readdirSync(abs) } catch { continue }
    for (const e of entries) {
      const childRel = rel ? `${rel}/${e}` : e
      const childAbs = join(PDFS_DIR, childRel)
      let st
      try { st = statSync(childAbs) } catch { continue }
      if (st.isDirectory()) stack.push(childRel)
      else if (e.endsWith('.pdf')) PDF_BASENAME_INDEX.set(e, childRel)
    }
  }
}

function resolveLocalPdf(sourceUrl: string | undefined): { path?: string; size?: number } {
  if (!sourceUrl || sourceUrl.endsWith('/None') || !sourceUrl.includes('.pdf')) return {}
  const basename = sourceUrl.split('/').pop()!
  const hit = PDF_BASENAME_INDEX.get(basename)
  if (!hit) return {}
  const abs = join(PDFS_DIR, hit)
  if (!existsSync(abs)) return {}
  let size: number | undefined
  try { size = statSync(abs).size } catch { /* ignore */ }
  return { path: hit, size }
}

// ─── raw record (one per YAML) ───────────────────────────────────────

interface RawRec {
  id: string
  slug: string
  docid: string
  doctype: Doctype
  docnumber: string
  /** Part number as string, or undefined if not a part. */
  partNumber?: string
  year?: number
  title: Partial<Record<Lang, string>>
  scope?: string
  status: Status
  tc?: string
  sustainabilityFramework?: 'People' | 'Prosperity' | 'Planet'
  highPriority?: boolean
  doi?: string
  publishedAt?: string
  relations: Relation[]
  localYamlPath: string
  /** Set only on instance records. */
  language?: Lang
  sourceUrl?: string
  localPdfPath?: string
  fileSize?: number
}

function partNumberFromDocid(docid: string): string | undefined {
  // "OIML R 60-1:2021" → "1"; "OIML R 60:2021" → undefined
  const m = docid.match(/\b([A-Z])\s*(\d+)-(\d+):/)
  if (!m) return undefined
  return m[3]
}

function yearFromDocid(docid: string): number | undefined {
  const m = docid.match(/:(\d{4})\b/)
  return m ? parseInt(m[1], 10) : undefined
}

function parseRaw(file: string): RawRec | null {
  const abs = join(DATA_DIR, file)
  let yaml: any
  try { yaml = parse(readFileSync(abs, 'utf8')) }
  catch { return null }
  if (!yaml?.id) return null

  const dt = doctypeOf(yaml)
  if (dt === 'excluded' || dt === 'unknown') return null

  const id: string = yaml.id
  const docid: string = yaml.docidentifier?.find((d: any) => d?.primary)?.content
    ?? yaml.docidentifier?.[0]?.content
    ?? id
  const docnumber: string = String(yaml.docnumber ?? '')

  const year = yaml.date?.find((d: any) => d.type === 'published')?.from
    ? new Date(yaml.date.find((d: any) => d.type === 'published').from).getFullYear()
    : (yearFromDocid(docid) ?? undefined)

  const lang = languageFromId(id)

  const rec: RawRec = {
    id,
    slug: slugify(id),
    docid,
    doctype: dt,
    docnumber,
    partNumber: partNumberFromDocid(docid),
    year,
    title: titlesOf(yaml),
    scope: yaml?.ext?.scope,
    status: statusOf(yaml),
    tc: tcOf(yaml),
    sustainabilityFramework: yaml?.ext?.sustainability_framework,
    highPriority: yaml?.ext?.high_priority === true,
    doi: yaml?.ext?.doi,
    publishedAt: yaml.date?.find((d: any) => d.type === 'published')?.from,
    relations: relationsOf(yaml),
    localYamlPath: `${BASE_PATH}/data/${file}`,
  }

  if (lang) {
    rec.language = lang
    const sourceUrl: string | undefined = yaml.source?.find((s: any) => s.type === 'website')?.content
    if (sourceUrl) rec.sourceUrl = sourceUrl
    const pdf = resolveLocalPdf(sourceUrl)
    if (pdf.path) {
      rec.localPdfPath = `${BASE_PATH}/pdfs/${pdf.path}`
      rec.fileSize = pdf.size
    }
  }

  return rec
}

// ─── build the hierarchy ─────────────────────────────────────────────

let _cached: Dataset | undefined

export function loadDataset(): Dataset {
  if (_cached) return _cached

  buildPdfIndex()

  let files: string[]
  try { files = readdirSync(DATA_DIR).filter(f => f.endsWith('.yaml')) }
  catch (e) { throw new Error(`cannot read ${DATA_DIR}: ${(e as Error).message}`) }

  const raws: RawRec[] = []
  for (const f of files) {
    const r = parseRaw(f)
    if (r) raws.push(r)
  }

  // Index by id for relation resolution
  const byId = new Map<string, RawRec>()
  for (const r of raws) byId.set(r.id, r)
  // Also by docid (e.g. "OIML R 60:2021")
  const byDocid = new Map<string, RawRec>()
  for (const r of raws) byDocid.set(r.docid, r)

  // Split into instances vs works
  const instances = raws.filter(r => r.language !== undefined)
  const works = raws.filter(r => r.language === undefined)

  // Build Instance objects
  const instObjs = new Map<string, Instance>()
  for (const r of instances) {
    instObjs.set(r.id, {
      id: r.id, slug: r.slug, docid: r.docid,
      language: r.language!,
      sourceUrl: r.sourceUrl ?? '',
      localPdfPath: r.localPdfPath,
      localYamlPath: r.localYamlPath,
      fileSize: r.fileSize,
      publishedAt: r.publishedAt,
      doi: r.doi,
      relations: r.relations,
    })
  }

  // Build Part objects for part-works (those with a partNumber)
  const partWorks = works.filter(w => w.partNumber !== undefined)
  const editionWorks = works.filter(w => w.partNumber === undefined)

  // For each part-work, find its instances (via hasInstance relations)
  const parts = new Map<string, Part>()
  for (const w of partWorks) {
    const insts = findInstancesFor(w, byId, byDocid, instObjs)
    parts.set(w.id, {
      id: w.id, slug: w.slug, docid: w.docid,
      partNumber: w.partNumber!,
      title: w.title,
      scope: w.scope,
      instances: insts,
      status: w.status,
      doi: w.doi,
      relations: w.relations,
    })
  }

  // Build Edition objects
  const editions = new Map<string, Edition>()
  for (const w of editionWorks) {
    // Direct instances (single-document editions)
    const directInsts = findInstancesFor(w, byId, byDocid, instObjs)
    // Parts that belong to this edition (via hasPart relation)
    const editionParts: Part[] = []
    for (const rel of w.relations) {
      if (rel.type !== 'hasPart') continue
      // Resolve target docid → part work
      const targetWork = byDocid.get(rel.target)
      if (!targetWork) continue
      const part = parts.get(targetWork.id)
      if (part) editionParts.push(part)
    }

    editions.set(w.id, {
      id: w.id,
      slug: w.slug,
      docid: w.docid,
      year: w.year ?? 0,
      title: w.title,
      scope: w.scope,
      status: w.status,
      tc: w.tc,
      sustainabilityFramework: w.sustainabilityFramework,
      highPriority: w.highPriority,
      doi: w.doi,
      publishedAt: w.publishedAt,
      parts: editionParts.sort((a, b) => a.partNumber.localeCompare(b.partNumber, undefined, { numeric: true })),
      instances: directInsts.sort((a, b) => a.language.localeCompare(b.language)),
      relations: w.relations,
      languages: () => {
        const set = new Set<Lang>()
        for (const i of directInsts) set.add(i.language)
        for (const p of editionParts) for (const i of p.instances) set.add(i.language)
        return [...set]
      },
    })
  }

  // Group editions into Series by (doctype, docnumber)
  const seriesMap = new Map<string, Series>()
  for (const ed of editions.values()) {
    const key = `${ed.doctype ?? 'unknown'}-${extractDocnumber(ed.docid)}`
    // We need doctype — get from raw
    const raw = byId.get(ed.id)
    const doctype = raw?.doctype ?? 'unknown' as Doctype
    const realKey = `${doctype}-${raw?.docnumber ?? ''}`
    const docnumber = raw?.docnumber ?? ''
    if (!seriesMap.has(realKey)) {
      seriesMap.set(realKey, {
        key: realKey,
        slug: `${doctype[0]}${docnumber}`.toLowerCase(),
        docid: `${doctype[0].toUpperCase()} ${docnumber}`,
        doctype,
        docnumber,
        title: {},
        editions: [],
      })
    }
    seriesMap.get(realKey)!.editions.push(ed)
  }

  // For each series: sort editions (newest first), pick current edition, set title/scope
  const allSeries = [...seriesMap.values()]
  for (const s of allSeries) {
    s.editions.sort((a, b) => b.year - a.year)
    // currentEdition = most recent in-force, else newest
    s.currentEdition = s.editions.find(e => e.status === 'in-force') ?? s.editions[0]
    if (s.currentEdition) {
      s.title = mergeTitles(s.editions)
      s.scope = s.currentEdition.scope
      s.tc = s.currentEdition.tc
      s.highPriority = s.editions.some(e => e.highPriority)
    }
  }

  // Sort series: by doctype then docnumber (numeric)
  allSeries.sort((a, b) => {
    if (a.doctype !== b.doctype) return a.doctype.localeCompare(b.doctype)
    return parseInt(a.docnumber) - parseInt(b.docnumber)
  })

  // byDoctype bucket
  const byDoctype = {} as Record<Doctype, Series[]>
  for (const dt of ALL_DOCTYPES) byDoctype[dt] = []
  for (const s of allSeries) {
    ;(byDoctype[s.doctype] ??= []).push(s)
  }

  // Stats
  const stats = computeStats(allSeries, parts, instObjs)

  _cached = {
    series: allSeries,
    seriesByKey: seriesMap,
    byDoctype,
    stats,
  }
  return _cached
}

function extractDocnumber(docid: string): string {
  const m = docid.match(/\b\d+\b/)
  return m ? m[0] : ''
}

function findInstancesFor(
  work: RawRec,
  byId: Map<string, RawRec>,
  byDocid: Map<string, RawRec>,
  instObjs: Map<string, Instance>,
): Instance[] {
  const out: Instance[] = []
  const seen = new Set<string>()

  // Method 1: work has hasInstance relations pointing at instances
  for (const rel of work.relations) {
    if (rel.type !== 'hasInstance') continue
    const target = byDocid.get(rel.target)
    if (!target) continue
    const inst = instObjs.get(target.id)
    if (inst && !seen.has(inst.id)) {
      seen.add(inst.id)
      out.push(inst)
    }
  }

  // Method 2: any instance whose instanceOf target is this work's docid
  if (out.length === 0) {
    for (const inst of instObjs.values()) {
      for (const rel of inst.relations) {
        if (rel.type !== 'instanceOf') continue
        if (rel.target === work.docid) {
          if (!seen.has(inst.id)) {
            seen.add(inst.id)
            out.push(inst)
          }
          break
        }
      }
    }
  }

  return out
}

function mergeTitles(editions: Edition[]): Partial<Record<Lang, string>> {
  // Prefer the most recent in-force edition's title; fall back across editions.
  const sorted = [...editions].sort((a, b) => b.year - a.year)
  const out: Partial<Record<Lang, string>> = {}
  for (const ed of sorted) {
    for (const [lang, val] of Object.entries(ed.title)) {
      if (!(lang in out) && val) (out as any)[lang] = val
    }
    for (const part of ed.parts) {
      for (const [lang, val] of Object.entries(part.title)) {
        if (!(lang in out) && val) (out as any)[lang] = val
      }
    }
  }
  return out
}

function computeStats(
  allSeries: Series[],
  parts: Map<string, Part>,
  instances: Map<string, Instance>,
): Dataset['stats'] {
  const byDoctype = {} as Record<Doctype, number>
  for (const dt of ALL_DOCTYPES) byDoctype[dt] = 0
  for (const s of allSeries) byDoctype[s.doctype] = (byDoctype[s.doctype] ?? 0) + 1

  const byStatus = { 'in-force': 0, 'superseded': 0, 'withdrawn': 0, 'draft': 0, 'unknown': 0 } as Record<Status, number>
  let totalEditions = 0
  let totalPdfsWithFile = 0
  const byLanguage: Record<string, number> = {}

  for (const s of allSeries) {
    for (const ed of s.editions) {
      totalEditions++
      byStatus[ed.status] = (byStatus[ed.status] ?? 0) + 1
      for (const i of ed.instances) {
        if (i.language) byLanguage[i.language] = (byLanguage[i.language] ?? 0) + 1
        if (i.localPdfPath) totalPdfsWithFile++
      }
      for (const p of ed.parts) {
        for (const i of p.instances) {
          if (i.language) byLanguage[i.language] = (byLanguage[i.language] ?? 0) + 1
          if (i.localPdfPath) totalPdfsWithFile++
        }
      }
    }
  }

  return {
    totalSeries: allSeries.length,
    totalEditions,
    totalParts: parts.size,
    totalInstances: instances.size,
    totalPdfsWithFile,
    byDoctype,
    byStatus,
    byLanguage,
  }
}
