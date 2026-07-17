// ─────────────────────────────────────────────────────────────────────
// Publications loader — reads every relaton YAML under ../../data/ at
// Astro build time, classifies by work vs instance, resolves PDF paths,
// and produces a typed Dataset.
//
// One function: `loadDataset()`. Memoized so all pages share one parse.
// ─────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { parse } from 'yaml'
import type {
  Dataset, PubWork, PubInstance, Doctype, Status, Lang, Relation, Contributor,
} from './types'
import { ALL_DOCTYPES, DOCTYPE_LABELS, EXCLUDED_DOCTYPES } from './types'

// Resolve via process.cwd() — Astro runs the build with cwd = site/
// So data/ and pdfs/ live one dir up: ../data, ../pdfs
const ROOT = join(process.cwd(), '..')
const DATA_DIR = join(ROOT, 'data')
const PDFS_DIR = join(ROOT, 'pdfs')

// Astro base path (`base` in astro.config.mjs).
export const BASE_PATH = '/publications'

// ─── id/slug helpers ─────────────────────────────────────────────────

const LANG_SUFFIX_RE = /-(E|F|Ara|Eng|Fra|Sr|Ukr|Zho|Rus|Pol|Por|Spa|Deu|Chi|FAra|Fa|Cn|Ua|Ro)$/

const LANG_CODE_MAP: Record<string, Lang> = {
  E: 'eng', F: 'fra',
  Eng: 'eng', Fra: 'fra',
  A: 'ara', Ara: 'ara',
  Sr: 'srp',
  Ukr: 'ukr',
  Zho: 'zho', Chi: 'zho', Cn: 'zho',
  Deu: 'deu',
  Rus: 'rus',
  Pol: 'pol',
  Por: 'por',
  Spa: 'spa', Sp: 'spa',
  Fa: 'fas', FAra: 'fas',
  Ua: 'ukr',
  Ro: 'ron',
}

/** 'R60-2021-E' → 'eng'; 'R60-2021' → undefined. */
function languageFromId(id: string): Lang | undefined {
  const m = id.match(LANG_SUFFIX_RE)
  if (!m) return undefined
  return LANG_CODE_MAP[m[1]] ?? 'unknown' as Lang
}

/** 'R60-2021-E' → 'R60-2021'. */
function workIdOf(id: string): string {
  return id.replace(LANG_SUFFIX_RE, '')
}

/** 'R60-2021' → 'r60-2021'; 'B10-1-2004+Amendment-2006-E' → 'b10-1-2004-amendment-2006-e'. */
function slugify(id: string): string {
  return id.toLowerCase().replace(/[+]/g, '-').replace(/[^a-z0-9-]/g, '-')
}

// ─── doctype + status parsing ────────────────────────────────────────

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
  const relationStatus = yaml?.status?.relation?.type // 'instance', 'versionOf'
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

// ─── relations parsing ───────────────────────────────────────────────

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

  // Status relation also encodes a successor link
  const succ = yaml?.status?.relation?.bibitem?.docidentifier?.[0]?.content
  const succType = yaml?.status?.relation?.subtype
  if (succ && succType === 'supersedes') push('replacedBy', succ)

  return out
}

// ─── PDF path resolution ─────────────────────────────────────────────

/**
 * Resolve an upstream PDF URL to a local mirror path under pdfs/.
 *
 * We use the same layout as relaton-data-oiml/pdfs/, which is:
 *   pdfs/<letter><num>_<year>/<basename>
 *     e.g. pdfs/r60_2021/r060-e21.pdf
 *
 * Multi-part pubs follow the same convention with parts_* subdirs:
 *   pdfs/r60_2017/parts_eng/R060-1-e17.pdf
 *
 * We look for the basename in any subdirectory under pdfs/, with a
 * fast path for the common layout.
 */
