#!/usr/bin/env node
// Removes the dev-only symlinks from public/ before `astro build` runs.
// These symlinks point into ../dist, which the build wipes — leaving them
// dangling and causing Vite's prepareOutDir to fail with ENOENT.
import { rmSync, lstatSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

for (const name of ['pdfs', 'data', 'pagefind']) {
  const p = resolve(publicDir, name)
  const st = lstatSync(p, { throwIfNoEntry: false })
  if (!st) continue
  if (st.isSymbolicLink()) {
    rmSync(p)
    console.log(`[build-cleanup] removed dev symlink: ${p}`)
  }
}
