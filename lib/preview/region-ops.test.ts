import { describe, expect, it } from 'vitest'
import {
  allowedColourIds,
  claimMask,
  claimPixel,
  copySettings,
  deleteRegions,
  duplicateRegion,
  groupRegions,
  makeRegion,
  mergeRegions,
  moveToGroup,
  nextName,
  optionKey,
  pasteSettings,
  releaseMask,
  reorderRegion,
  reviewWarnings,
  splitRegion,
  ungroup,
  type EditorState,
} from './region-ops'
import { fillRect, maskArea } from './regions'

const W = 20
const H = 10
const box = (x0: number, y0: number, x1: number, y1: number) => fillRect({ x: x0, y: y0 }, { x: x1, y: y1 }, W, H)
const empty = () => new Uint8Array(W * H)

describe('pixel ownership', () => {
  it('keeps exclusive regions exclusive', () => {
    const a = makeRegion('A', box(0, 0, 5, 5))
    const b = makeRegion('B', empty())
    claimMask([a, b], b, box(3, 0, 8, 5))
    expect(maskArea(a.mask)).toBe(3 * 5)
    expect(maskArea(b.mask)).toBe(5 * 5)
  })

  it('never takes pixels from a locked region', () => {
    const a = makeRegion('A', box(0, 0, 5, 5), '#000', { locked: true })
    const b = makeRegion('B', empty())
    claimMask([a, b], b, box(0, 0, 10, 5))
    expect(maskArea(a.mask)).toBe(25)
    expect(maskArea(b.mask)).toBe(25) // only the free half
    expect(claimPixel([a, b], a, 99)).toBe(false) // locked regions can't be painted either
  })

  it('lets overlapping regions share pixels', () => {
    const base = makeRegion('Base', box(0, 0, 10, 10))
    const deco = makeRegion('Decoration', empty(), '#000', { allowOverlap: true })
    claimMask([base, deco], deco, box(2, 2, 4, 4))
    expect(maskArea(base.mask)).toBe(100)
    expect(maskArea(deco.mask)).toBe(4)
  })

  it('respects the product (background) when adding', () => {
    const product = box(0, 0, 10, 10)
    const r = makeRegion('R', empty())
    claimMask([r], r, box(5, 0, 15, 10), product)
    expect(maskArea(r.mask)).toBe(50)
  })

  it('erases from one region or from all unlocked regions', () => {
    const a = makeRegion('A', box(0, 0, 10, 10))
    const b = makeRegion('B', box(10, 0, 20, 10), '#000', { locked: true })
    releaseMask([a, b], box(0, 0, 20, 5))
    expect(maskArea(a.mask)).toBe(50)
    expect(maskArea(b.mask)).toBe(100)
  })
})

