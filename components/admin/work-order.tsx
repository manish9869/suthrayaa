'use client'

import { useId } from 'react'
import { Printer, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/data'
import type { AdminOrderItem } from '@/lib/api/admin'
import { ColorPreview, snapshotColors } from '@/components/customize/color-preview'

const HEX_RE = /^#[0-9a-f]{3,8}$/i

/**
 * The maker's work order for one customized order line: the customer's design as they saw
 * it (re-drawn from the frozen snapshot, so later product edits never change it), every
 * part's yarn color, every other choice, and a print view to keep beside the hook.
 */
export function WorkOrder({ item, orderNumber }: { item: AdminOrderItem; orderNumber: string }) {
  const printId = useId().replace(/:/g, '')
  const snap = item.previewSnapshot
  /** The regions a colour choice paints, when they're named differently from the choice (e.g. a group). */
  const regionsOf = (customizationId?: string) => {
    const names = (snap?.layers ?? []).filter((l) => l.customizationId === customizationId).map((l) => l.regionName).filter(Boolean) as string[]
    const label = snap?.layers.find((l) => l.customizationId === customizationId)?.partLabel
    return names.length && !(names.length === 1 && names[0] === label) ? `→ ${names.join(', ')}` : undefined
  }

  const print = () => {
    document.body.dataset.printTarget = printId
    const done = () => {
      delete document.body.dataset.printTarget
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  return (
    <div data-print-id={printId} className="mt-3 rounded-xl border bg-muted/30 p-3">
      <style>{`@media print {
        body[data-print-target="${printId}"] * { visibility: hidden !important; }
        body[data-print-target="${printId}"] [data-print-id="${printId}"], body[data-print-target="${printId}"] [data-print-id="${printId}"] * { visibility: visible !important; }
        body[data-print-target="${printId}"] [data-print-id="${printId}"] { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0; background: #fff; }
        [data-print-id="${printId}"] .no-print { display: none !important; }
        [data-print-id="${printId}"] .print-only { display: block !important; }
      }`}</style>

      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Scissors className="h-3.5 w-3.5" /> Customization work order
        </p>
        <Button type="button" variant="ghost" size="sm" className="no-print h-7 text-xs" onClick={print}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
      </div>
      <div className="print-only mt-2 hidden">
        <p className="text-lg font-semibold">
          Order {orderNumber} — {item.name}
        </p>
        <p className="text-sm">Quantity: {item.quantity}</p>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        {snap && (
          <div className="aspect-square w-full shrink-0 overflow-hidden rounded-lg border bg-background p-2 sm:w-44">
            <ColorPreview preview={{ ...snap, layers: snap.layers.map((l, i) => ({ id: String(i), customizationId: l.customizationId, zone: l.zone, maskUrl: l.maskUrl, sortOrder: i })) }} colors={snapshotColors(snap.layers)} alt={`${item.name} — customer's design`} className="h-full w-full" />
          </div>
        )}
        <table className="w-full self-start text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-1.5 font-medium">Part / option</th>
              <th className="pb-1.5 font-medium">Choice</th>
              <th className="pb-1.5 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {item.customizations.map((c, i) => {
              const hex = c.type === 'color' && c.value && HEX_RE.test(c.value) ? c.value : undefined
              return (
                <tr key={i} className="border-t align-top">
                  <td className="py-1.5 pr-3 font-medium">
                    {c.label}
                    {regionsOf(c.customizationId) && <span className="block text-[11px] font-normal text-muted-foreground">{regionsOf(c.customizationId)}</span>}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      {hex && <span className="h-3.5 w-3.5 shrink-0 rounded-full border" style={{ backgroundColor: hex }} />}
                      {c.valueLabel ?? c.textValue}
                      {hex && <span className="font-mono text-xs text-muted-foreground">{hex.toUpperCase()}</span>}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {c.priceAdjustment ? `${c.priceAdjustment > 0 ? '+' : '−'}${formatPrice(Math.abs(c.priceAdjustment))}` : '—'}
                  </td>
                </tr>
              )
            })}
            {snap?.layers
              .filter((l, i, all) => !l.hex && !item.customizations.some((c) => c.customizationId === l.customizationId) && all.findIndex((x) => x.customizationId === l.customizationId) === i)
              .map((l) => (
                <tr key={l.customizationId} className="border-t">
                  <td className="py-1.5 pr-3 font-medium">
                    {l.partLabel}
                    {regionsOf(l.customizationId) && <span className="block text-[11px] font-normal text-muted-foreground">{regionsOf(l.customizationId)}</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground" colSpan={2}>
                    Not chosen — make as shown in the product photo
                  </td>
                </tr>
              ))}
            <tr className="border-t font-semibold">
              <td className="pt-2" colSpan={2}>
                Make {item.quantity} × · line total
              </td>
              <td className="pt-2 text-right tabular-nums">{formatPrice(item.lineTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
