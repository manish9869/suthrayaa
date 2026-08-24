import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import type { Product } from '@/lib/data'
import { Reveal } from '@/components/motion/reveal'

export function FeaturedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-lavender text-sm font-medium mb-4">
              Handpicked for You
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              Featured Creations
            </h2>
          </div>
          <Button variant="outline" asChild className="self-start md:self-auto">
            <Link href="/shop" className="group">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product, index) => (
            <Reveal key={product.id} delay={index * 0.08}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
