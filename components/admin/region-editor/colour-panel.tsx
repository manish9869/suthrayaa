'use client'

import { useMemo, useState } from 'react'
import { Check, Eye, EyeOff, FolderOpen, Layers2, Lock, Palette, Unlock, Users, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { AdminColor } from '@/lib/api/admin'
import type { EditorGroup, EditorRegion } from '@/lib/preview/region-ops'

/**
 * Settings for the selected region or group: name, whether customers can change it, which
 * library colours they may pick, and (for groups) one shared colour vs one per region.
 */

export type PanelTarget =
  | { kind: 'region'; region: EditorRegion; group?: EditorGroup }
  | { kind: 'group'; group: EditorGroup; regions: EditorRegion[] }

export function ColourPanel({
  target,
  library,
  paletteIds,
  productColourIds = [],
  groups,
  coverage,
  onRegion,
  onGroup,
  onSelectGroup,
  onMoveToGroup,
}: {
  target: PanelTarget
  library: AdminColor[]
  paletteIds: string[]
  /** The product's own colours, offered as a one-click list. */
  productColourIds?: string[]
  groups: EditorGroup[]
  coverage: (id: string) => number
  onRegion: (id: string, patch: Partial<EditorRegion>) => void
  onGroup: (id: string, patch: Partial<EditorGroup>) => void
  onSelectGroup: (id: string) => void
  onMoveToGroup: (regionId: string, groupId: string | null) => void
}) {
  if (target.kind === 'group') {
    const g = target.group
    return (
      <div className="space-y-3 rounded-lg border p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" /> Group settings
        </p>
        <Input value={g.name} onChange={(e) => onGroup(g.id, { name: e.target.value })} maxLength={60} className="h-8" aria-label="Group name" />
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">How customers choose colours for its {target.regions.length} regions</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { v: true, label: 'One colour for all', note: `Customers see “${g.name}”`, icon: Users },
              { v: false, label: 'Each region separately', note: 'Customers see each region', icon: User },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => onGroup(g.id, { sharedColor: o.v })}
                className={cn('rounded-lg border p-2 text-left transition-colors', g.sharedColor === o.v ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground')}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <o.icon className="h-3.5 w-3.5" /> {o.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{o.note}</span>
              </button>
            ))}
          </div>
        </div>
        <ColourChooser
          value={g.colorIds}
          onChange={(colorIds) => onGroup(g.id, { colorIds })}
          library={library}
          paletteIds={paletteIds}
          productColourIds={productColourIds}
          hint={g.sharedColor ? 'Colours for the whole group' : 'Default colours for its regions (each region can narrow them)'}
        />
      </div>
    )
  }

  const r = target.region
  const g = target.group
  const fromGroup = Boolean(g?.sharedColor)
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers2 className="h-3.5 w-3.5" /> Region settings
        </p>
        <span className="text-[11px] tabular-nums text-muted-foreground">{(coverage(r.id) * 100).toFixed(1)}% of the piece</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-8 w-8 shrink-0 rounded-full ring-1 ring-border" style={{ background: r.hex }} title="Colour in the photo" />
        <Input value={r.name} onChange={(e) => onRegion(r.id, { name: e.target.value })} maxLength={60} className="h-8" aria-label="Region name" />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <label className="flex items-center justify-between gap-2" title="Customers can change this region's colour">
          <span className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Changeable
          </span>
          <Switch checked={r.changeable} onCheckedChange={(v) => onRegion(r.id, { changeable: v })} disabled={r.locked} />
        </label>
        <label className="flex items-center justify-between gap-2" title="May share pixels with other regions — later regions in the list are drawn on top">
          <span className="flex items-center gap-1.5">
            <Layers2 className="h-3.5 w-3.5" /> Can overlap
          </span>
          <Switch checked={r.allowOverlap} onCheckedChange={(v) => onRegion(r.id, { allowOverlap: v })} disabled={r.locked} />
        </label>
        <label className="flex items-center justify-between gap-2" title="Locked regions can't be painted, erased, moved or deleted">
          <span className="flex items-center gap-1.5">{r.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />} Locked</span>
          <Switch checked={r.locked} onCheckedChange={(v) => onRegion(r.id, { locked: v })} />
        </label>
        <label className="flex items-center justify-between gap-2" title="Hide on this canvas only — customers still see it">
          <span className="flex items-center gap-1.5">{r.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} Hidden</span>
          <Switch checked={r.hidden} onCheckedChange={(v) => onRegion(r.id, { hidden: v })} />
        </label>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="shrink-0 text-muted-foreground">Group</span>
        <Select value={r.groupId ?? '__none'} onValueChange={(v) => onMoveToGroup(r.id, v === '__none' ? null : v)}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">No group</SelectItem>
            {groups.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!r.changeable ? (
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">Fixed — keeps its photo colour and never changes.</p>
      ) : fromGroup ? (
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          Its colour is chosen with the whole group{' '}
          <button type="button" className="font-medium text-foreground underline" onClick={() => onSelectGroup(g!.id)}>
            “{g!.name}”
          </button>
          .
        </p>
      ) : (
        <ColourChooser
          value={r.colorIds}
          onChange={(colorIds) => onRegion(r.id, { colorIds })}
          library={library}
          paletteIds={g?.colorIds ?? paletteIds}
          productColourIds={productColourIds}
          inheritLabel={g ? `Same as group “${g.name}”` : undefined}
          hint="Colours customers can choose for this region"
        />
      )}
    </div>
  )
}

