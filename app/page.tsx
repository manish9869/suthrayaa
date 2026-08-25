import { Fragment, type ReactNode } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/home/hero-section'
import { CategoriesSection } from '@/components/home/categories-section'
import { FeaturedProducts } from '@/components/home/featured-products'
import { BestSellers } from '@/components/home/best-sellers'
import { StorySection } from '@/components/home/story-section'
import { TestimonialsSection } from '@/components/home/testimonials-section'
import { InstagramSection } from '@/components/home/instagram-section'
import { TrustBadges } from '@/components/home/trust-badges'
import { getCategories, getFeaturedProducts, getBestsellerProducts, getTestimonials, getHeroSlides } from '@/lib/data'
import { getPublicHomepageSections } from '@/lib/api/settings'

// Default/fallback order — matches the original hardcoded homepage exactly, for the section
// keys that have a corresponding existing component. Used whenever the settings API fails or
// returns nothing, so the homepage is never empty.
const FALLBACK_SECTION_ORDER = [
  'hero_banner',
  'featured_categories',
  'featured_products',
  'best_sellers',
  'testimonials',
  'instagram',
]

export default async function HomePage() {
  const [categories, featuredProducts, bestsellers, testimonials, heroSlides] = await Promise.all([
    getCategories(),
    getFeaturedProducts(4),
    getBestsellerProducts(8),
    getTestimonials(),
    getHeroSlides(),
  ])

  let sectionOrder = FALLBACK_SECTION_ORDER
  try {
    const homepageSections = await getPublicHomepageSections()
    const enabledKeys = homepageSections
      .filter((section) => section.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((section) => section.sectionKey)
    if (enabledKeys.length > 0) sectionOrder = enabledKeys
  } catch {
    // Settings API hiccup — fall back to the default fixed order so the homepage is never empty.
  }

  // sectionKey -> existing component. Keys returned by the settings API with no matching
  // component here (new_arrivals, trending, sale_products, collections, promotional_banner,
  // newsletter) are intentionally left unmapped and skipped below, rather than inventing new
  // components for them. None of these components currently accept title/subtitle props, so
  // section.title/section.subtitle from the API aren't threaded through.
  const sectionComponents: Record<string, ReactNode> = {
    hero_banner: <HeroSection slides={heroSlides} featuredProducts={featuredProducts} />,
    featured_categories: <CategoriesSection categories={categories} />,
    featured_products: <FeaturedProducts products={featuredProducts} />,
    best_sellers: <BestSellers products={bestsellers} />,
    testimonials: <TestimonialsSection testimonials={testimonials} />,
    instagram: <InstagramSection />,
  }

  return (
    <>
      <Navbar categories={categories} />
      <main>
        {sectionOrder.map((key) => {
          const node = sectionComponents[key]
          if (!node) return null
          return (
            <Fragment key={key}>
              {node}
              {/* TrustBadges and StorySection have no entry in the homepage-sections catalog
                  (they're fixed storefront chrome, not admin-toggleable) — anchored right after
                  the sections they originally followed in the hardcoded layout. */}
              {key === 'hero_banner' && <TrustBadges />}
              {key === 'featured_products' && <StorySection />}
            </Fragment>
          )
        })}
      </main>
      <Footer />
    </>
  )
}
