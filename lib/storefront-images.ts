/** Every editorial (non-product) image the storefront uses, in one place — swap a path here
 * to restyle a section without touching components. All scenes are styled shots of real
 * Suthrayaa pieces. Product/category photos come from the API, and Admin → Hero Slides images
 * take priority over the hero fallbacks on the homepage. */
export const STOREFRONT_IMAGES = {
  logo: '/logo.png',
  /** Square, tightly-cropped emblem — use wherever the logo sits in a small box (header, drawer). */
  logoMark: '/logo-mark.png',
  // hero slides
  heroGarland: '/editorial/scene-garland.webp',
  heroFlowers: '/editorial/scene-hibiscus.webp',
  heroDecor: '/editorial/scene-rosetoran.webp',
  heroHair: '/editorial/scene-gajra.webp',
  heroKeychains: '/editorial/scene-keychains.webp',
  heroBags: '/editorial/scene-bags.webp',
  // sections
  megaMenu: '/editorial/scene-sunflowers.webp',
  promoBanner: '/editorial/scene-flatlay.webp',
  dealOfDay: '/editorial/scene-star.webp',
  story: '/editorial/story-hands.webp',
  storySecondary: '/editorial/scene-hair.webp',
  authSide: '/editorial/scene-devghar.webp',
  shopBanner: '/editorial/scene-flatlay.webp',
  aboutHero: '/editorial/story-hands.webp',
  instagram: [
    '/editorial/scene-garland.webp',
    '/editorial/scene-keychains.webp',
    '/editorial/scene-doily.webp',
    '/editorial/scene-mobile.webp',
    '/editorial/scene-bags.webp',
    '/editorial/scene-toran.webp',
  ],
} as const
