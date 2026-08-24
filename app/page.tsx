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

export default async function HomePage() {
  const [categories, featuredProducts, bestsellers, testimonials, heroSlides] = await Promise.all([
    getCategories(),
    getFeaturedProducts(4),
    getBestsellerProducts(8),
    getTestimonials(),
    getHeroSlides(),
  ])

  return (
    <>
      <Navbar categories={categories} />
      <main>
        <HeroSection slides={heroSlides} featuredProducts={featuredProducts} />
        <TrustBadges />
        <CategoriesSection categories={categories} />
        <FeaturedProducts products={featuredProducts} />
        <StorySection />
        <BestSellers products={bestsellers} />
        <TestimonialsSection testimonials={testimonials} />
        <InstagramSection />
      </main>
      <Footer />
    </>
  )
}
