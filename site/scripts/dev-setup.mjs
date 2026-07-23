#!/usr/bin/env node
// Ensures the dev-only symlinks public/pdfs, public/data, and public/pagefind
// exist before `astro dev` starts. These point at sibling directories the dev
// server can't see otherwise. Never writes real files; idempotent and safe.
import { mkdirSync, symlinkSync, lstatSync, existsSync, rmSync, readlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')
const repoRoot = resolve(here, '..', '..')

mkdirSync(publicDir, { recursive: true })

const links = [
  { from: resolve(repoRoot, 'pdfs'), to: resolve(publicDir, 'pdfs') },
  { from: resolve(repoRoot, 'relaton-data-oiml', 'data'), to: resolve(publicDir, 'data') },
  { from: resolve(here, '..', 'dist', 'pagefind'), to: resolve(publicDir, 'pagefind') },
]

let warnedPagefind = false

for (const { from, to } of links) {
  const fromOk = existsSync(from)
  const existing = lstatSync(to, { throwIfNoEntry: false })

  if (existing) {
    let current = null
    try { current = resolve(readlinkSync(to)) } catch {}
    if (current === from) continue
    rmSync(to, { recursive: true, force: true })
  }

  if (!fromOk) {
    if (to.endsWith('pagefind') && !warnedPagefind) {
      warnedPagefind = true
      console.warn(
        '\n[dev:setup] dist/pagefind not found — search will not work in dev mode.\n' +
        '  Run `npm run build` once to generate the Pagefind index, then restart `npm run dev`.\n'
      )
    }
    continue
  }

  symlinkSync(from, to)
  console.log(`[dev:setup] ${to} -> ${from}`)
}
