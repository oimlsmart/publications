// Idempotent pdf.js loader — the one seam between the site and the UMD
// build in public/pdfjs/. Resolves once window.pdfjsLib is available;
// injects the script tag itself so consumers never race a global.
let loading: Promise<any> | null = null

export function loadPdfJs(basePath: string): Promise<any> {
  const w = window as any
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-pdfjs]')
    if (!script) {
      script = document.createElement('script')
      script.src = `${basePath}/pdfjs/pdf.min.js`
      script.async = true
      script.dataset.pdfjs = 'true'
      script.addEventListener('error', () => {
        loading = null
        reject(new Error(`failed to load ${script!.src}`))
      })
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => {
      if (w.pdfjsLib) resolve(w.pdfjsLib)
      else reject(new Error('pdf.min.js loaded but window.pdfjsLib is missing'))
    })
  })
  return loading
}
