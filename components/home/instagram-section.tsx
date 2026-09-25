import Image from 'next/image'
import { Instagram, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import type { SectionHeadingContent, SiteContent } from '@/lib/content'
import { SectionHeading } from './section-heading'

// Built-in copy, used only if the content API is unreachable (edit in Admin → Storefront Content)
const FALLBACK: SiteContent['home.instagram'] = {
  profileUrl: 'https://instagram.com/suthrayaa',
  buttonLabel: 'Follow @suthrayaa',
  images: [
    { image: '/editorial/scene-garland.webp', alt: 'Crochet marigold garland' },
    { image: '/editorial/scene-keychains.webp', alt: 'Crochet keychains' },
    { image: '/editorial/scene-doily.webp', alt: 'Peacock crochet doily' },
    { image: '/editorial/scene-mobile.webp', alt: 'Star and moon mobile' },
    { image: '/editorial/scene-bags.webp', alt: 'Crochet phone sling bags' },
    { image: '/editorial/scene-toran.webp', alt: 'Peacock feather toran' },
  ],
}

export function InstagramSection({ content, heading }: { content?: SiteContent['home.instagram']; heading?: SectionHeadingContent | null }) {
  const { profileUrl, buttonLabel, images } = content ?? FALLBACK
  const photos = images.filter((p) => p.image)
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="@suthrayaa"
          title="Made for sharing,"
          accent="loved on Instagram"
          description="Behind-the-scenes peeks, new drops and your beautiful photos — tag us to be featured."
          content={heading}
        />
        {photos.length > 0 && (
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {photos.map((photo, i) => (
              <StaggerItem key={`${photo.image}-${i}`} className={i % 2 === 1 ? 'lg:translate-y-8' : undefined}>
                <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand">
                  <Image src={photo.image} alt={photo.alt} fill sizes="(max-width: 640px) 50vw, 16vw" className="zoom-img object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/0 transition-colors duration-300 group-hover:bg-primary/35">
                    <Instagram className="h-7 w-7 scale-90 text-white opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] group-hover:scale-100 group-hover:opacity-100" />
                  </span>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        )}
        {profileUrl && (
          <div className="mt-14 flex justify-center">
            <Button asChild variant="outline" size="lg" className="group h-12 px-7">
              <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                <Instagram className="h-4 w-4" /> {buttonLabel}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
