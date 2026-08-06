import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://oimlsmart.github.io',
  base: '/publications',
  output: 'static',
  integrations: [sitemap(), vue()],
  vite: {
    plugins: [tailwindcss()],
    // The vendored site-shell's islands resolve vue from the site root.
    resolve: { dedupe: ['vue'] },
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
})
