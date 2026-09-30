/**
 * "Is this the same yarn?" — finds parts whose typical photo colour matches, so what the
 * detector split apart (two halves of the petals, a leaf in shade) can be combined in one
 * click. Product-agnostic: it only compares colours, and only ever *proposes* — the admin
 * decides. Lightness counts half, because the same yarn in shade is darker but keeps its hue.
 */

import type { Lab } from './yarn-colors'

/** Colours closer than this (see `yarnDistance`) are treated as the same yarn. */
export const SAME_YARN = 10

/** Average L*a*b* of the pixels in a mask (`lab` holds 3 floats per pixel); null if empty. */
export function meanLab(lab: Float32Array, mask: Uint8Array): Lab | null {
  let L = 0, a = 0, b = 0, n = 0
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    L += lab[p * 3]
    a += lab[p * 3 + 1]
    b += lab[p * 3 + 2]
    n++
  }
  return n ? [L / n, a / n, b / n] : null
}

export const yarnDistance = (p: Lab, q: Lab) => Math.hypot((p[0] - q[0]) * 0.5, p[1] - q[1], p[2] - q[2])

export const sameYarn = (p: Lab | null, q: Lab | null, limit = SAME_YARN) => Boolean(p && q && yarnDistance(p, q) <= limit)

/**
 * Clusters items by colour. Biggest first; each joins the cluster whose seed (its biggest
 * member) is nearest and within `limit`. Comparing with seeds rather than chaining through
 * members means a run of slightly different shades can't pull unrelated colours together.
 * Items with no colour stay on their own. Clusters come out biggest seed first.
 */
export function clusterByColour<T>(items: T[], colour: (t: T) => Lab | null, size: (t: T) => number, limit = SAME_YARN): T[][] {
  const sorted = items.slice().sort((x, y) => size(y) - size(x))
  const clusters: { seed: Lab | null; members: T[] }[] = []
  for (const it of sorted) {
    const c = colour(it)
    let best: (typeof clusters)[number] | undefined
    let bestD = Infinity
    if (c) {
      for (const cl of clusters) {
        if (!cl.seed) continue
        const d = yarnDistance(c, cl.seed)
        if (d <= limit && d < bestD) {
          best = cl
          bestD = d
        }
      }
    }
    if (best) best.members.push(it)
    else clusters.push({ seed: c, members: [it] })
  }
  return clusters.map((cl) => cl.members)
}

/** The candidate nearest in colour within `limit`, if any. */
export function closestByColour<T>(target: Lab | null, candidates: T[], colour: (t: T) => Lab | null, limit = SAME_YARN): T | undefined {
  if (!target) return undefined
  let best: T | undefined
  let bestD = Infinity
  for (const c of candidates) {
    const lab = colour(c)
    if (!lab) continue
    const d = yarnDistance(target, lab)
    if (d <= limit && d < bestD) {
      best = c
      bestD = d
    }
  }
  return best
}
