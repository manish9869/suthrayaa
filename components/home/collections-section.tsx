import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Category } from '@/lib/data'
import type { SectionHeadingContent } from '@/lib/content'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { SectionHeading } from './section-heading'

/** Large image cards for the categories marked "Featured" in Admin → Categories (falls back
 * to the top-level categories shown on the homepage). */
export function CollectionsSection({ categories, heading }: { categories: Category[]; heading?: SectionHeadingContent | null }) {
  const featured = categories.filter((c) => c.isFeatured && !c.isDummy)
  const collections = (featured.length > 0 ? featured : categories.filter((c) => !c.parentId && c.showOnHomepage && !c.isDummy)).slice(0, 6)
  if (collections.length === 0) return null

  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading eyebrow="Curated for every corner" title="Our" accent="collections" href="/shop" linkLabel="Browse all" content={heading} />
        <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <StaggerItem key={c.id}>
              <Link href={`/shop?category=${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-sand ring-1 ring-border">
                {c.image && (
                  <Image src={c.image} alt={c.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="zoom-img object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3 text-white">
                  <div>
                    <p className="font-serif text-2xl leading-tight">{c.name}</p>
                    {c.description && <p className="mt-1 line-clamp-2 text-[13px] text-white/80">{c.description}</p>}
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-colors group-hover:bg-white group-hover:text-primary">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
