/**
 * Colour maths for the photo colour preview — pure functions, no DOM, so they run the same
 * in the admin (detecting a piece's yarn colours), the storefront (repainting them) and tests.
 *
 * A product is made of a handful of yarn colours. `detectYarnColors` finds them in a photo;
 * each one the admin ticks becomes a customer choice, and `buildMask` marks every pixel of
 * that yarn so `recolorPixels` can repaint it in the colour the customer picks.
 */

export type Lab = [number, number, number]
export type Rgb = [number, number, number]

// ---- sRGB <-> CIE Lab (D65) ----

const toLinear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(c * 255)))
}
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
const fInv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27))
const XN = 0.95047
const ZN = 1.08883

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = toLinear(r), G = toLinear(g), B = toLinear(b)
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / ZN
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function labToRgb(L: number, a: number, b: number): Rgb {
  const fy = (L + 16) / 116
  const x = fInv(fy + a / 500) * XN
  const y = fInv(fy)
  const z = fInv(fy - b / 200) * ZN
  return [
    fromLinear(3.2404542 * x - 1.5371385 * y - 0.4985314 * z),
    fromLinear(-0.969266 * x + 1.8760108 * y + 0.041556 * z),
    fromLinear(0.0556434 * x - 0.2040259 * y + 1.0572252 * z),
  ]
}

export function hexToRgb(hex: string): Rgb | null {
  let c = hex.trim().replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (!/^[0-9a-f]{6}$/i.test(c)) return null
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}

export const rgbToHex = ([r, g, b]: Rgb) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

export const deltaE = (p: Lab, q: Lab) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])

/**
 * Distance used to decide which yarn a pixel belongs to. Lightness counts for less than
 * hue/chroma, so a rose's shadowed folds stay with the rose instead of forming their own
 * "dark red" colour — the same yarn in shade is still the same yarn.
 */
const LIGHTNESS_WEIGHT = 0.4
const yarnDistance2 = (L: number, a: number, b: number, c: Lab) => {
  const dL = (L - c[0]) * LIGHTNESS_WEIGHT
  return dL * dL + (a - c[1]) ** 2 + (b - c[2]) ** 2
}

// ---- detection ----

export interface YarnColor {
  /** Index into the detection's clusters; stable for a given detection. */
  index: number
  lab: Lab
  hex: string
  /** Fraction of the photo (0–1). */
  share: number
  /** Fraction of the photo's outer frame (edges) this colour covers. Backdrops — walls,
   * windows, tables — crowd the frame; the piece itself sits inside it. */
  edge: number
}

export interface Detection {
  width: number
  height: number
  colors: YarnColor[]
  /** Per full-size pixel: which `colors[].index` it belongs to. */
  assignment: Uint8Array
}

/** Deterministic PRNG so the same photo always detects the same colours. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Finds the main colours of a photo (RGBA pixels). k-means++ in Lab on a sample, then
 * near-identical colours are merged and specks (< minShare) dropped.
 */
