'use client'

import { Component, useMemo, useState, type ReactNode } from 'react'
import { RotateCcw, ShoppingBag } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice, type Product } from '@/lib/data'
import { ProductCustomizer, type CustomizerSelection, type ResolvedCustomization } from '@/components/product-customizer'
import { ColorPreview } from '@/components/customize/color-preview'
import { ColourPartPicker } from '@/components/customize/colour-part-picker'
import { selectedColorMap } from '@/lib/preview/selected-colors'

/**
 * "Customize" — colours for each yarn, one part at a time, next to a live preview of the
 * piece. Choices are the page's own shared selections and "Add to cart" calls the page's
 * existing handler, so cart/checkout logic is untouched. Any render failure is contained by
 * the boundary below and reported via onPreviewError so the page can quietly hide it.
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
  const { product, open, onOpenChange, selections, missingRequired, quantity, outOfStock } = props
  const preview = product.preview!
  const [showOriginal, setShowOriginal] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const colors = useMemo(() => selectedColorMap(product, selections), [product, selections])
  // Parts the photo actually paints come first, in the preview's order
  const layerOrder = preview.layers.map((l) => l.customizationId)
  const rank = (id: string) => (layerOrder.includes(id) ? layerOrder.indexOf(id) : layerOrder.length)
  const colourGroups = product.customizations.filter((g) => g.enabled && g.type === 'color').sort((a, b) => rank(a.id) - rank(b.id))
  const hasColourChoice = colourGroups.some((g) => selections[g.id])
  const resetColours = () => {
    const next = { ...selections }
    for (const g of colourGroups) delete next[g.id]
    props.onSelectionsChange(next)
  }
  const otherGroups = product.customizations.filter((g) => g.enabled && g.type !== 'color')
  const unitPrice = product.price + props.resolved.reduce((s, r) => s + r.priceAdjustment, 0)
  const isPhoto = preview.mode === 'photo'

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
          'grid w-full max-w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-[1.5rem] p-0 sm:max-w-4xl',
          'max-md:max-h-[94dvh] max-md:grid-rows-[auto_minmax(0,1fr)] md:h-[min(40rem,90dvh)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]',
          'max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:max-w-full max-sm:rounded-b-none'
        )}
      >
        {/* Preview */}
        <div className="relative h-[42dvh] bg-sand md:h-full">
          <PreviewBoundary onError={props.onPreviewError}>
            {showOriginal && isPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.baseUrl} alt={product.name} className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <ColorPreview preview={preview} colors={colors} alt={`${product.name} in your colours`} className="absolute inset-0 h-full w-full" onError={props.onPreviewError} />
            )}
          </PreviewBoundary>
          {isPhoto ? (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <div className="flex rounded-full bg-background/85 p-0.5 text-xs font-medium shadow-sm backdrop-blur">
                {[
                  { label: 'Your colours', on: !showOriginal },
                  { label: 'Original', on: showOriginal },
                ].map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    aria-pressed={t.on}
                    onClick={() => setShowOriginal(t.label === 'Original')}
                    className={cn('rounded-full px-3 py-1.5 transition-colors', t.on ? 'bg-foreground text-background' : 'text-foreground/70 hover:text-foreground')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="absolute inset-x-0 bottom-3 text-center text-[11px] text-muted-foreground">Illustration · your piece is handmade</p>
          )}
        </div>

        {/* Choices */}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5 md:px-6 md:pt-6">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div>
                <DialogTitle className="font-serif text-xl font-medium tracking-tight">Choose your colours</DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px]">{product.name} · made by hand in the colours you pick</DialogDescription>
              </div>
              {hasColourChoice && (
                <button type="button" onClick={resetColours} className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              )}
            </div>

            <div className="mt-5">
              <ColourPartPicker groups={colourGroups} selections={selections} onChange={props.onSelectionsChange} showErrors={showErrors} />
            </div>

            {otherGroups.length > 0 && (
              <div className="mt-6 border-t pt-5">
                <ProductCustomizer
                  customizations={product.customizations}
                  selections={selections}
                  onSelectionsChange={props.onSelectionsChange}
                  onChange={props.onCustomizerChange}
                  showErrors={showErrors}
                  hideTypes={['color']}
                  bare
                />
              </div>
            )}
          </div>

          <div className="border-t px-5 py-3.5 md:px-6">
            {showErrors && missingRequired.length > 0 && (
              <p role="alert" className="mb-2 text-[12.5px] font-medium text-destructive">
                Please choose {missingRequired.map((m) => m.toLowerCase()).join(', ')}
              </p>
            )}
            <Button size="lg" className="h-12 w-full" onClick={addToCart} disabled={outOfStock}>
              <ShoppingBag className="h-5 w-5" />
              {outOfStock ? 'Out of stock' : `Add to cart · ${formatPrice(unitPrice * quantity)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
