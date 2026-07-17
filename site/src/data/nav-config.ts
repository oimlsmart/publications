// Navigation configuration for oimlsmart/publications browser.

export interface NavLink {
  readonly label: string
  readonly href: string
  readonly desc?: string
  readonly badge?: 'new' | 'beta'
  readonly external?: boolean
}

export interface NavDropdown {
  readonly id: string
  readonly label: string
  readonly links: readonly NavLink[]
}

export interface NavStandalone {
  readonly label: string
  readonly href: string
  readonly matchPrefix: string
  readonly external?: boolean
}

// "Browse" dropdown — jump straight to a publication type
export const BROWSE_DROPDOWN: NavDropdown = {
  id: 'browse',
  label: 'Browse',
  links: [
    { label: 'All publications', href: '/publications/browse/', desc: 'Every OIML publication in the archive' },
    { label: 'Recommendations',  href: '/publications/browse/recommendation/',    desc: 'Formal metrology requirements (R)' },
    { label: 'Documents',        href: '/publications/browse/document/',          desc: 'Guidance documents (D)' },
    { label: 'Guides',           href: '/publications/browse/guide/',             desc: 'Application guides (G)' },
    { label: 'Basic Publications', href: '/publications/browse/basic-publication/', desc: 'Directives, framework docs (B)' },
    { label: 'Vocabularies',     href: '/publications/browse/vocabulary/',        desc: 'VIM, VIML (V)' },
    { label: 'Expert Reports',   href: '/publications/browse/expert-report/',     desc: 'Commissioned expert reports (E)' },
    { label: 'Seminar Reports',  href: '/publications/browse/seminar-report/',    desc: 'OIML seminar proceedings (S)' },
  ],
}

// Standalone nav links (top-level)
export const NAV_STANDALONE: readonly NavStandalone[] = [
  { label: 'Browse',    href: '/publications/browse/', matchPrefix: '/publications/browse' },
  { label: 'Search',    href: '/publications/search/', matchPrefix: '/publications/search' },
  { label: 'API',       href: '/publications/api/publications.json', matchPrefix: '/publications/api', external: true },
  { label: 'OIML SMART', href: 'https://www.oimlsmart.org/', matchPrefix: '__never__', external: true },
  { label: 'GitHub',    href: 'https://github.com/oimlsmart/publications', matchPrefix: '__never__', external: true },
]

export function isLinkActive(matchPrefix: string, currentPath: string): boolean {
  if (matchPrefix === '__never__') return false
  const normalized = currentPath.replace(/\/$/, '')
  const prefix = matchPrefix.replace(/\/$/, '')
  return normalized === prefix || normalized.startsWith(prefix + '/')
}