export function detectYarnColors(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  opts: {
    k?: number
    mergeDeltaE?: number
    minShare?: number
    sampleSize?: number
    /** 1 = product pixel (background already removed). Colours are then found on the product only. */
    product?: Uint8Array
  } = {}
): Detection {
  const { k = opts.product ? 12 : 9, mergeDeltaE = opts.product ? 9 : 14, minShare = opts.product ? 0.008 : 0.01, sampleSize = 24000 } = opts
  const n = width * height
  const lab = new Float32Array(n * 3)
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const [L, a, b] = rgbToLab(rgba[i], rgba[i + 1], rgba[i + 2])
    lab[p * 3] = L
    lab[p * 3 + 1] = a
    lab[p * 3 + 2] = b
  }

  // sample — only the product's own pixels when we know them (background removed)
  const product = opts.product
  const productCount = product ? product.reduce((s, v) => s + (v ? 1 : 0), 0) : n
  const step = Math.max(1, Math.floor(productCount / sampleSize))
  const sample: number[] = []
  for (let p = 0, seen = 0; p < n; p++) {
    if (product && !product[p]) continue
    if (seen++ % step === 0) sample.push(p)
  }
  if (sample.length === 0) for (let p = 0; p < n; p += Math.max(1, Math.floor(n / sampleSize))) sample.push(p)
  const rand = mulberry32(12345)

  // k-means++ init
  const centers: Lab[] = []
  const first = sample[Math.floor(rand() * sample.length)]
  centers.push([lab[first * 3], lab[first * 3 + 1], lab[first * 3 + 2]])
  const d2 = new Float64Array(sample.length).fill(Infinity)
  while (centers.length < k) {
    const c = centers[centers.length - 1]
    let total = 0
    for (let s = 0; s < sample.length; s++) {
      const p = sample[s]
      const d = yarnDistance2(lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2], c)
      if (d < d2[s]) d2[s] = d
      total += d2[s]
    }
    let r = rand() * total
    let pick = sample[sample.length - 1]
    for (let s = 0; s < sample.length; s++) {
      r -= d2[s]
      if (r <= 0) {
        pick = sample[s]
        break
      }
    }
    centers.push([lab[pick * 3], lab[pick * 3 + 1], lab[pick * 3 + 2]])
  }

  // Lloyd iterations on the sample
  const nearest = (L: number, a: number, b: number, cs: Lab[]) => {
    let best = 0
    let bestD = Infinity
    for (let c = 0; c < cs.length; c++) {
      const d = yarnDistance2(L, a, b, cs[c])
      if (d < bestD) {
        bestD = d
        best = c
      }
    }
    return best
  }
  for (let iter = 0; iter < 14; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0])
    for (const p of sample) {
      const c = nearest(lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2], centers)
      sum[c][0] += lab[p * 3]
      sum[c][1] += lab[p * 3 + 1]
      sum[c][2] += lab[p * 3 + 2]
      sum[c][3]++
    }
    for (let c = 0; c < centers.length; c++) if (sum[c][3]) centers[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]]
  }

  // merge near-identical centres (weighted by how many sample pixels each holds)
  const counts = new Array(centers.length).fill(0)
  for (const p of sample) counts[nearest(lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2], centers)]++
  let groups = centers.map((c, i) => ({ lab: c, count: counts[i] })).filter((g) => g.count > 0)
  let merged = true
  while (merged) {
    merged = false
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const gi = groups[i], gj = groups[j]
        if (Math.sqrt(yarnDistance2(gi.lab[0], gi.lab[1], gi.lab[2], gj.lab)) < mergeDeltaE) {
          const t = gi.count + gj.count
          gi.lab = [0, 1, 2].map((x) => (gi.lab[x] * gi.count + gj.lab[x] * gj.count) / t) as Lab
          gi.count = t
          groups.splice(j, 1)
          merged = true
          break outer
        }
      }
    }
  }
  groups = groups.filter((g) => g.count / sample.length >= minShare).sort((a, b) => b.count - a.count)
  const finalCenters = groups.map((g) => g.lab)

  // assign every full-size pixel
  const assignment = new Uint8Array(n)
  const tally = new Array(finalCenters.length).fill(0)
  const edgeTally = new Array(finalCenters.length).fill(0)
  const fx = Math.max(1, Math.round(width * 0.06))
  const fy = Math.max(1, Math.round(height * 0.06))
  let frame = 0
  for (let p = 0; p < n; p++) {
    const c = nearest(lab[p * 3], lab[p * 3 + 1], lab[p * 3 + 2], finalCenters)
    assignment[p] = c
    if (!product || product[p]) tally[c]++
    const x = p % width
    const y = (p - x) / width
    if (x < fx || x >= width - fx || y < fy || y >= height - fy) {
      edgeTally[c]++
      frame++
    }
  }

  return {
    width,
    height,
    assignment,
    colors: finalCenters.map((c, index) => ({
      index,
      lab: c,
      hex: rgbToHex(labToRgb(c[0], c[1], c[2])),
      share: tally[index] / Math.max(1, productCount),
      edge: frame ? edgeTally[index] / frame : 0,
    })),
  }
}

/**
 * Suggests which detected colours are the same yarn (one in light, one in shade): same hue
 * family and clearly coloured. Neutrals (white/grey/black) are never grouped, and anything
 * dull and dark is treated as background. Only a starting point — the admin confirms.
 * Returns, per detected colour, a yarn number (1, 2, …) or 0 for background.
 */
