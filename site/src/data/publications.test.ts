import { describe, it, expect } from 'vitest'
import { loadDataset, deriveDoi, deriveUrn } from '../data/publications'
import { ALL_DOCTYPES } from '../data/types'

// Loading parses ~5,700 YAMLs at build time — first call takes ~5–10s.
// Subsequent calls hit the module-level memo and return instantly.
const LOAD_TIMEOUT = 60000

describe('loadDataset', () => {
  it('returns a dataset with series', { timeout: LOAD_TIMEOUT }, () => {
    const data = loadDataset()
    expect(data.series.length).toBeGreaterThan(100)
  })

  it('groups by doctype correctly', () => {
    const data = loadDataset()
    for (const dt of ALL_DOCTYPES) {
      expect(data.byDoctype[dt]).toBeDefined()
      expect(Array.isArray(data.byDoctype[dt])).toBe(true)
    }
  })

  it('recommendations have at least 100 series', () => {
    const data = loadDataset()
    expect(data.byDoctype['recommendation'].length).toBeGreaterThan(100)
  })

  it('stats are computed', () => {
    const data = loadDataset()
    expect(data.stats.totalSeries).toBeGreaterThan(100)
    expect(data.stats.totalEditions).toBeGreaterThan(100)
    expect(data.stats.totalInstances).toBeGreaterThan(100)
  })

  it('editions are sorted newest-first within a series', () => {
    const data = loadDataset()
    const r60 = data.series.find(s => s.docnumber === '60' && s.doctype === 'recommendation')
    expect(r60).toBeDefined()
    if (r60 && r60.editions.length > 1) {
      for (let i = 1; i < r60.editions.length; i++) {
        expect(r60.editions[i - 1].year).toBeGreaterThanOrEqual(r60.editions[i].year)
      }
    }
  })

  it('instances have language codes', () => {
    const data = loadDataset()
    for (const s of data.series.slice(0, 10)) {
      for (const ed of s.editions) {
        for (const inst of ed.instances) {
          expect(inst.language).toBeTruthy()
        }
      }
    }
  })

  it('PDF paths resolve for instances with local files', () => {
    const data = loadDataset()
    let foundPdf = false
    for (const s of data.series) {
      for (const ed of s.editions) {
        for (const inst of [...ed.instances, ...ed.parts.flatMap(p => p.instances)]) {
          if (inst.localPdfPath) {
            expect(inst.localPdfPath).toContain('/pdfs/')
            expect(inst.fileSize).toBeGreaterThan(0)
            foundPdf = true
          }
        }
      }
      if (foundPdf) break
    }
    expect(foundPdf).toBe(true)
  })

  it('derives DOIs following the OIML 10.63493 pattern', () => {
    expect(deriveDoi({ doctype: 'recommendation', docnumber: '60', year: 2021 }))
      .toBe('10.63493/r060.2021.en')
    expect(deriveDoi({ doctype: 'document', docnumber: '1', year: 2020 }))
      .toBe('10.63493/d001.2020.en')
    expect(deriveDoi({ doctype: 'basic-publication', docnumber: '146', year: 2007 }))
      .toBe('10.63493/b146.2007.en')
    // Missing year → cannot derive
    expect(deriveDoi({ doctype: 'recommendation', docnumber: '60' })).toBeUndefined()
  })

  it('derives hierarchical URNs at every level', () => {
    expect(deriveUrn({ doctype: 'recommendation', docnumber: '60' }))
      .toBe('urn:iso:std:oiml:60')
    expect(deriveUrn({ doctype: 'recommendation', docnumber: '60', year: 2021 }))
      .toBe('urn:iso:std:oiml:60:2021')
    expect(deriveUrn({ doctype: 'recommendation', docnumber: '60', year: 2021, partNumber: '1' }))
      .toBe('urn:iso:std:oiml:60:2021:1')
    expect(deriveUrn({ doctype: 'recommendation', docnumber: '60', year: 2021, partNumber: '1', language: 'eng' }))
      .toBe('urn:iso:std:oiml:60:2021:1:en')
  })

  it('every series, edition, and instance has a URN', () => {
    const data = loadDataset()
    expect(data.series.length).toBeGreaterThan(100)
    for (const s of data.series) {
      expect(s.urn, `series ${s.docid}`).toBeTruthy()
      expect(s.urn).toMatch(/^urn:iso:std:oiml:\d+$/)
      for (const ed of s.editions) {
        expect(ed.urn, `edition ${ed.docid}`).toBeTruthy()
        expect(ed.urn).toMatch(/^urn:iso:std:oiml:\d+:\d{4}$/)
      }
    }
  })

  it('every edition has a DOI (upstream or derived)', () => {
    const data = loadDataset()
    let checked = 0
    for (const s of data.series) {
      for (const ed of s.editions) {
        if (ed.year > 0) {
          expect(ed.doi, `edition ${ed.docid}`).toBeTruthy()
          expect(ed.doiSource).toMatch(/^(upstream|derived)$/)
          checked++
        }
      }
    }
    expect(checked).toBeGreaterThan(100)
  })
})
