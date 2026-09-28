'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Paintbrush, Pencil, Plus, Star, Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getThemeAdmin,
  activateTheme,
  createCustomTheme,
  updateCustomTheme,
  deleteCustomTheme,
  type ThemeAdminState,
  type ThemeColors,
  type ThemeDef,
} from '@/lib/api/admin'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { PageHeader } from '@/components/admin/page-header'
import { PageLoader } from '@/components/admin/loading-state'
import { useRbac } from '@/lib/rbac/rbac-context'
import { cn } from '@/lib/utils'

// ---- colour helpers (WCAG contrast) ----
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string) {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return 21
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
const CONTRAST_CHECKS: { fg: string; bg: string; label: string; min: number }[] = [
  { fg: 'foreground', bg: 'background', label: 'Body text on page', min: 4.5 },
  { fg: 'primaryForeground', bg: 'primary', label: 'Button text on primary', min: 4.5 },
  { fg: 'mutedForeground', bg: 'background', label: 'Secondary text on page', min: 4.5 },
  { fg: 'accentForeground', bg: 'accent', label: 'Text on highlight', min: 4.5 },
  { fg: 'secondaryForeground', bg: 'secondary', label: 'Text on secondary', min: 3 },
]

/** A miniature storefront painted with a theme's colours — header, hero, product card, newsletter, footer. */
function ThemePreview({ colors, className }: { colors: ThemeColors; className?: string }) {
  const c = colors
  return (
    <div className={cn('overflow-hidden rounded-xl border text-left', className)} style={{ background: c.background, color: c.foreground, borderColor: c.border }}>
      <div className="flex items-center justify-center gap-3 px-3 py-1 text-[9px] font-medium" style={{ background: c.ink, color: '#ffffffd9' }}>
        <span>Free shipping over ₹999</span>
        <span>·</span>
        <span>Handmade in India</span>
      </div>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: c.border, background: c.card }}>
        <span className="font-serif text-sm font-semibold" style={{ color: c.foreground }}>
          Suthrayaa
        </span>
        <span className="flex gap-2 text-[9px]" style={{ color: c.mutedForeground }}>
          <span>Shop</span>
          <span>About</span>
          <span style={{ color: c.primary }}>Cart (2)</span>
        </span>
      </div>
      <div className="grid grid-cols-[1.2fr_1fr] gap-3 p-3" style={{ background: c.sand }}>
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: c.rose }}>
            New season
          </p>
          <p className="mt-1 font-serif text-base leading-tight">
            Handmade <em style={{ color: c.primary }}>with love</em>
          </p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-full px-2.5 py-1 text-[9px] font-semibold" style={{ background: c.primary, color: c.primaryForeground }}>
              Shop now
            </span>
            <span className="rounded-full px-2.5 py-1 text-[9px] font-semibold" style={{ background: c.secondary, color: c.secondaryForeground }}>
              Offers
            </span>
          </div>
        </div>
        <div className="rounded-lg p-2" style={{ background: c.card, border: `1px solid ${c.border}` }}>
          <div className="relative h-10 rounded-md" style={{ background: c.muted }}>
            <span className="absolute left-1 top-1 rounded-full px-1.5 text-[7px] font-semibold text-white" style={{ background: c.rose }}>
              −20%
            </span>
          </div>
          <p className="mt-1.5 text-[9px] font-medium">Crochet garland</p>
          <p className="flex items-center gap-1 text-[9px]">
            <span className="font-semibold">₹499</span>
            <span className="line-through" style={{ color: c.mutedForeground }}>
              ₹624
            </span>
          </p>
          <p className="flex gap-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-2 w-2" style={{ color: c.gold, fill: c.gold }} />
            ))}
          </p>
        </div>
      </div>
      <div className="mx-3 my-2 flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: c.blush }}>
        <span className="text-[9px] font-medium">Join the circle</span>
        <span className="rounded-full px-2 py-0.5 text-[8px] font-semibold" style={{ background: c.accent, color: c.accentForeground }}>
          Subscribe
        </span>
      </div>
      <div className="px-3 py-2 text-[8px]" style={{ background: c.ink, color: '#ffffffb3' }}>
        © Suthrayaa · Privacy · Terms
      </div>
    </div>
  )
}

