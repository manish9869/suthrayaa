/**
 * Styled studio shots of real Suthrayaa pieces, matched to catalog items by name.
 *
 * Products (and categories) created before real photos were uploaded still carry the
 * `/placeholder.svg` image. Until an admin uploads photos — or the backend's
 * `scripts/attach-studio-images.ts` is run — the storefront shows the matching studio shot
 * instead, so no card is ever a grey placeholder. Real uploaded photos always win.
 */

const S = (name: string) => `/editorial/scene-${name}.webp`

/** First match wins, so more specific phrases come before generic ones. */
const RULES: [RegExp, string[]][] = [
  [/sonchafa\s*(&|and)\s*jaswand|jaswand/i, [S('garland'), S('devghar')]],
  [/sonchafa/i, [S('sonchafa'), S('garland')]],
  [/sunflower\s*pot|potted/i, [S('sunflowers'), S('flatlay')]],
  [/sunflower/i, [S('sunflowers'), S('flatlay')]],
  [/lily|lilies/i, [S('lily')]],
  [/hibiscus/i, [S('hibiscus'), S('bouquet'), S('bouquet-pink')]],
  [/bouquet/i, [S('bouquet'), S('bouquet-pink'), S('hibiscus')]],
  [/door\s*hanging|toran/i, [S('rosetoran'), S('rosetoran-marigold'), S('fantoran'), S('toran')]],
  [/flower\s*coaster/i, [S('coasters'), S('coasters-pastel'), S('doily')]],
  [/coaster|mat\b|mats\b/i, [S('mats'), S('coasters')]],
  [/doily/i, [S('doily')]],
  [/keychain|key\s*chain|charm/i, [S('flowerkeys'), S('keychains')]],
  [/hair\s*tie|scrunchie/i, [S('hair'), S('gajra')]],
  [/hair\s*band|headband/i, [S('hairband'), S('hairband-pastel')]],
  [/clip/i, [S('hairband'), S('hair')]],
  [/gajra|veni|mogra|jasmine/i, [S('gajra'), S('hair')]],
  [/bottle/i, [S('bottleopen'), S('bottleopen-lilac'), S('staropen')]],
  [/tote|shoulder\s*bag|granny/i, [S('totes'), S('bags')]],
  [/sling|bag|pouch/i, [S('bags'), S('totes')]],
  [/mobile|moon/i, [S('mobile')]],
  [/star/i, [S('staropen'), S('bottleopen')]],
  [/garland|haar|mala/i, [S('garland'), S('devghar')]],
  [/devghar|pooja|puja|chowki/i, [S('devghar'), S('garland')]],
  [/flower|floral|rose/i, [S('bouquet'), S('hibiscus')]],
  [/decor|décor|home/i, [S('rosetoran'), S('doily')]],
]

/** Tries each name in order (product name first, then its category), so a product's own
 * name always beats a broader category match. */
export function studioImagesFor(...names: (string | undefined | null)[]): string[] {
  for (const name of names) {
    if (!name) continue
    for (const [re, images] of RULES) if (re.test(name)) return images
  }
  return []
}

const isPlaceholder = (url?: string | null) => !url || /placeholder/i.test(url)

/** Real images when the item has any; otherwise the matching studio shots. */
export function withStudioImages(images: string[] | undefined, ...names: (string | undefined | null)[]): string[] {
  const real = (images ?? []).filter((u) => !isPlaceholder(u))
  if (real.length > 0) return real
  const studio = studioImagesFor(...names)
  return studio.length > 0 ? studio : (images ?? [])
}

export function withStudioImage(image: string | undefined, ...names: (string | undefined | null)[]): string | undefined {
  return withStudioImages(image ? [image] : [], ...names)[0] ?? image
}
