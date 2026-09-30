/**
 * Editor state for customization regions and the rules that operate on it — pure and
 * product-agnostic. The editor component holds this state; everything that decides *what a
 * change means* (exclusive vs overlapping regions, locks, grouping, which colours a region may
 * use, which customer option paints it) lives here so it can be tested.
 */

import { splitPieces } from './regions'
import { clusterByColour } from './same-colour'
import type { Lab } from './yarn-colors'

export interface EditorRegion {
  id: string
  name: string
  /** 1 = pixel belongs to this region (working resolution). The source of truth. */
  mask: Uint8Array
  groupId: string | null
  changeable: boolean
  /** Allowed library colour ids; null = inherit from the group / product. */
  colorIds: string[] | null
  /** May share pixels with other regions (drawn in layer order: later regions on top). */
  allowOverlap: boolean
  locked: boolean
  hidden: boolean
  /** Typical photo colour — shown as the "Original" swatch. */
  hex: string
  /** Uploaded image of this mask, and the fingerprint of the mask it was made from. */
  maskUrl?: string
  maskHash?: number
}

export interface EditorGroup {
  id: string
  name: string
  /** true: one customer choice colours every region; false: one choice per region. */
  sharedColor: boolean
  colorIds: string[] | null
}

export interface EditorState {
  /** Array order = layer order (index 0 is drawn first / bottom). */
  regions: EditorRegion[]
  groups: EditorGroup[]
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16))

export function makeRegion(name: string, mask: Uint8Array, hex = '#999999', extra: Partial<EditorRegion> = {}): EditorRegion {
  return { id: newId(), name, mask, groupId: null, changeable: true, colorIds: null, allowOverlap: false, locked: false, hidden: false, hex, ...extra }
}

/** Next free default name: "Region 1", "Region 2"… (names are the admin's to change). */
export function nextName(state: EditorState, base = 'Region'): string {
  const used = new Set([...state.regions.map((r) => r.name), ...state.groups.map((g) => g.name)])
  for (let i = 1; ; i++) if (!used.has(`${base} ${i}`)) return `${base} ${i}`
}

// ---- pixel ownership ----

/**
 * Whether `target` may take pixel q, and which regions lose it. Exclusive regions don't
 * share pixels: painting one takes the pixel from others — except locked regions, which are
 * never changed (so the pixel stays theirs). Regions allowed to overlap keep their pixels.
 */
export function claimPixel(regions: EditorRegion[], target: EditorRegion, q: number): boolean {
  if (target.locked) return false
  if (!target.allowOverlap) {
    for (const r of regions) if (r !== target && r.mask[q] && r.locked && !r.allowOverlap) return false
  }
  target.mask[q] = 1
  if (!target.allowOverlap) {
    for (const r of regions) if (r !== target && !r.locked && !r.allowOverlap) r.mask[q] = 0
  }
  return true
}

/** Adds a whole mask to a region under the same rules (returns pixels actually added). */
export function claimMask(regions: EditorRegion[], target: EditorRegion, add: Uint8Array, product?: Uint8Array): number {
  let n = 0
  for (let q = 0; q < add.length; q++) if (add[q] && (!product || product[q]) && !target.mask[q] && claimPixel(regions, target, q)) n++
  return n
}

/** Removes pixels from one region (or, with no target, from every unlocked region). */
export function releaseMask(regions: EditorRegion[], remove: Uint8Array, target?: EditorRegion) {
  for (const r of target ? [target] : regions) {
    if (r.locked) continue
    for (let q = 0; q < remove.length; q++) if (remove[q]) r.mask[q] = 0
  }
}

// ---- structure (pure: return new state) ----

const replaceRegion = (s: EditorState, id: string, patch: Partial<EditorRegion>): EditorState => ({
  ...s,
  regions: s.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)),
})

export const updateRegion = replaceRegion
export const updateGroup = (s: EditorState, id: string, patch: Partial<EditorGroup>): EditorState => ({
  ...s,
  groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
})

