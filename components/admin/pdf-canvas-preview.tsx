'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Renders every page of a PDF (given as an object/blob URL) onto canvases with pdf.js, sized to
 * the container width. Unlike an <iframe>, this works on phones and never shows browser PDF
 * chrome — used for the invoice design preview.
 */
/** pdf.js 4 relies on Promise.withResolvers, missing in Safari < 17.4 and older Chromium. */
function ensureWithResolvers() {
  if (typeof Promise.withResolvers === 'function') return
  Promise.withResolvers = function <T>(): PromiseWithResolvers<T> {
    let resolve!: PromiseWithResolvers<T>['resolve']
    let reject!: PromiseWithResolvers<T>['reject']
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

export function PdfCanvasPreview({ url, className, onError }: { url: string | null; className?: string; onError?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!url || !host) return
    let cancelled = false

    ;(async () => {
      try {
        ensureWithResolvers()
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const doc = await pdfjs.getDocument(url).promise
        if (cancelled) return
        const width = host.clientWidth || 400
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
        const canvases: HTMLCanvasElement[] = []
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * dpr })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.className = 'block rounded-md bg-white shadow-sm ring-1 ring-black/5'
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
          if (cancelled) return
          canvases.push(canvas)
        }
        // swap in all pages at once so the preview never flashes empty between renders
        host.replaceChildren(...canvases)
        setPages(doc.numPages)
        doc.destroy()
      } catch {
        if (!cancelled) onError?.()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [url, onError])

  return <div ref={hostRef} data-pages={pages} className={cn('flex flex-col gap-3', className)} />
}
