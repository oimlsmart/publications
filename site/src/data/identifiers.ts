// ─────────────────────────────────────────────────────────────────────
// Identifiers — the single source of truth for OIML identifier policy:
// language codes, doctype letters, DOI and URN derivation.
//
// Imported by the site loader (publications.ts) AND by the upstream sync
// script (scripts/sync-identifiers.mjs, via Node type stripping). Never
// duplicate these patterns — change them here only.
// ─────────────────────────────────────────────────────────────────────

import type { Doctype, Lang } from './types'

// DOI: OIML owns prefix 10.63493 and follows a uniform suffix pattern
//   10.63493/<letter><NNN>.<year>.en
// where <letter> is the lowercase doctype initial (r/d/g/b/v/e/s), <NNN>
// is the docnumber zero-padded to 3 digits, and the language suffix is
// always "en" (DOI is edition-level, not language-level — verified across
// all upstream DOIs in relaton-data-oiml).
//
// URN: RFC 5141 ISO-std namespace, extended with year/part/lang:
//   urn:iso:std:oiml:<num>[:<year>[:<part>[:<lang>]]]
// Matches what relaton-iso/metanorma emit and is safe to derive for every
// record (URNs need no registration authority).

const DOI_PREFIX = '10.63493'
const URN_PREFIX = 'urn:iso:std:oiml'

export const DOCTYPE_LETTER: Record<Doctype, string> = {
  'recommendation': 'r',
  'basic-publication': 'b',
  'document': 'd',
  'guide': 'g',
  'expert-report': 'e',
  'seminar-report': 's',
  'vocabulary': 'v',
}

/** Reverse map: leading id/file letter → doctype (R4-1972-ara → 'r' → recommendation). */
export const DOCTYPE_FROM_LETTER: Record<string, Doctype> = Object.fromEntries(
  Object.entries(DOCTYPE_LETTER).map(([dt, letter]) => [letter, dt])
) as Record<string, Doctype>

/** ISO 639-3 → ISO 639-1 (used for DOI suffix and URN lang component). */
const LANG_TO_2LETTER: Partial<Record<Lang, string>> = {
  eng: 'en', fra: 'fr', ara: 'ar', srp: 'sr', ukr: 'uk',
  zho: 'zh', deu: 'de', rus: 'ru', pol: 'pl', por: 'pt',
  spa: 'es', fas: 'fa', ron: 'ro',
}

// Match language suffix on relaton id. Covers every suffix OIML uses in
// its data: short legacy codes (E/F/A), ISO 639-3 (eng/fra/ara/deu/fas/pol/
// spa/srp/ukr/zho), and a few non-standard variants (Chi/Cn/Ua/Ro/Fa/Fara).
const LANG_SUFFIX_RE = /-(E|F|A|Sr|Uk|Eng|Fra|Ara|Deu|Rus|Pol|Por|Spa|Zho|Chi|Fa|Fas|Fara|Cn|Ua|Ro|eng|fra|ara|srp|ukr|deu|rus|pol|por|spa|zho|fas|chi)$/i

/** Suffix spellings found in relaton ids → canonical ISO 639-3 Lang. */
const LANG_CODE_MAP: Record<string, Lang> = {
  e: 'eng', f: 'fra', a: 'ara',
  eng: 'eng', fra: 'fra', ara: 'ara',
  sr: 'srp', srp: 'srp',
  ukr: 'ukr', uk: 'ukr', ua: 'ukr',
  zho: 'zho', chi: 'zho', cn: 'zho',
  deu: 'deu', rus: 'rus', pol: 'pol', por: 'por',
  spa: 'spa', sp: 'spa',
  fa: 'fas', fas: 'fas', fara: 'fas',
  ro: 'ron',
}

/** Extract the canonical language from a relaton id (R60-1-2021-E → 'eng'). */
export function languageFromId(id: string): Lang | undefined {
  const m = id.match(LANG_SUFFIX_RE)
  if (!m) return undefined
  return LANG_CODE_MAP[m[1].toLowerCase()] ?? ('unknown' as Lang)
}

/** ISO 639-3 → ISO 639-1 (eng → en). Undefined if unmapped. */
export function langTo2Letter(lang: Lang): string | undefined {
  return LANG_TO_2LETTER[lang]
}

export interface IdentInput {
  doctype: Doctype
  docnumber: string
  year?: number
  partNumber?: string
  language?: Lang
}

/** Compute the OIML-pattern DOI for an edition. Returns undefined if
 *  doctype/docnumber/year aren't known. */
export function deriveDoi(input: IdentInput): string | undefined {
  const letter = DOCTYPE_LETTER[input.doctype]
  if (!letter || !input.docnumber || !input.year) return undefined
  const num = input.docnumber.padStart(3, '0')
  return `${DOI_PREFIX}/${letter}${num}.${input.year}.en`
}

/** Compute the hierarchical URN. Includes year if known; part/lang only
 *  when those components are present (so series → edition → part → instance
 *  URNs nest cleanly). */
export function deriveUrn(input: IdentInput): string | undefined {
  if (!input.docnumber || !DOCTYPE_LETTER[input.doctype]) return undefined
  const parts: string[] = [URN_PREFIX, input.docnumber]
  if (input.year) parts.push(String(input.year))
  if (input.partNumber) parts.push(input.partNumber)
  if (input.language) {
    const lang2 = LANG_TO_2LETTER[input.language]
    if (lang2) parts.push(lang2)
  }
  return parts.join(':')
}
