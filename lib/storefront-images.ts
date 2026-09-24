/** Every editorial (non-product) image the storefront uses, in one place — swap a path here
 * to restyle a section without touching components. Product/category photos come from the API,
 * and Admin → Hero Slides images take priority over `heroMain` on the homepage. */
export const STOREFRONT_IMAGES = {
  logo: '/logo.png',
  heroMain: '/editorial/hero-model.webp',
  megaMenu: '/editorial/hero-model.webp',
  promoBanner: '/editorial/promo-flatlay.webp',
  dealOfDay: '/editorial/gift-bunny.webp',
  story: '/editorial/artisan-hands.webp',
  storySecondary: '/editorial/gift-set.webp',
  giftCard: '/editorial/gift-set.webp',
  authSide: '/editorial/yarn-basket.webp',
  shopBanner: '/editorial/yarn-banner.webp',
  aboutHero: '/editorial/studio.webp',
  instagram: ['/instagram/insta-1.jpg', '/instagram/insta-2.jpg', '/instagram/insta-3.jpg', '/instagram/insta-4.jpg', '/instagram/insta-5.jpg', '/instagram/insta-6.jpg'],
} as const
