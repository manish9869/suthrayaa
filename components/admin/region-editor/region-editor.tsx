'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Combine,
  Eraser,
  Eye,
  Hand,
  ImageIcon,
  Keyboard,
  Lasso,
  Loader2,
  Maximize2,
  Minimize2,
  Move,
  MousePointer2,
  Paintbrush,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  ScanSearch,
  Scissors,
  Shuffle,
  Sparkles,
  Square,
  SquareDashedMousePointer,
  SquarePlus,
  Undo2,
  Upload,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ProductCustomization } from '@/lib/data'
import type { AdminColor } from '@/lib/api/admin'
import { saveRegionConfig, uploadPreviewImage, type AdminPreviewConfig } from '@/lib/api/admin-preview'
import {
  detectYarnColors,
  growRegion,
  labToRgb,
  maskRange,
  maskStats,
  partsFromDetection,
  recolorPixels,
  referenceAround,
  rgbToHex,
  softenMask,
  suggestYarns,
  tidyPart,
  toLabArray,
  yarnMatcher,
  type Lab,
} from '@/lib/preview/yarn-colors'
import { dominantColours, fillPolygon, fillRect, labelPoint, maskArea, outline, overlapCounts, translateMask, type Point } from '@/lib/preview/regions'
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
  mergeTarget,
  moveToGroup,
  nextName,
  optionKey,
  pasteSettings,
  releaseMask,
  reorderRegion,
  reviewWarnings,
  sameColourSets,
  splitRegion,
  ungroup,
  updateGroup,
  updateRegion,
  type EditorGroup,
  type EditorRegion,
  type EditorState,
  type RegionSettings,
} from '@/lib/preview/region-ops'
import { detectProduct } from '@/lib/preview/background-removal'
import { createSegmentSession, type ClickPoint, type SegmentSession } from '@/lib/preview/segmenter'
import { suggestRegions, type Candidate } from '@/lib/preview/ai-suggest'
import { closestByColour, clusterByColour, meanLab } from '@/lib/preview/same-colour'
import { RegionTree, type RegionDetails } from './region-tree'
import { ColourPanel, type PanelTarget } from './colour-panel'

/**
 * Generic customization-region editor. The admin divides a product photo into regions —
 * arbitrary masks, the source of truth — groups them, and says which library colours each
 * may use. Automatic analysis only *suggests* regions; the admin decides. Nothing in here
 * knows what the product is.
 */

const WORK_MAX = 900 // editing happens on a copy at most this big; masks are scaled up on upload
const HISTORY = 30
const ZOOM_MIN = 1
const ZOOM_MAX = 8
const UPLOAD_CONCURRENCY = 4

type Tool = 'pick' | 'hand' | 'ai' | 'wand' | 'quick' | 'brush' | 'eraser' | 'lasso' | 'rect' | 'move' | 'bgRemove' | 'bgRestore'
type Shape = 'brush' | 'box' | 'lasso'
type Mode = 'edit' | 'inspect' | 'preview'
const BRUSH_TOOLS: Tool[] = ['quick', 'brush', 'eraser']
const BG_TOOLS: Tool[] = ['bgRemove', 'bgRestore']

interface Base {
  url?: string
  width?: number
  height?: number
}

interface Photo {
  w: number
  h: number
  rgba: Uint8ClampedArray
  lab: Float32Array
}

interface Snapshot {
  regions: EditorRegion[]
  groups: EditorGroup[]
  product: Uint8Array
}

interface Suggestion {
  id: number
  hex: string
  mask: Uint8Array
  lab: Lab | null
  area: number
}

/** Suggested parts of one colour, offered together; `match` = an existing region of that colour. */
interface SuggestionCluster {
  id: number
  parts: Suggestion[]
  hex: string
  mask: Uint8Array
  area: number
  match?: EditorRegion
}

interface Stroke {
  last: Point
  scale: number
  target?: EditorRegion
  ref?: Lab
  match?: (L: number, a: number, b: number) => boolean
  lastGrow?: Point
  subtract: boolean
  tool: Tool
}

// ---- helpers ----

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image'))
    img.src = url
  })
}

/** An uploaded mask image → 0/1 mask at working size. */
async function loadMask(url: string, w: number, h: number): Promise<Uint8Array> {
  const img = await loadImage(url)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const m = new Uint8Array(w * h)
  for (let p = 0; p < m.length; p++) m[p] = d[p * 4] > 127 ? 1 : 0
  return m
}

/** Mask (0–255) at working size → PNG at the base photo's size. */
function maskToFile(mask: Uint8ClampedArray, w: number, h: number, outW: number, outH: number, name: string): Promise<File> {
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const img = new ImageData(w, h)
  for (let p = 0; p < mask.length; p++) {
    img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = mask[p]
    img.data[p * 4 + 3] = 255
  }
  small.getContext('2d')!.putImageData(img, 0, 0)
  const big = document.createElement('canvas')
  big.width = outW
  big.height = outH
  const bctx = big.getContext('2d')!
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(small, 0, 0, outW, outH)
  return new Promise((resolve, reject) => big.toBlob((b) => (b ? resolve(new File([b], name, { type: 'image/png' })) : reject(new Error('Could not create mask'))), 'image/png'))
}

function averageHex(photo: Photo, mask: Uint8Array): string {
  let L = 0, a = 0, b = 0, c = 0
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue
    L += photo.lab[p * 3]
    a += photo.lab[p * 3 + 1]
    b += photo.lab[p * 3 + 2]
    c++
  }
  return c ? rgbToHex(labToRgb(L / c, a / c, b / c)) : '#999999'
}

/** Cheap fingerprint of a mask — to know whether its uploaded image is still current. */
function maskHash(mask: Uint8Array): number {
  let h = 2166136261
  for (let p = 0; p < mask.length; p++) if (mask[p]) h = Math.imul(h ^ p, 16777619)
  return h >>> 0
}

const clone = (regions: EditorRegion[]) => regions.map((r) => ({ ...r, mask: r.mask.slice() }))
const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
const hues = (i: number) => `hsl(${(i * 137.5) % 360} 80% 55%)`

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    })
  )
  return out
}

// ---- component ----

