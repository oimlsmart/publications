<script setup lang="ts">
import { ref } from 'vue'
import { BROWSE_DROPDOWN } from '../data/nav-config'

const props = defineProps<{ basePath: string }>()

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
  document.body.style.overflow = isOpen.value ? 'hidden' : ''
}

function close() {
  isOpen.value = false
  document.body.style.overflow = ''
}
</script>

<template>
  <div class="md:hidden">
    <button
      class="flex flex-col items-center justify-center gap-[5px] w-10 h-10 rounded-lg border border-rule cursor-pointer shrink-0 transition-colors hover:border-accent bg-transparent"
      @click="toggle"
      aria-label="Open menu"
    >
      <span class="block w-5 h-0.5 rounded-full bg-ink transition-all duration-200" :class="{ 'translate-y-[7px] rotate-45': isOpen }" />
      <span class="block w-5 h-0.5 rounded-full bg-ink transition-all duration-200" :class="{ 'opacity-0': isOpen }" />
      <span class="block w-5 h-0.5 rounded-full bg-ink transition-all duration-200" :class="{ '-translate-y-[7px] -rotate-45': isOpen }" />
    </button>

    <div v-if="isOpen" class="fixed inset-0 z-[300] bg-paper dark:bg-paper-deep flex flex-col">
      <div class="flex items-center justify-between h-14 px-6 border-b border-rule shrink-0">
        <a :href="props.basePath + '/'" class="flex items-center gap-2 no-underline text-ink" @click="close">
          <img :src="props.basePath + '/oiml-logo-icon-light.svg'" alt="" class="logo-light h-7 w-auto shrink-0" />
          <img :src="props.basePath + '/oiml-logo-icon-dark.svg'" alt="" class="logo-dark h-7 w-auto shrink-0" />
          <span class="font-serif text-base font-semibold tracking-tight">OIML Publications</span>
        </a>
        <button class="w-10 h-10 rounded-lg border border-rule flex items-center justify-center" @click="close" aria-label="Close menu">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        <a :href="props.basePath + '/browse/'" class="block py-3 px-3 text-base font-medium text-ink hover:bg-paper-raised dark:hover:bg-paper rounded" @click="close">Browse all</a>
        <a
          v-for="link in BROWSE_DROPDOWN.links.filter(l => l.label !== 'All publications')"
          :key="link.href"
          :href="link.href"
          class="block py-3 px-3 text-base text-ink-soft hover:bg-paper-raised dark:hover:bg-paper rounded"
          @click="close"
        >{{ link.label }}</a>
        <hr class="border-rule my-3" />
        <a :href="props.basePath + '/search/'" class="block py-3 px-3 text-base text-ink-soft hover:bg-paper-raised dark:hover:bg-paper rounded" @click="close">Search</a>
        <a href="https://www.oimlsmart.org/" class="block py-3 px-3 text-base text-ink-soft hover:bg-paper-raised dark:hover:bg-paper rounded">OIML SMART ↗</a>
        <a href="https://github.com/oimlsmart/publications" class="block py-3 px-3 text-base text-ink-soft hover:bg-paper-raised dark:hover:bg-paper rounded">GitHub ↗</a>
      </nav>
    </div>
  </div>
</template>