function Swatches({ colors }: { colors: ThemeColors }) {
  return (
    <div className="flex">
      {['primary', 'secondary', 'accent', 'background', 'ink', 'gold', 'rose'].map((k) => (
        <span key={k} className="-mr-1.5 h-6 w-6 rounded-full border-2 border-card" style={{ background: colors[k] }} title={k} />
      ))}
    </div>
  )
}

export default function ThemePage() {
  const { hasPermission } = useRbac()
  const canEdit = hasPermission('settings.branding')
  const [state, setState] = useState<ThemeAdminState | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // editor
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [colors, setColors] = useState<ThemeColors>({})

  useEffect(() => {
    getThemeAdmin()
      .then((s) => {
        setState(s)
        setPreviewId(s.activeId)
      })
      .catch(() => toast.error('Failed to load themes'))
  }, [])

  const all = useMemo(() => [...(state?.presets ?? []), ...(state?.customThemes ?? [])], [state])
  const byId = (id: string | null) => all.find((t) => t.id === id)
  const active = byId(state?.activeId ?? null)
  const previewed = byId(previewId) ?? active

  const apply = async (t: ThemeDef) => {
    if (!confirm(`Apply “${t.name}” to the customer site? It goes live within about a minute.`)) return
    setBusy(true)
    try {
      setState(await activateTheme(t.id))
      toast.success(`“${t.name}” is now the storefront theme`)
    } catch {
      toast.error('Failed to apply theme')
    } finally {
      setBusy(false)
    }
  }

  const openEditor = (base: ThemeDef, asCopy: boolean) => {
    setEditingId(asCopy ? null : base.id)
    setName(asCopy ? `${base.name} (custom)` : base.name)
    setColors({ ...base.colors })
    setEditorOpen(true)
  }

  const save = async (andApply: boolean) => {
    if (!name.trim()) return toast.error('Give your theme a name')
    const bad = state?.tokens.find((t) => !/^#[0-9a-f]{6}$/i.test(colors[t.key] ?? ''))
    if (bad) return toast.error(`“${bad.label}” needs a 6-digit hex colour like #6d4aff`)
    setBusy(true)
    try {
      const res = editingId ? await updateCustomTheme(editingId, name.trim(), colors) : await createCustomTheme(name.trim(), colors)
      let next: ThemeAdminState = res
      if (andApply) next = await activateTheme(res.id)
      setState(next)
      setPreviewId(res.id)
      setEditorOpen(false)
      toast.success(andApply ? `“${name.trim()}” saved and applied` : `“${name.trim()}” saved`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save theme')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (t: ThemeDef) => {
    const live = t.id === state?.activeId
    if (!confirm(`Delete “${t.name}”?${live ? ' It is live — the storefront will switch back to the default theme.' : ''}`)) return
    setBusy(true)
    try {
      const next = await deleteCustomTheme(t.id)
      setState(next)
      if (previewId === t.id) setPreviewId(next.activeId)
      toast.success('Theme deleted')
    } catch {
      toast.error('Failed to delete theme')
    } finally {
      setBusy(false)
    }
  }

  const warnings = useMemo(
    () =>
      CONTRAST_CHECKS.map((c) => ({ ...c, ratio: contrast(colors[c.fg] ?? '', colors[c.bg] ?? '') })).filter((c) => c.ratio < c.min),
    [colors]
  )
  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof state>['tokens']>()
    for (const t of state?.tokens ?? []) m.set(t.group, [...(m.get(t.group) ?? []), t])
    return [...m.entries()]
  }, [state])

  const ThemeCard = ({ t, custom }: { t: ThemeDef; custom?: boolean }) => {
    const isActive = t.id === state?.activeId
    const isPreviewed = t.id === previewed?.id
    return (
      <Card
        className={cn('cursor-pointer gap-0 py-0 transition-shadow hover:shadow-md', isPreviewed && 'ring-2 ring-primary')}
        onClick={() => setPreviewId(t.id)}
      >
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{t.name}</p>
              {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            {isActive ? (
              <Badge className="shrink-0">
                <Check className="h-3 w-3" /> Live
              </Badge>
            ) : t.id === state?.defaultId ? (
              <Badge variant="secondary" className="shrink-0">
                Default
              </Badge>
            ) : null}
          </div>
          <Swatches colors={t.colors} />
          {canEdit && (
            <div className="mt-auto flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" disabled={busy || isActive} onClick={() => apply(t)}>
                {isActive ? 'Applied' : 'Apply'}
              </Button>
              {custom ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => openEditor(t, false)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete theme" onClick={() => remove(t)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => openEditor(t, true)}>
                  <Copy className="h-3.5 w-3.5" /> Customize
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <ProtectedRoute permission="settings.view">
      <div className="space-y-6">
        <PageHeader
          title="Theme"
          description="Choose the colour theme of the customer site. Pick a ready-made theme or create your own — the storefront updates automatically within about a minute. The admin console keeps its own colours."
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> View site
                </a>
              </Button>
              {canEdit && state && (
                <Button onClick={() => openEditor(active ?? state.presets[0], true)}>
                  <Plus className="h-4 w-4" /> Create theme
                </Button>
              )}
            </div>
          }
        />

        {!state ? (
          <PageLoader />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ready-made themes</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {state.presets.map((t) => (
                    <ThemeCard key={t.id} t={t} />
                  ))}
                </div>
              </section>
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Your themes</h2>
                {state.customThemes.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                      <Paintbrush className="h-6 w-6 text-muted-foreground" />
                      <p className="font-medium">No custom themes yet</p>
                      <p className="max-w-sm text-sm text-muted-foreground">Click “Customize” on any theme above, or “Create theme”, to build one with your own colours.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                    {state.customThemes.map((t) => (
                      <ThemeCard key={t.id} t={t} custom />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Preview{previewed ? ` — ${previewed.name}` : ''}
              </h2>
              {previewed && <ThemePreview colors={previewed.colors} />}
              <p className="text-xs text-muted-foreground">Click a theme to preview it here. “Apply” makes it live on the customer site.</p>
            </aside>
          </div>
        )}

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit theme' : 'Create theme'}</DialogTitle>
              <DialogDescription>Pick each colour — the preview updates as you go.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="theme-name">Theme name</Label>
                    <Input id="theme-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start from</Label>
                    <Select
                      onValueChange={(id) => {
                        const base = byId(id)
                        if (base) setColors({ ...base.colors })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Load colours from…" />
                      </SelectTrigger>
                      <SelectContent>
                        {all.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {groups.map(([group, tokens]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {tokens.map((t) => (
                        <label key={t.key} className="flex items-center gap-2 rounded-lg border p-2">
                          <input
                            type="color"
                            value={/^#[0-9a-f]{6}$/i.test(colors[t.key] ?? '') ? colors[t.key] : '#000000'}
                            onChange={(e) => setColors((c) => ({ ...c, [t.key]: e.target.value }))}
                            className="h-8 w-8 shrink-0 cursor-pointer rounded border bg-transparent"
                            aria-label={t.label}
                          />
                          <span className="min-w-0 flex-1 truncate text-xs">{t.label}</span>
                          <Input
                            value={colors[t.key] ?? ''}
                            onChange={(e) => setColors((c) => ({ ...c, [t.key]: e.target.value.trim() }))}
                            className="h-8 w-24 font-mono text-xs"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 md:sticky md:top-0 md:self-start">
                <ThemePreview colors={colors} />
                {warnings.length > 0 ? (
                  <div className="space-y-1 rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <TriangleAlert className="h-3.5 w-3.5" /> Low contrast — may be hard to read
                    </p>
                    {warnings.map((w) => (
                      <p key={w.label}>
                        {w.label}: {w.ratio.toFixed(1)}:1 (aim for {w.min}:1)
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-mint" /> Text contrast looks good
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => save(false)} disabled={busy}>
                Save
              </Button>
              <Button onClick={() => save(true)} disabled={busy}>
                Save &amp; apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
