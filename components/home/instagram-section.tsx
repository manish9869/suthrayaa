import Image from 'next/image'
import { Instagram, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'
import { SectionHeading } from './section-heading'

const alts = ['Crochet marigold garland', 'Crochet keychains', 'Peacock crochet doily', 'Star and moon mobile', 'Crochet phone sling bags', 'Peacock feather toran']
const INSTAGRAM_URL = 'https://instagram.com/suthrayaa'

export function InstagramSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="@suthrayaa"
          title="Made for sharing,"
          accent="loved on Instagram"
          description="Behind-the-scenes peeks, new drops and your beautiful photos — tag us to be featured."
        />
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {STOREFRONT_IMAGES.instagram.map((src, i) => (
            <StaggerItem key={src} className={i % 2 === 1 ? 'lg:translate-y-8' : undefined}>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand">
                <Image src={src} alt={alts[i] ?? ''} fill sizes="(max-width: 640px) 50vw, 16vw" className="zoom-img object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-primary/0 transition-colors duration-300 group-hover:bg-primary/35">
                  <Instagram className="h-7 w-7 scale-90 text-white opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] group-hover:scale-100 group-hover:opacity-100" />
                </span>
              </a>
            </StaggerItem>
          ))}
        </Stagger>
        <div className="mt-14 flex justify-center">
          <Button asChild variant="outline" size="lg" className="group h-12 px-7">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <Instagram className="h-4 w-4" /> Follow @suthrayaa
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