export function suggestYarns(colors: YarnColor[], opts: { backgroundRemoved?: boolean } = {}): number[] {
  const hue = (c: YarnColor) => (Math.atan2(c.lab[2], c.lab[1]) * 180) / Math.PI
  const chroma = (c: YarnColor) => Math.hypot(c.lab[1], c.lab[2])
  const yarnOf: number[] = new Array(colors.length).fill(0)
  const reps: YarnColor[] = []
  const members: YarnColor[][] = []
  // brightest first, so each yarn is represented by its lit colour
  const order = [...colors].sort((a, b) => b.lab[0] - a.lab[0])
  // the colour filling most of the photo's edges is the backdrop (wall, cloth, table)
  const mainEdge = colors.reduce<YarnColor | undefined>((m, c) => (!m || c.edge > m.edge ? c : m), undefined)
  const PALE = 20 // below this chroma a colour reads as white/grey/black (incl. white in shade)
  for (const c of order) {
    const dullAndDark = chroma(c) < 25 && c.lab[0] < 30
    // much more common along the photo's edges than overall → the backdrop, not the piece
    const backdrop = (c.edge > 0.1 && c.edge > c.share * 1.5) || (c === mainEdge && c.edge > 0.25)
    // once the background is removed, every colour left belongs to the piece
    if (!opts.backgroundRemoved && (dullAndDark || backdrop)) continue
    const pale = chroma(c) < PALE
    // Closest existing yarn. Only two cases are safely "the same yarn in shade": a light
    // neutral next to a lighter one (white / white-in-shade), and a vivid colour next to one
    // of the same hue (a red rose's folds). Muted darks — browns, taupes — stay separate so a
    // chocolate centre and a taupe pot remain two choices.
    const vivid = (x: YarnColor) => chroma(x) >= 30
    let match = -1
    let bestDh = 18
    // compare with every shade already in a yarn, not just its brightest one
    members.forEach((group, i) => {
      for (const r of group) {
        if (pale || chroma(r) < PALE) {
          if (pale && chroma(r) < PALE && c.lab[0] > 50 && r.lab[0] - c.lab[0] < 30 && match < 0) match = i
          continue
        }
        if (!vivid(c) || !vivid(r)) continue
        const dh = Math.abs(((hue(c) - hue(r) + 540) % 360) - 180)
        if (dh < bestDh) {
          bestDh = dh
          match = i
        }
      }
    })
    if (match >= 0) {
      yarnOf[c.index] = match + 1
      members[match].push(c)
    } else {
      reps.push(c)
      members.push([c])
      yarnOf[c.index] = reps.length
    }
  }
  return yarnOf
}

/**
 * The mask (0–255 per pixel) for one yarn — the union of the detected colours it's made of.
 * `product` (same size, 1 = part of the product) keeps the background out.
 */
export function buildMask(det: Detection, colorIndexes: number[], product?: Uint8Array): Uint8ClampedArray {
  const members = new Set(colorIndexes)
  const hard = new Uint8Array(det.width * det.height)
  for (let p = 0; p < hard.length; p++) hard[p] = members.has(det.assignment[p]) && (!product || product[p]) ? 1 : 0
  return softenMask(hard, det.width, det.height)
}

/**
 * A part (1 = pixel of the part) ready for recolouring: stray specks removed and edges
 * feathered with a 3×3 blur, so repainted yarn blends into its neighbours instead of
 * looking cut out. Returns 0–255.
 */
export function softenMask(part: Uint8Array, w: number, h: number): Uint8ClampedArray {
  const hard = new Uint8Array(w * h)
  for (let p = 0; p < hard.length; p++) hard[p] = part[p] ? 255 : 0
  removeSpecks(hard, w, h, Math.max(24, Math.round(w * h * 0.0008)))
  const out = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0
      let c = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          s += hard[yy * w + xx]
          c++
        }
      }
      out[y * w + x] = s / c
    }
  }
  return out
}

// ---- parts: whole areas of one yarn, shading included ----

const neighbours4 = (p: number, w: number, n: number) => {
  const x = p % w
  return [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < n - w ? p + w : -1]
}

/** L*a*b* for every pixel (3 floats each) — computed once, shared by the tools below. */
export function toLabArray(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Float32Array {
  const lab = new Float32Array(w * h * 3)
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const [L, a, b] = rgbToLab(rgba[i], rgba[i + 1], rgba[i + 2])
    lab[p * 3] = L
    lab[p * 3 + 1] = a
    lab[p * 3 + 2] = b
  }
  return lab
}

export interface Part {
  id: number
  /** The part's typical colour in the photo. */
  hex: string
  /** 1 = pixel belongs to this part. */
  mask: Uint8Array
}

