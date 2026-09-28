'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Palette, Upload, Plus, Trash2, Shuffle, Save, Info, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ProductCustomization, ProductPreview } from '@/lib/data'
import { PREVIEW_TEMPLATES, getPreviewTemplate } from '@/lib/preview/templates'
import { ColorPreview } from '@/components/customize/color-preview'
import { YarnColorSetup } from '@/components/admin/preview-yarn-colors'
import type { AdminColor } from '@/lib/api/admin'
import {
  getPreviewConfig,
  savePreviewConfig,
  uploadPreviewImage,
  type AdminPreviewConfig,
  type PreviewMode,
} from '@/lib/api/admin-preview'

/**
 * Admin setup for the live color preview. Each colorable part of the piece is linked to one
 * of the product's Color customization groups; the customer's pick in that group paints the
 * part. Two ways to draw it: a real photo + one mask per part, or a built-in illustration.
 */

interface DraftLayer {
  key: string
  customizationId: string
  zone?: string
  maskUrl?: string
}

const NONE = '__none__'
let keySeq = 0
const nextKey = () => `l${++keySeq}`

const MODES: { value: PreviewMode; title: string; body: string }[] = [
  { value: 'none', title: 'Off', body: 'No preview for this product.' },
  { value: 'photo', title: 'Real photo', body: 'Your product photo, repainted yarn by yarn. Most realistic.' },
  { value: 'svg', title: 'Illustration', body: 'A built-in drawing. No photo prep needed.' },
]

