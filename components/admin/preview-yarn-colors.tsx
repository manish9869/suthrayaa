'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Check,
  Eraser,
  Hand,
  ImageIcon,
  Keyboard,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  MousePointer2,
  Paintbrush,
  Plus,
  RotateCcw,
  Save,
  Scan,
  Sparkles,
  SquareDashedMousePointer,
  SquarePlus,
  Tag,
  Trash2,
  Undo2,
  WandSparkles,
  ZoomIn,
  ZoomOut,
  Combine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ProductCustomization } from '@/lib/data'
import { addLibraryColors, createCustomizationGroup, deleteCustomizationGroup, type AdminColor } from '@/lib/api/admin'
import { savePreviewConfig, uploadPreviewImage, type AdminPreviewConfig } from '@/lib/api/admin-preview'
import {
  detectYarnColors,
  growRegion,
  labToRgb,
  partsFromDetection,
  referenceAround,
  rgbToHex,
  softenMask,
  suggestYarns,
  tidyPart,
  toLabArray,
  yarnMatcher,
  type Lab,
} from '@/lib/preview/yarn-colors'
import { detectProduct } from '@/lib/preview/background-removal'

/**
 * Colour setup for a product photo, built for a busy shop owner rather than a designer:
 *   1. pick one of the product's photos — the background is removed automatically;
 *   2. the parts of the piece are found automatically (shadows folded in); name each one;
 *      fix anything Photoshop-style — Quick Select, Brush, Eraser, zoom and pan;
 *   3. save — each part becomes a customer colour option filled from the Colors library,
 *      with its mask generated and uploaded behind the scenes.
 */

const WORK_MAX = 900 // detection/masks run on a copy at most this big; masks are scaled up on save
const NAME_IDEAS = ['Petals', 'Centre', 'Leaves', 'Stem', 'Pot', 'Soil', 'Flowers', 'Band', 'Beads', 'Bells', 'Tassels', 'Body', 'Border', 'Strap']
const HISTORY = 12
const ZOOM_MIN = 1
const ZOOM_MAX = 8

type Tool = 'select' | 'hand' | 'addPart' | 'addTo' | 'quick' | 'paint' | 'erase' | 'notProduct' | 'isProduct'
/** Tools that draw with a brush (background tools can also use a box). */
const DRAW_TOOLS: Tool[] = ['quick', 'paint', 'erase', 'notProduct', 'isProduct']

interface Base {
  url?: string
  width?: number
  height?: number
}

interface EditPart {
  id: number
  hex: string
  mask: Uint8Array
  name: string
  changeable: boolean
}

interface Photo {
  w: number
  h: number
  rgba: Uint8ClampedArray
  lab: Float32Array
  /** Whether the background was removed automatically (vs. assumed to be none). */
  auto: boolean
}

interface Snapshot {
  parts: EditPart[]
  product: Uint8Array
}

interface Stroke {
  last: { x: number; y: number }
  /** canvas px per screen px at stroke start */
  scale: number
  target?: EditPart
  ref?: Lab
  match?: (L: number, a: number, b: number) => boolean
  /** last point Quick Select grew from, to space out growth */
  lastGrow?: { x: number; y: number }
  /** Alt held with Brush/Quick Select: take away from the selected part instead */
  subtract?: boolean
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the photo'))
    img.src = url
  })
}

/** Mask at working size → PNG at the base photo's size (so it passes the server's shape check). */
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
  return new Promise((resolve, reject) =>
    big.toBlob((b) => (b ? resolve(new File([b], name, { type: 'image/png' })) : reject(new Error('Could not create mask'))), 'image/png')
  )
}

/** Average photo colour of a mask, as hex. */
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

