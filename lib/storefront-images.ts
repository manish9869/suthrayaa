/** Every editorial (non-product) image the storefront uses, in one place — swap a path here
 * to restyle a section without touching components. Product/category photos come from the API,
 * and Admin → Hero Slides images take priority over the hero fallbacks on the homepage. */
export const STOREFRONT_IMAGES = {
  logo: '/logo.png',
  heroGarland: '/editorial/hero-garland.webp',
  heroFlowers: '/editorial/hero-potted.webp',
  heroHair: '/editorial/hero-hair.webp',
  heroKeychains: '/editorial/hero-keychains.webp',
  megaMenu: '/editorial/hero-flowers.webp',
  promoBanner: '/editorial/promo-lilac.webp',
  dealOfDay: '/editorial/hair-gajra.webp',
  story: '/editorial/story-hands.webp',
  storySecondary: '/editorial/hair-gajra.webp',
  authSide: '/editorial/hero-flowers.webp',
  shopBanner: '/editorial/studio-lilac.webp',
  aboutHero: '/editorial/story-hands.webp',
  instagram: ['/instagram/insta-1.jpg', '/instagram/insta-2.jpg', '/instagram/insta-3.jpg', '/instagram/insta-4.jpg', '/instagram/insta-5.jpg', '/instagram/insta-6.jpg'],
} as const
