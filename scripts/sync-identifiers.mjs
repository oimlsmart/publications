#!/usr/bin/env node
// Populate OIML-pattern DOI and RFC-5141 URN into every relaton YAML in a
// local relaton-data-oiml checkout. Idempotent: only writes when the
// computed value differs from what's already there.
//
// DOI:  ext.doi  = 10.63493/<letter><NNN>.<year>.en   (only when missing)
// URN:  added as docidentifier[].{ content, type: 'urn' }
//
// The derivation rules are imported from site/src/data/identifiers.ts —
// the same single source of truth the site build uses (Node ≥ 23.6 strips
// the erasable type syntax natively; no build step needed).
//
// Usage: node scripts/sync-identifiers.mjs /path/to/relaton-data-oiml
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { deriveDoi, deriveUrn, languageFromId, DOCTYPE_LETTER, DOCTYPE_FROM_LETTER } from '../site/src/data/identifiers.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
// scripts/ → ../site/node_modules/yaml
const require = createRequire(join(__dirname, '../site/package.json'))
const { parse, stringify } = require('yaml')

const SRC = process.argv[2]
if (!SRC) {
  console.error('usage: sync-identifiers.mjs <relaton-data-oiml-path>')
  process.exit(1)
}
const DATA_DIR = join(SRC, 'data')
const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.yaml'))

function yearOf(yaml, docid) {
  const d = yaml.date?.find?.(x => x?.type === 'published')
  if (d?.from) {
    const y = new Date(d.from).getFullYear()
    if (!isNaN(y)) return y
  }
  const m = docid?.match(/:(\d{4})\b/)
  return m ? parseInt(m[1], 10) : undefined
}

function partOf(docid) {
  const m = docid?.match(/\b([A-Z])\s*(\d+)-(\d+):/)
  return m ? m[3] : undefined
}

function identInput(yaml) {
  const ext = yaml.ext ?? {}
  const doctypeRaw = typeof ext.doctype === 'string' ? ext.doctype : ext.doctype?.content
  let doctype = DOCTYPE_LETTER[doctypeRaw] ? doctypeRaw : undefined
  // relaton models translation as a doctype; OIML doesn't — infer parent
  // OIML doctype from the id's leading letter.
  if (!doctype && doctypeRaw === 'translation') {
    doctype = DOCTYPE_FROM_LETTER[String(yaml.id ?? '').charAt(0).toLowerCase()]
  }
  const docnumber = String(yaml.docnumber ?? '')
  const docid = yaml.docidentifier?.find?.(d => d?.primary)?.content
    ?? yaml.docidentifier?.[0]?.content
  return {
    doctype,
    docnumber,
    year: yearOf(yaml, docid),
    partNumber: partOf(docid),
    language: languageFromId(yaml.id ?? ''),
  }
}

let read = 0, doiAdded = 0, doiSkipped = 0, urnAdded = 0, urnSkipped = 0, errors = 0

for (const f of files) {
  const abs = join(DATA_DIR, f)
  let text
  try { text = readFileSync(abs, 'utf8') }
  catch { errors++; continue }
  let yaml
  try { yaml = parse(text) }
  catch { errors++; continue }
  if (!yaml?.id) { read++; continue }
  read++

  const i = identInput(yaml)
  let changed = false

  // DOI: only add when missing (preserve upstream value).
  if (!yaml.ext) yaml.ext = {}
  const wantDoi = deriveDoi(i)
  if (wantDoi) {
    if (!yaml.ext.doi) {
      yaml.ext.doi = wantDoi
      doiAdded++
      changed = true
    } else {
      doiSkipped++
    }
  }

  // URN: add as a docidentifier with type: 'urn' if not present.
  const wantUrn = deriveUrn(i)
  if (wantUrn) {
    if (!Array.isArray(yaml.docidentifier)) yaml.docidentifier = []
    const hasUrn = yaml.docidentifier.some(d => d?.type === 'urn')
    if (!hasUrn) {
      yaml.docidentifier.push({ content: wantUrn, type: 'urn' })
      urnAdded++
      changed = true
    } else {
      urnSkipped++
    }
  }

  if (changed) {
    const out = stringify(yaml)
    // Re-prepend the leading `---` document marker the relaton files use.
    const withFence = out.startsWith('---\n') ? out : `---\n${out}`
    writeFileSync(abs, withFence)
  }
}

console.log(`read:        ${read}`)
console.log(`doi added:   ${doiAdded}  (skipped ${doiSkipped} already populated)`)
console.log(`urn added:   ${urnAdded}  (skipped ${urnSkipped} already populated)`)
console.log(`errors:      ${errors}`)
