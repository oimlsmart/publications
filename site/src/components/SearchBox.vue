<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ basePath: string }>()

const error = ref<string | null>(null)
const initialQuery = ref('')

onMounted(() => {
  initialQuery.value = new URLSearchParams(window.location.search).get('q') || ''

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = props.basePath + '/pagefind/pagefind-ui.css'
  document.head.appendChild(link)

  const script = document.createElement('script')
  script.src = props.basePath + '/pagefind/pagefind-ui.js'
  script.onload = () => {
    const PagefindUI = (window as any).PagefindUI
    const el = document.getElementById('pf-search')
    if (!PagefindUI) {
      error.value = 'PagefindUI not found.'
      return
    }
    if (!el) {
      error.value = 'Search container not found.'
      return
    }
    new PagefindUI({
      element: el,
      showSubResults: true,
      showImages: false,
      translations: {
        placeholder: 'Search publications…',
        zero_results: 'No matching publications found.',
      },
    })

    if (initialQuery.value) {
      let attempts = 0
      const poll = () => {
        if (++attempts > 50) return
        const input = document.querySelector('#pf-search input.pagefind-ui__search-input') as HTMLInputElement | null
        if (input) {
          input.value = initialQuery.value
          input.dispatchEvent(new Event('input', { bubbles: true }))
          attachEnterHandler(input)
          return
        }
        setTimeout(poll, 20)
      }
      poll()
    } else {
      // Still need to attach Enter handler when no initial query
      let attempts = 0
      const poll = () => {
        if (++attempts > 50) return
        const input = document.querySelector('#pf-search input.pagefind-ui__search-input') as HTMLInputElement | null
        if (input) {
          attachEnterHandler(input)
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

function attachEnterHandler(input: HTMLInputElement) {
  if ((input as any).__pfEnterBound) return
  ;(input as any).__pfEnterBound = true
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const q = input.value.trim()
      const url = new URL(window.location.href)
      if (q) url.searchParams.set('q', q)
      else url.searchParams.delete('q')
      window.history.replaceState(null, '', url)
    }
  })
}
</script>

<template>
  <div class="search-host">
    <p v-if="error" class="text-sm text-red-700 dark:text-red-300 font-mono p-4">
      {{ error }} Make sure you have run <code>npm run build</code> at least once to generate the Pagefind index.
    </p>
  </div>
</template>