function resolveLocalPdf(sourceUrl: string | undefined): { path?: string; size?: number } {
  if (!sourceUrl || sourceUrl.endsWith('/None') || !sourceUrl.includes('.pdf')) return {}
  const basename = sourceUrl.split('/').pop()!
  // Fast path: walk pdfs/ at build time, find the basename
  const hit = PDF_BASENAME_INDEX.get(basename)
  if (!hit) return {}
  const abs = join(PDFS_DIR, hit)
  if (!existsSync(abs)) return {}
  let size: number | undefined
  try { size = statSync(abs).size } catch { /* ignore */ }
  return { path: hit, size }
}

// Build once at module load: basename → relative-path-under-pdfs/
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

// ─── title parsing ───────────────────────────────────────────────────

function titlesOf(yaml: any): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {}
  for (const t of yaml?.title ?? []) {
    if (!t?.content) continue
    const lang = t.language
    if (lang) (out as any)[lang] = t.content
  }
  // Fallback to a link title
  for (const l of yaml?.link ?? []) {
    if (l?.title?.content && l.type === 'website' && l.title.language) {
      (out as any)[l.title.language] ??= l.title.content
    }
  }
  return out
}

// ─── the loader ──────────────────────────────────────────────────────

let _cached: Dataset | undefined

export function loadDataset(): Dataset {
  if (_cached) return _cached

  buildPdfIndex()

  const works = new Map<string, PubWork>()
  const instances = new Map<string, PubInstance>()

  let entries: string[]
  try { entries = readdirSync(DATA_DIR).filter(f => f.endsWith('.yaml')) }
  catch (e) { throw new Error(`cannot read ${DATA_DIR}: ${(e as Error).message}`) }

  for (const file of entries) {
    const abs = join(DATA_DIR, file)
    let yaml: any
    try { yaml = parse(readFileSync(abs, 'utf8')) }
    catch { /* skip malformed */ }
    if (!yaml?.id) continue

    const dt = doctypeOf(yaml)
    if (dt === 'excluded' || dt === 'unknown') continue

    const id: string = yaml.id
    const lang = languageFromId(id)
    const docid: string = yaml.docidentifier?.find((d: any) => d?.primary)?.content
      ?? yaml.docidentifier?.[0]?.content
      ?? id
    const docnumber: string = String(yaml.docnumber ?? '')
    const year = yaml.date?.find((d: any) => d.type === 'published')?.from
      ? new Date(yaml.date.find((d: any) => d.type === 'published').from).getFullYear()
      : undefined
    const partMatch = docid.match(/(\d+)-(\d+):/)
    const part = partMatch ? partMatch[2] : undefined

    const base: PubWork = {
      id,
      slug: slugify(id),
      docid,
      doctype: dt,
      docnumber,
      part,
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
      instances: [],
      partWorkIds: [],
      parentWorkId: undefined,
    }

    const { replaces = [], replacedBy = [] } = splitReplaces(base.relations)
    base.replaces = replaces
    base.replacedBy = replacedBy

    const localYamlPath = `${BASE_PATH}/data/${file}`

    if (lang) {
      // Instance
      const sourceUrl: string | undefined = yaml.source?.find((s: any) => s.type === 'website')?.content
      const pdf = resolveLocalPdf(sourceUrl)
      const inst: PubInstance = {
        ...base,
        language: lang,
        sourceUrl: sourceUrl ?? '',
        localYamlPath,
        localPdfPath: pdf.path ? `${BASE_PATH}/pdfs/${pdf.path}` : undefined,
        fileSize: pdf.size,
      }
      instances.set(id, inst)
    } else {
      works.set(id, base)
    }
  }

  // Wire up instances → their parent work
  for (const inst of instances.values()) {
    const workId = workIdOf(inst.id)
    const work = works.get(workId)
    if (work) {
      work.instances.push(inst.id)
    } else {
      // Synthesize a work from the instance if missing
      const synthWork: PubWork = {
        ...inst,
        instances: [inst.id],
      }
      // Drop instance-only fields
      const { language, sourceUrl, localYamlPath, localPdfPath, fileSize, ...rest } = inst
      void language; void sourceUrl; void localYamlPath; void localPdfPath; void fileSize
      works.set(workId, synthWork)
    }
  }

  // Wire up parts → series
  for (const w of works.values()) {
    if (w.part) {
      // This is a part work; find parent series by docnumber
      const parentId = `${w.id.split('-')[0].match(/^[A-Za-z]+(\d+)/)?.[0] ?? ''}-${w.year ?? ''}`
      // Try relation-based first
      const viaRelation = w.relations.find(r => r.type === 'partOf' || r.type === 'instanceOf')?.target
      if (viaRelation) {
        const parent = [...works.values()].find(x => x.docid === viaRelation)
        if (parent) {
          w.parentWorkId = parent.id
          parent.partWorkIds.push(w.id)
        }
      }
    }
  }

  const dataset: Dataset = {
    works,
    instances,
    byDoctype: bucketize(works.values(), w => w.doctype, ALL_DOCTYPES),
    byStatus: bucketize(works.values(), w => w.status, ['in-force', 'superseded', 'withdrawn', 'draft', 'unknown'] as const),
    stats: computeStats(works, instances),
  }

  _cached = dataset
  return dataset
}

