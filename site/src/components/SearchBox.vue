<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ basePath: string }>()

const loaded = ref(false)
const error = ref<string | null>(null)
const initialQuery = ref('')

onMounted(() => {
  initialQuery.value = new URLSearchParams(window.location.search).get('q') || ''

  // Load CSS
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = props.basePath + '/pagefind/pagefind-ui.css'
  document.head.appendChild(link)

  // Load script
  const script = document.createElement('script')
  script.src = props.basePath + '/pagefind/pagefind-ui.js'
  script.onload = () => {
    const PagefindUI = (window as any).PagefindUI
    if (!PagefindUI) {
      error.value = 'PagefindUI not found.'
      return
    }
    new PagefindUI({
      element: '#pf-search',
      showSubResults: true,
      showImages: false,
      translations: {
        placeholder: 'Search publications…',
        zero_results: 'No matching publications found.',
      },
    })
    loaded.value = true

    // Apply initial query from URL
    if (initialQuery.value) {
      let attempts = 0
      const poll = () => {
        if (++attempts > 50) return
        const input = document.querySelector('#pf-search input[type="search"]') as HTMLInputElement | null
        if (input) {
          input.value = initialQuery.value
          input.dispatchEvent(new Event('input', { bubbles: true }))
          return
        }
        setTimeout(poll, 20)
      }
      poll()
    }
  }
  script.onerror = () => {
    error.value = 'Failed to load search index.'
  }
  document.head.appendChild(script)
})
</script>

<template>
  <div id="pf-search" />
  <p v-if="error" class="text-sm text-red-700 dark:text-red-300 font-mono p-4">
    {{ error }} Make sure you have run <code>npm run build</code> at least once to generate the Pagefind index.
  </p>
</template>