describe('structure', () => {
  const three = (): EditorState => ({ regions: [makeRegion('A', box(0, 0, 2, 2)), makeRegion('B', box(4, 0, 6, 2)), makeRegion('C', box(8, 0, 10, 2))], groups: [] })

  it('groups, moves and ungroups regions (empty groups disappear)', () => {
    const s = three()
    const { state, groupId } = groupRegions(s, [s.regions[0].id, s.regions[1].id], 'Flowers')
    expect(state.groups).toEqual([expect.objectContaining({ name: 'Flowers', sharedColor: true })])
    expect(state.regions.filter((r) => r.groupId === groupId)).toHaveLength(2)
    const moved = moveToGroup(state, [state.regions[0].id, state.regions[1].id], null)
    expect(moved.groups).toHaveLength(0)
    expect(ungroup(state, groupId).regions.every((r) => r.groupId === null)).toBe(true)
  })

  it('merges regions into the first', () => {
    const s = three()
    const m = mergeRegions(s, [s.regions[0].id, s.regions[2].id])
    expect(m.regions.map((r) => r.name)).toEqual(['A', 'B'])
    expect(maskArea(m.regions[0].mask)).toBe(8)
  })

  it('splits a selection of repeated elements into a group of regions', () => {
    const all = box(0, 0, 3, 3)
    const other = box(6, 0, 9, 3)
    for (let i = 0; i < all.length; i++) all[i] |= other[i]
    const s: EditorState = { regions: [makeRegion('Flower', all)], groups: [] }
    const { state, count } = splitRegion(s, s.regions[0].id, W, H, 3)
    expect(count).toBe(2)
    expect(state.regions.map((r) => r.name)).toEqual(['Flower 1', 'Flower 2'])
    expect(state.groups).toEqual([expect.objectContaining({ name: 'Flower', sharedColor: true })])
    expect(new Set(state.regions.map((r) => r.groupId)).size).toBe(1)
  })

  it('duplicates a region as an overlapping copy ready to move', () => {
    const s = three()
    const { state, newIdValue } = duplicateRegion(s, s.regions[1].id)
    const copy = state.regions.find((r) => r.id === newIdValue)!
    expect(copy.name).toBe('B copy')
    expect(copy.allowOverlap).toBe(true)
    expect(copy.mask).not.toBe(s.regions[1].mask)
    expect(state.regions.map((r) => r.name)).toEqual(['A', 'B', 'B copy', 'C'])
  })

  it('reorders layers and deletes (but not locked regions)', () => {
    const s = three()
    expect(reorderRegion(s, s.regions[2].id, -1).regions.map((r) => r.name)).toEqual(['A', 'C', 'B'])
    const locked = { ...s, regions: s.regions.map((r, i) => (i === 0 ? { ...r, locked: true } : r)) }
    expect(deleteRegions(locked, locked.regions.map((r) => r.id)).regions.map((r) => r.name)).toEqual(['A'])
  })

  it('copies settings from one region to others', () => {
    const s = three()
    const src = { ...s.regions[0], colorIds: ['red', 'blue'], changeable: false }
    const out = pasteSettings(s, [s.regions[1].id, s.regions[2].id], copySettings(src))
    expect(out.regions.slice(1).every((r) => !r.changeable && r.colorIds?.join() === 'red,blue')).toBe(true)
  })

  it('names new regions generically without clashing', () => {
    const s: EditorState = { regions: [makeRegion('Region 1', empty())], groups: [] }
    expect(nextName(s)).toBe('Region 2')
  })
})

describe('colours and options', () => {
  it('shared groups use one option; individual groups one per region; fixed regions none', () => {
    const shared = { id: 'g1', name: 'Flowers', sharedColor: true, colorIds: ['pink'] }
    const indiv = { id: 'g2', name: 'Balls', sharedColor: false, colorIds: ['red', 'blue'] }
    const a = makeRegion('F1', empty(), '#000', { groupId: 'g1', colorIds: ['ignored'] })
    const b = makeRegion('B1', empty(), '#000', { groupId: 'g2' })
    const c = makeRegion('B2', empty(), '#000', { groupId: 'g2', colorIds: ['blue'] })
    const fixed = makeRegion('Strings', empty(), '#000', { changeable: false })
    const groups = [shared, indiv]
    expect(optionKey(a, groups)).toBe('g:g1')
    expect(optionKey(b, groups)).toBe(`r:${b.id}`)
    expect(optionKey(fixed, groups)).toBeNull()
    expect(allowedColourIds(a, groups, ['all'])).toEqual(['pink'])
    expect(allowedColourIds(b, groups, ['all'])).toEqual(['red', 'blue'])
    expect(allowedColourIds(c, groups, ['all'])).toEqual(['blue'])
    expect(allowedColourIds(makeRegion('X', empty()), groups, ['all'])).toEqual(['all'])
  })

  it('warns about empty regions, duplicate names and nothing changeable', () => {
    const r1 = makeRegion('Body', box(0, 0, 2, 2))
    const r2 = makeRegion('Body', empty())
    const w = reviewWarnings({ regions: [r1, r2], groups: [] }, new Map([[r1.id, 4], [r2.id, 0]]))
    expect(w.some((x) => x.includes('empty'))).toBe(true)
    expect(w.some((x) => x.includes('named'))).toBe(true)
    expect(reviewWarnings({ regions: [{ ...r1, changeable: false }], groups: [] }, new Map([[r1.id, 4]]))[0]).toMatch(/No region is changeable/)
  })
})