const cloneParts = (parts: EditPart[]) => parts.map((p) => ({ ...p, mask: p.mask.slice() }))
const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export function YarnColorSetup({
  productId,
  productImages,
  base,
  onBaseChange,
  libraryColors,
  colorGroups,
  onSaved,
}: {
  productId: string
  productImages: string[]
  base: Base
  onBaseChange: (b: Base) => void
  libraryColors: AdminColor[]
  colorGroups: ProductCustomization[]
  /** Colour options the saved preview currently paints with. */
  linkedGroupIds?: string[]
  /** Called after options + preview are saved; the parent reloads. */
  onSaved: (config?: AdminPreviewConfig) => void | Promise<void>
}) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [product, setProduct] = useState<Uint8Array | null>(null)
  const [parts, setParts] = useState<EditPart[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [looseness, setLooseness] = useState(0.5)
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [removeOld, setRemoveOld] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [brushSize, setBrushSize] = useState(18)
  const [shape, setShape] = useState<'brush' | 'box'>('brush')
  const [smartEdges, setSmartEdges] = useState(true)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [paintTick, setPaintTick] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [spaceDown, setSpaceDown] = useState(false)
  const [altDown, setAltDown] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)
  const stroke = useRef<Stroke | null>(null)
  const panning = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null)

  const activeLibrary = useMemo(() => libraryColors.filter((c) => c.is_active), [libraryColors])

  const analyse = useCallback(async (url: string) => {
    setPhoto(null)
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

      setStatus('Removing the background…')
      const found = await detectProduct(url, w, h, (pct) => setStatus(`Getting the background remover ready (one-time) · ${pct}%`))
      setStatus('Finding the parts…')
      await new Promise((r) => setTimeout(r, 0))
      const productMask = found ?? new Uint8Array(w * h).fill(1)
      const det = detectYarnColors(rgba, w, h, { product: found ?? undefined })
      const groups = suggestYarns(det.colors, { backgroundRemoved: Boolean(found) })
      const foundParts = partsFromDetection(det, productMask, groups)
      const lab = toLabArray(rgba, w, h)
      const p: Photo = { w, h, rgba, lab, auto: Boolean(found) }
      nextId.current = 1
      setParts(
        foundParts
          .map((fp) => ({ id: nextId.current++, hex: averageHex(p, fp.mask), mask: fp.mask, name: '', changeable: true }))
          .sort((a, b) => b.mask.reduce((s, v) => s + v, 0) - a.mask.reduce((s, v) => s + v, 0))
      )
      setProduct(productMask)
      setHistory([])
      setSelected(null)
      setTool('select')
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setPhoto(p)
    } catch {
      toast.error('Could not read the photo. Try another one.')
    } finally {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    if (base.url) analyse(base.url)
  }, [base.url, analyse])

  const productArea = useMemo(() => (product ? product.reduce((s, v) => s + v, 0) : 0), [product])
  const shares = useMemo(() => new Map(parts.map((p) => [p.id, p.mask.reduce((s, v) => s + v, 0) / Math.max(1, productArea)])), [parts, productArea])
  const partAt = useCallback((idx: number) => parts.find((p) => p.mask[idx])?.id ?? null, [parts])

  const remember = () => product && setHistory((h) => [...h.slice(-(HISTORY - 1)), { parts: cloneParts(parts), product: product.slice() }])
  const undo = () => {
    const last = history.at(-1)
    if (!last) return
    setParts(last.parts)
    setProduct(last.product)
    setHistory((h) => h.slice(0, -1))
  }

  // ---- view: zoom & pan ----

  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const v = viewportRef.current
    if (!v) return p
    const minX = v.clientWidth - v.clientWidth * z
    const minY = v.clientHeight - v.clientHeight * z
    return { x: Math.min(0, Math.max(minX, p.x)), y: Math.min(0, Math.max(minY, p.y)) }
  }, [])

  /** Zoom to `z`, keeping the point (vx, vy) of the viewport under the same spot. */
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

  // Ctrl/⌘ + wheel zooms at the pointer; plain wheel pans while zoomed in
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

  // ---- drawing the photo ----

  // Background striped; the hovered/selected part stands out, the rest dims.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !photo || !product) return
    const { w, h, rgba } = photo
    canvas.width = w
    canvas.height = h
    const img = new ImageData(new Uint8ClampedArray(rgba), w, h)
    const d = img.data
    const focus = parts.find((p) => p.id === (hover ?? selected))
    const assigned = new Uint8Array(w * h)
    for (const p of parts) for (let q = 0; q < p.mask.length; q++) if (p.mask[q]) assigned[q] = 1
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      if (!product[p]) {
        const x = p % w
        const y = (p - x) / w
        const stripe = (x + y) % 14 < 3
        const k = stripe ? 0.55 : 0.3
        const t = stripe ? 90 : 235
        d[i] = d[i] * k + t * (1 - k)
        d[i + 1] = d[i + 1] * k + t * (1 - k)
        d[i + 2] = d[i + 2] * k + t * (1 - k)
      } else if (focus && !focus.mask[p]) {
        d[i] = d[i] * 0.25 + 20
        d[i + 1] = d[i + 1] * 0.25 + 20
        d[i + 2] = d[i + 2] * 0.25 + 20
      } else if (!assigned[p]) {
        // part of the piece not in any part yet: light pink wash so gaps are easy to spot
        d[i] = d[i] * 0.45 + 255 * 0.55
        d[i + 1] = d[i + 1] * 0.45 + 190 * 0.55
        d[i + 2] = d[i + 2] * 0.45 + 230 * 0.55
      }
    }
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(img, 0, 0)
    if (box) {
      ctx.lineWidth = Math.max(2, w / 300) / zoom
      ctx.setLineDash([8 / zoom, 6 / zoom])
      ctx.strokeStyle = tool === 'isProduct' ? '#16a34a' : '#dc2626'
      ctx.strokeRect(Math.min(box.x0, box.x1), Math.min(box.y0, box.y1), Math.abs(box.x1 - box.x0), Math.abs(box.y1 - box.y0))
    }
    // brush outline under the pointer
    const boxMode = shape === 'box' && (tool === 'notProduct' || tool === 'isProduct')
    if (cursor && DRAW_TOOLS.includes(tool) && !boxMode && !spaceDown) {
      const rect = canvas.getBoundingClientRect()
      const r = (brushSize * w) / Math.max(1, rect.width)
      const lw = Math.max(1, (1.5 * w) / Math.max(1, rect.width))
      ctx.setLineDash([])
      ctx.lineWidth = lw
      ctx.strokeStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(cursor.x, cursor.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = tool === 'erase' || tool === 'notProduct' || (altDown && (tool === 'paint' || tool === 'quick')) ? '#dc2626' : '#6d4aff'
      ctx.beginPath()
      ctx.arc(cursor.x, cursor.y, r + lw, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [photo, product, parts, hover, selected, box, tool, cursor, paintTick, brushSize, shape, zoom, spaceDown, altDown])

  const toPixel = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = Math.min(photo!.w - 1, Math.max(0, ((clientX - rect.left) / rect.width) * photo!.w))
    const y = Math.min(photo!.h - 1, Math.max(0, ((clientY - rect.top) / rect.height) * photo!.h))
    return { x, y, idx: Math.floor(y) * photo!.w + Math.floor(x), rectWidth: rect.width }
  }

  // ---- click tools: New part / Add to part ----

  const clickPart = (idx: number) => {
    if (!photo || !product) return
    if (!product[idx]) {
      toast.info('That spot is background. Use Background → Restore first if it belongs to the piece.')
      return
    }
    const region = growRegion(photo.lab, photo.w, photo.h, idx, product, looseness)
    if (region.reduce((s, v) => s + v, 0) < 20) {
      toast.info('Too small — try a slightly looser setting')
      return
    }
    remember()
    const target = tool === 'addTo' ? selected : null
    const id = target ?? nextId.current++
    setParts((prev) => {
      const next = prev.map((p) => {
        if (p.id === id) return p
        const mask = p.mask.slice()
        for (let q = 0; q < mask.length; q++) if (region[q]) mask[q] = 0
        return { ...p, mask }
      })
      if (target != null) {
        return next.map((p) => {
          if (p.id !== id) return p
          const mask = p.mask.slice()
          for (let q = 0; q < mask.length; q++) if (region[q]) mask[q] = 1
          return { ...p, mask, hex: averageHex(photo, mask) }
        })
      }
      return [...next, { id, hex: averageHex(photo, region), mask: region, name: '', changeable: true }]
    })
    setSelected(id)
    if (target == null) {
      setTool('quick')
      toast.success('Part added — name it on the right. Drag with Quick Select to add more.')
    }
  }

  // ---- brush tools: Quick Select / Brush / Eraser / Background ----

  const startStroke = (x: number, y: number, rectWidth: number, alt = false) => {
    if (!photo || !product) return
    let target: EditPart | undefined
    const subtract = alt && (tool === 'paint' || tool === 'quick')
    if (subtract && selected == null) {
      toast.info('Select the part to take away from first.')
      return
    }
    if (tool === 'paint' || tool === 'quick') {
      target = parts.find((p) => p.id === selected)
      if (!target && tool === 'paint') {
        toast.info('Select the part to paint first — click its card, or use Quick Select to start a new one.')
        return
      }
      if (!target) {
        // Quick Select with nothing selected starts a new part
        target = { id: nextId.current++, hex: '#999999', mask: new Uint8Array(photo.w * photo.h), name: '', changeable: true }
        const created = target
        setParts((prev) => [...prev, created])
        setSelected(created.id)
      }
    }
    remember()
    const at = Math.floor(y) * photo.w + Math.floor(x)
    const ref = referenceAround(photo.lab, photo.w, photo.h, at, product)
    stroke.current = {
      last: { x, y },
      scale: photo.w / Math.max(1, rectWidth),
      target,
      ref,
      subtract,
      // Brush/Eraser "smart edges" and Quick Select: only touch pixels of the yarn the stroke started on
      match: ((tool === 'paint' || tool === 'erase') && smartEdges) || tool === 'quick' ? yarnMatcher(ref, tool === 'quick' ? looseness : 0.6) : undefined,
    }
    stamp(x, y)
  }

  const stamp = (x: number, y: number) => {
    const s = stroke.current
    if (!s || !photo || !product) return
    const r = brushSize * s.scale
    const { w, h, lab } = photo
    const all = s.target && !parts.includes(s.target) ? [...parts, s.target] : parts
    const take = (q: number) => {
      for (const p of all) p.mask[q] = 0
      s.target!.mask[q] = 1
    }
    // step along the line from the last point so fast strokes don't leave gaps
    const dist = Math.hypot(x - s.last.x, y - s.last.y)
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, r / 2)))
    for (let i = 1; i <= steps; i++) {
      const cx: number = s.last.x + ((x - s.last.x) * i) / steps
      const cy: number = s.last.y + ((y - s.last.y) * i) / steps
      for (let yy = Math.max(0, Math.floor(cy - r)); yy <= Math.min(h - 1, Math.ceil(cy + r)); yy++) {
        for (let xx = Math.max(0, Math.floor(cx - r)); xx <= Math.min(w - 1, Math.ceil(cx + r)); xx++) {
          if ((xx - cx) ** 2 + (yy - cy) ** 2 > r * r) continue
          const q = yy * w + xx
          if (tool === 'notProduct') {
            product[q] = 0
            for (const p of all) p.mask[q] = 0
          } else if (tool === 'isProduct') {
            product[q] = 1
          } else if (tool === 'erase') {
            if (s.match && !s.match(lab[q * 3], lab[q * 3 + 1], lab[q * 3 + 2])) continue
            for (const p of all) p.mask[q] = 0
          } else if ((tool === 'paint' || tool === 'quick') && s.target && product[q]) {
            if (s.match && !s.match(lab[q * 3], lab[q * 3 + 1], lab[q * 3 + 2])) continue
            if (s.subtract) s.target.mask[q] = 0
            else take(q)
          }
        }
      }
      // Quick Select: from under the brush, spread to the rest of that yarn nearby
      if (tool === 'quick' && s.target) {
        const lg = s.lastGrow
        if (!lg || Math.hypot(cx - lg.x, cy - lg.y) >= r * 0.75) {
          s.lastGrow = { x: cx, y: cy }
          const seed = Math.floor(cy) * w + Math.floor(cx)
          if (product[seed] && s.match?.(lab[seed * 3], lab[seed * 3 + 1], lab[seed * 3 + 2])) {
            const region = growRegion(lab, w, h, seed, product, looseness, { ref: s.ref, within: { x: cx, y: cy, r: r * 3 }, raw: true, skip: s.subtract ? undefined : s.target.mask })
            for (let q = 0; q < region.length; q++) if (region[q]) (s.subtract ? (s.target.mask[q] = 0) : take(q))
          }
        }
      }
    }
    s.last = { x, y }
    setPaintTick((t) => t + 1)
  }

  const endStroke = () => {
    const s = stroke.current
    if (!s || !photo || !product) return
    stroke.current = null
    const target = s.target
    if (tool === 'quick' && target && !s.subtract) {
      // close stitch gaps / small holes once, then keep parts exclusive
      const tidy = tidyPart(target.mask, photo.w, photo.h, product)
      target.mask.set(tidy)
      for (const p of parts) if (p !== target) for (let q = 0; q < tidy.length; q++) if (tidy[q]) p.mask[q] = 0
    }
    if (tool === 'notProduct' || tool === 'isProduct') setProduct((prev) => (prev ? prev.slice() : prev))
    // new object identities so shares/colours recompute; drop parts that ended up empty
    setParts((prev) => {
      const list = target && !prev.includes(target) ? [...prev, target] : prev
      return list.filter((p) => p.mask.some(Boolean) || p === target).map((p) => ({ ...p, hex: p === target ? averageHex(photo, p.mask) : p.hex }))
    })
  }

  const applyBox = (b: NonNullable<typeof box>) => {
    if (!photo || !product) return
    const x0 = Math.floor(Math.min(b.x0, b.x1)), x1 = Math.ceil(Math.max(b.x0, b.x1))
    const y0 = Math.floor(Math.min(b.y0, b.y1)), y1 = Math.ceil(Math.max(b.y0, b.y1))
    if (x1 - x0 < 3 || y1 - y0 < 3) return
    remember()
    const next = product.slice()
    const v = tool === 'isProduct' ? 1 : 0
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) next[y * photo.w + x] = v
    setProduct(next)
    if (!v) setParts((prev) => prev.map((p) => ({ ...p, mask: p.mask.map((m, q) => (next[q] ? m : 0)) })))
  }

  // ---- keyboard shortcuts (Photoshop-style) ----

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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      undo()
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const map: Record<string, Tool> = { v: 'select', h: 'hand', w: 'addPart', a: 'addTo', q: 'quick', b: 'paint', e: 'erase' }
    const k = e.key.toLowerCase()
    if (map[k]) {
      if ((map[k] === 'addTo' || map[k] === 'paint') && selected == null) return
      setTool(map[k])
    } else if (e.key === '[') setBrushSize((s) => Math.max(4, s - 3))
    else if (e.key === ']') setBrushSize((s) => Math.min(80, s + 3))
    else if (e.key === '+' || e.key === '=') zoomTo(zoom * 1.25)
    else if (e.key === '-') zoomTo(zoom / 1.25)
    else if (e.key === '0') fit()
    else if (e.key === 'Escape' && fullscreen) setFullscreen(false)
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

  // ---- photo pick, part edits, save ----

  const pickProductPhoto = async (url: string) => {
    setBusy('photo')
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const up = await uploadPreviewImage(productId, new File([blob], 'base', { type: blob.type || 'image/jpeg' }), 'base')
      onBaseChange({ url: up.url, width: up.width, height: up.height })
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : 'Could not use that photo')
    } finally {
      setBusy(null)
    }
  }

  const updatePart = (id: number, patch: Partial<EditPart>) => setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const deletePart = (id: number) => {
    remember()
    setParts((prev) => prev.filter((p) => p.id !== id))
    if (selected === id) setSelected(null)
  }
  const mergePart = (id: number, into: number) => {
    remember()
    setParts((prev) => {
      const from = prev.find((p) => p.id === id)!
      return prev
        .filter((p) => p.id !== id)
        .map((p) => {
          if (p.id !== into) return p
          const mask = p.mask.slice()
          for (let q = 0; q < mask.length; q++) if (from.mask[q]) mask[q] = 1
          return { ...p, mask }
        })
    })
    setSelected(into)
  }

  const changeable = parts.filter((p) => p.changeable)
  const label = (p: EditPart, i: number) => p.name.trim() || `Colour ${i + 1}`
  const usedNames = new Set(parts.map((p) => p.name.trim().toLowerCase()).filter(Boolean))
  const oldGroups = colorGroups.filter((g) => !changeable.some((p, i) => label(p, i).toLowerCase() === g.label.toLowerCase()))
  const unnamed = changeable.filter((p) => !p.name.trim()).length
  const bgSuspicious = photo && (!photo.auto || productArea > photo.w * photo.h * 0.85)

  const save = async () => {
    if (!photo || !product || !base.url || !base.width || !base.height) return
    if (changeable.length === 0) {
      toast.error('Keep at least one part customers can change')
      return
    }
    setBusy('save')
    try {
      const layers: { customizationId: string; maskUrl: string }[] = []
      const stampId = Date.now().toString(36)
      for (const [i, p] of changeable.entries()) {
        const inProduct = p.mask.map((m, q) => (m && product[q] ? 1 : 0))
        const mask = softenMask(inProduct, photo.w, photo.h)
        const file = await maskToFile(mask, photo.w, photo.h, base.width, base.height, `part-${i + 1}.png`)
        const up = await uploadPreviewImage(productId, file, 'mask', base)

        // Reuse an existing colour option with the same name (keeps customers' carts valid)
        const name = label(p, i)
        let groupId = colorGroups.find((g) => g.label.trim().toLowerCase() === name.toLowerCase())?.id
        if (!groupId) {
          const key = `colour_${i + 1}_${stampId}`
          const updated = await createCustomizationGroup(productId, {
            name: key,
            label: name,
            type: 'color',
            required: false,
            enabled: true,
            sortOrder: 100 + i,
            defaultValue: p.hex, // the colour in the photo — shown to customers as "Original"
          })
          const created = updated.customizations.find((g) => g.name === key)
          if (!created) throw new Error('Could not create the colour option')
          groupId = created.id
          await addLibraryColors(productId, groupId, activeLibrary.map((c) => c.id))
        }
        layers.push({ customizationId: groupId, maskUrl: up.url })
      }
      const saved = await savePreviewConfig(productId, { mode: 'photo', baseUrl: base.url, width: base.width, height: base.height, layers })

      if (removeOld) {
        const keep = new Set(layers.map((l) => l.customizationId))
        for (const g of colorGroups) if (!keep.has(g.id)) await deleteCustomizationGroup(productId, g.id)
      }

      toast.success(`Saved — customers can now change ${layers.length} part${layers.length > 1 ? 's' : ''}`)
      setFullscreen(false)
      await onSaved(saved)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  // ---- render ----

  if (activeLibrary.length === 0) {
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

  const step = !base.url || !photo ? 1 : 2
  const TOOL_GROUPS: { title: string; tools: { key: Tool; label: string; icon: typeof Plus; hint: string; key2: string; needsPart?: boolean }[] }[] = [
    {
      title: 'Select',
      tools: [
        { key: 'select', label: 'Pick', icon: MousePointer2, hint: 'Click a part to select it.', key2: 'V' },
        { key: 'hand', label: 'Move', icon: Hand, hint: 'Drag to move around when zoomed in (or hold Space).', key2: 'H' },
        { key: 'addPart', label: 'New part', icon: WandSparkles, hint: 'Click an area — the whole area of that yarn becomes a new part.', key2: 'W' },
        { key: 'addTo', label: 'Add click', icon: Plus, hint: 'Click more areas to add them to the selected part.', key2: 'A', needsPart: true },
      ],
    },
    {
      title: 'Paint',
      tools: [
        { key: 'quick', label: 'Quick select', icon: Sparkles, hint: 'Drag over an area — the selection spreads to that yarn up to its edges. Hold Alt to take away.', key2: 'Q' },
        { key: 'paint', label: 'Brush', icon: Paintbrush, hint: 'Paint to add to the selected part. Hold Alt to take away from it.', key2: 'B', needsPart: true },
        { key: 'erase', label: 'Eraser', icon: Eraser, hint: 'Paint to take areas out of every part.', key2: 'E' },
      ],
    },
    {
      title: 'Background',
      tools: [
        { key: 'notProduct', label: 'Remove', icon: SquareDashedMousePointer, hint: 'Mark background that got included as part of the piece.', key2: '' },
        { key: 'isProduct', label: 'Restore', icon: SquarePlus, hint: 'Bring back any part of the piece that was cut off.', key2: '' },
      ],
    },
  ]
  const activeTool = TOOL_GROUPS.flatMap((g) => g.tools).find((t) => t.key === tool)!
  const bgTool = tool === 'notProduct' || tool === 'isProduct'
  const usesBox = bgTool && shape === 'box'
  const panMode = tool === 'hand' || spaceDown
  const selectedPart = parts.find((p) => p.id === selected)
  const ratio = photo ? photo.w / photo.h : 1

  return (
    <div className={cn('rounded-xl border bg-background', fullscreen && 'fixed inset-0 z-50 flex flex-col overflow-hidden rounded-none border-0')}>
      {/* Steps */}
      <ol className="flex items-center gap-2 border-b px-3 py-2.5 text-xs">
        {[
          { label: 'Pick a photo', icon: ImageIcon },
          { label: 'Check the parts', icon: Layers },
          { label: 'Save', icon: Save },
        ].map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-5 bg-border" />}
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                step > i + 1 ? 'bg-primary text-primary-foreground' : step === i + 1 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
              )}
            >
              {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
            </span>
            <span className={cn('hidden sm:inline', step === i + 1 ? 'font-medium' : 'text-muted-foreground')}>{s.label}</span>
          </li>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {base.url && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onBaseChange({})} disabled={busy !== null}>
              <ImageIcon className="h-3.5 w-3.5" /> Change photo
            </Button>
          )}
          {photo && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setFullscreen((v) => !v)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />} {fullscreen ? 'Exit full screen' : 'Full screen'}
            </Button>
          )}
        </div>
      </ol>

      {!base.url ? (
        <div className="space-y-3 p-3">
          <p className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-primary" /> Which photo should customers recolour?
          </p>
          {productImages.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add photos in the Media tab first.</p>
          ) : (
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
              {busy === 'photo' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          )}
          <p className="text-xs text-muted-foreground">A photo of just this piece on a plain background works best.</p>
        </div>
      ) : !photo ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {status ?? 'Working…'}
        </div>
      ) : (
        <div className={cn('grid gap-4 p-3 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]', fullscreen && 'min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_24rem]')}>
          {/* Photo + tools */}
          <div className={cn('min-w-0 space-y-2', !fullscreen && 'md:sticky md:top-4 md:self-start', fullscreen && 'flex min-h-0 flex-col')}>
            {/* Toolbar */}
            <div className="space-y-1">
              {TOOL_GROUPS.map((g) => (
                <div key={g.title} className="flex items-center gap-2">
                  <p className="w-[4.75rem] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{g.title}</p>
                  <div className="flex min-w-0 flex-1 gap-0.5 rounded-lg bg-muted p-0.5 text-[11px]">
                    {g.tools.map((t) => {
                      const disabled = t.needsPart && selected == null
                      return (
                        <button
                          key={t.key}
                          type="button"
                          disabled={disabled}
                          title={`${disabled ? 'Select a part first. ' : ''}${t.hint}${t.key2 ? ` (${t.key2})` : ''}`}
                          onClick={() => setTool(t.key)}
                          className={cn(
                            'flex min-w-0 flex-1 basis-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 font-medium transition-colors disabled:opacity-40',
                            tool === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <t.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Tool options + zoom */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-2 py-1.5 text-xs text-muted-foreground">
              {(tool === 'addPart' || tool === 'addTo' || tool === 'quick') && (
                <label className="flex min-w-36 flex-1 items-center gap-1.5" title="How far a click or drag spreads">
                  <Scan className="h-3.5 w-3.5 shrink-0" /> Tight
                  <input type="range" min={0} max={1} step={0.05} value={looseness} onChange={(e) => setLooseness(Number(e.target.value))} className="min-w-0 flex-1" aria-label="How far a click spreads" />
                  Loose
                </label>
              )}
              {DRAW_TOOLS.includes(tool) && !usesBox && (
                <label className="flex min-w-36 flex-1 items-center gap-1.5" title="Brush size — [ and ] keys">
                  <Paintbrush className="h-3.5 w-3.5 shrink-0" />
                  <input type="range" min={4} max={80} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="min-w-0 flex-1" aria-label="Brush size" />
                  <span className="w-9 tabular-nums">{brushSize}px</span>
                </label>
              )}
              {bgTool && (
                <div className="flex rounded-md bg-muted p-0.5">
                  {(['brush', 'box'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShape(s)}
                      className={cn('flex items-center gap-1 rounded px-2 py-0.5 font-medium capitalize', shape === s ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground')}
                    >
                      {s === 'brush' ? <Paintbrush className="h-3 w-3" /> : <SquareDashedMousePointer className="h-3 w-3" />} {s}
                    </button>
                  ))}
                </div>
              )}
              {(tool === 'paint' || tool === 'erase') && (
                <label className="flex items-center gap-1.5" title="Only touches pixels of the same yarn as where you start the stroke, so you can work right up to an edge">
                  <Switch checked={smartEdges} onCheckedChange={setSmartEdges} />
                  Smart edges
                </label>
              )}
              <div className="ml-auto flex items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(zoom / 1.25)} disabled={zoom <= ZOOM_MIN} title="Zoom out (−)">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <button type="button" onClick={fit} className="w-11 rounded px-1 py-0.5 text-center tabular-nums hover:bg-muted" title="Fit to screen (0)">
                  {Math.round(zoom * 100)}%
                </button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomTo(zoom * 1.25)} disabled={zoom >= ZOOM_MAX} title="Zoom in (+) · or Ctrl + scroll">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <span className="mx-1 h-4 w-px bg-border" />
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)">
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
              </div>
            </div>

            {/* Photo */}
            <div className={cn('flex justify-center', fullscreen && 'min-h-0 flex-1')}>
              <div
                ref={viewportRef}
                className="relative overflow-hidden rounded-lg bg-muted"
                style={{
                  aspectRatio: `${photo.w} / ${photo.h}`,
                  width: fullscreen ? `min(100%, calc((100dvh - 15rem) * ${ratio}))` : `min(100%, calc(72dvh * ${ratio}))`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className={cn(
                    'absolute left-0 top-0 h-full w-full origin-top-left touch-none',
                    panMode ? (panning.current ? 'cursor-grabbing' : 'cursor-grab') : tool === 'select' ? 'cursor-pointer' : DRAW_TOOLS.includes(tool) && !usesBox ? 'cursor-none' : 'cursor-crosshair'
                  )}
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    if (panMode || e.button === 1) {
                      panning.current = { x: e.clientX, y: e.clientY, pan }
                      return
                    }
                    if (e.button !== 0) return
                    const { x, y, idx, rectWidth } = toPixel(e.clientX, e.clientY)
                    if (usesBox) setBox({ x0: x, y0: y, x1: x, y1: y })
                    else if (DRAW_TOOLS.includes(tool)) startStroke(x, y, rectWidth, e.altKey)
                    else if (tool === 'select') setSelected(partAt(idx))
                    else clickPart(idx)
                  }}
                  onPointerMove={(e) => {
                    const pressed = (e.buttons & 1) === 1 || (e.buttons & 4) === 4
                    if (panning.current) {
                      if (!pressed) panning.current = null
                      else {
                        const p0 = panning.current
                        setPan(clampPan({ x: p0.pan.x + e.clientX - p0.x, y: p0.pan.y + e.clientY - p0.y }, zoom))
                      }
                      return
                    }
                    const { x, y, idx } = toPixel(e.clientX, e.clientY)
                    if (DRAW_TOOLS.includes(tool)) setCursor({ x, y })
                    // only draw while the button is actually held; a missed release ends the stroke
                    if (stroke.current && !pressed) endStroke()
                    if (box && !pressed) setBox(null)
                    if (box && pressed) setBox({ ...box, x1: x, y1: y })
                    else if (stroke.current && pressed) stamp(x, y)
                    else if (tool === 'select') setHover(partAt(idx))
                  }}
                  onPointerUp={() => {
                    panning.current = null
                    if (box) applyBox(box)
                    setBox(null)
                    endStroke()
                  }}
                  onPointerCancel={() => {
                    panning.current = null
                    setBox(null)
                    endStroke()
                  }}
                  onLostPointerCapture={() => {
                    panning.current = null
                    endStroke()
                  }}
                  onPointerLeave={() => {
                    setHover(null)
                    setCursor(null)
                  }}
                />
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-start gap-1.5">
                <activeTool.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {activeTool.hint}
                  {(tool === 'quick' || tool === 'paint') && selectedPart && (
                    <>
                      {' '}
                      Adding to <strong className="text-foreground">{selectedPart.name.trim() || 'the selected part'}</strong>.
                    </>
                  )}
                </span>
              </span>
              <button type="button" onClick={() => setShowKeys((v) => !v)} className="flex shrink-0 items-center gap-1 hover:text-foreground">
                <Keyboard className="h-3.5 w-3.5" /> Shortcuts
              </button>
            </div>
            {showKeys && (
              <p className="rounded-lg bg-muted px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                <kbd>Q</kbd> Quick select · <kbd>B</kbd> Brush · <kbd>E</kbd> Eraser · <kbd>W</kbd> New part · <kbd>V</kbd> Pick · <kbd>H</kbd> or hold <kbd>Space</kbd> Move ·{' '}
                <kbd>Alt</kbd>+drag Take away · <kbd>[</kbd> <kbd>]</kbd> Brush size · <kbd>Ctrl</kbd>+scroll or <kbd>+</kbd> <kbd>−</kbd> Zoom · <kbd>0</kbd> Fit · <kbd>Ctrl</kbd>+<kbd>Z</kbd> Undo
              </p>
            )}
            {bgSuspicious && (
              <p className="flex gap-1.5 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The background couldn&apos;t be separated clearly on this photo. Use <strong>Background → Remove</strong> to paint it out, or pick a photo on a plain background.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">Striped = background · pink = part of the piece not in any part yet.</p>
          </div>

          {/* Parts */}
          <div className={cn('min-w-0 space-y-2.5', fullscreen && 'min-h-0 overflow-y-auto pr-1')}>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm">
                <Layers className="h-4 w-4 text-primary" />
                <span>
                  <strong>{parts.length}</strong> part{parts.length === 1 ? '' : 's'} — name each one, customers see these names.
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setSelected(null)
                  setTool('quick')
                  toast.info('Drag over the new part with Quick Select, or click it with New part.')
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add part
              </Button>
            </div>

            {parts.map((p, i) => (
              <div
                key={p.id}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setSelected(p.id)}
                className={cn(
                  'cursor-pointer rounded-lg border p-2.5 transition-colors',
                  selected === p.id ? 'border-primary bg-primary/[0.03] ring-1 ring-primary' : 'hover:border-primary/50',
                  !p.changeable && 'opacity-60'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="relative h-8 w-8 shrink-0 rounded-full ring-1 ring-border" style={{ background: p.hex }}>
                    {selected === p.id && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
                  </span>
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={p.name}
                      onChange={(e) => updatePart(p.id, { name: e.target.value })}
                      placeholder={`Name, e.g. ${NAME_IDEAS[i % NAME_IDEAS.length]}`}
                      className="h-8 pl-7 text-sm"
                      maxLength={30}
                    />
                  </div>
                  <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground" title="Customers can change this part's colour" onClick={(e) => e.stopPropagation()}>
                    <Switch checked={p.changeable} onCheckedChange={(v) => updatePart(p.id, { changeable: v })} />
                    <span className="hidden lg:inline">Changeable</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete this part"
                    title="Delete this part"
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePart(p.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {!p.name.trim() && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {NAME_IDEAS.filter((n) => !usedNames.has(n.toLowerCase())).slice(0, 8).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          updatePart(p.id, { name: n })
                        }}
                        className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{Math.max(1, Math.round((shares.get(p.id) ?? 0) * 100))}% of the piece</span>
                  {parts.length > 1 && (
                    <div onClick={(e) => e.stopPropagation()} className="ml-auto">
                      <Select value="" onValueChange={(v) => mergePart(p.id, Number(v))}>
                        <SelectTrigger className="h-6 w-auto gap-1 border-0 px-1.5 text-[11px] shadow-none">
                          <Combine className="h-3 w-3" />
                          <SelectValue placeholder="Same yarn as…" />
                        </SelectTrigger>
                        <SelectContent>
                          {parts
                            .filter((o) => o.id !== p.id)
                            .map((o) => (
                              <SelectItem key={o.id} value={String(o.id)}>
                                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: o.hex }} />
                                {o.name.trim() || `Part ${parts.indexOf(o) + 1}`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {oldGroups.length > 0 && (
              <label className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs">
                <input type="checkbox" className="mt-0.5" checked={removeOld} onChange={(e) => setRemoveOld(e.target.checked)} />
                <span>
                  Remove the old colour options customers see now: <strong>{oldGroups.map((g) => g.label).join(', ')}</strong>
                </span>
              </label>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => base.url && analyse(base.url)} disabled={busy !== null} title="Detect the parts again from scratch">
                <RotateCcw className="h-4 w-4" /> Start over
              </Button>
              <Button type="button" onClick={save} disabled={busy !== null || changeable.length === 0} className="flex-1">
                {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save {changeable.length} part{changeable.length === 1 ? '' : 's'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {unnamed > 0 ? `${unnamed} part${unnamed > 1 ? 's are' : ' is'} unnamed and will show as “Colour 1”, “Colour 2”… · ` : ''}
              Each part gets all {activeLibrary.length} colours from your library; untick some later in the Customization tab.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
