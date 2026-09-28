import { describe, expect, it } from 'vitest'
import { gridPoints, suggestRegions, type Candidate } from './ai-suggest'
import { fillRect, maskArea } from './regions'

const W = 40
const H = 20
const box = (x0: number, y0: number, x1: number, y1: number) => fillRect({ x: x0, y: y0 }, { x: x1, y: y1 }, W, H)
const union = (...ms: Uint8Array[]) => {
  const out = new Uint8Array(W * H)
  for (const m of ms) for (let i = 0; i < out.length; i++) out[i] |= m[i]
  return out
}

// A "product" made of a body (left) with a smaller decoration inside it, and a separate tag (right).
const body = box(2, 2, 20, 18)
const deco = box(8, 6, 14, 12)
const tag = box(26, 6, 36, 14)
const product = union(body, tag)

/** A fake segmentation model: the smallest shape containing the click, the object, and the whole piece. */
function fakeDecode(score = 0.95) {
  let calls = 0
  const decode = async (x: number, y: number): Promise<Candidate[]> => {
    calls++
    const at = y * W + x
    const shapes: Candidate[] = []
    if (deco[at]) shapes.push({ mask: deco, score })
    if (body[at]) shapes.push({ mask: body, score })
    if (tag[at]) shapes.push({ mask: tag, score })
    shapes.push({ mask: product, score }) // whole piece — should be ignored (too big)
    return shapes
  }
  return { decode, calls: () => calls }
}

describe('AI region suggestions', () => {
  it('places grid clicks only on the product', () => {
    const pts = gridPoints(product, W, H, 6)
    expect(pts.length).toBeGreaterThan(0)
    expect(pts.every((p) => product[p.y * W + p.x])).toBe(true)
  })

  it('returns separate parts: nested shapes are resolved smallest-first', async () => {
    const parts = await suggestRegions(W, H, product, fakeDecode().decode, { grid: 8, maxShare: 0.8 })
    const areas = parts.map(maskArea)
    // body minus decoration, the tag, and the decoration — each once
    expect(areas.sort((a, b) => a - b)).toEqual([maskArea(deco), maskArea(tag), maskArea(body) - maskArea(deco)].sort((a, b) => a - b))
    // no pixel belongs to two suggestions
    const seen = new Uint8Array(W * H)
    for (const p of parts) for (let i = 0; i < p.length; i++) if (p[i]) expect(seen[i]++).toBe(0)
  })

  it('ignores low-confidence shapes', async () => {
    const parts = await suggestRegions(W, H, product, fakeDecode(0.5).decode, { grid: 8 })
    expect(parts).toHaveLength(0)
  })

  it('skips clicks that land inside small shapes it already found', async () => {
    const fake = fakeDecode()
    const pts = gridPoints(product, W, H, 8)
    await suggestRegions(W, H, product, fake.decode, { grid: 8, maxShare: 0.8 })
    expect(fake.calls()).toBeLessThan(pts.length)
  })
})
