'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatPrice, type ProductCustomization } from '@/lib/data'
import { ColorYarnSwatch } from '@/components/color-yarn-swatch'

export interface CustomizerSelection {
  customizationId: string
  valueId?: string
  textValue?: string
}

export interface ResolvedCustomization extends CustomizerSelection {
  label: string
  displayValue: string
  priceAdjustment: number
}

interface ProductCustomizerProps {
  customizations: ProductCustomization[]
  onChange: (resolved: ResolvedCustomization[], priceAdjustment: number, missingRequired: string[]) => void
}

const LIGHT_HEXES = ['#FFFFFF', '#F5F5DC', '#FFE5B5', '#FFB5BA']

/**
 * Renders the admin-configured customization groups for a product as clean, tappable
 * chips (per spec — no dropdowns, no complicated form). Handles conditional reveal
 * (e.g. "Add Name? Yes" -> shows a text field) and live price adjustment. The backend
 * always re-validates and recomputes price at checkout; this is display-only.
 */
export function ProductCustomizer({ customizations, onChange }: ProductCustomizerProps) {
  const [selections, setSelections] = useState<Record<string, CustomizerSelection>>({})

  const groups = useMemo(
    () => [...customizations].filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [customizations]
  )

  const selectedValueIds = useMemo(
    () => new Set(Object.values(selections).map((s) => s.valueId).filter(Boolean) as string[]),
    [selections]
  )

  const visibleGroups = groups.filter(
    (g) => !g.conditionalParentValueId || selectedValueIds.has(g.conditionalParentValueId)
  )
  const visibleGroupIds = visibleGroups.map((g) => g.id).join(',')

  useEffect(() => {
    const resolved: ResolvedCustomization[] = []
    const missingRequired: string[] = []
    let priceAdjustment = 0

    for (const group of visibleGroups) {
      const selection = selections[group.id]

      if (group.type === 'text' || group.type === 'number') {
        const textValue = selection?.textValue?.trim()
        if (textValue) {
          resolved.push({
            customizationId: group.id,
            textValue,
            label: group.label,
            displayValue: textValue,
            priceAdjustment: 0,
          })
        } else if (group.required) {
          missingRequired.push(group.label)
        }
        continue
      }

      if (selection?.valueId) {
        const value = group.values.find((v) => v.id === selection.valueId)
        if (value) {
          priceAdjustment += value.priceAdjustment
          resolved.push({
            customizationId: group.id,
            valueId: value.id,
            label: group.label,
            displayValue: value.label,
            priceAdjustment: value.priceAdjustment,
          })
        }
      } else if (group.required) {
        missingRequired.push(group.label)
      }
    }

    onChange(resolved, Math.round(priceAdjustment * 100) / 100, missingRequired)
    // visibleGroupIds captures the only derived value that should re-trigger this beyond selections itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, visibleGroupIds])

  if (groups.length === 0) return null

  const select = (customizationId: string, valueId: string) =>
    setSelections((prev) => ({ ...prev, [customizationId]: { customizationId, valueId } }))

  const setText = (customizationId: string, textValue: string) =>
    setSelections((prev) => ({ ...prev, [customizationId]: { customizationId, textValue } }))

  return (
    <div className="space-y-5 rounded-xl bg-peach/20 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-secondary" /> Customize Your Piece
      </p>

      {visibleGroups.map((group) => {
        const current = selections[group.id]
        return (
          <div key={group.id}>
            <Label className="mb-2 block text-sm font-medium">
              {group.label}
              {!group.required && <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>}
            </Label>

            {(group.type === 'choice' || group.type === 'checkbox') && (
              <div className="flex flex-wrap gap-2">
                {group.values
                  .filter((v) => v.enabled)
                  .map((value) => {
                    const active = current?.valueId === value.id
                    return (
                      <button
                        key={value.id}
                        type="button"
                        onClick={() => select(group.id, value.id)}
                        className={cn(
                          'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-muted-foreground'
                        )}
                      >
                        {value.label}
                        {value.priceAdjustment > 0 && (
                          <span className={cn('ml-1', active ? 'opacity-90' : 'text-secondary')}>
                            +{formatPrice(value.priceAdjustment)}
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            )}

            {group.type === 'color' && (
              <div className="flex flex-wrap gap-2">
                {group.values
                  .filter((v) => v.enabled)
                  .map((value) => {
                    const active = current?.valueId === value.id
                    return (
                      <button
                        key={value.id}
                        type="button"
                        onClick={() => select(group.id, value.id)}
                        title={value.label}
                        aria-label={value.label}
                        className={cn(
                          'relative h-10 w-10 rounded-full border-2 bg-muted p-1.5 transition-all',
                          active ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border hover:border-muted-foreground'
                        )}
                      >
                        <ColorYarnSwatch color={value.value} />
                        {active && (
                          <Check
                            className={cn(
                              'absolute inset-0 m-auto h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
                              LIGHT_HEXES.includes(value.value.toUpperCase()) ? 'text-foreground' : 'text-white'
                            )}
                          />
                        )}
                      </button>
                    )
                  })}
              </div>
            )}

            {(group.type === 'text' || group.type === 'number') && (
              <Input
                type={group.type === 'number' ? 'number' : 'text'}
                placeholder={group.placeholder}
                maxLength={group.maxLength}
                value={current?.textValue ?? ''}
                onChange={(e) => setText(group.id, e.target.value.slice(0, group.maxLength))}
                className="max-w-xs bg-background"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