export function deleteRegions(s: EditorState, ids: string[]): EditorState {
  const drop = new Set(s.regions.filter((r) => ids.includes(r.id) && !r.locked).map((r) => r.id))
  const regions = s.regions.filter((r) => !drop.has(r.id))
  // a group left with no regions goes too
  return { regions, groups: s.groups.filter((g) => regions.some((r) => r.groupId === g.id)) }
}

/** Puts regions into a new group (shared colour by default). */
export function groupRegions(s: EditorState, ids: string[], name = nextName(s, 'Group')): { state: EditorState; groupId: string } {
  const groupId = newId()
  const regions = s.regions.map((r) => (ids.includes(r.id) ? { ...r, groupId } : r))
  const groups = [...s.groups, { id: groupId, name, sharedColor: true, colorIds: null }].filter((g) => regions.some((r) => r.groupId === g.id))
  return { state: { regions, groups }, groupId }
}

export function ungroup(s: EditorState, groupId: string): EditorState {
  return { regions: s.regions.map((r) => (r.groupId === groupId ? { ...r, groupId: null } : r)), groups: s.groups.filter((g) => g.id !== groupId) }
}

export function moveToGroup(s: EditorState, ids: string[], groupId: string | null): EditorState {
  const regions = s.regions.map((r) => (ids.includes(r.id) ? { ...r, groupId } : r))
  return { regions, groups: s.groups.filter((g) => regions.some((r) => r.groupId === g.id)) }
}

/**
 * Union of several regions into one — `keepId` if given, else the first in layer order — which
 * keeps its name, settings and place. Locked regions are left alone.
 */
export function mergeRegions(s: EditorState, ids: string[], keepId?: string): EditorState {
  const picked = s.regions.filter((r) => ids.includes(r.id) && !r.locked)
  if (picked.length < 2) return s
  const keep = picked.find((r) => r.id === keepId) ?? picked[0]
  const rest = picked.filter((r) => r !== keep)
  const mask = keep.mask.slice()
  for (const r of rest) for (let q = 0; q < mask.length; q++) if (r.mask[q]) mask[q] = 1
  const restIds = new Set(rest.map((r) => r.id))
  const regions = s.regions.filter((r) => !restIds.has(r.id)).map((r) => (r.id === keep.id ? { ...r, mask, maskUrl: undefined } : r))
  return { regions, groups: s.groups.filter((g) => regions.some((r) => r.groupId === g.id)) }
}

const DEFAULT_NAME = /^Region \d+$/

/** Which region a merge should keep: one the admin has named, else the biggest. */
export function mergeTarget(regions: EditorRegion[], sizes: Map<string, number>): EditorRegion | undefined {
  const score = (r: EditorRegion) => (DEFAULT_NAME.test(r.name.trim()) ? 0 : 1e12) + (sizes.get(r.id) ?? 0)
  return regions.slice().sort((a, b) => score(b) - score(a))[0]
}

/**
 * Sets of regions that look like the same yarn — offered to the admin to merge. Only regions
 * that can be merged (unlocked, visible, not empty) and treated alike (all changeable or all
 * fixed); regions the admin already put in one group together are left as they are.
 */
export function sameColourSets(s: EditorState, colour: (r: EditorRegion) => Lab | null, sizes: Map<string, number>, limit?: number): EditorRegion[][] {
  const eligible = s.regions.filter((r) => !r.locked && !r.hidden && (sizes.get(r.id) ?? 0) > 0)
  const sets: EditorRegion[][] = []
  for (const changeable of [true, false]) {
    const pool = eligible.filter((r) => r.changeable === changeable)
    for (const set of clusterByColour(pool, colour, (r) => sizes.get(r.id) ?? 0, limit)) {
      if (set.length < 2) continue
      if (set[0].groupId && set.every((r) => r.groupId === set[0].groupId)) continue
      sets.push(set)
    }
  }
  return sets
}

/**
 * Repeated elements: one selection covering several separate pieces becomes one region per
 * piece ("Name 1", "Name 2"…) in a group named after the original — shared colour by default,
 * switchable to individual. Returns the state unchanged if there's only one piece.
 */