function tcOf(yaml: any): string | undefined {
  const c = yaml?.contributor?.find((c: any) => c.role?.includes('author'))
  const subdiv = c?.organization?.subdivision?.[0]
  if (!subdiv) return c?.organization?.abbreviation?.content
  const tc = subdiv.identifier?.find((i: any) => i.type === 'technical-committee')?.content
  const sc = subdiv.identifier?.find((i: any) => i.type === 'subcommittee')?.content
  return [tc, sc].filter(Boolean).join('/') || subdiv.name?.[0]?.content
}

function splitReplaces(relations: Relation[]): { replaces: string[]; replacedBy: string[] } {
  const replaces: string[] = []
  const replacedBy: string[] = []
  for (const r of relations) {
    if (r.type === 'hasSuccessor' || r.type === 'hasPredecessor' || r.type === 'successorOf' || r.type === 'predecessorOf') {
      // ambiguous — skip, status.relation covers this
      continue
    }
    if (r.type === 'updatedBy' || r.type === 'revisedBy' || r.type === 'amendedBy' || r.type === 'isRevisedBy' || r.type === 'isUpdatedBy' || r.type === 'isAmendedBy') {
      replacedBy.push(r.target)
    }
    if (r.type === 'updates' || r.type === 'revises' || r.type === 'amends') {
      replaces.push(r.target)
    }
  }
  return { replaces, replacedBy }
}

function bucketize<T, K extends string>(
  items: Iterable<T>,
  keyFn: (item: T) => K,
  keys: readonly K[],
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const k of keys) out[k] = []
  for (const item of items) {
    const k = keyFn(item)
    ;(out[k] ??= []).push(item)
  }
  // Sort each bucket by docnumber then year
  for (const k of keys) {
    out[k].sort((a, b) => {
      const an = parseInt((a as PubWork).docnumber) || 0
      const bn = parseInt((b as PubWork).docnumber) || 0
      if (an !== bn) return an - bn
      return ((a as PubWork).year ?? 0) - ((b as PubWork).year ?? 0)
    })
  }
  return out
}

function computeStats(works: Map<string, PubWork>, instances: Map<string, PubInstance>): Dataset['stats'] {
  const byDoctype = bucketize(works.values(), w => w.doctype, ALL_DOCTYPES)
  const byStatus = bucketize(works.values(), w => w.status, ['in-force', 'superseded', 'withdrawn', 'draft', 'unknown'] as const)
  const byLanguage: Record<string, number> = {}
  let totalPdfsWithFile = 0
  for (const inst of instances.values()) {
    byLanguage[inst.language] = (byLanguage[inst.language] ?? 0) + 1
    if (inst.localPdfPath) totalPdfsWithFile++
  }
  return {
    totalWorks: works.size,
    totalInstances: instances.size,
    totalPdfsWithFile,
    byDoctype: Object.fromEntries(Object.entries(byDoctype).map(([k, v]) => [k, v.length])) as Dataset['stats']['byDoctype'],
    byStatus: Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, v.length])) as Dataset['stats']['byStatus'],
    byLanguage,
  }
}
