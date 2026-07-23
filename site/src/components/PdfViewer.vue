<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  pdfUrl: string
  basePath: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const pageLabel = ref('1 / —')
const loading = ref(true)
const errorMsg = ref('')
const currentPage = ref(1)
let docPromise: Promise<any> | null = null
let pdfDoc: any = null

function load() {
  // pdf.js v2.16.105 is loaded via a <script> tag in the parent Astro component
  // and attaches as window.pdfjsLib
  const pdfjsLib = (window as any).pdfjsLib
  if (!pdfjsLib) {
    setTimeout(load, 50)
    return
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = props.basePath + '/pdfjs/pdf.worker.min.js'

  docPromise = pdfjsLib.getDocument(props.pdfUrl).promise
  docPromise
    .then((doc: any) => {
      pdfDoc = doc
      return render(currentPage.value)
    })
    .then(() => {
      loading.value = false
    })
    .catch((e: any) => {
      loading.value = false
      errorMsg.value = e?.message || String(e)
    })
}

async function render(pageNum: number) {
  if (!pdfDoc || !canvas.value) return
  if (pageNum < 1) pageNum = 1
  if (pageNum > pdfDoc.numPages) pageNum = pdfDoc.numPages
  currentPage.value = pageNum
  pageLabel.value = `${pageNum} / ${pdfDoc.numPages}`

  const page = await pdfDoc.getPage(pageNum)
  const container = canvas.value.parentElement!
  const desiredWidth = container.clientWidth - 24
  const viewport0 = page.getViewport({ scale: 1 })
  const scale = Math.min(2, Math.max(0.3, desiredWidth / viewport0.width))
  const viewport = page.getViewport({ scale })
  const ctx = canvas.value.getContext('2d')!
  canvas.value.width = viewport.width
  canvas.value.height = viewport.height
  canvas.value.style.width = viewport.width + 'px'
  canvas.value.style.height = viewport.height + 'px'
  await page.render({ canvasContext: ctx, viewport }).promise
}

function prev() { render(currentPage.value - 1) }
function next() { render(currentPage.value + 1) }

onMounted(load)
</script>

<template>
  <div class="border border-rule rounded-sm bg-paper-soft dark:bg-paper overflow-hidden">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-rule bg-paper dark:bg-paper-deep text-sm">
      <button class="px-2 py-1 border border-rule rounded-sm hover:bg-paper-soft dark:hover:bg-paper" @click="prev">←</button>
      <span class="font-mono text-xs">{{ pageLabel }}</span>
      <button class="px-2 py-1 border border-rule rounded-sm hover:bg-paper-soft dark:hover:bg-paper" @click="next">→</button>
      <span class="flex-1" />
      <a :href="pdfUrl" download class="text-xs font-mono text-accent hover:underline">⬇ Download PDF</a>
    </div>
    <div class="overflow-auto bg-gray-200 dark:bg-gray-900" style="height: 75vh">
      <canvas id="pdf-canvas" ref="canvas" class="mx-auto block shadow-lg" />
    </div>
    <p v-if="loading" class="px-3 py-2 text-sm text-ink-soft font-mono">Loading PDF…</p>
    <p v-if="errorMsg" class="px-3 py-2 text-sm text-red-700 dark:text-red-300 font-mono">
      Failed to load PDF: {{ errorMsg }}
    </p>
  </div>
</template>