export function PreviewEditor({
  productId,
  customizations,
  productImages = [],
  libraryColors = [],
  onCustomizationsChange,
}: {
  productId?: string
  customizations: ProductCustomization[]
  productImages?: string[]
  libraryColors?: AdminColor[]
  /** Reload the product after the yarn tool creates colour options. */
  onCustomizationsChange?: () => void | Promise<void>
}) {
  const [config, setConfig] = useState<AdminPreviewConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<PreviewMode>('none')
  const [svgTemplate, setSvgTemplate] = useState<string | undefined>()
  const [base, setBase] = useState<{ url?: string; width?: number; height?: number }>({})
  const [layers, setLayers] = useState<DraftLayer[]>([])
  const [testColors, setTestColors] = useState<Record<string, string | undefined>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  const colorGroups = useMemo(() => customizations.filter((c) => c.type === 'color'), [customizations])

  useEffect(() => {
    if (!productId) return
    getPreviewConfig(productId)
      .then((c) => {
        setConfig(c)
        setMode(c.mode)
        setSvgTemplate(c.svgTemplate)
        setBase({ url: c.baseUrl, width: c.width, height: c.height })
        setLayers(c.layers.map((l) => ({ key: nextKey(), customizationId: l.customizationId, zone: l.zone, maskUrl: l.maskUrl })))
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [productId])

  if (!productId) {
    return <Hint>Save the product first, then come back here to set up its color preview.</Hint>
  }
  if (loadError) return <Hint tone="warn">{loadError}</Hint>
  if (!config) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading color preview…
      </div>
    )
  }

  const template = getPreviewTemplate(svgTemplate)

  const applySaved = async (saved?: AdminPreviewConfig) => {
    if (saved) {
      setConfig(saved)
      setMode(saved.mode)
      setSvgTemplate(saved.svgTemplate)
      setBase({ url: saved.baseUrl, width: saved.width, height: saved.height })
      setLayers(saved.layers.map((l) => ({ key: nextKey(), customizationId: l.customizationId, zone: l.zone, maskUrl: l.maskUrl })))
    }
    await onCustomizationsChange?.()
  }

  const draftPreview: ProductPreview | null =
    mode === 'svg' && template
      ? { mode: 'svg', svgTemplate, layers: layers.filter((l) => l.zone && l.customizationId).map((l, i) => ({ id: l.key, customizationId: l.customizationId, zone: l.zone, sortOrder: i })) }
      : mode === 'photo' && base.url
        ? { mode: 'photo', baseUrl: base.url, width: base.width, height: base.height, layers: layers.filter((l) => l.maskUrl && l.customizationId).map((l, i) => ({ id: l.key, customizationId: l.customizationId, maskUrl: l.maskUrl, sortOrder: i })) }
        : null

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
    // Keep any zone links that still exist in the new template.
    const zones = getPreviewTemplate(key)?.zones.map((z) => z.key) ?? []
    setLayers((prev) => prev.filter((l) => l.zone && zones.includes(l.zone)))
  }

  const setZoneGroup = (zone: string, customizationId: string) => {
    setLayers((prev) => {
      const rest = prev.filter((l) => l.zone !== zone)
      return customizationId === NONE ? rest : [...rest, { key: nextKey(), zone, customizationId }]
    })
  }

  const upload = async (file: File | undefined, kind: 'base' | 'mask', layerKey?: string) => {
    if (!file) return
    setUploading(layerKey ?? 'base')
    try {
      const res = await uploadPreviewImage(productId, file, kind, base)
      if (kind === 'base') {
        setBase({ url: res.url, width: res.width, height: res.height })
      } else {
        setLayers((prev) => prev.map((l) => (l.key === layerKey ? { ...l, maskUrl: res.url } : l)))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    const usable = layers.filter((l) => l.customizationId && (mode === 'svg' ? l.zone : l.maskUrl))
    if (mode !== 'none' && usable.length === 0) {
      toast.error('Link at least one part to a color group')
      return
    }
    setSaving(true)
    try {
      const saved = await savePreviewConfig(productId, {
        mode,
        svgTemplate: mode === 'svg' ? svgTemplate : svgTemplate ?? null,
        baseUrl: base.url ?? null,
        width: base.width ?? null,
        height: base.height ?? null,
        layers: mode === 'none' ? layers.filter((l) => l.customizationId).map(({ customizationId, zone, maskUrl }) => ({ customizationId, zone, maskUrl })) : usable.map(({ customizationId, zone, maskUrl }) => ({ customizationId, zone, maskUrl })),
      })
      setConfig(saved)
      toast.success(mode === 'none' ? 'Color preview turned off for this product' : 'Color preview saved')
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
            <Palette className="h-4 w-4 text-violet" /> Live Color Preview
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Customers tap &ldquo;Customize &amp; Preview&rdquo; and see this piece repainted in the yarn colors they pick. Prices and
            order details still come from the Color groups in the Customization section above.
          </p>
        </div>

        <SetupChecklist
          config={config}
          colorGroups={colorGroups}
          mode={mode}
          svgTemplate={svgTemplate}
          baseUrl={base.url}
          layers={layers}
        />

        {/* Mode */}
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
          <YarnColorSetup
            productId={productId}
            productImages={productImages}
            base={base}
            onBaseChange={setBase}
            libraryColors={libraryColors}
            colorGroups={colorGroups}
            linkedGroupIds={config.mode === 'photo' ? config.layers.map((l) => l.customizationId) : []}
            onSaved={applySaved}
          />
        )}

        {mode !== 'none' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              {mode === 'svg' && (
                <>
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
                      <Label className="block">Which color group paints each part?</Label>
                      {template.zones.map((z) => {
                        const linked = layers.find((l) => l.zone === z.key)?.customizationId ?? NONE
                        return (
                          <div key={z.key} className="flex items-center gap-3">
                            <span className="h-4 w-4 shrink-0 rounded-full border" style={{ background: z.defaultColor }} />
                            <span className="w-32 shrink-0 text-sm">{z.label}</span>
                            <GroupSelect groups={colorGroups} value={linked} onChange={(v) => setZoneGroup(z.key, v)} noneLabel="Fixed (default color)" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {mode === 'photo' && (
                <details className="rounded-xl border p-3 [&[open]>summary]:mb-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Parts ({layers.length}) · advanced: replace the photo or masks by hand
                  </summary>
                  <div className="space-y-5">
                  <div>
                    <Label className="mb-2 block">Base photo</Label>
                    <div className="flex items-center gap-3">
                      {base.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={base.url} alt="Base" className="h-20 w-20 rounded-lg border object-cover" />
                      )}
                      <UploadButton busy={uploading === 'base'} label={base.url ? 'Replace photo' : 'Upload photo'} onFile={(f) => upload(f, 'base')} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">A clear photo on a plain background detects best.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="block">Parts</Label>
                    {layers.map((l) => (
                      <div key={l.key} className="flex flex-wrap items-center gap-3 rounded-xl border p-2">
                        {l.maskUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.maskUrl} alt="Mask" className="h-12 w-12 rounded border bg-black object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground">no mask</span>
                        )}
                        <GroupSelect
                          groups={colorGroups}
                          value={l.customizationId || NONE}
                          onChange={(v) => setLayers((prev) => prev.map((x) => (x.key === l.key ? { ...x, customizationId: v === NONE ? '' : v } : x)))}
                          noneLabel="Choose color group…"
                        />
                        <UploadButton busy={uploading === l.key} disabled={!base.url} label={l.maskUrl ? 'Replace mask' : 'Upload mask'} onFile={(f) => upload(f, 'mask', l.key)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setLayers((prev) => prev.filter((x) => x.key !== l.key))} aria-label="Remove part">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setLayers((prev) => [...prev, { key: nextKey(), customizationId: '' }])}>
                      <Plus className="h-4 w-4" /> Add part
                    </Button>
                    <Hint>
                      <strong>Making a mask</strong> (free in Photopea or Canva): open your base photo, select the part (e.g. all petals), fill it
                      <strong> white</strong>, fill everything else <strong>black</strong>, export as PNG at the <strong>same size</strong> as the photo.
                    </Hint>
                  </div>
                  </div>
                </details>
              )}
            </div>

            {/* Live test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Test preview</Label>
                <Button type="button" variant="ghost" size="sm" onClick={shuffle} disabled={colorGroups.length === 0}>
                  <Shuffle className="h-4 w-4" /> Shuffle
                </Button>
              </div>
              <div className="aspect-square overflow-hidden rounded-xl border bg-blush/40 p-3">
                {draftPreview ? (
                  <ColorPreview preview={draftPreview} colors={testColors} alt="Test preview" className="h-full w-full" />
                ) : (
                  <p className="p-4 text-center text-xs text-muted-foreground">{mode === 'svg' ? 'Pick an illustration' : 'Upload a base photo'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save color preview
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** A color group a customer can actually pick from — the storefront ignores the rest. */
const isUsableGroup = (g: ProductCustomization) => g.enabled && g.values.some((v) => v.enabled && v.inLibrary !== false)

const layerSignature = (ls: { customizationId: string; zone?: string; maskUrl?: string }[]) =>
  ls
    .filter((l) => l.customizationId)
    .map((l) => `${l.customizationId}|${l.zone ?? ''}|${l.maskUrl ?? ''}`)
    .sort()
    .join(',')

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
  baseUrl,
  layers,
}: {
  config: AdminPreviewConfig
  colorGroups: ProductCustomization[]
  mode: PreviewMode
  svgTemplate?: string
  baseUrl?: string
  layers: DraftLayer[]
}) {
  const usableGroups = colorGroups.filter(isUsableGroup)
  const usableIds = new Set(usableGroups.map((g) => g.id))
  const complete = layers.filter((l) => l.customizationId && (mode === 'svg' ? l.zone : l.maskUrl))
  const working = complete.filter((l) => usableIds.has(l.customizationId))
  const brokenLinks = complete.length - working.length
  const incompleteParts = mode === 'photo' ? layers.filter((l) => !l.customizationId || !l.maskUrl).length : 0
  const dirty =
    mode !== config.mode ||
    (mode === 'svg' && svgTemplate !== config.svgTemplate) ||
    (mode === 'photo' && baseUrl !== config.baseUrl) ||
    layerSignature(layers) !== layerSignature(config.layers)

  const offLibrary = colorGroups.filter((g) => g.values.some((v) => v.inLibrary === false))

  const items: CheckItem[] = [
    {
      ok: config.enabledGlobally,
      label: 'Live Color Preview is on store-wide',
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
    {
      ok: usableGroups.length > 0,
      label: `Product has a Color group${usableGroups.length > 1 ? 's' : ''} customers can pick from${usableGroups.length ? ` (${usableGroups.map((g) => g.label).join(', ')})` : ''}`,
      fix:
        colorGroups.length > 0 ? (
          <>Your Color groups are switched off or have no enabled colors. Enable the group and at least one color in the Customization tab, save the product, then reload this page.</>
        ) : (
          <>
            In the <strong>Customization</strong> tab, add a group with type <strong>Color</strong> for each part (e.g. &ldquo;Petal color&rdquo;, &ldquo;Tassel
            color&rdquo;) and add some colors. <strong>Save the product, then reload this page</strong> so the group shows up here.
          </>
        ),
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
          , so customers can&apos;t pick them. In the Customization tab, delete those or change them to a library colour.
        </>
      ),
    },
    {
      ok: mode !== 'none',
      label: 'A preview type is chosen',
      fix: <>Pick <strong>Illustration</strong> (quickest) or <strong>Photo + masks</strong> below.</>,
    },
    mode === 'photo'
      ? { ok: Boolean(baseUrl), label: 'Base photo uploaded', fix: <>Upload a photo of the piece, ideally in white or cream yarn.</> }
      : { ok: mode === 'svg' && Boolean(getPreviewTemplate(svgTemplate)), label: 'Illustration picked', fix: <>Choose the drawing that matches this piece.</> },
    {
      ok: working.length > 0 && brokenLinks === 0 && incompleteParts === 0,
      label: working.length > 0 ? `${working.length} part${working.length > 1 ? 's' : ''} linked to a color group` : 'At least one part is linked to a color group',
      fix:
        brokenLinks > 0 ? (
          <>{brokenLinks} part{brokenLinks > 1 ? 's are' : ' is'} linked to a Color group that&apos;s switched off. Customers won&apos;t see {brokenLinks > 1 ? 'them' : 'it'} painted.</>
        ) : incompleteParts > 0 ? (
          <>{incompleteParts} part{incompleteParts > 1 ? 's need' : ' needs'} both a color group and a mask. Incomplete parts are skipped when you save.</>
        ) : mode === 'photo' ? (
          <>Click <strong>Add part</strong>, choose its color group and upload its mask.</>
        ) : (
          <>Under &ldquo;Which color group paints each part?&rdquo;, choose a color group for at least one part.</>
        ),
    },
    {
      ok: !dirty && config.mode !== 'none',
      label: 'Saved',
      fix: dirty ? <>You have unsaved changes. Click <strong>Save color preview</strong> at the bottom.</> : <>Nothing saved yet. Finish the steps above and click <strong>Save color preview</strong>.</>,
    },
  ]

  const missing = items.filter((i) => !i.ok).length
  const live = missing === 0

  return (
    <div className={cn('rounded-xl border p-3', live ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5')}>
      <p className="flex items-center gap-2 text-sm font-medium">
        {live ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
        {live ? 'Customers can see the color preview on this product' : `Customers can’t see the preview yet: ${missing} thing${missing > 1 ? 's' : ''} missing`}
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

function UploadButton({ label, busy, disabled, onFile }: { label: string; busy: boolean; disabled?: boolean; onFile: (f: File | undefined) => void }) {
  return (
    <Button type="button" variant="outline" size="sm" asChild disabled={disabled || busy}>
      <label className={cn('cursor-pointer', (disabled || busy) && 'pointer-events-none opacity-50')}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {label}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
    </Button>
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
