import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// Site is published at https://oimlsmart.github.io/publications/
// (GitHub Pages project-page path). Adjust `base` if moved to a custom
// domain.
export default defineConfig({
  site: 'https://oimlsmart.github.io',
  base: '/publications',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
})
