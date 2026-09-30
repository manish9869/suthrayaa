import type { Product } from '@/lib/data'

/** group id -> chosen hex, for every color customization group (undefined = not chosen yet). */
export function selectedColorMap(product: Product, selections: Record<string, { valueId?: string }>) {
  const map: Record<string, string | undefined> = {}
  for (const group of product.customizations) {
    if (group.type !== 'color') continue
    const valueId = selections[group.id]?.valueId
    map[group.id] = valueId ? group.values.find((v) => v.id === valueId)?.value : undefined
  }
  return map
}
