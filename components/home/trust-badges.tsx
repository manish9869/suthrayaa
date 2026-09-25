import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { ContentIcon } from '@/components/content-text'
import type { SiteContent } from '@/lib/content'

// Built-in copy, used only if the content API is unreachable (edit in Admin → Storefront Content)
const FALLBACK: SiteContent['home.trust_badges'] = {
  items: [
    { icon: 'truck', title: 'Free shipping', description: 'On orders above ₹999' },
    { icon: 'rotate-ccw', title: 'Easy returns', description: '7-day hassle-free returns' },
    { icon: 'shield-check', title: 'Secure checkout', description: 'UPI, cards & net banking' },
    { icon: 'gem', title: 'Premium quality', description: '100% cotton, finished by hand' },
  ],
}

export function TrustBadges({ content }: { content?: SiteContent['home.trust_badges'] }) {
  const badges = (content ?? FALLBACK).items
  if (badges.length === 0) return null
  return (
    <section className="relative z-10 -mt-6 px-4 lg:-mt-10">
      <Stagger className="container mx-auto grid grid-cols-2 gap-y-6 rounded-[1.75rem] bg-card px-5 py-6 shadow-[0_20px_60px_-35px_rgb(49_32_140/0.45)] ring-1 ring-border lg:grid-cols-4 lg:divide-x lg:divide-border lg:px-2 lg:py-7">
        {badges.map((badge, i) => (
          <StaggerItem key={`${badge.title}-${i}`} className="flex flex-col items-center gap-2.5 px-2 text-center sm:flex-row sm:text-left lg:justify-center lg:px-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary sm:h-12 sm:w-12">
              <ContentIcon name={badge.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{badge.title}</span>
              <span className="block text-[12px] leading-snug text-muted-foreground sm:text-[12.5px]">{badge.description}</span>
            </span>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