export function RegionEditor({
  productId,
  productImages,
  productColorHexes,
  config,
  libraryColors,
  colourOptions,
  onSaved,
}: {
  productId: string
  productImages: string[]
  /** The product's own colours — the default palette regions inherit. */
  productColorHexes: string[]
  config: AdminPreviewConfig
  libraryColors: AdminColor[]
  /** The product's current colour options (to offer removing ones outside this setup). */
  colourOptions: ProductCustomization[]
  onSaved: (config: AdminPreviewConfig) => void | Promise<void>
}) {
  const library = useMemo(() => libraryColors.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order), [libraryColors])
  // Regions with no colour list of their own offer the whole library (mirrors the server);
  // the product's own colours are a one-click list in the colour panel.
  const paletteIds = useMemo(() => library.map((c) => c.id), [library])
  const productColourIds = useMemo(() => {
    const own = new Set(productColorHexes.map((h) => h.toLowerCase()))
    return library.filter((c) => own.has(c.hex.toLowerCase())).map((c) => c.id)
  }, [library, productColorHexes])

  const [base, setBase] = useState<Base>(config.mode === 'photo' ? { url: config.baseUrl, width: config.width, height: config.height } : {})
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [product, setProduct] = useState<Uint8Array | null>(null)
  const [bgUrl, setBgUrl] = useState<{ url: string; hash: number } | null>(null)
  const [es, setEs] = useState<EditorState>({ regions: [], groups: [] })
  const [rev, setRev] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [hover, setHover] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [suggestionSource, setSuggestionSource] = useState<'ai' | 'colour'>('ai')
  const [hoverSuggestion, setHoverSuggestion] = useState<number | null>(null)
  /** Suggested parts the admin asked to see one by one instead of combined by colour. */
  const [separate, setSeparate] = useState<Set<number>>(new Set())
  /** Same-colour region sets the admin chose to keep separate. */
  const [apart, setApart] = useState<Set<string>>(new Set())
  const [hoverSet, setHoverSet] = useState<string[] | null>(null)
  const [tool, setTool] = useState<Tool>('pick')
  const [shape, setShape] = useState<Shape>('brush')
  const [looseness, setLooseness] = useState(0.5)
  const [brushSize, setBrushSize] = useState(18)
  const [smartEdges, setSmartEdges] = useState(true)
  const [eraseActiveOnly, setEraseActiveOnly] = useState(false)
  const [mode, setMode] = useState<Mode>('edit')
  const [testColours, setTestColours] = useState<Map<string, string>>(new Map())
  const [past, setPast] = useState<Snapshot[]>([])
  const [future, setFuture] = useState<Snapshot[]>([])
  const [clipboard, setClipboard] = useState<RegionSettings | null>(null)
  const [removeOthers, setRemoveOthers] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [box, setBox] = useState<{ a: Point; b: Point } | null>(null)
  const [lasso, setLasso] = useState<Point[] | null>(null)
  const [moveOffset, setMoveOffset] = useState<Point | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [spaceDown, setSpaceDown] = useState(false)
  const [altDown, setAltDown] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  /** AI select: the clicks so far and the candidate shapes for them (smallest → largest). */
  const [pending, setPending] = useState<{ points: ClickPoint[]; candidates: Candidate[]; index: number } | null>(null)
  const [aiReady, setAiReady] = useState<'no' | 'loading' | 'yes' | 'failed'>('no')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stroke = useRef<Stroke | null>(null)
  const panning = useRef<{ x: number; y: number; pan: Point } | null>(null)
  const lassoDrag = useRef<{ freehand: boolean } | null>(null)
  const moveStart = useRef<{ at: Point; outline: HTMLCanvasElement } | null>(null)
  const suggestionSeq = useRef(1)
  const session = useRef<{ photo: Photo; session: SegmentSession } | null>(null)
  const aiBusy = useRef(false)

  const activeRegion = es.regions.find((r) => r.id === activeId) ?? null
  const bump = () => setRev((v) => v + 1)

  // ---- history ----

  const snapshot = useCallback((): Snapshot | null => (product ? { regions: clone(es.regions), groups: es.groups.map((g) => ({ ...g })), product: product.slice() } : null), [es, product])
  const remember = () => {
    const s = snapshot()
    if (!s) return
    setPast((p) => [...p.slice(-(HISTORY - 1)), s])
    setFuture([])
  }
  const restore = (s: Snapshot) => {
    setEs({ regions: s.regions, groups: s.groups })
    setProduct(s.product)
    bump()
  }
  const undo = () => {
    const last = past.at(-1)
    const now = snapshot()
    if (!last || !now) return
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [...f, now])
    restore(last)
  }
  const redo = () => {
    const next = future.at(-1)
    const now = snapshot()
    if (!next || !now) return
    setFuture((f) => f.slice(0, -1))
    setPast((p) => [...p, now])
    restore(next)
  }
  /** Structural change: remember, then apply a pure state transform. */
  const commit = (fn: (s: EditorState) => EditorState) => {
    remember()
    setEs((s) => fn(s))
    bump()
  }

  // ---- loading ----

  /** The AI selection model for this photo (loaded once, then cached by the browser). */
  const getSession = useCallback(async (p: Photo): Promise<SegmentSession | null> => {
    if (session.current?.photo === p) return session.current.session
    setAiReady('loading')
    setStatus('Getting AI selection ready…')
    const s = await createSegmentSession(p.rgba, p.w, p.h, (pct) => setStatus(`Getting AI selection ready (one-time download) · ${pct}%`))
    setStatus(null)
    if (!s) {
      setAiReady('failed')
      return null
    }
    session.current = { photo: p, session: s }
    setAiReady('yes')
    return s
  }, [])

  const findSuggestions = useCallback(
    async (p: Photo, productMask: Uint8Array, backgroundRemoved: boolean) => {
      setSeparate(new Set())
      const toList = (masks: Uint8Array[]): Suggestion[] =>
        masks
          .map((mask) => ({ id: suggestionSeq.current++, hex: averageHex(p, mask), mask, lab: meanLab(p.lab, mask), area: maskArea(mask) }))
          .sort((a, b) => b.area - a.area)
      // AI: probe the photo with clicks and keep the confident object shapes
      const s = await getSession(p)
      if (s) {
        setStatus('Finding the parts of the piece…')
        const masks = await suggestRegions(p.w, p.h, productMask, (x, y) => s.decode([{ x, y, positive: true }]), { grid: 8 }, (done, total) =>
          setStatus(`Finding the parts of the piece… ${Math.round((done / total) * 100)}%`)
        )
        setStatus(null)
        if (masks.length) {
          setSuggestions(toList(masks))
          setSuggestionSource('ai')
          return
        }
      }
      // fallback: colour grouping (less precise)
      setStatus('Looking for regions by colour…')
      await new Promise((r) => setTimeout(r, 0))
      const det = detectYarnColors(p.rgba, p.w, p.h, { product: backgroundRemoved ? productMask : undefined })
      const parts = partsFromDetection(det, productMask, suggestYarns(det.colors, { backgroundRemoved }))
      setSuggestions(toList(parts.map((pt) => pt.mask)))
      setSuggestionSource('colour')
      setStatus(null)
    },
    [getSession]
  )

  const load = useCallback(
    async (url: string, fromConfig: boolean) => {
      setPhoto(null)
      setSuggestions(null)
      try {
        setStatus('Loading the photo…')
        const img = await loadImage(url)
        const scale = Math.min(1, WORK_MAX / Math.max(img.naturalWidth, img.naturalHeight))
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, w, h)
        const rgba = ctx.getImageData(0, 0, w, h).data
        const p: Photo = { w, h, rgba, lab: toLabArray(rgba, w, h) }

        const saved = fromConfig ? config.layers.filter((l) => l.maskUrl) : []
        const bgLayer = saved.find((l) => l.regionType === 'background')
        let productMask: Uint8Array
        let removed = true
        if (bgLayer?.maskUrl) {
          setStatus('Loading saved regions…')
          const bg = await loadMask(bgLayer.maskUrl, w, h)
          productMask = bg.map((v) => (v ? 0 : 1))
          setBgUrl({ url: bgLayer.maskUrl, hash: maskHash(productMask) })
        } else {
          setStatus('Removing the background…')
          const found = await detectProduct(url, w, h, (pct) => setStatus(`Getting the background remover ready (one-time) · ${pct}%`))
          removed = Boolean(found)
          productMask = found ?? new Uint8Array(w * h).fill(1)
          setBgUrl(null)
        }

        const regionLayers = saved.filter((l) => l.regionType !== 'background')
        const regions: EditorRegion[] = await Promise.all(
          regionLayers.map(async (l, i) => {
            const mask = await loadMask(l.maskUrl!, w, h)
            // regions saved before names existed take their colour option's name
            const legacyName = colourOptions.find((o) => o.id === l.customizationId)?.label
            return makeRegion(l.name || legacyName || `Region ${i + 1}`, mask, averageHex(p, mask), {
              id: l.id,
              groupId: l.groupId ?? null,
              changeable: l.regionType !== 'fixed' && Boolean(l.customizationId),
              colorIds: l.colorIds ?? null,
              allowOverlap: Boolean(l.allowOverlap),
              locked: Boolean(l.locked),
              hidden: Boolean(l.hidden),
              maskUrl: l.maskUrl,
              maskHash: maskHash(mask),
            })
          })
        )
        const groups: EditorGroup[] = (config.groups ?? [])
          .filter((g) => regions.some((r) => r.groupId === g.id))
          .map((g) => ({ id: g.id, name: g.name, sharedColor: g.sharedColor, colorIds: g.colorIds ?? null }))

        setProduct(productMask)
        setEs({ regions, groups })
        setPast([])
        setFuture([])
        setActiveId(null)
        setActiveGroupId(null)
        setSelectedIds([])
        setMode('edit')
        setTool('pick')
        setZoom(1)
        setPan({ x: 0, y: 0 })
        setPhoto(p)
        bump()
        if (regions.length === 0) await findSuggestions(p, productMask, removed)
      } catch {
        toast.error('Could not read the photo. Try another one.')
      } finally {
        setStatus(null)
      }
    },
    // config is read once per photo load on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findSuggestions]
  )

  useEffect(() => {
    if (base.url) load(base.url, base.url === config.baseUrl && config.mode === 'photo')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.url])

  useEffect(() => {
    if (tool !== 'ai' || mode !== 'edit') setPending(null)
  }, [tool, mode])

  // ---- derived ----

  const sizes = useMemo(() => new Map(es.regions.map((r) => [r.id, maskArea(r.mask)])), [es, rev]) // eslint-disable-line react-hooks/exhaustive-deps
  const productArea = useMemo(() => (product ? maskArea(product) : 0), [product, rev]) // eslint-disable-line react-hooks/exhaustive-deps
  const coverage = useCallback(
    (id: string) => {
      const r = es.regions.find((x) => x.id === id)
      if (!r || !product || !productArea) return 0
      let n = 0
      for (let q = 0; q < r.mask.length; q++) if (r.mask[q] && product[q]) n++
      return n / productArea
    },
    [es, product, productArea, rev] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const details = useMemo(() => {
    if (mode !== 'inspect' || !photo) return null
    const ov = overlapCounts(es.regions.map((r) => ({ id: r.id, mask: r.mask })))
    const name = new Map(es.regions.map((r) => [r.id, r.name]))
    return new Map<string, RegionDetails & { label: Point | null }>(
      es.regions.map((r, i) => [
        r.id,
        {
          area: sizes.get(r.id) ?? 0,
          dominant: dominantColours(photo.lab, r.mask, 3),
          overlaps: [...(ov.get(r.id)?.keys() ?? [])].map((id) => name.get(id) ?? '?'),
          layer: i,
          label: labelPoint(r.mask, photo.w),
        },
      ])
    )
  }, [mode, photo, es, sizes, rev]) // eslint-disable-line react-hooks/exhaustive-deps

  const warnings = useMemo(() => reviewWarnings(es, sizes), [es, sizes])

  /** Each region's typical photo colour (what "same colour" compares) — kept as is mid-drag. */
  const labsCache = useRef(new Map<string, Lab | null>())
  const regionLabs = useMemo(() => {
    if (stroke.current || moveStart.current) return labsCache.current
    labsCache.current = new Map(photo ? es.regions.map((r) => [r.id, meanLab(photo.lab, r.mask)] as const) : [])
    return labsCache.current
  }, [photo, es, rev]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Suggestions combined by colour — the detector often splits one yarn into several parts. */
  const clusters = useMemo<SuggestionCluster[]>(() => {
    if (!suggestions?.length) return []
    const together = clusterByColour(
      suggestions.filter((sg) => !separate.has(sg.id)),
      (sg) => sg.lab,
      (sg) => sg.area
    )
    const alone = suggestions.filter((sg) => separate.has(sg.id)).map((sg) => [sg])
    const targets = es.regions.filter((r) => !r.locked && !r.hidden && (sizes.get(r.id) ?? 0) > 0)
    return [...together, ...alone]
      .map((parts) => {
        const seed = parts[0]
        let mask = seed.mask
        if (parts.length > 1) {
          mask = new Uint8Array(seed.mask.length)
          for (const pt of parts) for (let q = 0; q < mask.length; q++) if (pt.mask[q]) mask[q] = 1
        }
        return {
          id: seed.id,
          parts,
          hex: seed.hex,
          mask,
          area: parts.reduce((n, pt) => n + pt.area, 0),
          match: closestByColour(seed.lab, targets, (r) => regionLabs.get(r.id) ?? null),
        }
      })
      .sort((a, b) => b.area - a.area)
  }, [suggestions, separate, es, sizes, regionLabs])

  const setKey = (set: EditorRegion[]) => set.map((r) => r.id).sort().join('|')
  const sameSets = useMemo(
    () => (mode === 'edit' ? sameColourSets(es, (r) => regionLabs.get(r.id) ?? null, sizes).filter((set) => !apart.has(setKey(set))) : []),
    [mode, es, regionLabs, sizes, apart]
  )

  const shuffle = useCallback(() => {
    const next = new Map<string, string>()
    for (const r of es.regions) {
      const key = optionKey(r, es.groups)
      if (!key || next.has(key)) continue
      const ids = allowedColourIds(r, es.groups, paletteIds)
      const pick = library.filter((c) => ids.includes(c.id))
      if (pick.length) next.set(key, pick[Math.floor(Math.random() * pick.length)].hex)
    }
    setTestColours(next)
  }, [es, library, paletteIds])

  // ---- composite image (recomputed on edits, not on every pointer move) ----

  const composite = useMemo(() => {
    if (!photo || !product) return null
    const { w, h, rgba } = photo
    const img = new ImageData(new Uint8ClampedArray(rgba), w, h)
    const d = img.data
    const visible = es.regions.filter((r) => !r.hidden)

    if (mode === 'preview') {
      for (const r of es.regions) {
        const key = optionKey(r, es.groups)
        const hex = key ? testColours.get(key) : undefined
        if (!hex) continue
        const m = new Uint8ClampedArray(r.mask.length)
        for (let q = 0; q < m.length; q++) m[q] = r.mask[q] && product[q] ? 255 : 0
        recolorPixels(rgba, d, m, maskStats(rgba, m), hex, maskRange(m, w))
      }
      return img
    }

    // which visible region owns each pixel (topmost), and how many claim it
    const owner = new Int16Array(w * h).fill(-1)
    const count = new Uint8Array(w * h)
    visible.forEach((r, i) => {
      for (let q = 0; q < r.mask.length; q++) {
        if (!r.mask[q]) continue
        owner[q] = i
        if (count[q] < 255) count[q]++
      }
    })
    const focusId = hover ?? activeId
    const focusIdx = focusId ? visible.findIndex((r) => r.id === focusId) : -1
    const hoveredCluster = hoverSuggestion != null ? clusters.find((c) => c.id === hoverSuggestion) : undefined
    let setMask: Uint8Array | null = null
    if (hoverSet) {
      setMask = new Uint8Array(w * h)
      for (const r of visible) if (hoverSet.includes(r.id)) for (let q = 0; q < setMask.length; q++) if (r.mask[q]) setMask[q] = 1
    }
    const focusMask = hoveredCluster?.mask ?? setMask ?? (focusIdx >= 0 ? visible[focusIdx].mask : null)
    const washGaps = visible.length > 0
    const tints = visible.map((_, i) => {
      const c = document.createElement('canvas').getContext('2d')!
      c.fillStyle = hues(i)
      const hex = c.fillStyle as string
      return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
    })

    for (let q = 0, i = 0; q < w * h; q++, i += 4) {
      const x = q % w
      const y = (q - x) / w
      if (!product[q]) {
        const stripe = (x + y) % 14 < 3
        const k = stripe ? 0.55 : 0.3
        const t = stripe ? 90 : 235
        d[i] = d[i] * k + t * (1 - k)
        d[i + 1] = d[i + 1] * k + t * (1 - k)
        d[i + 2] = d[i + 2] * k + t * (1 - k)
        continue
      }
      if (mode === 'inspect') {
        const o = owner[q]
        if (count[q] > 1 && (x + y) % 6 < 2) {
          d[i] = 255
          d[i + 1] = 0
          d[i + 2] = 200 // overlap
        } else if (o >= 0) {
          const [tr, tg, tb] = tints[o]
          const k = focusIdx >= 0 && o !== focusIdx ? 0.15 : 0.5
          d[i] = d[i] * (1 - k) + tr * k
          d[i + 1] = d[i + 1] * (1 - k) + tg * k
          d[i + 2] = d[i + 2] * (1 - k) + tb * k
        }
        continue
      }
      if (focusMask && !focusMask[q]) {
        // everything but the focused region: soft grey, so the region stands out in colour
        const g = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]
        d[i] = (d[i] * 0.3 + g * 0.7) * 0.8 + 30
        d[i + 1] = (d[i + 1] * 0.3 + g * 0.7) * 0.8 + 30
        d[i + 2] = (d[i + 2] * 0.3 + g * 0.7) * 0.8 + 30
      } else if (!focusMask && washGaps && owner[q] < 0) {
        // part of the piece not in any region yet: light pink wash
        d[i] = d[i] * 0.45 + 255 * 0.55
        d[i + 1] = d[i + 1] * 0.45 + 190 * 0.55
        d[i + 2] = d[i + 2] * 0.45 + 230 * 0.55
      }
    }

    // outlines: selected regions (edit) or every region (inspect)
    const outlined = mode === 'inspect' ? visible : visible.filter((r) => selectedIds.includes(r.id) || r.id === activeId)
    outlined.forEach((r) => {
      const edge = outline(r.mask, w, h)
      const i0 = visible.indexOf(r)
      const [tr, tg, tb] = mode === 'inspect' ? tints[i0] : [109, 74, 255]
      for (let q = 0; q < edge.length; q++) {
        if (!edge[q]) continue
        d[q * 4] = tr
        d[q * 4 + 1] = tg
        d[q * 4 + 2] = tb
      }
    })
    return img
  }, [photo, product, es, rev, hover, activeId, selectedIds, mode, testColours, hoverSuggestion, clusters, hoverSet]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingOverlay = useMemo(() => {
    if (!pending || !photo) return null
    const m = pending.candidates[pending.index].mask
    const c = document.createElement('canvas')
    c.width = photo.w
    c.height = photo.h
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(photo.w, photo.h)
    const edge = outline(m, photo.w, photo.h)
    for (let q = 0; q < m.length; q++) {
      if (!m[q]) continue
      img.data.set(edge[q] ? [255, 255, 255, 255] : [236, 72, 153, 110], q * 4)
    }
    ctx.putImageData(img, 0, 0)
    return c
  }, [pending, photo])

  // ---- drawing ----

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !photo || !composite) return
    const { w, h } = photo
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(composite, 0, 0)
    const rect = canvas.getBoundingClientRect()
    const px = w / Math.max(1, rect.width) // canvas px per screen px

    if (mode === 'inspect' && details) {
      ctx.font = `600 ${Math.round(12 * px)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3 * px
      for (const r of es.regions) {
        const at = details.get(r.id)?.label
        if (!at || r.hidden) continue
        ctx.strokeStyle = 'rgba(0,0,0,.75)'
        ctx.strokeText(r.name, at.x, at.y)
        ctx.fillStyle = '#fff'
        ctx.fillText(r.name, at.x, at.y)
      }
    }
    ctx.setLineDash([6 * px, 4 * px])
    ctx.lineWidth = 1.5 * px
    const subtracting = altDown || tool === 'bgRemove' || tool === 'eraser'
    if (box) {
      ctx.strokeStyle = subtracting ? '#dc2626' : '#6d4aff'
      ctx.strokeRect(Math.min(box.a.x, box.b.x), Math.min(box.a.y, box.b.y), Math.abs(box.b.x - box.a.x), Math.abs(box.b.y - box.a.y))
    }
    if (lasso && lasso.length > 0) {
      ctx.strokeStyle = subtracting ? '#dc2626' : '#6d4aff'
      ctx.beginPath()
      ctx.moveTo(lasso[0].x, lasso[0].y)
      for (const p of lasso.slice(1)) ctx.lineTo(p.x, p.y)
      if (cursor && !lassoDrag.current) ctx.lineTo(cursor.x, cursor.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#6d4aff'
      ctx.beginPath()
      ctx.arc(lasso[0].x, lasso[0].y, 4 * px, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.setLineDash([])
    if (pendingOverlay && pending) {
      ctx.drawImage(pendingOverlay, 0, 0)
      for (const pt of pending.points) {
        ctx.fillStyle = pt.positive ? '#16a34a' : '#dc2626'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2 * px
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 5 * px, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
    if (moveOffset && moveStart.current) ctx.drawImage(moveStart.current.outline, moveOffset.x, moveOffset.y)
    const brushLike = BRUSH_TOOLS.includes(tool) || (BG_TOOLS.includes(tool) && shape === 'brush')
    if (cursor && brushLike && !spaceDown) {
      const r = brushSize * px
      ctx.lineWidth = 1.5 * px
      ctx.strokeStyle = '#fff'
      ctx.beginPath()
      ctx.arc(cursor.x, cursor.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = subtracting ? '#dc2626' : '#6d4aff'
      ctx.beginPath()
      ctx.arc(cursor.x, cursor.y, r + 1.5 * px, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [photo, composite, details, es, box, lasso, cursor, moveOffset, tool, shape, brushSize, spaceDown, altDown, mode, zoom, pendingOverlay, pending])

  // ---- view: zoom & pan ----

  const clampPan = useCallback((p: Point, z: number) => {
    const v = viewportRef.current
    if (!v) return p
    return { x: Math.min(0, Math.max(v.clientWidth - v.clientWidth * z, p.x)), y: Math.min(0, Math.max(v.clientHeight - v.clientHeight * z, p.y)) }
  }, [])
  const zoomTo = useCallback(
    (z: number, vx?: number, vy?: number) => {
      const v = viewportRef.current
      const nz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
      const cx = vx ?? (v ? v.clientWidth / 2 : 0)
      const cy = vy ?? (v ? v.clientHeight / 2 : 0)
      setZoom((oz) => {
        setPan((op) => clampPan({ x: cx - ((cx - op.x) * nz) / oz, y: cy - ((cy - op.y) * nz) / oz }, nz))
        return nz
      })
    },
    [clampPan]
  )
  const fit = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  useEffect(() => {
    const v = viewportRef.current
    if (!v) return
    const onWheel = (e: WheelEvent) => {
      const rect = v.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setZoom((oz) => {
          const nz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oz * Math.exp(-e.deltaY * 0.0025)))
          const cx = e.clientX - rect.left
          const cy = e.clientY - rect.top
          setPan((op) => clampPan({ x: cx - ((cx - op.x) * nz) / oz, y: cy - ((cy - op.y) * nz) / oz }, nz))
          return nz
        })
      } else if (zoom > 1) {
        e.preventDefault()
        setPan((op) => clampPan({ x: op.x - e.deltaX, y: op.y - e.deltaY }, zoom))
      }
    }
    v.addEventListener('wheel', onWheel, { passive: false })
    return () => v.removeEventListener('wheel', onWheel)
  }, [photo, zoom, clampPan])

  const toPixel = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = Math.min(photo!.w - 1, Math.max(0, ((clientX - rect.left) / rect.width) * photo!.w))
    const y = Math.min(photo!.h - 1, Math.max(0, ((clientY - rect.top) / rect.height) * photo!.h))
    return { x, y, idx: Math.floor(y) * photo!.w + Math.floor(x), scale: photo!.w / Math.max(1, rect.width) }
  }

  /** The topmost visible region at a pixel. */
  const regionAt = (idx: number) => {
    for (let i = es.regions.length - 1; i >= 0; i--) if (!es.regions[i].hidden && es.regions[i].mask[idx]) return es.regions[i]
    return null
  }

  // ---- targets ----

  /** The region add-tools paint into: the active one, or a new one. */
  const ensureTarget = (): EditorRegion | null => {
    if (activeRegion) {
      if (activeRegion.locked) {
        toast.info(`“${activeRegion.name}” is locked — unlock it to edit.`)
        return null
      }
      return activeRegion
    }
    if (!photo) return null
    const r = makeRegion(nextName(es), new Uint8Array(photo.w * photo.h))
    setEs((s) => ({ ...s, regions: [...s.regions, r] }))
    setActiveId(r.id)
    setActiveGroupId(null)
    setSelectedIds([r.id])
    return r
  }

  const allWith = (t?: EditorRegion) => (t && !es.regions.includes(t) ? [...es.regions, t] : es.regions)

  /** Applies a filled shape (lasso / rectangle / wand result) with the current tool's meaning. */
  const applyMask = (m: Uint8Array, subtract: boolean) => {
    if (!photo || !product) return
    if (tool === 'bgRemove' || tool === 'bgRestore') {
      remember()
      const next = product.slice()
      for (let q = 0; q < m.length; q++) if (m[q]) next[q] = tool === 'bgRestore' ? 1 : 0
      if (tool === 'bgRemove') releaseMask(es.regions, m)
      setProduct(next)
      bump()
      return
    }
    if (subtract) {
      if (!activeRegion || activeRegion.locked) {
        toast.info('Select the region to take away from first.')
        return
      }
      remember()
      releaseMask(es.regions, m, activeRegion)
      finishEdit([activeRegion])
      return
    }
    remember()
    const target = ensureTarget()
    if (!target) return
    claimMask(allWith(target), target, m, product)
    finishEdit([target])
  }

  /** After pixels changed: refresh colours/ids so React sees the change; drop empties unless active. */
  const finishEdit = (touched: EditorRegion[]) => {
    if (!photo) return
    setEs((s) => {
      const regions = (touched.some((t) => !s.regions.includes(t)) ? [...s.regions, ...touched.filter((t) => !s.regions.includes(t))] : s.regions).map((r) =>
        touched.includes(r) ? { ...r, hex: averageHex(photo, r.mask) } : r
      )
      return { ...s, regions }
    })
    bump()
  }

  // ---- brush strokes (quick select / brush / eraser / background brush) ----

  const startStroke = (x: number, y: number, scale: number, alt: boolean) => {
    if (!photo || !product) return
    const subtract = alt && (tool === 'quick' || tool === 'brush')
    let target: EditorRegion | undefined
    if (tool === 'quick' || tool === 'brush') {
      if (subtract || tool === 'brush') {
        if (!activeRegion) {
          toast.info(subtract ? 'Select the region to take away from first.' : 'Select a region to paint (click it in the list), or use Quick select to start one.')
          return
        }
        if (activeRegion.locked) {
          toast.info(`“${activeRegion.name}” is locked.`)
          return
        }
        target = activeRegion
      } else {
        remember()
        target = ensureTarget() ?? undefined
        if (!target) return
      }
    }
    if (!(tool === 'quick' && !subtract)) remember()
    const at = Math.floor(y) * photo.w + Math.floor(x)
    const ref = referenceAround(photo.lab, photo.w, photo.h, at, product)
    const smart = ((tool === 'brush' || tool === 'eraser') && smartEdges) || tool === 'quick'
    stroke.current = {
      last: { x, y },
      scale,
      target,
      ref,
      subtract,
      tool,
      match: smart ? yarnMatcher(ref, tool === 'quick' ? looseness : 0.6) : undefined,
    }
    stamp(x, y)
  }

  const stamp = (x: number, y: number) => {
    const s = stroke.current
    if (!s || !photo || !product) return
    const r = brushSize * s.scale
    const { w, h, lab } = photo
    const all = allWith(s.target)
    const dist = Math.hypot(x - s.last.x, y - s.last.y)
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, r / 2)))
    for (let i = 1; i <= steps; i++) {
      const cx: number = s.last.x + ((x - s.last.x) * i) / steps
      const cy: number = s.last.y + ((y - s.last.y) * i) / steps
      for (let yy = Math.max(0, Math.floor(cy - r)); yy <= Math.min(h - 1, Math.ceil(cy + r)); yy++) {
        for (let xx = Math.max(0, Math.floor(cx - r)); xx <= Math.min(w - 1, Math.ceil(cx + r)); xx++) {
          if ((xx - cx) ** 2 + (yy - cy) ** 2 > r * r) continue
          const q = yy * w + xx
          const matches = !s.match || s.match(lab[q * 3], lab[q * 3 + 1], lab[q * 3 + 2])
          if (s.tool === 'bgRemove') {
            product[q] = 0
            for (const reg of all) if (!reg.locked) reg.mask[q] = 0
          } else if (s.tool === 'bgRestore') {
            product[q] = 1
          } else if (s.tool === 'eraser') {
            if (!matches) continue
            for (const reg of eraseActiveOnly && activeRegion ? [activeRegion] : all) if (!reg.locked) reg.mask[q] = 0
          } else if (s.target && product[q] && matches) {
            if (s.subtract) s.target.mask[q] = 0
            else claimPixel(all, s.target, q)
          }
        }
      }
      // Quick select: spread from under the brush to the rest of that yarn nearby
      if (s.tool === 'quick' && s.target) {
        const lg = s.lastGrow
        if (!lg || Math.hypot(cx - lg.x, cy - lg.y) >= r * 0.75) {
          s.lastGrow = { x: cx, y: cy }
          const seed = Math.floor(cy) * w + Math.floor(cx)
          if (product[seed] && s.match?.(lab[seed * 3], lab[seed * 3 + 1], lab[seed * 3 + 2])) {
            const region = growRegion(lab, w, h, seed, product, looseness, { ref: s.ref, within: { x: cx, y: cy, r: r * 3 }, raw: true, skip: s.subtract ? undefined : s.target.mask })
            for (let q = 0; q < region.length; q++) {
              if (!region[q]) continue
              if (s.subtract) s.target.mask[q] = 0
              else claimPixel(all, s.target, q)
            }
          }
        }
      }
    }
    s.last = { x, y }
    bump()
  }

  const endStroke = () => {
    const s = stroke.current
    if (!s || !photo || !product) return
    stroke.current = null
    if (s.tool === 'quick' && s.target && !s.subtract) {
      // close stitch gaps / small holes once, then keep exclusivity
      const tidy = tidyPart(s.target.mask, photo.w, photo.h, product)
      const add = new Uint8Array(tidy.length)
      for (let q = 0; q < tidy.length; q++) add[q] = tidy[q] && !s.target.mask[q] ? 1 : 0
      claimMask(allWith(s.target), s.target, add, product)
    }
    if (BG_TOOLS.includes(s.tool)) setProduct(product.slice())
    finishEdit(s.target ? [s.target] : [])
  }

  // ---- AI select ----

  const aiClick = async (x: number, y: number, positive: boolean) => {
    if (!photo || !product || aiBusy.current) return
    aiBusy.current = true
    try {
      const s = await getSession(photo)
      if (!s) {
        toast.error('AI selection isn’t available on this device — use Quick select or Lasso instead.')
        return
      }
      const points = [...(pending?.points ?? []), { x, y, positive }]
      const candidates = (await s.decode(points)).filter((c) => maskArea(c.mask) > 0).reverse() // smallest → largest
      if (!candidates.length) {
        toast.info('Nothing found there — try clicking inside the part.')
        return
      }
      // keep the same size choice while refining; first click → the model's most confident shape
      const best = candidates.reduce((bi, c, i) => (c.score > candidates[bi].score ? i : bi), 0)
      const index = pending ? Math.min(pending.index, candidates.length - 1) : best
      setPending({ points, candidates, index })
    } finally {
      aiBusy.current = false
    }
  }

  const acceptPending = (asNew: boolean) => {
    if (!pending || !photo || !product) return
    const m = pending.candidates[pending.index].mask
    setPending(null)
    if (asNew) {
      setActiveId(null)
      remember()
      const r = makeRegion(nextName(es), new Uint8Array(m.length))
      claimMask([...es.regions, r], r, m, product)
      setEs((st) => ({ ...st, regions: [...st.regions, { ...r, hex: averageHex(photo, r.mask) }] }))
      setActiveId(r.id)
      setSelectedIds([r.id])
      bump()
    } else applyMask(m, false)
  }

  // ---- lasso ----

  const closeLasso = (pts: Point[] | null = lasso) => {
    setLasso(null)
    lassoDrag.current = null
    if (!photo || !pts || pts.length < 3) return
    applyMask(fillPolygon(pts, photo.w, photo.h), altDown && (tool === 'lasso' || tool === 'rect'))
  }

  // ---- move ----

  const startMove = (at: Point) => {
    if (!photo || !activeRegion) {
      toast.info('Select the region to move first.')
      return
    }
    if (activeRegion.locked) {
      toast.info(`“${activeRegion.name}” is locked.`)
      return
    }
    const edge = outline(activeRegion.mask, photo.w, photo.h)
    const c = document.createElement('canvas')
    c.width = photo.w
    c.height = photo.h
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(photo.w, photo.h)
    for (let q = 0; q < edge.length; q++) {
      if (!activeRegion.mask[q]) continue
      const i = q * 4
      if (edge[q]) img.data.set([109, 74, 255, 255], i)
      else img.data.set([109, 74, 255, 70], i)
    }
    ctx.putImageData(img, 0, 0)
    moveStart.current = { at, outline: c }
    setMoveOffset({ x: 0, y: 0 })
  }
  const endMove = () => {
    const m = moveStart.current
    const off = moveOffset
    moveStart.current = null
    setMoveOffset(null)
    if (!m || !off || !photo || !product || !activeRegion || (Math.abs(off.x) < 1 && Math.abs(off.y) < 1)) return
    remember()
    const moved = translateMask(activeRegion.mask, photo.w, photo.h, off.x, off.y)
    activeRegion.mask.fill(0)
    claimMask(es.regions, activeRegion, moved, product)
    finishEdit([activeRegion])
  }

  // ---- pointer ----

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo || mode === 'preview') return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (tool === 'hand' || spaceDown || e.button === 1) {
      panning.current = { x: e.clientX, y: e.clientY, pan }
      return
    }
    if (tool === 'ai' && mode === 'edit' && (e.button === 0 || e.button === 2)) {
      const { x, y } = toPixel(e.clientX, e.clientY)
      aiClick(x, y, e.button === 0 && !e.altKey)
      return
    }
    if (e.button !== 0) return
    const { x, y, idx, scale } = toPixel(e.clientX, e.clientY)
    if (mode === 'inspect') {
      selectRegion(regionAt(idx)?.id ?? null, e.shiftKey || e.ctrlKey || e.metaKey)
      return
    }
    const shapeTool = tool === 'rect' || tool === 'lasso' || (BG_TOOLS.includes(tool) && shape !== 'brush')
    const useBox = tool === 'rect' || (BG_TOOLS.includes(tool) && shape === 'box')
    const useLasso = tool === 'lasso' || (BG_TOOLS.includes(tool) && shape === 'lasso')

    if (tool === 'pick') {
      const r = regionAt(idx)
      const c = !r ? clusters.find((x) => x.mask[idx]) : undefined
      if (c) {
        const chosen = e.shiftKey && activeRegion && !activeRegion.locked ? activeRegion : null
        const into = chosen ?? c.match ?? null
        addSuggested(c, into)
        setHoverSuggestion(null)
        if (into) {
          toast.success(chosen ? `Added to “${into.name}”.` : `Added to “${into.name}” — it's the same colour.`, {
            action: { label: 'Keep separate', onClick: () => later.current.separate(into.id, c.mask, c.hex) },
          })
        } else toast.success('Added as a region — name it on the right, and adjust its area with the tools if needed.')
      } else selectRegion(r?.id ?? null, e.shiftKey || e.ctrlKey || e.metaKey)
    } else if (tool === 'wand') {
      if (!product?.[idx]) {
        toast.info('That spot is background. Use Background → Restore first if it belongs to the piece.')
        return
      }
      const grown = growRegion(photo.lab, photo.w, photo.h, idx, product, looseness)
      if (maskArea(grown) < 10) {
        toast.info('Too small — try a looser setting')
        return
      }
      applyMask(grown, e.altKey)
    } else if (tool === 'move') {
      startMove({ x, y })
    } else if (shapeTool && useBox) {
      setBox({ a: { x, y }, b: { x, y } })
    } else if (shapeTool && useLasso) {
      if (lasso && lasso.length > 2 && Math.hypot(x - lasso[0].x, y - lasso[0].y) < 10 * scale) closeLasso()
      else if (lasso) setLasso([...lasso, { x, y }])
      else {
        setLasso([{ x, y }])
        lassoDrag.current = { freehand: false }
      }
    } else {
      startStroke(x, y, scale, e.altKey)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return
    const pressed = (e.buttons & 1) === 1 || (e.buttons & 4) === 4
    if (panning.current) {
      if (!pressed) panning.current = null
      else {
        const p0 = panning.current
        setPan(clampPan({ x: p0.pan.x + e.clientX - p0.x, y: p0.pan.y + e.clientY - p0.y }, zoom))
      }
      return
    }
    const { x, y, idx, scale } = toPixel(e.clientX, e.clientY)
    setCursor({ x, y })
    if (stroke.current && !pressed) endStroke()
    if (box && !pressed) setBox(null)
    if (moveStart.current) {
      if (pressed) setMoveOffset({ x: x - moveStart.current.at.x, y: y - moveStart.current.at.y })
      else endMove()
      return
    }
    if (box && pressed) setBox({ ...box, b: { x, y } })
    else if (stroke.current && pressed) stamp(x, y)
    else if (lasso && lassoDrag.current && pressed) {
      const last = lasso[lasso.length - 1]
      if (Math.hypot(x - last.x, y - last.y) > 3 * scale) {
        lassoDrag.current.freehand = true
        setLasso([...lasso, { x, y }])
      }
    } else if (tool === 'pick' && mode !== 'preview') {
      const r = regionAt(idx)
      setHover(r?.id ?? null)
      setHoverSuggestion(r ? null : (clusters.find((x) => x.mask[idx])?.id ?? null))
    }
  }

  const onPointerUp = () => {
    panning.current = null
    if (box && photo) {
      const m = fillRect(box.a, box.b, photo.w, photo.h)
      setBox(null)
      if (maskArea(m) > 4) applyMask(m, altDown && tool === 'rect')
    }
    if (lasso && lassoDrag.current) {
      const freehand = lassoDrag.current.freehand
      lassoDrag.current = null
      if (freehand) closeLasso()
    }
    if (moveStart.current) endMove()
    endStroke()
  }

  // ---- selection & structural actions ----

  const selectRegion = (id: string | null, additive: boolean) => {
    setActiveGroupId(null)
    if (!id) {
      setActiveId(null)
      setSelectedIds([])
      return
    }
    if (additive) {
      setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
      setActiveId(id)
    } else {
      setSelectedIds([id])
      setActiveId(id)
    }
  }

  const addRegion = () => {
    if (!photo) return
    const r = makeRegion(nextName(es), new Uint8Array(photo.w * photo.h))
    commit((s) => ({ ...s, regions: [...s.regions, r] }))
    setActiveId(r.id)
    setSelectedIds([r.id])
    setActiveGroupId(null)
    setTool('quick')
    toast.info(`Added “${r.name}” — drag over its area with Quick select, or use the Wand, Lasso or Brush.`)
  }

  const dropSuggestions = (parts: Suggestion[]) => {
    const ids = new Set(parts.map((pt) => pt.id))
    setSuggestions((list) => list?.filter((x) => !ids.has(x.id)) ?? null)
  }
  /** Adds suggested parts to a region: `into` (e.g. the region of the same colour) or a new one. */
  const addSuggested = (c: SuggestionCluster, into: EditorRegion | null) => {
    if (!product) return
    remember()
    const existing = into ? es.regions.find((r) => r.id === into.id) : undefined
    const target = existing ?? makeRegion(nextName(es), new Uint8Array(c.mask.length), c.hex)
    const regions = existing ? [...es.regions] : [...es.regions, target]
    claimMask(regions, target, c.mask, product)
    setEs((s) => ({ ...s, regions }))
    dropSuggestions(c.parts)
    setActiveId(target.id)
    setSelectedIds([target.id])
    setActiveGroupId(null)
    bump()
  }
  const acceptAllSuggestions = () => {
    if (!product || !clusters.length) return
    remember()
    let state = es
    let merged = 0
    for (const c of clusters) {
      const existing = c.match ? state.regions.find((r) => r.id === c.match!.id) : undefined
      const target = existing ?? makeRegion(nextName(state), new Uint8Array(c.mask.length), c.hex)
      if (existing) merged++
      else state = { ...state, regions: [...state.regions, target] }
      claimMask(state.regions, target, c.mask, product)
    }
    setEs({ ...state, regions: [...state.regions] })
    setSuggestions([])
    setActiveId(null)
    setSelectedIds([])
    bump()
    toast.success(`Added ${clusters.length - merged} new region${clusters.length - merged === 1 ? '' : 's'}${merged ? `; ${merged} added to regions of the same colour` : ''}. Name them on the right.`)
  }
  const suggestionToBackground = (c: SuggestionCluster) => {
    if (!product) return
    remember()
    const next = product.slice()
    for (let q = 0; q < next.length; q++) if (c.mask[q]) next[q] = 0
    releaseMask(es.regions, c.mask)
    setProduct(next)
    dropSuggestions(c.parts)
    bump()
  }
  /** Undo an automatic "same colour" add: those pixels become a region of their own. */
  const separateFrom = (fromId: string, mask: Uint8Array, hex: string) => {
    const from = es.regions.find((r) => r.id === fromId)
    if (!product || !from) return
    remember()
    const r = makeRegion(nextName(es), new Uint8Array(mask.length), hex)
    const regions = [...es.regions, r]
    claimMask(regions, r, mask, product)
    if (from.allowOverlap) releaseMask(regions, mask, from)
    setEs((s) => ({ ...s, regions }))
    setActiveId(r.id)
    setSelectedIds([r.id])
    bump()
  }
  const mergeSet = (set: EditorRegion[]) => {
    const keep = mergeTarget(set, sizes)
    if (!keep) return
    commit((s) => mergeRegions(s, set.map((r) => r.id), keep.id))
    setActiveId(keep.id)
    setSelectedIds([keep.id])
    setActiveGroupId(null)
    setHoverSet(null)
    toast.success(`Merged into “${keep.name}”.`, { action: { label: 'Undo', onClick: () => later.current.undo() } })
  }
  /** Latest versions of actions that toasts call later (their closures would be stale). */
  const later = useRef({ separate: separateFrom, undo })
  later.current = { separate: separateFrom, undo }

  const onDelete = (ids: string[]) => {
    commit((s) => deleteRegions(s, ids))
    if (activeId && ids.includes(activeId)) setActiveId(null)
    setSelectedIds((sel) => sel.filter((x) => !ids.includes(x)))
  }
  const onSplit = (id: string) => {
    if (!photo) return
    const { state, count } = splitRegion(es, id, photo.w, photo.h, Math.max(20, Math.round(photo.w * photo.h * 0.0004)))
    if (count < 2) {
      toast.info('This region is one connected piece — nothing to split.')
      return
    }
    remember()
    setEs(state)
    bump()
    setActiveId(null)
    setSelectedIds([])
    toast.success(`Split into ${count} regions, grouped together — choose one colour for all or each separately in the group settings.`)
  }
  const onDuplicate = (id: string) => {
    const { state, newIdValue } = duplicateRegion(es, id)
    commit(() => state)
    if (newIdValue) {
      setActiveId(newIdValue)
      setSelectedIds([newIdValue])
      setTool('move')
      toast.info('Copy created on top — drag it to where the repeated element is.')
    }
  }
  const onGroupSelected = () => {
    const ids = selectedIds.length ? selectedIds : activeId ? [activeId] : []
    if (!ids.length) return
    const { state, groupId } = groupRegions(es, ids)
    commit(() => state)
    setActiveGroupId(groupId)
    setActiveId(null)
  }

  // ---- keyboard ----

  const keys = useRef<(e: KeyboardEvent, down: boolean) => void>(() => {})
  keys.current = (e, down) => {
    if (!photo || isTyping(e.target)) return
    if (e.code === 'Space') {
      e.preventDefault()
      setSpaceDown(down)
      return
    }
    if (e.key === 'Alt') {
      e.preventDefault()
      setAltDown(down)
      return
    }
    if (!down) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
      return
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      redo()
      return
    }
    if (mod && e.key.toLowerCase() === 'd' && activeId) {
      e.preventDefault()
      onDuplicate(activeId)
      return
    }
    if (mod || e.altKey) return
    const map: Record<string, Tool> = { v: 'pick', h: 'hand', s: 'ai', w: 'wand', q: 'quick', b: 'brush', e: 'eraser', l: 'lasso', m: 'rect', g: 'move' }
    const k = e.key.toLowerCase()
    if (map[k]) setTool(map[k])
    else if (e.key === '[') setBrushSize((s) => Math.max(3, s - 3))
    else if (e.key === ']') setBrushSize((s) => Math.min(100, s + 3))
    else if (e.key === '+' || e.key === '=') zoomTo(zoom * 1.25)
    else if (e.key === '-') zoomTo(zoom / 1.25)
    else if (e.key === '0') fit()
    else if (e.key === 'Enter' && pending) acceptPending(false)
    else if (e.key === 'Enter' && lasso) closeLasso()
    else if (pending && (e.key === ',' || e.key === '.')) setPending({ ...pending, index: Math.max(0, Math.min(pending.candidates.length - 1, pending.index + (e.key === '.' ? 1 : -1))) })
    else if (e.key === 'Escape') {
      if (pending) setPending(null)
      else if (lasso) setLasso(null)
      else if (fullscreen) setFullscreen(false)
      else selectRegion(null, false)
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedIds.length || activeId)) onDelete(selectedIds.length ? selectedIds : [activeId!])
    else if (k === 'i') setMode((m) => (m === 'inspect' ? 'edit' : 'inspect'))
  }
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current(e, true)
    const up = (e: KeyboardEvent) => keys.current(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ---- photo pick / upload ----

  const uploadBaseFile = async (file: File) => {
    setBusy('photo')
    try {
      const up = await uploadPreviewImage(productId, file, 'base')
      setBase({ url: up.url, width: up.width, height: up.height })
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'Could not use that photo')
    } finally {
      setBusy(null)
    }
  }
  const pickProductPhoto = async (url: string) => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      await uploadBaseFile(new File([blob], 'base', { type: blob.type || 'image/jpeg' }))
    } catch {
      toast.error('Could not use that photo')
    }
  }
  const changePhoto = () => {
    if (es.regions.length && !confirm('Choose a different photo? The regions on this one will be discarded when you save.')) return
    setBase({})
    setPhoto(null)
    setEs({ regions: [], groups: [] })
  }

  // ---- save ----

  const otherOptions = colourOptions.filter((o) => o.type === 'color' && !o.name.startsWith('preview:'))

  const save = async () => {
    if (!photo || !product || !base.url || !base.width || !base.height) return
    const bad = es.regions.filter((r) => !r.name.trim())
    if (bad.length) {
      toast.error('Every region needs a name — customers see it.')
      return
    }
    if (!es.regions.some((r) => r.changeable && (sizes.get(r.id) ?? 0) > 0)) {
      toast.error('Make at least one region with an area changeable.')
      return
    }
    setBusy('save')
    try {
      const keep = es.regions.filter((r) => (sizes.get(r.id) ?? 0) > 0)
      // upload only masks that changed since they were last uploaded
      let done = 0
      const urls = await mapLimit(keep, UPLOAD_CONCURRENCY, async (r) => {
        const hash = maskHash(r.mask)
        if (r.maskUrl && r.maskHash === hash) return { url: r.maskUrl, hash }
        const inProduct = r.mask.map((m, q) => (m && product[q] ? 1 : 0))
        const file = await maskToFile(softenMask(inProduct, photo.w, photo.h), photo.w, photo.h, base.width!, base.height!, `region-${r.id}.png`)
        const up = await uploadPreviewImage(productId, file, 'mask', base)
        setStatus(`Uploading regions… ${++done}`)
        return { url: up.url, hash }
      })
      const productHash = maskHash(product)
      let backgroundMaskUrl = bgUrl?.hash === productHash ? bgUrl.url : undefined
      if (!backgroundMaskUrl) {
        const bg = new Uint8ClampedArray(product.length)
        for (let q = 0; q < bg.length; q++) bg[q] = product[q] ? 0 : 255
        backgroundMaskUrl = (await uploadPreviewImage(productId, await maskToFile(bg, photo.w, photo.h, base.width, base.height, 'background.png'), 'mask', base)).url
      }

      const usedGroups = es.groups.filter((g) => keep.some((r) => r.groupId === g.id))
      const saved = await saveRegionConfig(productId, {
        baseUrl: base.url,
        width: base.width,
        height: base.height,
        backgroundMaskUrl,
        groups: usedGroups.map((g) => ({ id: g.id, name: g.name.trim() || 'Group', sharedColor: g.sharedColor, colorIds: g.colorIds })),
        regions: keep.map((r, i) => ({
          id: r.id,
          name: r.name.trim(),
          maskUrl: urls[i].url,
          groupId: r.groupId,
          changeable: r.changeable,
          colorIds: r.colorIds,
          allowOverlap: r.allowOverlap,
          locked: r.locked,
          hidden: r.hidden,
          hex: r.hex,
        })),
        removeOtherColourOptions: removeOthers,
      })
      setBgUrl({ url: backgroundMaskUrl, hash: productHash })
      setEs((s) => ({
        ...s,
        regions: s.regions.map((r) => {
          const i = keep.indexOf(r)
          return i >= 0 ? { ...r, maskUrl: urls[i].url, maskHash: urls[i].hash } : r
        }),
      }))
      toast.success('Saved — customers see these regions now')
      setFullscreen(false)
      await onSaved(saved)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(null)
      setStatus(null)
    }
  }

  // ---- render ----

  if (library.length === 0) {
    return (
      <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
        Your Colors library is empty. Add the yarn colours you stock under{' '}
        <Link href="/admin/colors" className="font-medium underline">
          Colors
        </Link>{' '}
        — customers can only choose from those.
      </p>
    )
  }

  const TOOLS: { group: string; items: { key: Tool; label: string; icon: typeof Plus; hint: string; k?: string }[] }[] = [
    {
      group: 'Select',
      items: [
        { key: 'pick', label: 'Pick', icon: MousePointer2, hint: 'Click a region to select it (Shift/Ctrl adds more). Click a suggested area to add it — Shift-click adds it to the selected region.', k: 'V' },
        { key: 'hand', label: 'Move view', icon: Hand, hint: 'Drag to look around when zoomed in (or hold Space).', k: 'H' },
        { key: 'move', label: 'Move region', icon: Move, hint: 'Drag the selected region to a new place — handy for duplicated repeated elements.', k: 'G' },
      ],
    },
    {
      group: 'Add area',
      items: [
        { key: 'ai', label: 'AI select', icon: BrainCircuit, hint: 'Click a part — AI outlines the whole object, shadows and texture included. Right-click or Alt-click excludes a spot.', k: 'S' },
        { key: 'quick', label: 'Quick', icon: Sparkles, hint: 'Drag over an area — it spreads over similar colour up to edges. Alt takes away.', k: 'Q' },
        { key: 'wand', label: 'Wand', icon: WandSparkles, hint: 'Click an area to add everything connected and similar in colour. Alt-click takes away.', k: 'W' },
        { key: 'lasso', label: 'Lasso', icon: Lasso, hint: 'Drag to draw freehand, or click points and click the first one to close. Alt takes away.', k: 'L' },
        { key: 'rect', label: 'Box', icon: Square, hint: 'Drag a rectangle. Alt takes away.', k: 'M' },
      ],
    },
    {
      group: 'Paint',
      items: [
        { key: 'brush', label: 'Brush', icon: Paintbrush, hint: 'Paint the selected region. Alt takes away.', k: 'B' },
        { key: 'eraser', label: 'Eraser', icon: Eraser, hint: 'Remove areas from regions (all, or only the selected one).', k: 'E' },
      ],
    },
    {
      group: 'Background',
      items: [
        { key: 'bgRemove', label: 'Remove', icon: SquareDashedMousePointer, hint: 'Mark areas as background — never recoloured, never part of a region.' },
        { key: 'bgRestore', label: 'Restore', icon: SquarePlus, hint: 'Bring back parts of the piece that were treated as background.' },
      ],
    },
  ]
  const activeTool = TOOLS.flatMap((g) => g.items).find((t) => t.key === tool)!
  const panMode = tool === 'hand' || spaceDown
  const ratio = photo ? photo.w / photo.h : 1
  const activeGroup = es.groups.find((g) => g.id === activeGroupId)
  const panelTarget: PanelTarget | null = activeGroup
    ? { kind: 'group', group: activeGroup, regions: es.regions.filter((r) => r.groupId === activeGroup.id) }
    : activeRegion
      ? { kind: 'region', region: activeRegion, group: es.groups.find((g) => g.id === activeRegion.groupId) }
      : null
  const cursorClass = panMode
    ? 'cursor-grab'
    : mode === 'preview'
      ? 'cursor-default'
      : tool === 'pick'
        ? 'cursor-pointer'
        : BRUSH_TOOLS.includes(tool) || (BG_TOOLS.includes(tool) && shape === 'brush')
          ? 'cursor-none'
          : 'cursor-crosshair'

  return (
    <div className={cn('rounded-xl border bg-background', fullscreen && 'fixed inset-0 z-50 flex flex-col overflow-hidden rounded-none border-0')}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Customization regions
        </p>
        {photo && (
          <div className="flex rounded-lg bg-muted p-0.5 text-xs">
            {(
              [
                { m: 'edit', label: 'Edit', icon: Paintbrush },
                { m: 'inspect', label: 'Inspect', icon: ScanSearch },
                { m: 'preview', label: 'Preview', icon: Eye },
              ] as const
            ).map((o) => (
              <button
                key={o.m}
                type="button"
                onClick={() => {
                  setMode(o.m)
                  if (o.m === 'preview' && testColours.size === 0) shuffle()
                }}
                className={cn('flex items-center gap-1 rounded-md px-2 py-1 font-medium', mode === o.m ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <o.icon className="h-3.5 w-3.5" /> {o.label}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {base.url && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={changePhoto} disabled={busy !== null}>
              <ImageIcon className="h-3.5 w-3.5" /> Change photo
            </Button>
          )}
          {photo && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setFullscreen((v) => !v)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />} {fullscreen ? 'Exit full screen' : 'Full screen'}
            </Button>
          )}
        </div>
      </div>

      {!base.url ? (
        <div className="space-y-3 p-3">
          <p className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-primary" /> Which photo should customers recolour?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {productImages.map((src) => (
              <button
                key={src}
                type="button"
                disabled={busy !== null}
                onClick={() => pickProductPhoto(src)}
                className="relative h-24 w-24 overflow-hidden rounded-lg border transition hover:ring-2 hover:ring-primary disabled:opacity-50"
                title="Use this photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            <label className={cn('flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary', busy && 'pointer-events-none opacity-50')}>
              {busy === 'photo' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              Upload
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadBaseFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      ) : !photo ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {status ?? 'Working…'}
        </div>
      ) : (
        <div className={cn('grid gap-4 p-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]', fullscreen && 'min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_26rem]')}>
          {/* Canvas side */}
          <div className={cn('min-w-0 space-y-2', !fullscreen && 'lg:sticky lg:top-4 lg:self-start', fullscreen && 'flex min-h-0 flex-col')}>
            {mode === 'edit' && (
              <div className="space-y-1">
                {TOOLS.map((g) => (
                  <div key={g.group} className="flex items-center gap-2">
                    <p className="w-[4.5rem] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{g.group}</p>
                    <div className="flex min-w-0 flex-1 gap-0.5 rounded-lg bg-muted p-0.5 text-[11px]">
                      {g.items.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          title={`${t.hint}${t.k ? ` (${t.k})` : ''}`}
                          onClick={() => setTool(t.key)}
                          className={cn(
                            'flex min-w-0 flex-1 basis-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 font-medium transition-colors',
                            tool === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <t.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* options + zoom */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-2 py-1.5 text-xs text-muted-foreground">
              {mode === 'edit' && (tool === 'quick' || tool === 'wand') && (
                <label className="flex min-w-36 flex-1 items-center gap-1.5" title="How far a click or drag spreads">
                  Tight
                  <input type="range" min={0} max={1} step={0.05} value={looseness} onChange={(e) => setLooseness(Number(e.target.value))} className="min-w-0 flex-1" aria-label="Spread" />
                  Loose
                </label>
              )}
              {mode === 'edit' && BG_TOOLS.includes(tool) && (
                <div className="flex rounded-md bg-muted p-0.5">
                  {(['brush', 'box', 'lasso'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setShape(s)} className={cn('rounded px-2 py-0.5 font-medium capitalize', shape === s ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground')}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'edit' && (BRUSH_TOOLS.includes(tool) || (BG_TOOLS.includes(tool) && shape === 'brush')) && (
                <label className="flex min-w-36 flex-1 items-center gap-1.5" title="Brush size — [ and ] keys">
                  <Paintbrush className="h-3.5 w-3.5 shrink-0" />
                  <input type="range" min={3} max={100} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="min-w-0 flex-1" aria-label="Brush size" />
                  <span className="w-9 tabular-nums">{brushSize}px</span>
                </label>
              )}
              {mode === 'edit' && (tool === 'brush' || tool === 'eraser') && (
                <label className="flex items-center gap-1.5" title="Only touch pixels of the same yarn as where the stroke starts">
                  <Switch checked={smartEdges} onCheckedChange={setSmartEdges} /> Smart edges
                </label>
              )}
              {mode === 'edit' && tool === 'eraser' && (
                <label className="flex items-center gap-1.5" title="Erase only from the selected region">
                  <Switch checked={eraseActiveOnly} onCheckedChange={setEraseActiveOnly} /> Selected only
                </label>
              )}
              {mode === 'preview' && (
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={shuffle}>
                  <Shuffle className="h-3.5 w-3.5" /> Try other colours
                </Button>
              )}
              <div className="ml-auto flex items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(zoom / 1.25)} disabled={zoom <= ZOOM_MIN} title="Zoom out (−)">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button type="button" onClick={fit} className="w-11 rounded px-1 py-0.5 text-center tabular-nums hover:bg-muted" title="Fit (0)">
                  {Math.round(zoom * 100)}%
                </button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(zoom * 1.25)} disabled={zoom >= ZOOM_MAX} title="Zoom in (+) · Ctrl + scroll">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <span className="mx-1 h-4 w-px bg-border" />
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Shift+Z)">
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {pending && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-pink-500/40 bg-pink-500/5 px-2 py-1.5 text-xs">
                <BrainCircuit className="h-4 w-4 text-pink-600" />
                <span className="font-medium">AI selection</span>
                <span className="tabular-nums text-muted-foreground">
                  {productArea ? ((maskArea(pending.candidates[pending.index].mask) / productArea) * 100).toFixed(1) : '0'}% of the piece · {pending.points.length} click{pending.points.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={pending.index === 0} onClick={() => setPending({ ...pending, index: pending.index - 1 })} title="Smaller shape (,)">
                    <ChevronLeft className="h-3.5 w-3.5" /> Smaller
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={pending.index >= pending.candidates.length - 1} onClick={() => setPending({ ...pending, index: pending.index + 1 })} title="Larger shape (.)">
                    Larger <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => acceptPending(false)} title="Enter">
                    <Check className="h-3.5 w-3.5" /> {activeRegion ? `Add to “${activeRegion.name}”` : 'Make a region'}
                  </Button>
                  {activeRegion && (
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => acceptPending(true)}>
                      <Plus className="h-3.5 w-3.5" /> New region
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPending(null)} title="Esc">
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className={cn('flex justify-center', fullscreen && 'min-h-0 flex-1')}>
              <div
                ref={viewportRef}
                className="relative overflow-hidden rounded-lg bg-muted"
                style={{
                  aspectRatio: `${photo.w} / ${photo.h}`,
                  width: fullscreen ? `min(100%, calc((100dvh - 16rem) * ${ratio}))` : `min(100%, calc(72dvh * ${ratio}))`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className={cn('absolute left-0 top-0 h-full w-full origin-top-left touch-none', cursorClass)}
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onLostPointerCapture={() => {
                    panning.current = null
                    endStroke()
                  }}
                  onDoubleClick={() => lasso && closeLasso()}
                  onContextMenu={(e) => e.preventDefault()}
                  onPointerLeave={() => {
                    setHover(null)
                    setHoverSuggestion(null)
                    setCursor(null)
                  }}
                />
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-start gap-1.5">
                {mode === 'edit' ? (
                  <>
                    <activeTool.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      {activeTool.hint}
                      {tool === 'ai' && aiReady === 'failed' && <strong className="text-destructive"> AI selection couldn&apos;t start here — use Quick select or Lasso.</strong>}
                      {activeRegion && ['ai', 'quick', 'wand', 'lasso', 'rect', 'brush'].includes(tool) && (
                        <>
                          {' '}
                          Adding to <strong className="text-foreground">{activeRegion.name}</strong>.
                        </>
                      )}
                    </span>
                  </>
                ) : mode === 'inspect' ? (
                  <span>Every region in its own colour with its name; magenta stripes show pixels shared by two regions. Click a region in the list to focus it.</span>
                ) : (
                  <span>How customers see it with sample colours from each region&apos;s allowed list.</span>
                )}
              </span>
              <button type="button" onClick={() => setShowKeys((v) => !v)} className="flex shrink-0 items-center gap-1 hover:text-foreground">
                <Keyboard className="h-3.5 w-3.5" /> Keys
              </button>
            </div>
            {showKeys && (
              <p className="rounded-lg bg-muted px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                S AI select (right-click excludes, , . smaller/larger, Enter add) · V pick · H/Space move view · G move region · Q quick · W wand · L lasso · M box · B brush · E eraser · Alt take away · [ ] brush size · Ctrl+scroll or + − zoom · 0 fit · I inspect ·
                Ctrl+Z undo · Ctrl+Shift+Z redo · Ctrl+D duplicate · Del delete · Enter close lasso · Esc cancel
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">Striped = background (never recoloured) · pink = part of the piece that isn&apos;t in any region.</p>
          </div>

          {/* Side panel */}
          <div className={cn('min-w-0 space-y-3', fullscreen && 'min-h-0 overflow-y-auto pr-1')}>
            {status && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {status}
              </p>
            )}

            {/* Suggestions (assistant only) */}
            {clusters.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-dashed p-2.5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <WandSparkles className="h-3.5 w-3.5 text-primary" /> Suggested regions ({clusters.length})
                  </p>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={acceptAllSuggestions}>
                      Add all
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setSuggestions([])}>
                      Dismiss
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {suggestionSource === 'ai' ? 'Found by AI' : 'Found by colour (AI wasn’t available)'}; parts of the same colour are combined. Point at the photo to see each one and{' '}
                  <strong>click it</strong> (or Add). If you already have a region of that colour, it&apos;s added to it.
                </p>
                <ul className="space-y-1">
                  {clusters.map((c) => {
                    const pct = productArea ? Math.max(1, Math.round((c.area / productArea) * 100)) : 0
                    const others = es.regions.filter((r) => !r.locked && r.id !== c.match?.id)
                    return (
                      <li
                        key={c.id}
                        onMouseEnter={() => setHoverSuggestion(c.id)}
                        onMouseLeave={() => setHoverSuggestion(null)}
                        className={cn('flex items-center gap-2 rounded-md px-1 py-0.5 text-xs', hoverSuggestion === c.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted')}
                      >
                        <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-border" style={{ background: c.hex }} />
                        <span className="min-w-0 flex-1 truncate tabular-nums text-muted-foreground">
                          {c.parts.length > 1 ? `${c.parts.length} parts · ${pct}%` : `${pct}% of the piece`}
                        </span>
                        <div className="flex shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={c.match ? 'default' : 'outline'}
                            className="h-6 max-w-[11rem] rounded-r-none px-2 text-[11px]"
                            onClick={() => addSuggested(c, c.match ?? null)}
                            title={c.match ? `Same colour as “${c.match.name}”` : 'Make it a new region'}
                          >
                            {c.match ? <Combine className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            <span className="truncate">{c.match ? `Add to “${c.match.name}”` : 'Add'}</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" size="sm" variant={c.match ? 'default' : 'outline'} className="h-6 rounded-l-none border-l border-l-background/30 px-1" aria-label="More ways to add">
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {c.match && (
                                <DropdownMenuItem onSelect={() => addSuggested(c, null)}>
                                  <Plus className="h-4 w-4" /> As a new region
                                </DropdownMenuItem>
                              )}
                              {others.length > 0 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Combine className="h-4 w-4" /> Add to a region
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="max-h-72 w-48 overflow-y-auto">
                                    {others.map((r) => (
                                      <DropdownMenuItem key={r.id} onSelect={() => addSuggested(c, r)}>
                                        <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-border" style={{ background: r.hex }} />
                                        <span className="truncate">{r.name}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                              {c.parts.length > 1 && (
                                <DropdownMenuItem onSelect={() => setSeparate((set) => new Set([...set, ...c.parts.map((pt) => pt.id)]))}>
                                  <Scissors className="h-4 w-4" /> Show its {c.parts.length} parts separately
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => suggestionToBackground(c)}>
                                <SquareDashedMousePointer className="h-4 w-4" /> It&apos;s background
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => dropSuggestions(c.parts)} aria-label="Dismiss" title="Dismiss">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              product && (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => findSuggestions(photo, product, true)} disabled={status !== null}>
                  <WandSparkles className="h-3.5 w-3.5" /> Suggest regions from the photo
                </Button>
              )
            )}

            {/* Regions that look like the same yarn: one click to merge */}
            {sameSets.length > 0 && (
              <div className="space-y-1 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Combine className="h-3.5 w-3.5 text-primary" /> Same colour — merge?
                </p>
                {sameSets.map((set) => {
                  const keep = mergeTarget(set, sizes)!
                  const names = set.map((r) => `“${r.name}”`)
                  return (
                    <div
                      key={setKey(set)}
                      onMouseEnter={() => setHoverSet(set.map((r) => r.id))}
                      onMouseLeave={() => setHoverSet(null)}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-1 py-1 text-xs hover:bg-background"
                    >
                      <span className="flex shrink-0 -space-x-1.5">
                        {set.map((r) => (
                          <span key={r.id} className="h-4 w-4 rounded-full ring-2 ring-background" style={{ background: r.hex }} />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1">
                        {names.slice(0, -1).join(', ')} and {names.at(-1)} look like the same yarn.
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <Button type="button" size="sm" className="h-6 px-2 text-[11px]" onClick={() => mergeSet(set)}>
                          <Combine className="h-3 w-3" /> Merge into “{keep.name}”
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setApart((a) => new Set(a).add(setKey(set)))}>
                          Keep separate
                        </Button>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <RegionTree
              state={es}
              activeId={activeId}
              activeGroupId={activeGroupId}
              selectedIds={selectedIds}
              coverage={coverage}
              inspect={mode === 'inspect'}
              details={details}
              canPaste={Boolean(clipboard)}
              onSelect={selectRegion}
              onSelectGroup={(id) => {
                setActiveGroupId(id)
                setActiveId(null)
                setSelectedIds(es.regions.filter((r) => r.groupId === id).map((r) => r.id))
              }}
              onHover={setHover}
              onPatch={(id, patch) => commit((s) => updateRegion(s, id, patch))}
              onReorder={(id, dir) => commit((s) => reorderRegion(s, id, dir))}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onSplit={onSplit}
              onCopySettings={(id) => {
                const r = es.regions.find((x) => x.id === id)
                if (r) {
                  setClipboard(copySettings(r))
                  toast.success(`Copied settings of “${r.name}”`)
                }
              }}
              onPasteSettings={(ids) => clipboard && commit((s) => pasteSettings(s, ids, clipboard))}
              onGroupSelected={onGroupSelected}
              onMergeSelected={() => mergeSet(es.regions.filter((r) => selectedIds.includes(r.id)))}
              onMergeInto={(id, targetId) => {
                commit((s) => mergeRegions(s, [id, targetId], targetId))
                setActiveId(targetId)
                setSelectedIds([targetId])
                setActiveGroupId(null)
              }}
              onUngroup={(gid) => {
                commit((s) => ungroup(s, gid))
                if (activeGroupId === gid) setActiveGroupId(null)
              }}
              onAddRegion={addRegion}
            />

            {panelTarget && (
              <ColourPanel
                target={panelTarget}
                library={library}
                paletteIds={paletteIds}
                productColourIds={productColourIds}
                groups={es.groups}
                coverage={coverage}
                onRegion={(id, patch) => {
                  setEs((s) => updateRegion(s, id, patch))
                  bump()
                }}
                onGroup={(id, patch) => {
                  setEs((s) => updateGroup(s, id, patch))
                  bump()
                }}
                onSelectGroup={(id) => {
                  setActiveGroupId(id)
                  setActiveId(null)
                }}
                onMoveToGroup={(rid, gid) => commit((s) => moveToGroup(s, [rid], gid))}
              />
            )}

            {warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200">
                {warnings.map((w) => (
                  <li key={w} className="flex gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}

            {otherOptions.length > 0 && (
              <label className="flex items-start gap-2 rounded-lg bg-muted p-2.5 text-xs">
                <input type="checkbox" className="mt-0.5" checked={removeOthers} onChange={(e) => setRemoveOthers(e.target.checked)} />
                <span>
                  Remove colour options that aren&apos;t part of these regions: <strong>{otherOptions.map((o) => o.label).join(', ')}</strong>
                </span>
              </label>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!confirm('Reload the saved setup and discard unsaved changes?')) return
                  if (base.url) load(base.url, base.url === config.baseUrl && config.mode === 'photo')
                }}
                disabled={busy !== null}
                title="Discard unsaved changes"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button type="button" onClick={save} disabled={busy !== null} className="flex-1">
                {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save {es.regions.length} region{es.regions.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
