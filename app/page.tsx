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
import { PromoSection } from '@/components/home/promo-section'
import { NewArrivals } from '@/components/home/new-arrivals'
import { LogoIntro } from '@/components/home/logo-intro'
import { ReelsSection } from '@/components/home/reels-section'
import { ConvertibleShowcase } from '@/components/home/convertible-showcase'
import { ProductGridSection } from '@/components/home/product-grid-section'
import { CollectionsSection } from '@/components/home/collections-section'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { YarnDivider } from '@/components/motion/yarn-thread'
import { getCategories, getFeaturedProducts, getBestsellerProducts, getNewArrivals, getTestimonials, getHeroSlides, getProducts } from '@/lib/data'
import { getPublicHomepageSections } from '@/lib/api/settings'
import { getSiteContent, type SectionHeadingContent } from '@/lib/content'

// Every homepage section — its on/off state, order and heading copy — is controlled from
// Admin → Site Settings → Homepage; section bodies come from Admin → Storefront Content (and
// Products / Categories / Testimonials / Hero Slides). This order is the fallback used only if
// the settings API is unreachable, and matches the original hardcoded homepage.
const FALLBACK_SECTION_ORDER = [
  'hero_banner',
  'trust_badges',
  'featured_categories',
  'reels',
  'featured_products',
  'story',
  'new_arrivals',
  'best_sellers',
  'convertible_showcase',
  'promotional_banner',
  'testimonials',
  'instagram',
]

// Decorative dividers that follow a section (not content, so not admin-managed)
const DIVIDER_AFTER: Record<string, ReactNode> = {
  featured_products: <YarnDivider className="mt-4" />,
  best_sellers: <YarnDivider tone="peach" />,
  new_arrivals: <YarnDivider />,
}

export default async function HomePage() {
  const [categories, featuredProducts, bestsellers, newArrivals, testimonials, heroSlides, content, sections] = await Promise.all([
    getCategories(),
    getFeaturedProducts(4),
    getBestsellerProducts(8),
    // Optional sections — never let one of them take the whole homepage down
    getNewArrivals(5).catch(() => []),
    getTestimonials(),
    getHeroSlides(),
    getSiteContent(),
    getPublicHomepageSections().catch(() => []),
  ])

  const enabled = sections.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
  const order = enabled.length > 0 ? enabled.map((s) => s.sectionKey) : [...FALLBACK_SECTION_ORDER]
  // A built-in section with no row at all (e.g. before migration 0015 has run) keeps its
  // original slot rather than silently disappearing; once it has a row, the admin decides.
  if (enabled.length > 0) {
    FALLBACK_SECTION_ORDER.forEach((key, i) => {
      if (sections.some((s) => s.sectionKey === key)) return
      const prev = FALLBACK_SECTION_ORDER.slice(0, i).reverse().find((k) => order.includes(k))
      order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, key)
    })
  }
  const headingFor = (key: string): SectionHeadingContent | null => sections.find((s) => s.sectionKey === key) ?? null

  // Product sets only some sections need — fetched only when that section is switched on
  const needs = (key: string) => order.includes(key)
  const [trending, catalogue] = await Promise.all([
    needs('trending') ? getProducts({ sort: 'rating', limit: 8 }).then((r) => r.items).catch(() => []) : [],
    needs('sale_products') ? getProducts({ limit: 100 }).then((r) => r.items).catch(() => []) : [],
  ])
  const onSale = catalogue.filter((p) => p.comparePrice && p.comparePrice > p.price)

  const render: Record<string, () => ReactNode> = {
    hero_banner: () => <HeroSection slides={heroSlides} featuredProducts={featuredProducts} />,
    trust_badges: () => <TrustBadges content={content['home.trust_badges']} />,
    featured_categories: () => <CategoriesSection categories={categories} heading={headingFor('featured_categories')} />,
    reels: () => <ReelsSection content={content['home.reels']} heading={headingFor('reels')} />,
    featured_products: () => <FeaturedProducts products={featuredProducts} heading={headingFor('featured_products')} />,
    story: () => <StorySection content={content['home.story']} />,
    new_arrivals: () => <NewArrivals products={newArrivals} heading={headingFor('new_arrivals')} />,
    best_sellers: () => <BestSellers products={bestsellers} heading={headingFor('best_sellers')} />,
    convertible_showcase: () => <ConvertibleShowcase content={content['home.convertible']} />,
    promotional_banner: () => <PromoSection products={[...bestsellers, ...featuredProducts]} content={content['home.promo']} />,
    trending: () => (
      <ProductGridSection products={trending} heading={headingFor('trending')} eyebrow="Top rated this season" title="Trending" accent="now" href="/shop?sort=rating" />
    ),
    sale_products: () => (
      <ProductGridSection products={onSale} heading={headingFor('sale_products')} eyebrow="Limited-time prices" title="On" accent="sale" href="/shop" linkLabel="Shop the sale" tinted />
    ),
    collections: () => <CollectionsSection categories={categories} heading={headingFor('collections')} />,
    testimonials: () => (
      <TestimonialsSection testimonials={testimonials} heading={headingFor('testimonials')} content={content['home.testimonials']} />
    ),
    instagram: () => <InstagramSection content={content['home.instagram']} heading={headingFor('instagram')} />,
    newsletter: () => {
      const h = headingFor('newsletter')
      const footer = content['footer.content']
      return (
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <NewsletterSignup
              source="homepage"
              title={h?.title?.trim() || footer?.newsletterTitle || undefined}
              text={h?.description?.trim() || footer?.newsletterText}
              successMessage={footer?.newsletterSuccess || undefined}
            />
          </div>
        </section>
      )
    },
  }

  return (
    <>
      <LogoIntro />
      <Navbar categories={categories} />
      <main className="overflow-x-clip">
        {order.map((key) => {
          const section = render[key]
          if (!section) return null
          return (
            <Fragment key={key}>
              {section()}
              {DIVIDER_AFTER[key]}
            </Fragment>
          )
        })}
      </main>
      <Footer />
    </>
  )
}
