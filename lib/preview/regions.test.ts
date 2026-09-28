import { describe, expect, it } from 'vitest'
import { boundingBox, coverage, dominantColours, fillPolygon, fillRect, labelPoint, maskArea, outline, overlapCounts, splitPieces, translateMask } from './regions'
import { toLabArray } from './yarn-colors'

const W = 20
const H = 10
const rect = (x0: number, y0: number, x1: number, y1: number) => fillRect({ x: x0, y: y0 }, { x: x1, y: y1 }, W, H)

describe('shapes', () => {
  it('fills a rectangle exactly', () => {
    const m = rect(2, 3, 6, 5)
    expect(maskArea(m)).toBe(4 * 2)
    expect(boundingBox(m, W)).toEqual({ x0: 2, y0: 3, x1: 5, y1: 4 })
  })

  it('fills a polygon (lasso) including only its inside', () => {
    const tri = fillPolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }], W, H)
    expect(tri[0 * W + 1]).toBe(1)
    expect(tri[9 * W + 9]).toBe(0)
    expect(maskArea(tri)).toBeGreaterThan(40)
    expect(maskArea(tri)).toBeLessThan(60)
  })

  it('ignores degenerate polygons', () => {
    expect(maskArea(fillPolygon([{ x: 1, y: 1 }, { x: 5, y: 5 }], W, H))).toBe(0)
  })
})

describe('regions', () => {
  it('measures coverage against the product only (background excluded)', () => {
    const product = rect(0, 0, 10, 10) // left half is the product
    const region = rect(0, 0, 5, 10)
    const straddling = rect(5, 0, 15, 10) // half of it is background
    expect(coverage(region, product)).toBeCloseTo(0.5)
    expect(coverage(straddling, product)).toBeCloseTo(0.5)
  })

  it('splits repeated elements into one region each, in reading order', () => {
    const m = new Uint8Array(W * H)
    for (const [x, y] of [[15, 1], [2, 1], [8, 7]]) {
      const r = rect(x, y, x + 3, y + 2)
      for (let i = 0; i < m.length; i++) m[i] |= r[i]
    }
    const pieces = splitPieces(m, W, H, 3)
    expect(pieces).toHaveLength(3)
    expect(pieces.map((p) => boundingBox(p, W)!.x0)).toEqual([2, 15, 8])
  })

  it('drops pieces smaller than the minimum (specks)', () => {
    const m = rect(0, 0, 4, 4)
    m[9 * W + 19] = 1
    expect(splitPieces(m, W, H, 3)).toHaveLength(1)
  })

  it('moves a region, dropping what falls off the image', () => {
    const moved = translateMask(rect(0, 0, 4, 2), W, H, 18, 0)
    expect(maskArea(moved)).toBe(2 * 2)
    expect(boundingBox(moved, W)).toEqual({ x0: 18, y0: 0, x1: 19, y1: 1 })
  })

  it('reports overlaps between regions', () => {
    const a = rect(0, 0, 6, 6)
    const b = rect(4, 4, 10, 10)
    const c = rect(15, 0, 18, 3)
    const o = overlapCounts([{ id: 'a', mask: a }, { id: 'b', mask: b }, { id: 'c', mask: c }])
    expect(o.get('a')!.get('b')).toBe(4)
    expect(o.get('b')!.get('a')).toBe(4)
    expect(o.has('c')).toBe(false)
  })

  it('outlines only the edge and labels inside the region', () => {
    const m = rect(2, 2, 8, 8)
    expect(maskArea(outline(m, W, H))).toBe(6 * 6 - 4 * 4)
    const lp = labelPoint(m, W)!
    expect(m[lp.y * W + lp.x]).toBe(1)
  })

  it('describes a region by its main colours without splitting it', () => {
    const rgba = new Uint8ClampedArray(W * H * 4)
    for (let p = 0; p < W * H; p++) {
      const dark = p % W < 5
      rgba.set(dark ? [120, 10, 10, 255] : [220, 40, 40, 255], p * 4)
    }
    const cols = dominantColours(toLabArray(rgba, W, H), rect(0, 0, 20, 10), 3)
    expect(cols).toHaveLength(2) // one region, two shades — still one region
    expect(cols[0].share + cols[1].share).toBeCloseTo(1)
  })
})
