/**
 * Region suggestions from an object-segmentation model (Segment Anything), independent of
 * which model runs it: the caller supplies `decode(x, y)` → candidate masks for a click.
 *
 * The photo is probed with a grid of clicks over the product; confident candidate shapes
 * are de-duplicated, and overlapping ones resolved smallest-first so the result is a set of
 * separate parts (a leaf, a stem, the soil…) rather than nested wholes. These are only
 * suggestions — the admin accepts, edits or dismisses each one.
 */

export interface Candidate {
  /** 1 = pixel in the shape (working resolution). */
  mask: Uint8Array
  /** The model's own confidence (predicted IoU), 0–1. */
  score: number
}

export interface SuggestOptions {
  /** Clicks per side of the grid over the product's bounding box. */
  grid?: number
  minScore?: number
  /** Ignore shapes smaller / bigger than these fractions of the product. */
  minShare?: number
  maxShare?: number
  /** Two shapes overlapping more than this (intersection ÷ union) are the same shape. */
  sameShape?: number
}

const area = (m: Uint8Array) => {
  let n = 0
  for (let i = 0; i < m.length; i++) n += m[i]
  return n
}

function iou(a: Uint8Array, b: Uint8Array): number {
  let inter = 0
  let union = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] || b[i]) union++
    if (a[i] && b[i]) inter++
  }
  return union ? inter / union : 0
}

/** Grid click points (pixel coords) that land on the product. */
export function gridPoints(product: Uint8Array, w: number, h: number, grid: number): { x: number; y: number }[] {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let p = 0; p < product.length; p++) {
    if (!product[p]) continue
    const x = p % w
    const y = (p - x) / w
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (x1 < 0) return []
  const pts: { x: number; y: number }[] = []
  for (let j = 0; j < grid; j++) {
    for (let i = 0; i < grid; i++) {
      const x = Math.round(x0 + ((i + 0.5) / grid) * (x1 - x0))
      const y = Math.round(y0 + ((j + 0.5) / grid) * (y1 - y0))
      if (product[y * w + x]) pts.push({ x, y })
    }
  }
  return pts
}

export async function suggestRegions(
  w: number,
  h: number,
  product: Uint8Array,
  decode: (x: number, y: number) => Promise<Candidate[]>,
  opts: SuggestOptions = {},
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array[]> {
  const { grid = 7, minScore = 0.86, minShare = 0.004, maxShare = 0.6, sameShape = 0.75 } = opts
  const productArea = area(product)
  if (!productArea) return []
  const points = gridPoints(product, w, h, grid)

  const kept: { mask: Uint8Array; score: number; size: number }[] = []
  for (const [i, pt] of points.entries()) {
    // a click already inside a small confident shape adds nothing new — skip it (faster).
    // Inside a big shape (a whole pot) it may still find a smaller part (the soil).
    const covered = kept.some((k) => k.mask[pt.y * w + pt.x] && k.size / productArea < 0.12)
    if (!covered) {
      for (const c of await decode(pt.x, pt.y)) {
        if (c.score < minScore) continue
        const mask = new Uint8Array(c.mask.length)
        for (let q = 0; q < mask.length; q++) mask[q] = c.mask[q] && product[q] ? 1 : 0
        const size = area(mask)
        const share = size / productArea
        if (share < minShare || share > maxShare) continue
        if (kept.some((k) => iou(k.mask, mask) > sameShape)) continue
        kept.push({ mask, score: c.score, size })
      }
    }
    onProgress?.(i + 1, points.length)
  }

  // smallest first: each pixel belongs to the most specific shape that contains it
  kept.sort((a, b) => a.size - b.size)
  const claimed = new Uint8Array(w * h)
  const parts: Uint8Array[] = []
  for (const k of kept) {
    const part = new Uint8Array(w * h)
    let n = 0
    for (let q = 0; q < part.length; q++) {
      if (k.mask[q] && !claimed[q]) {
        part[q] = 1
        claimed[q] = 1
        n++
      }
    }
    if (n / productArea >= minShare) parts.push(part)
  }
  return parts.sort((a, b) => area(b) - area(a))
}
