<script setup lang="ts">
import { ref } from 'vue'
import { BROWSE_DROPDOWN, NAV_STANDALONE, isLinkActive } from '../data/nav-config'

const props = defineProps<{ currentPath: string }>()

const browseOpen = ref(false)
let browseTimer: ReturnType<typeof setTimeout> | null = null

function openBrowse() {
  if (browseTimer) clearTimeout(browseTimer)
  browseOpen.value = true
}

function closeBrowse() {
  browseTimer = setTimeout(() => { browseOpen.value = false }, 150)
}

function toggleBrowse() {
  browseOpen.value = !browseOpen.value
}
</script>

<template>
  <nav class="hidden md:flex items-center gap-5">
    <!-- Browse dropdown -->
    <div class="relative" @mouseenter="openBrowse" @mouseleave="closeBrowse">
      <button
        class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap"
        :class="browseOpen ? 'text-accent' : 'text-ink-soft hover:text-accent'"
        @click="toggleBrowse"
        aria-haspopup="true"
        :aria-expanded="browseOpen"
      >
        <span>Browse</span>
        <span class="text-[0.625rem] text-ink-muted">▾</span>
      </button>
      <div
        v-if="browseOpen"
        class="absolute top-full mt-2 left-0 min-w-[280px] bg-paper-soft dark:bg-paper border border-rule rounded-lg p-1.5 shadow-lg flex flex-col gap-0.5 z-[200]"
      >
        <a
          v-for="link in BROWSE_DROPDOWN.links"
          :key="link.href"
          :href="link.href"
          class="flex items-start gap-2 px-3 py-2 text-sm text-ink-soft hover:bg-paper-raised dark:hover:bg-paper-deep hover:text-accent rounded transition-colors no-underline"
        >
          <div class="flex flex-col gap-0.5 flex-1 min-w-0">
            <span>{{ link.label }}</span>
            <span v-if="link.desc" class="text-xs text-ink-muted">{{ link.desc }}</span>
          </div>
        </a>
      </div>
    </div>

    <!-- Standalone links -->
    <a
      v-for="item in NAV_STANDALONE.filter(l => l.label !== 'Browse')"
      :key="item.href"
      :href="item.href"
      class="text-sm font-medium hover:text-accent transition-colors whitespace-nowrap"
      :class="[
        isLinkActive(item.matchPrefix, props.currentPath) ? 'text-accent font-semibold' : 'text-ink-soft',
        item.external ? 'inline-flex items-center gap-1' : '',
      ]"
    >
      <span>{{ item.label }}</span>
      <svg v-if="item.external" class="w-3 h-3 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 17L17 7M17 7H7M17 7V17" />
      </svg>
    </a>

    <ThemeToggle client:load />
  </nav>
</template>

<script lang="ts">
import ThemeToggle from './ThemeToggle.vue'
export default { components: { ThemeToggle } }
</script>
