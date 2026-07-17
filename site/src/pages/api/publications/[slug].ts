import type { APIRoute } from 'astro'
import { loadDataset, BASE_PATH } from '../../../data/publications.js'

export async function getStaticPaths() {
  const data = loadDataset()
  const out: { params: { slug: string }; props: any }[] = []
  for (const s of data.series) {
    out.push({ params: { slug: s.slug }, props: { kind: 'series', series: s } })
    for (const ed of s.editions) {
      out.push({ params: { slug: ed.slug }, props: { kind: 'edition', series: s, edition: ed } })
      for (const p of ed.parts) {
        out.push({ params: { slug: p.slug }, props: { kind: 'part', series: s, edition: ed, part: p } })
      }
      for (const i of ed.instances) {
        out.push({ params: { slug: i.slug }, props: { kind: 'instance', series: s, edition: ed, instance: i } })
      }
      for (const p of ed.parts) for (const i of p.instances) {
        out.push({ params: { slug: i.slug }, props: { kind: 'instance', series: s, edition: ed, part: p, instance: i } })
      }
    }
  }
  return out
}

export const GET: APIRoute = ({ props }) => {
  const p = props as any
  const base = {
    '@context': 'https://schema.org',
    '@type': ['Standard', 'CreativeWork'],
    publisher: { '@type': 'Organization', name: 'OIML' },
  }
  let payload: any
  if (p.kind === 'series') {
    const s = p.series
    payload = {
      ...base,
      '@id': `${BASE_PATH}/pub/${s.slug}/`,
      identifier: s.docid,
      name: s.title.eng ?? s.title.fra ?? s.docid,
      description: s.scope,
      hasEdition: s.editions.map((e: any) => `${BASE_PATH}/pub/${e.slug}/`),
    }
  } else if (p.kind === 'edition') {
    const ed = p.edition
    payload = {
      ...base,
      '@id': `${BASE_PATH}/pub/${ed.slug}/`,
      identifier: ed.docid,
      name: ed.title.eng ?? ed.title.fra ?? ed.docid,
      description: ed.scope,
      datePublished: ed.publishedAt,
      inLanguage: ed.languages(),
      isPartOf: `${BASE_PATH}/pub/${p.series.slug}/`,
      hasPart: ed.parts.map((part: any) => `${BASE_PATH}/pub/${part.slug}/`),
      doi: ed.doi,
    }
  } else if (p.kind === 'part') {
    const part = p.part
    payload = {
      ...base,
      '@id': `${BASE_PATH}/pub/${part.slug}/`,
      identifier: part.docid,
      name: part.title.eng ?? part.title.fra ?? part.docid,
      description: part.scope,
      isPartOf: `${BASE_PATH}/pub/${p.edition.slug}/`,
    }
  } else {
    const inst = p.instance
    payload = {
      ...base,
      '@id': `${BASE_PATH}/pub/${inst.slug}/`,
      identifier: inst.docid,
      inLanguage: inst.language,
      datePublished: inst.publishedAt,
      encoding: inst.localPdfPath ? [{
        '@type': 'MediaObject',
        encodingFormat: 'application/pdf',
        contentUrl: inst.localPdfPath,
      }] : undefined,
      isPartOf: `${BASE_PATH}/pub/${(p.part ?? p.edition).slug}/`,
      doi: inst.doi,
    }
  }
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
