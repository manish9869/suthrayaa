/**
 * Mask utilities for customization regions — pure functions over 0/1 masks (Uint8Array,
 * one byte per pixel, row-major). A region is ONLY its mask: nothing here looks at what the
 * product is, and colour analysis is used just to describe a region, never to define it.
 */

import { labToRgb, rgbToHex } from './yarn-colors'

export interface Point {
  x: number
  y: number
}

/** Pixels inside a polygon (lasso / polygon tool), even-odd rule, sampled at pixel centres. */
export function fillPolygon(points: Point[], w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  if (points.length < 3) return out
  const ys = points.map((p) => p.y)
  const y0 = Math.max(0, Math.floor(Math.min(...ys)))
  const y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)))
  const xs: number[] = []
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5
    xs.length = 0
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i]
      const b = points[j]
      if (a.y > cy !== b.y > cy) xs.push(a.x + ((cy - a.y) * (b.x - a.x)) / (b.y - a.y))
    }
    xs.sort((p, q) => p - q)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5))
      const to = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5))
      for (let x = from; x <= to; x++) out[y * w + x] = 1
    }
  }
  return out
}

/** Pixels inside an axis-aligned rectangle given by two corners. */
export function fillRect(a: Point, b: Point, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x)))
  const x1 = Math.min(w, Math.ceil(Math.max(a.x, b.x)))
  const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y)))
  const y1 = Math.min(h, Math.ceil(Math.max(a.y, b.y)))
  for (let y = y0; y < y1; y++) out.fill(1, y * w + x0, y * w + x1)
  return out
}

export const maskArea = (mask: Uint8Array) => {
  let n = 0
  for (let i = 0; i < mask.length; i++) n += mask[i] ? 1 : 0
  return n
}

/** Region pixels ÷ product (foreground) pixels — background never counts. 0–1. */
export function coverage(mask: Uint8Array, product: Uint8Array): number {
  let inside = 0
  let total = 0
  for (let i = 0; i < mask.length; i++) {
    if (!product[i]) continue
    total++
    if (mask[i]) inside++
  }
  return total ? inside / total : 0
}

/**
 * Separate pieces of a mask (8-connected), largest-area-first filtered by `minArea`, in
 * reading order (top-to-bottom rows, left-to-right). Used to turn one selection of many
 * repeated elements into one region per element.
 */
export function splitPieces(mask: Uint8Array, w: number, h: number, minArea = 20): Uint8Array[] {
  const seen = new Uint8Array(w * h)
  const pieces: { pixels: number[]; cx: number; cy: number }[] = []
  const stack: number[] = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    const pixels: number[] = []
    stack.push(start)
    seen[start] = 1
    let sx = 0
    let sy = 0
    while (stack.length) {
      const p = stack.pop()!
      pixels.push(p)
      const x = p % w
      const y = (p - x) / w
      sx += x
      sy += y
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          const q = yy * w + xx
          if (mask[q] && !seen[q]) {
            seen[q] = 1
            stack.push(q)
          }
        }
      }
    }
    if (pixels.length >= minArea) pieces.push({ pixels, cx: sx / pixels.length, cy: sy / pixels.length })
  }
  // reading order: bucket rows by a tolerance of ~5% of the height so a row of elements stays together
  const band = Math.max(1, h * 0.05)
  pieces.sort((a, b) => Math.round(a.cy / band) - Math.round(b.cy / band) || a.cx - b.cx)
  return pieces.map((p) => {
    const m = new Uint8Array(w * h)
    for (const q of p.pixels) m[q] = 1
    return m
  })
}

/** A mask moved by (dx, dy) whole pixels; anything moved off the image is dropped. */
export function translateMask(mask: Uint8Array, w: number, h: number, dx: number, dy: number): Uint8Array {
  const out = new Uint8Array(w * h)
  const ix = Math.round(dx)
  const iy = Math.round(dy)
  for (let y = 0; y < h; y++) {
    const ty = y + iy
    if (ty < 0 || ty >= h) continue
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue
      const tx = x + ix
      if (tx >= 0 && tx < w) out[ty * w + tx] = 1
    }
  }
  return out
}

export function boundingBox(mask: Uint8Array, w: number): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    const x = p % w
    const y = (p - x) / w
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 }
}

/** Where to put a label: the region pixel nearest its centre of mass. */
export function labelPoint(mask: Uint8Array, w: number): Point | null {
  let sx = 0, sy = 0, n = 0
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    sx += p % w
    sy += Math.floor(p / w)
    n++
  }
  if (!n) return null
  const cx = sx / n
  const cy = sy / n
  let best: Point | null = null
  let bestD = Infinity
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    const x = p % w
    const y = (p - x) / w
    const d = (x - cx) ** 2 + (y - cy) ** 2
    if (d < bestD) {
      bestD = d
      best = { x, y }
    }
  }
  return best
}

/** Region edge pixels (in the mask, with a 4-neighbour outside it) — for drawing outlines. */
export function outline(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    const x = p % w
    const y = (p - x) / w
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !mask[p - 1] || !mask[p + 1] || !mask[p - w] || !mask[p + w]) out[p] = 1
  }
  return out
}

/**
 * The main colours seen inside a region (Lab histogram, coarse bins) — to describe a region
 * ("mostly dark red, some light red"), never to decide what the region is.
 */
export function dominantColours(lab: Float32Array, mask: Uint8Array, max = 3): { hex: string; share: number }[] {
  const bins = new Map<number, { n: number; L: number; a: number; b: number }>()
  let total = 0
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    const L = lab[p * 3], a = lab[p * 3 + 1], b = lab[p * 3 + 2]
    const key = (Math.round(L / 12) * 64 + Math.round(a / 12) + 32) * 64 + Math.round(b / 12) + 32
    const bin = bins.get(key) ?? { n: 0, L: 0, a: 0, b: 0 }
    bin.n++
    bin.L += L
    bin.a += a
    bin.b += b
    bins.set(key, bin)
    total++
  }
  return [...bins.values()]
    .sort((x, y) => y.n - x.n)
    .slice(0, max)
    .map((bin) => ({ hex: rgbToHex(labToRgb(bin.L / bin.n, bin.a / bin.n, bin.b / bin.n)), share: bin.n / Math.max(1, total) }))
}

/** Pixels shared by each pair of regions: overlaps[a][b] = count. Only pairs that overlap appear. */
export function overlapCounts(regions: { id: string; mask: Uint8Array }[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i].mask
      const b = regions[j].mask
      let n = 0
      for (let p = 0; p < a.length; p++) if (a[p] && b[p]) n++
      if (!n) continue
      if (!out.has(regions[i].id)) out.set(regions[i].id, new Map())
      if (!out.has(regions[j].id)) out.set(regions[j].id, new Map())
      out.get(regions[i].id)!.set(regions[j].id, n)
      out.get(regions[j].id)!.set(regions[i].id, n)
    }
  }
  return out
}
