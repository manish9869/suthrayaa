import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Category } from '@/lib/data'
import { buildCategoryTree, totalProductCount } from '@/lib/utils/category-tree'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { SectionHeading } from './section-heading'

export function CategoriesSection({ categories }: { categories: Category[] }) {
  const topLevel = buildCategoryTree(categories).filter((c) => c.showOnHomepage)
  if (topLevel.length === 0) return null

  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading eyebrow="Explore the collection" title="Shop by" accent="category" href="/shop" linkLabel="Browse all" />
        <Stagger className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {topLevel.map((category) => (
            <StaggerItem key={category.id} className="w-[42vw] shrink-0 snap-start sm:w-auto">
              <Link href={`/shop?category=${category.slug}`} className="group block text-center">
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-sand ring-1 ring-border transition-shadow duration-300 group-hover:ring-2 group-hover:ring-primary/40">
                  <Image
                    src={category.image || '/placeholder.svg'}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 30vw, 16vw"
                    className="zoom-img object-cover"
                  />
                  <span className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-card text-primary opacity-0 shadow-md transition-[opacity,transform] duration-300 ease-[var(--ease-out)] group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-4 font-medium transition-colors group-hover:text-primary">{category.name}</p>
                <p className="text-[13px] text-muted-foreground">{totalProductCount(category)}+ pieces</p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
