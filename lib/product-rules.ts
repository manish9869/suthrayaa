import type { Product } from '@/lib/data'

/**
 * True when a product can't be added straight from a card or the wishlist because the
 * customer has to pick something first (a required size / option, a colour when there are several, or custom text).
 * Those products send the customer to the product page instead of silently adding an
 * incomplete line that would only fail at payment.
 */
export function needsOptions(product: Product): boolean {
  const required = (product.customizations ?? []).some((c) => c.enabled && c.required)
  const legacyText = !(product.customizations?.length) && product.isCustomizable && !!product.customizationOptions?.allowText
  // Several base colours (and no colour option group of its own) means a colour must be chosen
  const hasColorGroup = (product.customizations ?? []).some((c) => c.enabled && c.type === 'color')
  const chooseColour = product.colors.length > 1 && !hasColorGroup
  return required || legacyText || chooseColour
}

/** Same stock rule as the backend: only limits when tracked and backorders are off. */
export function isOutOfStock(product: Product): boolean {
  const limited = product.trackInventory !== false && !product.allowBackorders && !product.continueSellingWhenOutOfStock
  return limited && product.stock <= 0
}
