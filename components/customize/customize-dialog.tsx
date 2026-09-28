'use client'

import { Component, useMemo, useState, type ReactNode } from 'react'
import { ShoppingBag, Sparkles, Image as ImageIcon, Palette } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice, type Product } from '@/lib/data'
import { ProductCustomizer, type CustomizerSelection, type ResolvedCustomization } from '@/components/product-customizer'
import { ColorPreview } from '@/components/customize/color-preview'
import { selectedColorMap } from '@/lib/preview/selected-colors'

/**
 * "Customize & Preview" — a self-contained flow on top of the product's existing
 * customization groups. Nothing here touches cart/checkout logic: choices are the same
 * shared selections the page's own customizer uses, and "Add to cart" calls the page's
 * existing handler. Any render failure is contained by the boundary below and reported
 * via onPreviewError so the page can quietly hide the feature.
 */

class PreviewBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

interface CustomizeDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  selections: Record<string, CustomizerSelection>
  onSelectionsChange: (next: Record<string, CustomizerSelection>) => void
  onCustomizerChange: (resolved: ResolvedCustomization[], priceAdjustment: number, missingRequired: string[]) => void
  resolved: ResolvedCustomization[]
  missingRequired: string[]
  quantity: number
  outOfStock: boolean
  /** The page's existing add-to-cart handler. */
  onAddToCart: () => void
  onPreviewError: () => void
}

export default function CustomizeDialog(props: CustomizeDialogProps) {
  const { product, open, onOpenChange, selections, resolved, missingRequired, quantity, outOfStock } = props
  const preview = product.preview!
  const [showOriginal, setShowOriginal] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const colors = useMemo(() => selectedColorMap(product, selections), [product, selections])
  const paid = resolved.filter((r) => r.priceAdjustment !== 0)
  const unitPrice = product.price + resolved.reduce((s, r) => s + r.priceAdjustment, 0)
  const pickedParts = preview.layers.filter((l) => colors[l.customizationId]).length

  const addToCart = () => {
    if (missingRequired.length > 0) {
      setShowErrors(true)
      return
    }
    props.onAddToCart()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[94dvh] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-[1.75rem] p-0 sm:max-w-5xl',
          'max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:max-w-full max-sm:rounded-b-none'
        )}
      >
        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1.1fr_1fr] md:overflow-hidden">
          {/* Preview */}
          <div className="sticky top-0 z-10 flex flex-col bg-blush/60 md:static md:min-h-0">
            <div className="relative mx-auto aspect-square h-[40dvh] max-w-full p-4 md:h-auto md:w-full md:p-8">
              <PreviewBoundary onError={props.onPreviewError}>
                {showOriginal && preview.mode === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.baseUrl} alt={product.name} className="h-full w-full object-contain" />
                ) : (
                  <ColorPreview preview={preview} colors={colors} alt={`${product.name} — your design`} className="h-full w-full" onError={props.onPreviewError} />
                )}
              </PreviewBoundary>
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur md:left-6 md:top-6">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Live preview
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-4 text-xs text-muted-foreground md:px-8 md:pb-6">
              <span>
                {pickedParts}/{preview.layers.length} parts colored
                {preview.mode === 'svg' && ' · illustration, actual piece is handmade'}
              </span>
              {preview.mode === 'photo' && (
                <button
                  type="button"
                  onClick={() => setShowOriginal((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 font-medium text-foreground transition-colors hover:border-muted-foreground"
                >
                  {showOriginal ? <Palette className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {showOriginal ? 'Your design' : 'Original photo'}
                </button>
              )}
            </div>
          </div>

          {/* Choices */}
          <div className="flex min-h-0 flex-col md:overflow-y-auto">
            <div className="px-5 pt-5 md:px-7 md:pt-7">
              <DialogTitle className="font-serif text-2xl font-medium tracking-tight">Customize your {product.name}</DialogTitle>
              <DialogDescription className="mt-1.5 text-sm">
                Pick a yarn color for each part and watch your piece change. We&apos;ll handcraft it exactly like this.
              </DialogDescription>
            </div>
            <div className="p-5 md:px-7">
              <ProductCustomizer
                customizations={product.customizations}
                selections={selections}
                onSelectionsChange={props.onSelectionsChange}
                onChange={props.onCustomizerChange}
                showErrors={showErrors}
              />
            </div>

            {/* Price breakdown */}
            <div className="mx-5 mb-5 rounded-2xl border p-4 text-sm md:mx-7">
              <div className="flex justify-between text-muted-foreground">
                <span>Base price</span>
                <span className="tabular-nums">{formatPrice(product.price)}</span>
              </div>
              {paid.map((r) => (
                <div key={r.customizationId} className="mt-1.5 flex justify-between gap-4 text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {r.label}: {r.displayValue}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {r.priceAdjustment > 0 ? '+' : '−'}
                    {formatPrice(Math.abs(r.priceAdjustment))}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
                <span>{quantity > 1 ? `Total (${quantity} × ${formatPrice(unitPrice)})` : 'Your price'}</span>
                <span className="tabular-nums">{formatPrice(unitPrice * quantity)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t bg-background px-5 py-3.5 md:px-7">
          <Button variant="outline" size="lg" className="h-12" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button size="lg" className="h-12 flex-1" onClick={addToCart} disabled={outOfStock}>
            <ShoppingBag className="h-5 w-5" />
            {outOfStock ? 'Out of stock' : `Add to cart · ${formatPrice(unitPrice * quantity)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