/**
 * Turns detected colours into whole parts. A real yarn forms solid areas; shadows and
 * highlights show up as colours scattered in specks across several parts. Those scattered
 * colours are folded into the solid part around them (spreading outward from solid areas),
 * so a petal in shadow stays a petal instead of becoming a "grey" part of its own. Colours
 * `groupOf` puts together (e.g. a red and its deep shade) become one part; 0 = not the piece.
 */
export function partsFromDetection(det: Detection, product: Uint8Array | undefined, groupOf: number[]): Part[] {
  const { width: w, height: h, assignment } = det
  const n = w * h
  const inProduct = (p: number) => !product || product[p] === 1
  const k = det.colors.length

  // How scattered is each colour: the share of its pixels touching a different colour.
  // Shading and highlights are sprinkled between other colours; real yarn forms areas.
  const count = new Float64Array(k)
  const edge = new Float64Array(k)
  for (let p = 0; p < n; p++) {
    if (!inProduct(p)) continue
    const c = assignment[p]
    count[c]++
    if (neighbours4(p, w, n).some((q) => q >= 0 && inProduct(q) && assignment[q] !== c)) edge[c]++
  }
  const total = count.reduce((s, v) => s + v, 0) || 1
  const scattered = (c: number) => count[c] > 0 && edge[c] / count[c] > 0.5 && count[c] / total < 0.3
  const wanted = det.colors.map((c) => c.index).filter((c) => groupOf[c] > 0)
  const solidFirst = wanted.filter((c) => !scattered(c))
  const solid = new Set(solidFirst.length ? solidFirst : wanted)

  // label solid pixels with their group, then spread labels through the rest of the product
  const label = new Int16Array(n).fill(-1)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  for (let p = 0; p < n; p++) {
    if (inProduct(p) && solid.has(assignment[p])) {
      label[p] = groupOf[assignment[p]]
      queue[tail++] = p
    }
  }
  while (head < tail) {
    const p = queue[head++]
    for (const q of neighbours4(p, w, n)) {
      if (q < 0 || label[q] !== -1 || !inProduct(q)) continue
      // never spread into a solid colour marked "not part of the piece"
      if (groupOf[assignment[q]] === 0 && !scattered(assignment[q])) continue
      label[q] = label[p]
      queue[tail++] = q
    }
  }

  // One colour can sit in separate places (a dark centre up top, a dark pot shadow below).
  // Split each group into its separate areas; an area then joins the neighbouring part if
  // it's just a darker shade of that part's colour (shadow), otherwise it's a part of its own.
  const labLit = (g: number) => det.colors.filter((c) => groupOf[c.index] === g && solid.has(c.index)).sort((a, b) => b.share - a.share)[0]
  const minArea = Math.max(40, total * 0.03)
  const area = new Int32Array(n).fill(-1)
  const areas: { group: number; pixels: number[] }[] = []
  for (let start = 0; start < n; start++) {
    if (label[start] < 0 || area[start] !== -1) continue
    const id = areas.length
    const pixels: number[] = []
    area[start] = id
    const stack = [start]
    while (stack.length) {
      const p = stack.pop()!
      pixels.push(p)
      for (const q of neighbours4(p, w, n)) {
        if (q >= 0 && area[q] === -1 && label[q] === label[start]) {
          area[q] = id
          stack.push(q)
        }
      }
    }
    areas.push({ group: label[start], pixels })
  }
  const hueOf = (c: YarnColor) => (Math.atan2(c.lab[2], c.lab[1]) * 180) / Math.PI
  const biggestOf = new Map<number, number>()
  areas.forEach((a, i) => {
    const b = biggestOf.get(a.group)
    if (b === undefined || areas[b].pixels.length < a.pixels.length) biggestOf.set(a.group, i)
  })
  // shadow of a neighbour: the group this area should join, or -1
  const shadowOf = areas.map((a, i) => {
    if (a.pixels.length < minArea) return -1
    const border = new Map<number, number>()
    for (const p of a.pixels) {
      for (const q of neighbours4(p, w, n)) {
        if (q < 0 || label[q] < 0 || area[q] === i || label[q] === a.group) continue
        border.set(label[q], (border.get(label[q]) ?? 0) + 1)
      }
    }
    const [nbGroup] = [...border.entries()].sort((x, y) => y[1] - x[1])[0] ?? [-1]
    if (nbGroup < 0) return -1
    const me = labLit(a.group)
    const them = labLit(nbGroup)
    const sameHue = Math.abs(((hueOf(me) - hueOf(them) + 540) % 360) - 180) < 25
    return sameHue && me.lab[0] < them.lab[0] ? nbGroup : -1
  })
  // each area's own identity: its colour group for the biggest area, a new part otherwise
  // (small bits stay with their colour)
  let nextId = Math.max(0, ...groupOf) + 1
  const own = areas.map((a, i) => (biggestOf.get(a.group) === i || a.pixels.length < minArea ? a.group : nextId++))
  const colourOfPart = new Map<number, number>()
  areas.forEach((a, i) => colourOfPart.set(own[i], a.group))
  // follow shadow links (group → the part its biggest area ends up in), guarding against loops
  const resolveGroup = (g: number, seen = new Set<number>()): number => {
    const i = biggestOf.get(g)!
    if (shadowOf[i] < 0 || seen.has(g)) return own[i]
    seen.add(g)
    return resolveGroup(shadowOf[i], seen)
  }
  const partOfArea = areas.map((_, i) => (shadowOf[i] >= 0 ? resolveGroup(shadowOf[i]) : own[i] === areas[i].group ? resolveGroup(areas[i].group) : own[i]))

  const partIds = [...new Set(partOfArea)]
  return partIds.map((id) => {
    const mask = new Uint8Array(n)
    const colourGroup = colourOfPart.get(id) ?? id
    areas.forEach((a, i) => {
      if (partOfArea[i] === id) for (const p of a.pixels) mask[p] = 1
    })
    return { id, hex: labLit(colourGroup).hex, mask }
  })
}

