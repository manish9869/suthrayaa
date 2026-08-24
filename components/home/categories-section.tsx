import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Category } from '@/lib/data'
import { buildCategoryTree, totalProductCount } from '@/lib/utils/category-tree'
import { Reveal } from '@/components/motion/reveal'

export function CategoriesSection({ categories }: { categories: Category[] }) {
  const topLevel = buildCategoryTree(categories).filter((c) => c.showOnHomepage)
  if (topLevel.length === 0) return null

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <Reveal className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-peach text-sm font-medium mb-4">
            Explore Our Collections
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Shop by Category
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From personalized keychains to adorable amigurumi, find the perfect handcrafted piece for every occasion.
          </p>
        </Reveal>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
          {topLevel.map((category, index) => (
            <Reveal
              key={category.id}
              delay={Math.min(index, 4) * 0.06}
              className={index === 0 || index === 3 ? 'md:col-span-2' : undefined}
            >
              <Link
                href={`/shop?category=${category.slug}`}
                className={`group relative block overflow-hidden rounded-2xl ${
                  index === 0 || index === 3 ? 'aspect-[2/1]' : 'aspect-square'
                }`}
              >
                <Image
                  src={category.image || '/placeholder.svg'}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4 lg:p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-white font-serif font-semibold text-lg lg:text-xl mb-1">
                        {category.name}
                      </h3>
                      <p className="text-white/80 text-sm hidden sm:block">
                        {totalProductCount(category)} products
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-secondary transition-colors">
                      <ArrowRight className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
