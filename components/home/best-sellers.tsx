'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/product-card'
import type { Product } from '@/lib/data'
import { Reveal } from '@/components/motion/reveal'

export function BestSellers({ products: bestSellers }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (bestSellers.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section className="py-16 lg:py-24 bg-peach/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-sm font-medium mb-4">
              Customer Favorites
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              Best Sellers
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </Reveal>

        {/* Scrollable Products */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {bestSellers.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-72 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-8">
          <Button variant="outline" asChild className="group">
            <Link href="/shop?sort=bestselling">
              View All Best Sellers
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