/**
 * Selects the part the admin clicked: grows outward from the clicked pixel through pixels
 * of the same yarn — judged mostly by hue/chroma so shadows and highlights on the yarn are
 * included — then closes the small gaps between stitches. `looseness` 0–1 widens it.
 */
export function growRegion(
  lab: Float32Array,
  w: number,
  h: number,
  seed: number,
  product: Uint8Array | undefined,
  looseness = 0.5,
  opts: {
    /** Colour to match (default: the colour around the seed). */
    ref?: Lab
    /** Only grow within this circle — used by Quick Select while dragging. */
    within?: { x: number; y: number; r: number }
    /** Skip the stitch-gap/hole clean-up (do it once at the end of a drag instead). */
    raw?: boolean
    /** Pixels to treat as already selected (not revisited). */
    skip?: Uint8Array
  } = {}
): Uint8Array {
  const n = w * h
  const region = new Uint8Array(n)
  if (product && !product[seed]) return region
  const ref = opts.ref ?? referenceAround(lab, w, h, seed, product)
  const matches = yarnMatcher(ref, looseness)
  const within = opts.within
  const inside = (q: number) => {
    if (!within) return true
    const x = q % w
    const y = (q - x) / w
    return (x - within.x) ** 2 + (y - within.y) ** 2 <= within.r * within.r
  }
  // a sharp jump between neighbouring pixels is the edge between two yarns
  const stepTol = 12 + 12 * looseness
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  region[seed] = 1
  queue[tail++] = seed
  while (head < tail) {
    const p = queue[head++]
    for (const q of neighbours4(p, w, n)) {
      if (q < 0 || region[q] || (product && !product[q]) || (opts.skip && opts.skip[q]) || !inside(q)) continue
      if (!matches(lab[q * 3], lab[q * 3 + 1], lab[q * 3 + 2])) continue
      const step = Math.hypot((lab[q * 3] - lab[p * 3]) * 0.5, lab[q * 3 + 1] - lab[p * 3 + 1], lab[q * 3 + 2] - lab[p * 3 + 2])
      if (step > stepTol) continue
      region[q] = 1
      queue[tail++] = q
    }
  }
  return opts.raw ? region : tidyPart(region, w, h, product)
}

/** Closes the gaps between stitches and fills small holes (deep shadows) in a part. */
export function tidyPart(part: Uint8Array, w: number, h: number, product?: Uint8Array): Uint8Array {
  const closed = closeMask(part, w, h, 2, product)
  const productArea = product ? product.reduce((t, v) => t + v, 0) : w * h
  return fillSmallHoles(closed, w, h, Math.max(30, productArea * 0.004), product)
}

