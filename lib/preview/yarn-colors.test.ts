import { describe, expect, it } from 'vitest'
import { fillSmallHoles, growRegion, maskStats, recolorPixels, rgbToLab, toLabArray, yarnMatcher } from './yarn-colors'

const W = 30
const H = 20

/** Two touching blocks: red yarn (left, darkening gradually into a shadow at x = 7) and brown yarn (right). */
function twoYarns() {
  const rgba = new Uint8ClampedArray(W * H * 4)
  for (let p = 0; p < W * H; p++) {
    const x = p % W
    const shade = 1 - 0.45 * Math.max(0, 1 - Math.abs(x - 7) / 4) // real shadows fade in
    const px = x < 15 ? [200 * shade, 40 * shade, 40 * shade] : [120, 80, 60]
    rgba.set([...px, 255], p * 4)
  }
  return rgba
}

describe('yarn matching', () => {
  it('treats a shadow as the same yarn but a similar-hued different yarn as different', () => {
    const red = rgbToLab(200, 40, 40)
    const m = yarnMatcher(red, 0.5)
    expect(m(...rgbToLab(110, 20, 22))).toBe(true) // red in shadow
    expect(m(...rgbToLab(120, 80, 60))).toBe(false) // brown
  })
})

describe('click-to-select', () => {
  it('grows over the whole yarn, shadow included, and stops at the neighbouring yarn', () => {
    const lab = toLabArray(twoYarns(), W, H)
    const region = growRegion(lab, W, H, 5 * W + 3, undefined, 0.5)
    let left = 0
    let right = 0
    for (let p = 0; p < W * H; p++) if (region[p]) (p % W < 15 ? left++ : right++)
    expect(left).toBe(15 * H)
    expect(right).toBe(0)
  })

  it('stays inside the product and inside a limit circle', () => {
    const lab = toLabArray(twoYarns(), W, H)
    const product = new Uint8Array(W * H).fill(1)
    for (let p = 0; p < W * H; p++) if (Math.floor(p / W) < 5) product[p] = 0
    const region = growRegion(lab, W, H, 10 * W + 3, product, 0.5, { within: { x: 3, y: 10, r: 3 }, raw: true })
    for (let p = 0; p < W * H; p++) {
      if (!region[p]) continue
      expect(product[p]).toBe(1)
      expect((p % W - 3) ** 2 + (Math.floor(p / W) - 10) ** 2).toBeLessThanOrEqual(9)
    }
  })
})

describe('hole filling', () => {
  it('fills small holes but leaves a large enclosed area (a different part) alone', () => {
    const ring = new Uint8Array(W * H).fill(1)
    ring[3 * W + 3] = 0 // small hole
    for (let y = 8; y < 16; y++) for (let x = 12; x < 24; x++) ring[y * W + x] = 0 // big enclosed area
    const out = fillSmallHoles(ring, W, H, 10)
    expect(out[3 * W + 3]).toBe(1)
    expect(out[10 * W + 15]).toBe(0)
  })
})

describe('recolouring', () => {
  it('changes only masked pixels and keeps the shading order (shadow stays darker)', () => {
    const base = twoYarns()
    const out = new Uint8ClampedArray(base)
    const mask = new Uint8Array(W * H)
    for (let p = 0; p < W * H; p++) if (p % W < 15) mask[p] = 255
    recolorPixels(base, out, mask, maskStats(base, mask), '#2F6FD6')
    const at = (x: number) => rgbToLab(out[x * 4], out[x * 4 + 1], out[x * 4 + 2])
    const lit = at(3)
    const shadow = at(7)
    expect(lit[2]).toBeLessThan(-20) // now blue
    expect(shadow[0]).toBeLessThan(lit[0]) // shadow still darker
    expect([...out.slice(20 * 4, 20 * 4 + 4)]).toEqual([...base.slice(20 * 4, 20 * 4 + 4)]) // brown untouched
    expect(out[3 * 4 + 3]).toBe(255) // alpha untouched
  })
})
