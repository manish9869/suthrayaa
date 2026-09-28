import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageShell } from '@/components/static-page-shell'
import { StorySection } from '@/components/home/story-section'
import { TrustBadges } from '@/components/home/trust-badges'
import { Button } from '@/components/ui/button'
import { AccentText, ContentIcon } from '@/components/content-text'
import { getCategories } from '@/lib/data'
import { getSiteContent, type SiteContent } from '@/lib/content'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'

export const metadata: Metadata = {
  title: 'Our Story | Suthrayaa',
  description: 'The story behind Suthrayaa — handcrafted crochet, made with love, one stitch at a time.',
}

// Built-in copy, used only if the content API is unreachable (edit in Admin → Storefront Content)
const FALLBACK: SiteContent['page.about'] = {
  eyebrow: 'Our Story',
  title: 'Telling Stories Through Yarn',
  description: 'Suthrayaa is a small studio with a simple belief: handmade things carry more heart than anything mass-produced ever could.',
  heroImage: STOREFRONT_IMAGES.aboutHero,
  processEyebrow: 'Behind the yarn',
  processTitle: 'From skein *to doorstep*',
  processDescription: 'Here’s what happens between the moment you place an order and the moment it arrives at your door.',
  steps: [
    { icon: 'sparkles', title: 'Design', description: 'Every piece starts as a sketch, inspired by color, texture, and the little details that make handmade special.' },
    { icon: 'heart', title: 'Craft', description: 'Our artisans hand-crochet each item, stitch by stitch, using premium cotton yarn — no machines involved.' },
    { icon: 'users', title: 'Check', description: 'Every finished piece is inspected for quality before it’s wrapped and readied for your doorstep.' },
    { icon: 'award', title: 'Deliver', description: 'Packed with care and a little bit of love, your handmade piece begins its journey to you.' },
  ],
  ctaTitle: 'Ready to find a piece that tells your story?',
  ctaLabel: 'Explore the Collection',
  ctaHref: '/shop',
}

export default async function AboutPage() {
  const [categories, content] = await Promise.all([getCategories(), getSiteContent()])
  const c = content['page.about'] ?? FALLBACK

  return (
    <StaticPageShell
      categories={categories}
      eyebrow={c.eyebrow}
      title={c.title}
      description={c.description}
      image={c.heroImage || STOREFRONT_IMAGES.aboutHero}
      wide
    >
      <StorySection content={content['home.story']} />

      {/* Behind the Yarn — our process */}
      {c.steps.length > 0 && (
        <div id="process" className="scroll-mt-28 py-16 lg:py-20 border-t">
          <div className="text-center mb-12">
            {c.processEyebrow && <p className="eyebrow mb-4">{c.processEyebrow}</p>}
            <h2 className="display text-4xl md:text-6xl text-foreground mb-4">
              <AccentText text={c.processTitle} />
            </h2>
            {c.processDescription && <p className="text-muted-foreground max-w-2xl mx-auto">{c.processDescription}</p>}
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-4 min-[420px]:gap-6">
            {c.steps.map((step, i) => (
              <div key={`${step.title}-${i}`} className="relative rounded-[1.75rem] bg-card p-6 text-center ring-1 ring-border lift">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <ContentIcon name={step.icon} className="h-6 w-6" />
                </div>
                <p className="text-xs text-primary font-semibold mb-1">Step {i + 1}</p>
                <h3 className="font-serif font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {c.ctaTitle && (
        <div className="my-8 rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground">
          <p className="display text-3xl sm:text-4xl">{c.ctaTitle}</p>
          {c.ctaLabel && c.ctaHref && (
            <Button size="lg" asChild className="mt-6 h-12 bg-blush px-7 text-foreground hover:bg-blush/90">
              <Link href={c.ctaHref}>{c.ctaLabel}</Link>
            </Button>
          )}
        </div>
      )}

      <div className="-mx-4">
        <TrustBadges content={content['home.trust_badges']} />
      </div>
    </StaticPageShell>
  )
}
