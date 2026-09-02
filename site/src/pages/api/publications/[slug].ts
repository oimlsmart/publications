import type { APIRoute } from 'astro'
import { loadDataset } from '../../../data/publications.js'
import { toJsonLd } from '../../../data/record.js'

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
  const payload = toJsonLd({
    series: p.series,
    edition: p.edition,
    part: p.part,
    instance: p.instance,
  })
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
