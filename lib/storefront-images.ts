/** Every editorial (non-product) image the storefront uses, in one place — swap a path here
 * to restyle a section without touching components. All scenes are styled shots of real
 * Suthrayaa pieces. Product/category photos come from the API, and Admin → Hero Slides images
 * take priority over the hero fallbacks on the homepage. */
import { mediaUrl } from './media'

export const STOREFRONT_IMAGES = {
  logo: mediaUrl('/logo.png'),
  /** Square, tightly-cropped emblem — use wherever the logo sits in a small box (header, drawer). */
  logoMark: '/logo-mark.png',
  // hero slides
  heroGarland: mediaUrl('/editorial/scene-garland.webp'),
  heroFlowers: mediaUrl('/editorial/scene-hibiscus.webp'),
  heroDecor: mediaUrl('/editorial/scene-rosetoran.webp'),
  heroHair: mediaUrl('/editorial/scene-gajra.webp'),
  heroKeychains: mediaUrl('/editorial/scene-keychains.webp'),
  heroBags: mediaUrl('/editorial/scene-bags.webp'),
  // sections
  megaMenu: mediaUrl('/editorial/scene-sunflowers.webp'),
  promoBanner: mediaUrl('/editorial/scene-flatlay.webp'),
  dealOfDay: mediaUrl('/editorial/scene-star.webp'),
  story: mediaUrl('/editorial/story-hands.webp'),
  storySecondary: mediaUrl('/editorial/scene-hair.webp'),
  authSide: mediaUrl('/editorial/scene-devghar.webp'),
  shopBanner: mediaUrl('/editorial/scene-flatlay.webp'),
  aboutHero: mediaUrl('/editorial/story-hands.webp'),
  instagram: [
    mediaUrl('/editorial/scene-garland.webp'),
    mediaUrl('/editorial/scene-keychains.webp'),
    mediaUrl('/editorial/scene-doily.webp'),
    mediaUrl('/editorial/scene-mobile.webp'),
    mediaUrl('/editorial/scene-bags.webp'),
    mediaUrl('/editorial/scene-toran.webp'),
  ],
} as const
