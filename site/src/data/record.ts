// ─────────────────────────────────────────────────────────────────────
// Record serialization — how a publication record is described to the
// outside world (schema.org JSON-LD). One serializer for all four levels
// (series / edition / part / instance), shared by the page components'
// <script type="application/ld+json"> and the /api/publications/<slug>
// endpoint, so the two can never drift.
// ─────────────────────────────────────────────────────────────────────

import type { Series, Edition, Part, Instance } from './types'
import { pubUrl } from './urls'

export interface RecordRef {
  series: Series
  edition?: Edition
  part?: Part
  instance?: Instance
}

const BASE = {
  '@context': 'https://schema.org',
  '@type': ['Standard', 'CreativeWork'],
  publisher: { '@type': 'Organization', name: 'OIML' },
} as const

/** schema.org JSON-LD for one publication record. Level is inferred from
 *  which refs are present: instance > part > edition > series. */
export function toJsonLd(rec: RecordRef): Record<string, any> {
  const { series: s, edition: ed, part: p, instance: inst } = rec

  if (inst && ed) {
    const title = p?.title[inst.language] ?? ed.title[inst.language] ?? inst.docid
    return {
      ...BASE,
      '@id': inst.urn ?? pubUrl(inst.slug),
      identifier: inst.docid,
      name: title,
      description: p?.scope ?? ed.scope,
      datePublished: inst.publishedAt,
      inLanguage: inst.language,
      encoding: inst.localPdfPath ? [{
        '@type': 'MediaObject',
        encodingFormat: 'application/pdf',
        contentUrl: inst.localPdfPath,
      }] : undefined,
      doi: inst.doi,
      doiSource: inst.doiSource,
      urn: inst.urn,
      isPartOf: pubUrl((p ?? ed).slug),
    }
  }

  if (p && ed) {
    return {
      ...BASE,
      '@id': p.urn ?? pubUrl(p.slug),
      identifier: p.docid,
      name: p.title.eng ?? p.title.fra ?? p.docid,
      description: p.scope,
      doi: p.doi,
      doiSource: p.doiSource,
      urn: p.urn,
      isPartOf: pubUrl(ed.slug),
    }
  }

  if (ed) {
    return {
      ...BASE,
      '@id': ed.urn ?? pubUrl(ed.slug),
      identifier: ed.docid,
      name: ed.title.eng ?? ed.title.fra ?? ed.docid,
      description: ed.scope,
      datePublished: ed.publishedAt,
      inLanguage: ed.languages(),
      doi: ed.doi,
      doiSource: ed.doiSource,
      urn: ed.urn,
      isPartOf: pubUrl(s.slug),
      hasPart: ed.parts.map(part => pubUrl(part.slug)),
    }
  }

  return {
    ...BASE,
    '@id': s.urn ?? pubUrl(s.slug),
    identifier: s.docid,
    name: s.title.eng ?? s.title.fra ?? s.docid,
    description: s.scope,
    urn: s.urn,
    hasEdition: s.editions.map(e => pubUrl(e.slug)),
    hasSuccessor: s.editions.flatMap(e => e.relations.filter(r => r.type === 'hasSuccessor').map(r => r.target)),
  }
}
