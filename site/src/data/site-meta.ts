export interface SiteMeta {
  title: string
  description: string
  lang: string
  basePath: string
}

const SITE: SiteMeta = {
  title: 'OIML Publications',
  description:
    'A public archive of OIML International Recommendations, Documents, Guides, Vocabularies, Basic Publications, Expert Reports, and Seminar Reports — bibliographic data and PDFs for every OIML publication.',
  lang: 'en',
  basePath: '/publications',
}

export default SITE