/** Library colours to allow: inherit (null) or an explicit list, with family filter. */
function ColourChooser({
  value,
  onChange,
  library,
  paletteIds,
  productColourIds = [],
  inheritLabel,
  hint,
}: {
  value: string[] | null
  onChange: (ids: string[] | null) => void
  library: AdminColor[]
  paletteIds: string[]
  productColourIds?: string[]
  inheritLabel?: string
  hint: string
}) {
  const [family, setFamily] = useState<string | null>(null)
  const families = useMemo(() => [...new Set(library.map((c) => c.family?.trim()).filter(Boolean) as string[])].sort(), [library])
  const shown = family ? library.filter((c) => c.family?.trim() === family) : library
  const inherit = value === null
  const chosen = new Set(value ?? paletteIds)
  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(library.filter((c) => next.has(c.id)).map((c) => c.id))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn('rounded-md border px-2 py-1.5 text-left', inherit ? 'border-primary bg-primary/5 font-medium' : 'hover:border-muted-foreground')}
        >
          {inheritLabel ?? 'All library colours'} <span className="text-muted-foreground">({paletteIds.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onChange([...chosen])}
          className={cn('rounded-md border px-2 py-1.5 text-left', !inherit ? 'border-primary bg-primary/5 font-medium' : 'hover:border-muted-foreground')}
        >
          Only selected <span className="text-muted-foreground">({inherit ? '—' : value!.length})</span>
        </button>
      </div>
      {!inherit && (
        <>
          {families.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {[null, ...families].map((f) => (
                <button
                  key={f ?? 'all'}
                  type="button"
                  onClick={() => setFamily(f)}
                  className={cn('rounded-full border px-2 py-0.5 text-[11px]', family === f ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
                >
                  {f ?? 'All'}
                </button>
              ))}
            </div>
          )}
          <div className="grid max-h-48 grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1.5 overflow-y-auto p-0.5">
            {shown.map((c) => {
              const on = chosen.has(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  title={`${c.name}${c.family ? ` · ${c.family}` : ''}`}
                  aria-pressed={on}
                  className={cn('relative aspect-square rounded-full ring-1 ring-black/10 transition-transform hover:scale-110', on ? 'ring-2 ring-foreground ring-offset-1' : 'opacity-40')}
                  style={{ background: c.hex }}
                >
                  {on && <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white mix-blend-difference" />}
                </button>
              )
            })}
          </div>
          <div className="flex gap-3 text-[11px]">
            <button type="button" className="font-medium text-primary" onClick={() => onChange(library.map((c) => c.id))}>
              Select all
            </button>
            {productColourIds.length > 0 && (
              <button type="button" className="font-medium text-primary" onClick={() => onChange([...productColourIds])}>
                The product&apos;s colours ({productColourIds.length})
              </button>
            )}
            <button type="button" className="font-medium text-muted-foreground hover:text-foreground" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          {value!.length === 0 && <p className="text-[11px] text-destructive">Pick at least one colour.</p>}
        </>
      )}
    </div>
  )
}
