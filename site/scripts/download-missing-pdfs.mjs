#!/usr/bin/env node
// Download language-edition PDFs that are referenced in relaton YAML but
// missing from ./pdfs/. Tries, in order:
//   1. every remote `source` URL on the record
//   2. oiml.caco3consulting.com/static/files/{en,fr,}/<basename>
//   3. the en↔fr swap of any www.oiml.org/files URL
// Writes to pdfs/<publication-dir>/<basename> (no language label in the
// folder name — eng/fra of one work share a directory). Resolution is
// basename-based.
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { parse } from 'yaml'

const ROOT = join(process.cwd(), '..')
const DATA = join(ROOT, 'relaton-data-oiml', 'data')
const PDFS = join(ROOT, 'pdfs')
const LANG_SUFFIX = /-(E|F|A|Sr|Uk|Eng|Fra|Ara|Deu|Rus|Pol|Por|Spa|Zho|Chi|Fa|Fas|Fara|Cn|Ua|Ro|eng|fra|ara|srp|ukr|deu|rus|pol|por|spa|zho|fas|chi)$/i
/** Trailing language label on a YAML stem: r49-2-2024_eng → r49-2-2024. */
const STEM_LANG = /_(eng|fra|ara|srp|ukr|deu|rus|pol|por|spa|zho|fas|chi|ron)$/i

/** Directory under pdfs/ for a YAML file — language label stripped. */
function pubDir(yamlFile) {
  return yamlFile.replace(/\.yaml$/, '').replace(STEM_LANG, '')
}

function indexPdfs() {
  const byLower = new Map()
  const stack = ['']
  while (stack.length) {
    const rel = stack.pop()
    const abs = join(PDFS, rel)
    let entries
    try { entries = readdirSync(abs) } catch { continue }
    for (const e of entries) {
      const childRel = rel ? `${rel}/${e}` : e
      let st
      try { st = statSync(join(PDFS, childRel)) } catch { continue }
      if (st.isDirectory()) stack.push(childRel)
      else if (e.toLowerCase().endsWith('.pdf')) byLower.set(e.toLowerCase(), childRel)
    }
  }
  return byLower
}

function candidates(srcUrls, base) {
  const out = []
  const push = (u) => { if (u && !out.includes(u)) out.push(u) }
  for (const s of srcUrls) push(s)
  for (const lang of ['en', 'fr', '']) {
    push(`https://oiml.caco3consulting.com/static/files/${lang ? lang + '/' : ''}${base}`)
  }
  for (const s of srcUrls) {
    if (!/^https?:/i.test(s)) continue
    try {
      const u = new URL(s)
      if (!u.hostname.endsWith('oiml.org')) continue
      if (u.pathname.includes('/files/')) {
        if (u.pathname.includes('/en/')) push(s.replace('/en/', '/fr/'))
        if (u.pathname.includes('/fr/')) push(s.replace('/fr/', '/en/'))
      }
    } catch { /* ignore */ }
  }
  return out
}

async function tryDownload(urls, destAbs) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000) })
      if (!res.ok) continue
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('pdf') && !url.toLowerCase().endsWith('.pdf')) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1000) continue
      // crude PDF magic check
      if (!buf.subarray(0, 5).toString('latin1').startsWith('%PDF')) continue
      mkdirSync(join(destAbs, '..'), { recursive: true })
      writeFileSync(destAbs, buf)
      return { ok: true, url, size: buf.length }
    } catch { /* try next */ }
  }
  return { ok: false }
}

const existing = indexPdfs()
const jobs = []
for (const f of readdirSync(DATA).filter(f => f.endsWith('.yaml')).sort()) {
  let y
  try { y = parse(readFileSync(join(DATA, f), 'utf8')) } catch { continue }
  if (!y?.id || !LANG_SUFFIX.test(y.id)) continue
  const dt = y?.ext?.doctype?.content ?? y?.ext?.doctype
  if (dt && ['article', 'issue', 'section', 'volume', 'periodical'].includes(String(dt))) continue
  const docid = (y.docidentifier ?? []).find(d => d.primary)?.content
    ?? (y.docidentifier ?? [])[0]?.content ?? y.id
  const lang = Array.isArray(y.language) ? y.language[0] : y.language
  const sources = (y.source ?? []).map(s => s.content).filter(Boolean)
  const pdfSources = sources.filter(s => s && s.includes('.pdf') && !String(s).endsWith('/None'))
  if (!pdfSources.length) continue
  const bases = pdfSources.map(s => basename(new URL(s, 'https://x').pathname))
  if (bases.some(b => existing.has(b.toLowerCase()))) continue
  const base = bases[0]
  jobs.push({ yaml: f, id: y.id, docid, lang, base, remotes: pdfSources.filter(s => /^https?:/i.test(s)) })
}

console.log(`pending downloads: ${jobs.length}`)
const results = []
let done = 0
const CONCURRENCY = 6
let i = 0

async function worker() {
  while (i < jobs.length) {
    const job = jobs[i++]
    const destRel = `pdfs/${pubDir(job.yaml)}/${job.base}`
    const destAbs = join(ROOT, destRel)
    const urls = candidates(job.remotes, job.base)
    const r = await tryDownload(urls, destAbs)
    done++
    const status = r.ok ? `OK  ${String(r.size).padStart(9)}` : 'FAIL'
    console.log(`[${String(done).padStart(3)}/${jobs.length}] ${status}  ${job.docid}  ${r.ok ? r.url : job.remotes[0] ?? '(no remote)'}`)
    results.push({
      docid: job.docid,
      lang: job.lang,
      yaml: job.yaml,
      base: job.base,
      dest: r.ok ? destRel : null,
      size: r.size ?? null,
      url: r.url ?? null,
      tried: urls,
    })
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

const ok = results.filter(r => r.dest)
const fail = results.filter(r => !r.dest)
writeFileSync(join(ROOT, 'site', 'MISSING-PDFS.md'), renderReport(ok, fail, results))
writeFileSync('/tmp/download-results.json', JSON.stringify(results, null, 2))
console.log(`\nDownloaded ${ok.length}, unavailable ${fail.length}`)

function renderReport(ok, fail, all) {
  const lines = []
  lines.push('# Language editions missing a local PDF')
  lines.push('')
  lines.push(`Source scan: relaton YAML language instances with a remote PDF URL and no matching file under \`pdfs/\`.`)
  lines.push('')
  lines.push(`| result | count |`)
  lines.push(`|---|---:|`)
  lines.push(`| downloaded | ${ok.length} |`)
  lines.push(`| still unavailable upstream | ${fail.length} |`)
  lines.push('')
  lines.push('## Downloaded')
  lines.push('')
  lines.push('| docid | lang | from | to |')
  lines.push('|---|---|---|---|')
  for (const r of ok) lines.push(`| ${r.docid} | ${r.lang} | ${r.url} | \`${r.dest}\` |`)
  lines.push('')
  lines.push('## Still unavailable (every candidate URL 404/failed)')
  lines.push('')
  lines.push('| docid | lang | primary source |')
  lines.push('|---|---|---|')
  for (const r of fail) lines.push(`| ${r.docid} | ${r.lang} | ${r.tried?.[0] ?? ''} |`)
  lines.push('')
  return lines.join('\n') + '\n'
}
