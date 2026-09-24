import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Sparkles, Users, Award } from 'lucide-react'
import { StaticPageShell } from '@/components/static-page-shell'
import { StorySection } from '@/components/home/story-section'
import { TrustBadges } from '@/components/home/trust-badges'
import { Button } from '@/components/ui/button'
import { getCategories } from '@/lib/data'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'

export const metadata: Metadata = {
  title: 'Our Story | Suthrayaa',
  description: 'The story behind Suthrayaa — handcrafted crochet, made with love, one stitch at a time.',
}

const processSteps = [
  { icon: Sparkles, title: 'Design', description: 'Every piece starts as a sketch, inspired by color, texture, and the little details that make handmade special.' },
  { icon: Heart, title: 'Craft', description: 'Our artisans hand-crochet each item, stitch by stitch, using premium cotton yarn — no machines involved.' },
  { icon: Users, title: 'Check', description: 'Every finished piece is inspected for quality before it’s wrapped and readied for your doorstep.' },
  { icon: Award, title: 'Deliver', description: 'Packed with care and a little bit of love, your handmade piece begins its journey to you.' },
]

export default async function AboutPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="Our Story"
      title="Telling Stories Through Yarn"
      description="Suthrayaa is a small studio with a simple belief: handmade things carry more heart than anything mass-produced ever could."
      image={STOREFRONT_IMAGES.aboutHero}
      wide
    >
      <StorySection />

      {/* Behind the Yarn — our process */}
      <div id="process" className="scroll-mt-28 py-16 lg:py-20 border-t">
        <div className="text-center mb-12">
          <p className="eyebrow mb-4">Behind the yarn</p>
          <h2 className="display text-4xl md:text-6xl text-foreground mb-4">
            From skein <em className="font-normal italic text-primary">to doorstep</em>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Here&apos;s what happens between the moment you place an order and the moment it arrives at your door.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {processSteps.map((step, i) => (
            <div key={step.title} className="relative rounded-[1.75rem] bg-card p-6 text-center ring-1 ring-border lift">
              <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-soft">
                <step.icon className="h-6 w-6" />
              </div>
              <p className="text-xs text-primary font-semibold mb-1">Step {i + 1}</p>
              <h3 className="font-serif font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="my-8 rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground">
        <p className="display text-3xl sm:text-4xl">Ready to find a piece that tells your story?</p>
        <Button size="lg" asChild className="mt-6 h-12 bg-blush px-7 text-foreground hover:bg-blush/90">
          <Link href="/shop">Explore the Collection</Link>
        </Button>
      </div>

      <div className="-mx-4">
        <TrustBadges />
      </div>
    </StaticPageShell>
  )
}
