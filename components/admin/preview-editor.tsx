'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Palette, Shuffle, Save, Info, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ProductCustomization, ProductPreview } from '@/lib/data'
import { PREVIEW_TEMPLATES, getPreviewTemplate } from '@/lib/preview/templates'
import { ColorPreview } from '@/components/customize/color-preview'
import { RegionEditor } from '@/components/admin/region-editor/region-editor'
import type { AdminColor } from '@/lib/api/admin'
import { getPreviewConfig, savePreviewConfig, type AdminPreviewConfig, type PreviewMode } from '@/lib/api/admin-preview'

/**
 * Admin setup for the live colour preview. Two ways to show a product:
 *   • Real photo — the product photo divided into customization regions (region editor);
 *   • Illustration — a built-in drawing whose zones are linked to colour options.
 * "Off" keeps whatever was set up and just hides it from customers.
 */

interface DraftZone {
  key: string
  customizationId: string
  zone: string
}

const NONE = '__none__'
let keySeq = 0
const nextKey = () => `z${++keySeq}`

const MODES: { value: PreviewMode; title: string; body: string }[] = [
  { value: 'none', title: 'Off', body: 'No preview for this product.' },
  { value: 'photo', title: 'Real photo', body: 'Your product photo, divided into regions customers can recolour.' },
  { value: 'svg', title: 'Illustration', body: 'A built-in drawing. No photo prep needed.' },
]

const zonesOf = (c: AdminPreviewConfig): DraftZone[] =>
  c.layers.filter((l) => l.zone && l.customizationId).map((l) => ({ key: nextKey(), customizationId: l.customizationId!, zone: l.zone! }))

