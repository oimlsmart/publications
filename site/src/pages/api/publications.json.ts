import type { APIRoute } from 'astro'
import { loadDataset, BASE_PATH } from '../../data/publications.js'

export const GET: APIRoute = () => {
  const data = loadDataset()
  const records = data.series.map(s => ({
    id: s.slug,
    slug: s.slug,
    url: `${BASE_PATH}/pub/${s.slug}/`,
    docid: s.docid,
    doctype: s.doctype,
    docnumber: s.docnumber,
    title: s.title.eng ?? s.title.fra ?? s.docid,
    scope: s.scope,
    tc: s.tc,
    highPriority: s.highPriority,
    editions: s.editions.map(ed => ({
      id: ed.slug,
      slug: ed.slug,
      url: `${BASE_PATH}/pub/${ed.slug}/`,
      docid: ed.docid,
      year: ed.year,
      status: ed.status,
      doi: ed.doi,
      parts: ed.parts.map(p => ({
        id: p.slug,
        slug: p.slug,
        url: `${BASE_PATH}/pub/${p.slug}/`,
        docid: p.docid,
        partNumber: p.partNumber,
        title: p.title.eng ?? p.title.fra ?? p.docid,
        instances: p.instances.map(i => ({
          id: i.slug, slug: i.slug, url: `${BASE_PATH}/pub/${i.slug}/`,
          docid: i.docid, language: i.language,
          pdf: i.localPdfPath, size: i.fileSize,
        })),
      })),
      instances: ed.instances.map(i => ({
        id: i.slug, slug: i.slug, url: `${BASE_PATH}/pub/${i.slug}/`,
        docid: i.docid, language: i.language,
        pdf: i.localPdfPath, size: i.fileSize,
      })),
    })),
  }))
  return new Response(
    JSON.stringify({
      generated: new Date().toISOString(),
      count: records.length,
      publications: records,
    }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
}