/**
 * Fills holes inside a part that are small (deep stitch shadows, specks) — anything not
 * reachable from outside the part and under `maxSize` px. Big enclosed areas (a flower's
 * centre inside its petals) are left alone: they're a different part.
 */
export function fillSmallHoles(mask: Uint8Array, w: number, h: number, maxSize: number, product?: Uint8Array): Uint8Array {
  const n = w * h
  const out = mask.slice()
  const seen = new Uint8Array(n)
  const stack: number[] = []
  const hole: number[] = []
  for (let start = 0; start < n; start++) {
    if (out[start] || seen[start]) continue
    hole.length = 0
    let touchesEdge = false
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const p = stack.pop()!
      hole.push(p)
      const x = p % w
      if (x === 0 || x === w - 1 || p < w || p >= n - w) touchesEdge = true
      for (const q of neighbours4(p, w, n)) {
        if (q >= 0 && !seen[q] && !out[q]) {
          seen[q] = 1
          stack.push(q)
        }
      }
    }
    if (!touchesEdge && hole.length <= maxSize) for (const q of hole) if (!product || product[q]) out[q] = 1
  }
  return out
}

/** Average colour in a small disc around a pixel — steadier than one (possibly noisy) pixel. */
export function referenceAround(lab: Float32Array, w: number, h: number, at: number, product?: Uint8Array, r = 4): Lab {
  const cx = at % w
  const cy = (at - cx) / w
  let L = 0, a = 0, b = 0, c = 0
  for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
      const p = y * w + x
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r || (product && !product[p])) continue
      L += lab[p * 3]
      a += lab[p * 3 + 1]
      b += lab[p * 3 + 2]
      c++
    }
  }
  return c ? [L / c, a / c, b / c] : [lab[at * 3], lab[at * 3 + 1], lab[at * 3 + 2]]
}

/**
 * "Is this pixel the same yarn as `ref`?" A shadow darkens yarn but keeps its hue and its
 * saturation relative to brightness (chroma ÷ lightness) roughly the same — while a
 * different yarn of a similar hue (red soil vs a brown pot) has a clearly different ratio.
 * Neutrals (white/grey/black) are compared by lightness and colour directly.
 */
export function yarnMatcher(ref: Lab, looseness = 0.5) {
  const [rL, ra, rb] = ref
  const rC = Math.hypot(ra, rb)
  const rH = Math.atan2(rb, ra)
  const rS = rC / Math.max(8, rL)
  const neutral = rC < 12
  const hueTol = ((10 + 16 * looseness) * Math.PI) / 180
  const satTol = 0.22 + 0.33 * looseness
  const neutralTol = 10 + 14 * looseness
  return (L: number, a: number, b: number) => {
    const C = Math.hypot(a, b)
    if (neutral) return C < 12 + 8 * looseness && Math.hypot((L - rL) * 0.6, a - ra, b - rb) < neutralTol
    if (C < 6) return false
    let dh = Math.abs(Math.atan2(b, a) - rH)
    if (dh > Math.PI) dh = 2 * Math.PI - dh
    const s = C / Math.max(8, L)
    return dh < hueTol && Math.abs(Math.log(s / rS)) < satTol && L > rL * 0.3 && L < rL + 40
  }
}

/** Morphological close (dilate then erode by r px): fills the dark gaps between stitches. */
function closeMask(mask: Uint8Array, w: number, h: number, r: number, product?: Uint8Array): Uint8Array {
  const pass = (src: Uint8Array, grow: boolean) => {
    const out = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // dilate: on if any neighbour is on; erode: on only if every neighbour is on
        let v = grow ? 0 : 1
        search: for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy
          if (yy < 0 || yy >= h) continue
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx
            if (xx < 0 || xx >= w) continue
            const on = src[yy * w + xx] === 1
            if (grow && on) {
              v = 1
              break search
            }
            if (!grow && !on) {
              v = 0
              break search
            }
          }
        }
        out[y * w + x] = v
      }
    }
    return out
  }
  const closed = pass(pass(mask, true), false)
  if (product) for (let p = 0; p < closed.length; p++) closed[p] &= product[p]
  return closed
}

/** Clears connected blobs smaller than `minArea` px — stray pixels in the background that
 * merely share a yarn's colour would otherwise get repainted as specks. */
