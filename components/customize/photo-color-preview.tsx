'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { maskRange, maskStats, recolorPixels, type MaskStats } from '@/lib/preview/yarn-colors'

/**
 * Recolors parts of a real product photo in the browser. For each part, a black/white mask
 * marks its pixels; those pixels are repainted in the chosen yarn color while keeping their
 * original shading — so stitches, shadows and highlights survive and it still looks like
 * the photo. Works from any yarn colour (red → yellow, white → blue…); see lib/preview/yarn-colors.
 */

export interface PhotoLayer {
  maskUrl: string
  /** Target hex, or undefined to keep the photo's original color for this part. */
  hex?: string
}

interface Prepared {
  width: number
  height: number
  base: Uint8ClampedArray
  masks: Map<string, { alpha: Uint8Array; stats: MaskStats; range: { from: number; to: number } }>
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${url}`))
    img.src = url
  })
}

async function prepare(baseUrl: string, maskUrls: string[]): Promise<Prepared> {
  const baseImg = await loadImage(baseUrl)
  const width = baseImg.naturalWidth
  const height = baseImg.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas unavailable')

  ctx.drawImage(baseImg, 0, 0)
  const base = ctx.getImageData(0, 0, width, height).data // throws if CORS is missing

  const masks = new Map<string, { alpha: Uint8Array; stats: MaskStats; range: { from: number; to: number } }>()
  await Promise.all(
    [...new Set(maskUrls)].map(async (url) => {
      const img = await loadImage(url)
      const c = document.createElement('canvas')
      c.width = width
      c.height = height
      const mctx = c.getContext('2d', { willReadFrequently: true })!
      mctx.drawImage(img, 0, 0, width, height) // masks share the base's aspect ratio (checked on upload)
      const data = mctx.getImageData(0, 0, width, height).data
      const alpha = new Uint8Array(width * height)
      for (let i = 0, p = 0; p < alpha.length; i += 4, p++) alpha[p] = data[i]
      masks.set(url, { alpha, stats: maskStats(base, alpha), range: maskRange(alpha, width) })
    })
  )

  return { width, height, base, masks }
}

function render(target: HTMLCanvasElement, prep: Prepared, layers: PhotoLayer[]) {
  const ctx = target.getContext('2d')
  if (!ctx) return
  target.width = prep.width
  target.height = prep.height
  const out = new Uint8ClampedArray(prep.base)

  for (const layer of layers) {
    const mask = layer.hex ? prep.masks.get(layer.maskUrl) : undefined
    if (mask) recolorPixels(prep.base, out, mask.alpha, mask.stats, layer.hex!, mask.range)
  }

  ctx.putImageData(new ImageData(out, prep.width, prep.height), 0, 0)
}

export function PhotoColorPreview({
  baseUrl,
  layers,
  className,
  alt,
  onError,
}: {
  baseUrl: string
  layers: PhotoLayer[]
  className?: string
  alt: string
  onError?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [prep, setPrep] = useState<Prepared | null>(null)
  const [failed, setFailed] = useState(false)
  const maskKey = layers.map((l) => l.maskUrl).join('|')
  const colorKey = layers.map((l) => l.hex ?? '').join('|')

  useEffect(() => {
    let cancelled = false
    setPrep(null)
    prepare(baseUrl, maskKey ? maskKey.split('|') : [])
      .then((p) => !cancelled && setPrep(p))
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        onError?.()
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, maskKey])

  useEffect(() => {
    if (!prep || !canvasRef.current) return
    const frame = requestAnimationFrame(() => canvasRef.current && render(canvasRef.current, prep, layers))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep, colorKey])

  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={baseUrl} alt={alt} className={cn('h-full w-full object-contain', className)} />
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      {!prep && <div className="absolute inset-0 animate-pulse rounded-2xl bg-muted" aria-hidden />}
      <canvas ref={canvasRef} role="img" aria-label={alt} className={cn('h-full w-full object-contain transition-opacity duration-300', prep ? 'opacity-100' : 'opacity-0')} />
    </div>
  )
}
