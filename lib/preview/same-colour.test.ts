import { describe, expect, it } from 'vitest'
import { closestByColour, clusterByColour, meanLab, sameYarn, yarnDistance } from './same-colour'
import { makeRegion, mergeRegions, mergeTarget, sameColourSets, type EditorState } from './region-ops'
import type { Lab } from './yarn-colors'

// Average colours measured on a real sunflower photo's AI parts (see the editor's suggestions)
const petal: Lab = [71, 17, 68]
const petalLit: Lab = [74, 16, 69]
const centre: Lab = [22, 17, 11]
const centreShade: Lab = [16, 19, 12]
const ring: Lab = [20, 33, 17]
const leaf: Lab = [41, -38, 29]
const leafLit: Lab = [45, -43, 30]
const olive: Lab = [33, -19, 29]
const pale: Lab = [72, 4, 49]

describe('same yarn', () => {
  it('treats a yarn in light and shade as one colour, and different yarns as different', () => {
    expect(sameYarn(petal, petalLit)).toBe(true)
    expect(sameYarn(centre, centreShade)).toBe(true)
    expect(sameYarn(leaf, leafLit)).toBe(true)
    expect(sameYarn(petal, pale)).toBe(false)
    expect(sameYarn(centre, ring)).toBe(false)
    expect(sameYarn(leaf, olive)).toBe(false)
    expect(sameYarn(null, petal)).toBe(false)
  })

  it('weighs lightness half as much as hue', () => {
    expect(yarnDistance([50, 0, 0], [70, 0, 0])).toBe(10)
    expect(yarnDistance([50, 0, 0], [50, 10, 0])).toBe(10)
  })

  it('averages a mask', () => {
    const lab = new Float32Array([10, 0, 0, 30, 4, -2, 99, 99, 99])
    expect(meanLab(lab, new Uint8Array([1, 1, 0]))).toEqual([20, 2, -1])
    expect(meanLab(lab, new Uint8Array(3))).toBeNull()
  })

  it('clusters around seeds (no chaining) and keeps colourless items apart', () => {
    const items = [
      { id: 'petal', lab: petal, size: 19 },
      { id: 'centre', lab: centre, size: 13 },
      { id: 'centreShade', lab: centreShade, size: 12 },
      { id: 'leaf', lab: leaf, size: 7 },
      { id: 'petalLit', lab: petalLit, size: 3 },
      { id: 'ring', lab: ring, size: 4 },
      { id: 'empty', lab: null, size: 0 },
    ]
    const ids = clusterByColour(items, (t) => t.lab, (t) => t.size).map((c) => c.map((t) => t.id))
    expect(ids).toEqual([['petal', 'petalLit'], ['centre', 'centreShade'], ['leaf'], ['ring'], ['empty']])
    // a chain of small steps doesn't pull the ends together
    const chain = [0, 8, 16, 24].map((b, i) => ({ id: i, lab: [50, 0, b] as Lab, size: 10 - i }))
    expect(clusterByColour(chain, (t) => t.lab, (t) => t.size).map((c) => c.map((t) => t.id))).toEqual([[0, 1], [2, 3]])
  })

  it('finds the closest match within the limit', () => {
    const regions = [{ n: 'Petals', lab: petal }, { n: 'Centre', lab: centre }]
    expect(closestByColour(petalLit, regions, (r) => r.lab)?.n).toBe('Petals')
    expect(closestByColour(leaf, regions, (r) => r.lab)).toBeUndefined()
  })
})

describe('merging same-colour regions', () => {
  const W = 10
  const at = (...px: number[]) => {
    const m = new Uint8Array(W)
    for (const p of px) m[p] = 1
    return m
  }

  it('offers regions of one yarn, keeping the named/biggest one', () => {
    const petals = makeRegion('Petals', at(0, 1, 2))
    const r1 = makeRegion('Region 1', at(3, 4, 5, 6))
    const r2 = makeRegion('Region 2', at(7))
    const soil = makeRegion('Region 3', at(8))
    const s: EditorState = { regions: [petals, r1, r2, soil], groups: [] }
    const lab = new Map([[petals.id, petal], [r1.id, petalLit], [r2.id, petal], [soil.id, centre]])
    const sizes = new Map(s.regions.map((r) => [r.id, r.mask.reduce((a, v) => a + v, 0)]))
    const sets = sameColourSets(s, (r) => lab.get(r.id) ?? null, sizes)
    expect(sets.map((set) => set.map((r) => r.name).sort())).toEqual([['Petals', 'Region 1', 'Region 2']])
    expect(mergeTarget(sets[0], sizes)?.name).toBe('Petals') // named beats bigger
    expect(mergeTarget([r1, r2], sizes)?.name).toBe('Region 1') // else the biggest

    const merged = mergeRegions(s, sets[0].map((r) => r.id), petals.id)
    expect(merged.regions.map((r) => r.name)).toEqual(['Petals', 'Region 3'])
    expect(Array.from(merged.regions[0].mask.slice(0, 8))).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
  })

  it('skips locked, fixed-vs-changeable and already-grouped regions', () => {
    const a = makeRegion('A', at(0))
    const b = makeRegion('B', at(1), '#000', { locked: true })
    const c = makeRegion('C', at(2), '#000', { changeable: false })
    const g1 = makeRegion('G1', at(3), '#000', { groupId: 'g' })
    const g2 = makeRegion('G2', at(4), '#000', { groupId: 'g' })
    const s: EditorState = { regions: [a, b, c, g1, g2], groups: [{ id: 'g', name: 'G', sharedColor: true, colorIds: null }] }
    const sizes = new Map(s.regions.map((r) => [r.id, 1]))
    expect(sameColourSets({ ...s, regions: [a, b, c] }, () => petal, sizes)).toEqual([])
    expect(sameColourSets({ ...s, regions: [g1, g2] }, () => petal, sizes)).toEqual([])
    // merging never swallows a locked region, and empty groups are dropped
    const m = mergeRegions({ ...s, regions: [a, b, g1] }, [a.id, b.id, g1.id], a.id)
    expect(m.regions.map((r) => r.name)).toEqual(['A', 'B'])
    expect(m.groups).toEqual([])
  })
})
