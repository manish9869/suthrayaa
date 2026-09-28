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
  // `/refresh/*` are local (public/) until uploaded to the site-media bucket
  promoBanner: '/refresh/promo-flatlay.webp',
  dealOfDay: mediaUrl('/editorial/scene-star.webp'),
  story: '/refresh/story-hands.webp',
  storySecondary: mediaUrl('/editorial/scene-hair.webp'),
  authSide: '/refresh/auth-corner.webp',
  shopBanner: '/refresh/promo-flatlay.webp',
  aboutHero: '/refresh/story-hands.webp',
  customize: ['/refresh/customize-banner.webp', '/refresh/customize-colours.webp', '/refresh/customize-name.webp'],
  instagram: [
    mediaUrl('/editorial/scene-garland.webp'),
    mediaUrl('/editorial/scene-keychains.webp'),
    mediaUrl('/editorial/scene-doily.webp'),
    mediaUrl('/editorial/scene-mobile.webp'),
    mediaUrl('/editorial/scene-bags.webp'),
    mediaUrl('/editorial/scene-toran.webp'),
  ],
} as const
