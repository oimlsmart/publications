import type { APIRoute } from 'astro'
import { loadDataset, BASE_PATH } from '../../data/publications.js'

export const GET: APIRoute = () => {
  const data = loadDataset()
  const records = [...data.works.values()].map(w => ({
    id: w.id,
    slug: w.slug,
    url: `${BASE_PATH}/pub/${w.slug}/`,
    docid: w.docid,
    doctype: w.doctype,
    docnumber: w.docnumber,
    year: w.year,
    status: w.status,
    title: w.title.eng ?? w.title.fra ?? w.docid,
    scope: w.scope,
    languages: w.instances
      .map(id => data.instances.get(id)?.language)
      .filter(Boolean),
    tc: w.tc,
    doi: w.doi,
    highPriority: w.highPriority,
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