function removeSpecks(mask: Uint8Array, w: number, h: number, minArea: number) {
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  const blob: number[] = []
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue
    blob.length = 0
    stack.push(start)
    seen[start] = 1
    while (stack.length) {
      const p = stack.pop()!
      blob.push(p)
      const x = p % w
      if (x > 0 && mask[p - 1] && !seen[p - 1]) (seen[p - 1] = 1), stack.push(p - 1)
      if (x < w - 1 && mask[p + 1] && !seen[p + 1]) (seen[p + 1] = 1), stack.push(p + 1)
      if (p >= w && mask[p - w] && !seen[p - w]) (seen[p - w] = 1), stack.push(p - w)
      if (p < mask.length - w && mask[p + w] && !seen[p + w]) (seen[p + w] = 1), stack.push(p + w)
    }
    if (blob.length < minArea) for (const q of blob) mask[q] = 0
  }
}

/** The library colour closest to a detected yarn colour — used to name it ("Colour 1 – Red"). */
export function nearestColor<T extends { hex: string }>(lab: Lab, colors: T[]): T | undefined {
  let best: T | undefined
  let bestD = Infinity
  for (const c of colors) {
    const rgb = hexToRgb(c.hex)
    if (!rgb) continue
    const d = deltaE(lab, rgbToLab(...rgb))
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

// ---- recolouring ----

/** The span of pixel indexes a mask occupies (first to last non-zero row), for recolorPixels. */
export function maskRange(mask: Uint8Array | Uint8ClampedArray, width: number): { from: number; to: number } {
  let first = -1
  let last = -1
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    if (first < 0) first = p
    last = p
  }
  if (first < 0) return { from: 0, to: 0 }
  return { from: first - (first % width), to: Math.min(mask.length, last - (last % width) + width) }
}

export interface MaskStats {
  /** Median lightness (L*) of the masked yarn — maps to exactly the chosen colour. */
  refL: number
}

export function maskStats(rgba: Uint8ClampedArray | Uint8Array, mask: Uint8Array | Uint8ClampedArray): MaskStats {
  const hist = new Uint32Array(101)
  let count = 0
  for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
    if (mask[p] < 128) continue
    const L = rgbToLab(rgba[i], rgba[i + 1], rgba[i + 2])[0]
    hist[Math.max(0, Math.min(100, Math.round(L)))]++
    count++
  }
  if (!count) return { refL: 50 }
  let acc = 0
  for (let L = 0; L <= 100; L++) {
    acc += hist[L]
    if (acc >= count / 2) return { refL: Math.max(4, L) }
  }
  return { refL: 50 }
}

/**
 * Repaints the masked pixels of `out` (RGBA, modified in place) in `targetHex`, keeping each
 * pixel's shading: the yarn's typical lightness becomes the target colour exactly, shadows
 * get proportionally darker and highlights lighter. Hue/chroma come from the target (and ease
 * off in deep shadow / bright highlight, like real yarn), so red → yellow gives golden
 * shadows rather than olive ones.
 */
export function recolorPixels(
  base: Uint8ClampedArray | Uint8Array,
  out: Uint8ClampedArray,
  mask: Uint8Array | Uint8ClampedArray,
  stats: MaskStats,
  targetHex: string,
  /** Only look at pixels in [from, to) — the region's rows — instead of the whole photo. */
  range: { from: number; to: number } = { from: 0, to: mask.length }
): void {
  const rgb = hexToRgb(targetHex)
  if (!rgb) return
  const [tL, ta, tb] = rgbToLab(...rgb)
  const refL = stats.refL
  for (let p = range.from, i = range.from * 4; p < range.to; p++, i += 4) {
    const m = mask[p]
    if (!m) continue
    const L = rgbToLab(base[i], base[i + 1], base[i + 2])[0]
    let nL: number
    let chroma: number
    if (L <= refL) {
      const k = L / refL
      nL = tL * k
      chroma = 0.55 + 0.45 * k // deep shadows lose some colour
    } else {
      const k = Math.min(1, (L - refL) / Math.max(1, 100 - refL))
      nL = tL + (100 - tL) * k
      chroma = 1 - 0.7 * k // highlights wash toward white
    }
    const [r, g, b] = labToRgb(nL, ta * chroma, tb * chroma)
    const t = m / 255
    out[i] = base[i] * (1 - t) + r * t
    out[i + 1] = base[i + 1] * (1 - t) + g * t
    out[i + 2] = base[i + 2] * (1 - t) + b * t
  }
}