export function PreviewEditor({
  productId,
  customizations,
  productImages = [],
  productColorHexes = [],
  libraryColors = [],
  onCustomizationsChange,
}: {
  productId?: string
  customizations: ProductCustomization[]
  productImages?: string[]
  /** The product's own colours — the default palette photo regions inherit. */
  productColorHexes?: string[]
  libraryColors?: AdminColor[]
  /** Reload the product after the region editor saves (it creates/updates colour options). */
  onCustomizationsChange?: () => void | Promise<void>
}) {
  const [config, setConfig] = useState<AdminPreviewConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<PreviewMode>('none')
  const [svgTemplate, setSvgTemplate] = useState<string | undefined>()
  const [zones, setZones] = useState<DraftZone[]>([])
  const [testColors, setTestColors] = useState<Record<string, string | undefined>>({})
  const [saving, setSaving] = useState(false)

  const colorGroups = useMemo(() => customizations.filter((c) => c.type === 'color'), [customizations])

  useEffect(() => {
    if (!productId) return
    getPreviewConfig(productId)
      .then((c) => {
        setConfig(c)
        setMode(c.mode)
        setSvgTemplate(c.svgTemplate)
        setZones(zonesOf(c))
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [productId])

  if (!productId) {
    return <Hint>Save the product first, then come back here to set up its colour preview.</Hint>
  }
  if (loadError) return <Hint tone="warn">{loadError}</Hint>
  if (!config) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading colour preview…
      </div>
    )
  }

  const template = getPreviewTemplate(svgTemplate)
  const draftPreview: ProductPreview | null =
    mode === 'svg' && template ? { mode: 'svg', svgTemplate, layers: zones.map((z, i) => ({ id: z.key, customizationId: z.customizationId, zone: z.zone, sortOrder: i })) } : null

  const shuffle = () => {
    const next: Record<string, string> = {}
    for (const g of colorGroups) {
      const vals = g.values.filter((v) => v.enabled)
      if (vals.length) next[g.id] = vals[Math.floor(Math.random() * vals.length)].value
    }
    setTestColors(next)
  }

  const chooseTemplate = (key: string) => {
    setSvgTemplate(key)
    const keep = getPreviewTemplate(key)?.zones.map((z) => z.key) ?? []
    setZones((prev) => prev.filter((z) => keep.includes(z.zone)))
  }

  const setZoneGroup = (zone: string, customizationId: string) =>
    setZones((prev) => {
      const rest = prev.filter((z) => z.zone !== zone)
      return customizationId === NONE ? rest : [...rest, { key: nextKey(), zone, customizationId }]
    })

  /** Saves "Off" or the illustration setup (photo regions save from the region editor). */
  const save = async () => {
    if (mode === 'svg' && zones.length === 0) {
      toast.error('Link at least one part of the drawing to a colour option')
      return
    }
    setSaving(true)
    try {
      const saved = await savePreviewConfig(productId, {
        mode,
        svgTemplate: svgTemplate ?? null,
        baseUrl: config.baseUrl ?? null,
        width: config.width ?? null,
        height: config.height ?? null,
        layers: mode === 'svg' ? zones.map(({ customizationId, zone }) => ({ customizationId, zone })) : [],
      })
      setConfig(saved)
      toast.success(mode === 'none' ? 'Colour preview turned off — your setup is kept' : 'Colour preview saved')
      await onCustomizationsChange?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Palette className="h-4 w-4 text-violet" /> Live colour preview
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Customers choose yarn colours for the parts you define and see this piece repainted live. Choices, prices and order details are checked on the server.
          </p>
        </div>

        <SetupChecklist config={config} colorGroups={colorGroups} mode={mode} svgTemplate={svgTemplate} zones={zones} />

        <div className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn('rounded-xl border p-3 text-left transition-colors', mode === m.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground')}
            >
              <p className="text-sm font-medium">{m.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{m.body}</p>
            </button>
          ))}
        </div>

        {mode === 'photo' && (
          <RegionEditor
            productId={productId}
            productImages={productImages}
            productColorHexes={productColorHexes}
            config={config}
            libraryColors={libraryColors}
            colourOptions={colorGroups}
            onSaved={async (saved) => {
              setConfig(saved)
              await onCustomizationsChange?.()
            }}
          />
        )}

        {mode === 'svg' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <div>
                <Label className="mb-2 block">Illustration</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {PREVIEW_TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => chooseTemplate(t.key)}
                      className={cn('rounded-xl border p-2 text-center transition-colors', svgTemplate === t.key ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground')}
                    >
                      <div className="aspect-square">
                        <t.Component colors={Object.fromEntries(t.zones.map((z) => [z.key, z.defaultColor]))} />
                      </div>
                      <p className="mt-1 text-[11px] leading-tight">{t.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              {template && (
                <div className="space-y-2">
                  <Label className="block">Which colour option paints each part of the drawing?</Label>
                  {template.zones.map((z) => (
                    <div key={z.key} className="flex items-center gap-3">
                      <span className="h-4 w-4 shrink-0 rounded-full border" style={{ background: z.defaultColor }} />
                      <span className="w-32 shrink-0 text-sm">{z.label}</span>
                      <GroupSelect groups={colorGroups} value={zones.find((l) => l.zone === z.key)?.customizationId ?? NONE} onChange={(v) => setZoneGroup(z.key, v)} noneLabel="Fixed (default colour)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Test preview</Label>
                <Button type="button" variant="ghost" size="sm" onClick={shuffle} disabled={colorGroups.length === 0}>
                  <Shuffle className="h-4 w-4" /> Shuffle
                </Button>
              </div>
              <div className="aspect-square overflow-hidden rounded-xl border bg-blush/40 p-3">
                {draftPreview ? <ColorPreview preview={draftPreview} colors={testColors} alt="Test preview" className="h-full w-full" /> : <p className="p-4 text-center text-xs text-muted-foreground">Pick an illustration</p>}
              </div>
            </div>
          </div>
        )}

        {mode !== 'photo' && (
          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {mode === 'none' ? 'Turn preview off' : 'Save colour preview'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** A colour option a customer can actually pick from — the storefront ignores the rest. */
const isUsableGroup = (g: ProductCustomization) => g.enabled && g.values.some((v) => v.enabled && v.inLibrary !== false)

interface CheckItem {
  ok: boolean
  label: string
  /** Shown only while the item is failing: what to do about it. */
  fix: ReactNode
}

/**
 * Everything the storefront needs before a customer sees the preview (mirrors
 * `loadStorefrontPreview` in the backend), so a missing piece is named instead of the
 * preview silently not appearing.
 */
function SetupChecklist({
  config,
  colorGroups,
  mode,
  svgTemplate,
  zones,
}: {
  config: AdminPreviewConfig
  colorGroups: ProductCustomization[]
  mode: PreviewMode
  svgTemplate?: string
  zones: DraftZone[]
}) {
  const usable = new Set(colorGroups.filter(isUsableGroup).map((g) => g.id))
  const offLibrary = colorGroups.filter((g) => g.values.some((v) => v.inLibrary === false))
  const savedRegions = config.layers.filter((l) => l.maskUrl && l.regionType !== 'background' && l.regionType !== 'fixed' && l.customizationId && usable.has(l.customizationId))
  const zoneSig = (zs: { customizationId?: string; zone?: string }[]) =>
    zs
      .filter((z) => z.zone && z.customizationId)
      .map((z) => `${z.customizationId}|${z.zone}`)
      .sort()
      .join(',')
  const svgDirty = mode === 'svg' && (config.mode !== 'svg' || svgTemplate !== config.svgTemplate || zoneSig(zones) !== zoneSig(config.layers))

  const items: CheckItem[] = [
    {
      ok: config.enabledGlobally,
      label: 'Live colour preview is on store-wide',
      fix: (
        <>
          Turn on &ldquo;Live Color Preview&rdquo; in{' '}
          <Link href="/admin/settings" className="font-medium underline">
            Settings → Storefront
          </Link>
          . Your setup here is kept either way.
        </>
      ),
    },
    { ok: mode !== 'none', label: 'A preview type is chosen', fix: <>Pick <strong>Real photo</strong> or <strong>Illustration</strong> below.</> },
    mode === 'svg'
      ? {
          ok: Boolean(getPreviewTemplate(svgTemplate)) && zones.some((z) => usable.has(z.customizationId)),
          label: 'Illustration parts linked to colour options',
          fix: <>Choose a drawing and link at least one part to a colour option (make colour options in the Customization tab).</>,
        }
      : {
          ok: config.mode === 'photo' && savedRegions.length > 0,
          label: savedRegions.length ? `${savedRegions.length} region${savedRegions.length > 1 ? 's' : ''} customers can recolour` : 'Photo regions saved',
          fix: <>Pick a photo below, add regions, and click <strong>Save</strong> in the region editor.</>,
        },
    {
      ok: offLibrary.length === 0,
      label: 'Colour options only use your Colors library',
      fix: (
        <>
          {offLibrary.map((g) => `“${g.label}”`).join(', ')} {offLibrary.length > 1 ? 'have' : 'has'} colours that aren&apos;t in your{' '}
          <Link href="/admin/colors" className="font-medium underline">
            Colors library
          </Link>
          , so customers can&apos;t pick them.
        </>
      ),
    },
    ...(mode === 'svg' ? [{ ok: !svgDirty, label: 'Saved', fix: <>You have unsaved changes. Click <strong>Save colour preview</strong> at the bottom.</> }] : []),
  ]

  const missing = items.filter((i) => !i.ok).length
  const live = missing === 0 && mode !== 'none'

  return (
    <div className={cn('rounded-xl border p-3', live ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5')}>
      <p className="flex items-center gap-2 text-sm font-medium">
        {live ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
        {live ? 'Customers can see the colour preview on this product' : `Customers can’t see the preview yet: ${missing} thing${missing > 1 ? 's' : ''} missing`}
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex gap-2 text-xs">
            {i.ok ? <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <XCircle className="mt-px h-3.5 w-3.5 shrink-0 text-destructive" />}
            <div>
              <p className={cn(i.ok ? 'text-muted-foreground' : 'font-medium text-foreground')}>{i.label}</p>
              {!i.ok && <p className="mt-0.5 leading-relaxed text-muted-foreground">{i.fix}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GroupSelect({ groups, value, onChange, noneLabel }: { groups: ProductCustomization[]; value: string; onChange: (v: string) => void; noneLabel: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Hint({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={cn('flex gap-2 rounded-xl p-3 text-xs leading-relaxed', tone === 'warn' ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200' : 'bg-muted text-muted-foreground')}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
