import { describe, it, expect } from 'vitest'
import { loadDataset } from '../data/publications'
import { ALL_DOCTYPES } from '../data/types'

describe('loadDataset', () => {
  it('returns a dataset with series', () => {
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
})
