/**
 * Customer colour controls, generated from the product's own configuration — the same code
 * for every product type. Regions an admin grouped with a shared colour give one control
 * named after the group; groups with individual colours give one control per region under
 * the group's heading; ungrouped regions give their own control. Colour options that aren't
 * part of the photo preview come last.
 */

import type { ProductCustomization, ProductPreview } from '@/lib/data'

export interface ColourSection {
  /** Group heading, when the controls belong to a group of individually-coloured regions. */
  title?: string
  options: ProductCustomization[]
}

export function colourSections(customizations: ProductCustomization[], preview?: ProductPreview): ColourSection[] {
  const colour = customizations.filter((c) => c.enabled && c.type === 'color')
  const byId = new Map(colour.map((c) => [c.id, c]))
  const placed = new Set<string>()
  const take = (id: string) => {
    const c = byId.get(id)
    if (!c || placed.has(id)) return undefined
    placed.add(id)
    return c
  }

  const sections: ColourSection[] = []
  const layers = [...(preview?.layers ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const groups = new Map((preview?.groups ?? []).map((g) => [g.id, g]))
  const loose: ProductCustomization[] = []

  // walk regions in layer order; a group's controls appear where its first region is
  const doneGroups = new Set<string>()
  for (const layer of layers) {
    const g = layer.groupId ? groups.get(layer.groupId) : undefined
    if (!g) {
      const c = take(layer.customizationId)
      if (c) loose.push(c)
      continue
    }
    if (doneGroups.has(g.id)) continue
    doneGroups.add(g.id)
    const options = layers
      .filter((l) => l.groupId === g.id)
      .map((l) => take(l.customizationId))
      .filter((c): c is ProductCustomization => Boolean(c))
    if (options.length === 0) continue
    // shared colour → a single control already named after the group: no heading needed
    if (loose.length) sections.push({ options: loose.splice(0) })
    sections.push(options.length === 1 ? { options } : { title: g.name, options })
  }
  if (loose.length) sections.push({ options: loose })

  const rest = colour.filter((c) => !placed.has(c.id))
  if (rest.length) sections.push({ options: rest })
  return sections
}
