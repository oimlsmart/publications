import type { APIRoute } from 'astro'
import { loadDataset, BASE_PATH } from '../../../data/publications.js'

export async function getStaticPaths() {
  const data = loadDataset()
  return [
    ...data.works.values(),
    ...data.instances.values(),
  ].map(rec => ({
    params: { slug: rec.slug },
    props: { rec },
  }))
}

export const GET: APIRoute = ({ props }) => {
  const rec = props.rec as any
  const data = loadDataset()
  const isInstance = 'language' in rec
  const instances = isInstance ? [] : rec.instances
    .map((id: string) => data.instances.get(id))
    .filter(Boolean)
  return new Response(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': ['Standard', 'CreativeWork'],
      '@id': `${BASE_PATH}/pub/${rec.slug}/`,
      identifier: rec.docid,
      name: rec.title.eng ?? rec.title.fra ?? rec.docid,
      description: rec.scope,
      datePublished: rec.publishedAt,
      inLanguage: isInstance ? rec.language : instances.map((i: any) => i.language),
      encoding: isInstance && rec.localPdfPath ? [{
        '@type': 'MediaObject',
        encodingFormat: 'application/pdf',
        contentUrl: rec.localPdfPath,
      }] : undefined,
      doi: rec.doi,
      status: rec.status,
      doctype: rec.doctype,
      tc: rec.tc,
      relations: rec.relations,
      publisher: { '@type': 'Organization', name: 'OIML' },
    }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  )
}
