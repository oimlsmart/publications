import { defineConfig } from 'vitest/config'
import vue from '@astrojs/vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