export function splitRegion(s: EditorState, id: string, w: number, h: number, minArea = 20): { state: EditorState; count: number } {
  const r = s.regions.find((x) => x.id === id)
  if (!r || r.locked) return { state: s, count: 0 }
  const pieces = splitPieces(r.mask, w, h, minArea)
  if (pieces.length < 2) return { state: s, count: pieces.length }
  const groupId = r.groupId ?? newId()
  const parts = pieces.map((mask, i) => ({ ...r, id: newId(), name: `${r.name} ${i + 1}`, mask, groupId, maskUrl: undefined }))
  const idx = s.regions.findIndex((x) => x.id === id)
  const regions = [...s.regions.slice(0, idx), ...parts, ...s.regions.slice(idx + 1)]
  const groups = r.groupId ? s.groups : [...s.groups, { id: groupId, name: r.name, sharedColor: true, colorIds: r.colorIds }]
  return { state: { regions, groups }, count: parts.length }
}

export function duplicateRegion(s: EditorState, id: string): { state: EditorState; newIdValue?: string } {
  const r = s.regions.find((x) => x.id === id)
  if (!r) return { state: s }
  const copy: EditorRegion = { ...r, id: newId(), name: `${r.name} copy`, mask: r.mask.slice(), locked: false, maskUrl: undefined }
  // a copy of an exclusive region sits on top of it until moved — allow that
  copy.allowOverlap = true
  const idx = s.regions.findIndex((x) => x.id === id)
  return { state: { ...s, regions: [...s.regions.slice(0, idx + 1), copy, ...s.regions.slice(idx + 1)] }, newIdValue: copy.id }
}

/** Moves a region one step up/down the layer order. */
export function reorderRegion(s: EditorState, id: string, dir: -1 | 1): EditorState {
  const i = s.regions.findIndex((r) => r.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= s.regions.length) return s
  const regions = s.regions.slice()
  ;[regions[i], regions[j]] = [regions[j], regions[i]]
  return { ...s, regions }
}

export interface RegionSettings {
  changeable: boolean
  colorIds: string[] | null
  allowOverlap: boolean
}

export const copySettings = (r: EditorRegion): RegionSettings => ({ changeable: r.changeable, colorIds: r.colorIds ? [...r.colorIds] : null, allowOverlap: r.allowOverlap })

export function pasteSettings(s: EditorState, ids: string[], settings: RegionSettings): EditorState {
  return { ...s, regions: s.regions.map((r) => (ids.includes(r.id) && !r.locked ? { ...r, ...settings, colorIds: settings.colorIds ? [...settings.colorIds] : null } : r)) }
}

// ---- colours & customer options ----

/** The colour option key that paints a region (null = never recoloured). Mirrors the server. */
export function optionKey(r: EditorRegion, groups: EditorGroup[]): string | null {
  if (!r.changeable) return null
  const g = r.groupId ? groups.find((x) => x.id === r.groupId) : undefined
  return g?.sharedColor ? `g:${g.id}` : `r:${r.id}`
}

/** Allowed colours: region's own → its group's → the product's palette. */
export function allowedColourIds(r: EditorRegion, groups: EditorGroup[], palette: string[]): string[] {
  const g = r.groupId ? groups.find((x) => x.id === r.groupId) : undefined
  if (g?.sharedColor) return g.colorIds ?? palette
  return r.colorIds ?? g?.colorIds ?? palette
}

/** Warnings an admin should see before saving (not errors — the admin decides). */
export function reviewWarnings(s: EditorState, sizes: Map<string, number>): string[] {
  const out: string[] = []
  if (!s.regions.some((r) => r.changeable)) out.push('No region is changeable yet — customers would have nothing to choose.')
  for (const r of s.regions) if ((sizes.get(r.id) ?? 0) === 0) out.push(`“${r.name}” is empty — paint or select its area, or delete it.`)
  const names = new Map<string, number>()
  for (const r of s.regions) names.set(r.name.trim().toLowerCase(), (names.get(r.name.trim().toLowerCase()) ?? 0) + 1)
  for (const [n, c] of names) if (c > 1 && n) out.push(`${c} regions are named “${n}” — customers won't be able to tell them apart.`)
  return out
}
