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

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrustBadges />
        <CategoriesSection />
        <FeaturedProducts />
        <StorySection />
        <BestSellers />
        <TestimonialsSection />
        <InstagramSection />
      </main>
      <Footer />
    </>
  )
}
