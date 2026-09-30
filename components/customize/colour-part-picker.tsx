'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, type ProductCustomization } from '@/lib/data'
import type { CustomizerSelection } from '@/components/product-customizer'
import type { ColourSection } from '@/lib/preview/sections'

/**
 * Colour choices, one part at a time: part tabs (each showing its current colour) — grouped
 * under headings when the admin grouped regions — and a compact swatch grid for the selected
 * part, with colour-family filters when there are many colours. "Original" keeps the colour
 * in the photo. Everything comes from the product's configuration; nothing is product-specific.
 */
export function ColourPartPicker({
  sections,
  selections,
  onChange,
  showErrors = false,
}: {
  sections: ColourSection[]
  selections: Record<string, CustomizerSelection>
  onChange: (next: Record<string, CustomizerSelection>) => void
  showErrors?: boolean
}) {
  const groups = sections.flatMap((s) => s.options)
  const [activeId, setActiveId] = useState(groups[0]?.id)
  const [family, setFamily] = useState<string | null>(null)
  const active = groups.find((g) => g.id === activeId) ?? groups[0]
  if (!active) return null

  const chosen = (g: ProductCustomization) => g.values.find((v) => v.id === selections[g.id]?.valueId)
  const pick = (g: ProductCustomization, valueId: string | null) => {
    const next = { ...selections }
    if (valueId) next[g.id] = { customizationId: g.id, valueId }
    else delete next[g.id]
    onChange(next)
    // move on to the next part that hasn't been chosen yet
    if (valueId) {
      const i = groups.findIndex((x) => x.id === g.id)
      const upcoming = groups.slice(i + 1).find((x) => !next[x.id])
      if (upcoming) {
        setActiveId(upcoming.id)
        setFamily(null)
      }
    }
  }

  const current = chosen(active)
  const values = active.values.filter((v) => v.enabled)
  const families = [...new Set(values.map((v) => v.family?.trim()).filter(Boolean) as string[])].sort()
  const showFamilies = families.length > 1 && values.length > 10
  const shown = showFamilies && family ? values.filter((v) => v.family?.trim() === family) : values

  const tab = (g: ProductCustomization) => {
    const c = chosen(g)
    const swatch = c?.value ?? g.defaultValue
    const missing = showErrors && g.required && !c
    return (
      <button
        key={g.id}
        type="button"
        role="tab"
        aria-selected={g.id === active.id}
        onClick={() => {
          setActiveId(g.id)
          setFamily(null)
        }}
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] transition-colors',
          g.id === active.id ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-muted-foreground',
          missing && 'border-destructive'
        )}
      >
        <span className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ background: swatch ?? 'transparent' }} />
        <span className="font-medium">{g.label}</span>
      </button>
    )
  }

  return (
    <div>
      {groups.length > 1 && (
        <div role="tablist" aria-label="Parts" className="space-y-2">
          {sections.map((s, i) =>
            s.title ? (
              <div key={s.title + i}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.title}</p>
                <div className="flex flex-wrap gap-1.5">{s.options.map(tab)}</div>
              </div>
            ) : (
              <div key={i} className="flex flex-wrap gap-1.5">
                {s.options.map(tab)}
              </div>
            )
          )}
        </div>
      )}

      <p className="mt-3 text-sm">
        <span className="text-muted-foreground">{groups.length > 1 ? active.label : `${active.label}:`}</span>{' '}
        {groups.length > 1 && <span className="text-muted-foreground">· </span>}
        <span className="font-medium">{current ? current.label : active.defaultValue ? 'Original' : 'Choose a colour'}</span>
        {current && current.priceAdjustment > 0 && <span className="text-muted-foreground"> (+{formatPrice(current.priceAdjustment)})</span>}
      </p>

      {showFamilies && (
        <div className="mt-2 flex flex-wrap gap-1">
          {[null, ...families].map((f) => (
            <button
              key={f ?? 'all'}
              type="button"
              onClick={() => setFamily(f)}
              className={cn('rounded-full border px-2.5 py-0.5 text-xs', family === f ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              {f ?? 'All'}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-2">
        {active.defaultValue && !active.required && !family && (
          <Swatch color={active.defaultValue} label="Original" selected={!current} onClick={() => pick(active, null)} original />
        )}
        {shown.map((v) => (
          <Swatch key={v.id} color={v.value} label={v.label} selected={current?.id === v.id} onClick={() => pick(active, v.id)} />
        ))}
      </div>
    </div>
  )
}

function Swatch({ color, label, selected, onClick, original }: { color: string; label: string; selected: boolean; onClick: () => void; original?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'relative aspect-square w-full max-w-10 rounded-full ring-1 ring-black/10 transition-transform duration-150 ease-[var(--ease-out)] hover:scale-110',
        selected && 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
      )}
      style={{ background: color }}
    >
      {original && !selected && <span className="absolute inset-0 rounded-full bg-[repeating-linear-gradient(45deg,transparent_0_3px,rgb(255_255_255/.45)_3px_5px)]" />}
      {selected && <Check className={cn('absolute inset-0 m-auto h-4 w-4', isLight(color) ? 'text-black/70' : 'text-white')} />}
    </button>
  )
}

function isLight(hex: string) {
  const c = hex.replace('#', '')
  if (c.length !== 6) return true
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}
