'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import type { Product } from '@/lib/data'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { SectionHeading } from './section-heading'
import { cn } from '@/lib/utils'
import type { SectionHeadingContent } from '@/lib/content'

export function BestSellers({ products: bestSellers, heading }: { products: Product[]; heading?: SectionHeadingContent | null }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const update = () => {
    const el = scrollRef.current
    if (!el) return
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }
  useEffect(update, [bestSellers.length])

  if (bestSellers.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: (direction === 'left' ? -1 : 1) * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className="bg-sand/60 py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="relative">
          <SectionHeading eyebrow="Customer favourites" title="Best" accent="sellers" href="/shop?sort=bestselling" linkLabel="View all best sellers" content={heading} />
        </div>
        <div className="relative">
          <div ref={scrollRef} onScroll={update} className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 scrollbar-hide">
            <Stagger className="flex gap-5">
              {bestSellers.map((product) => (
                <StaggerItem key={product.id} className="w-[64vw] shrink-0 snap-start sm:w-[300px]">
                  <ProductCard product={product} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
          {(['left', 'right'] as const).map((dir) => {
            const disabled = dir === 'left' ? edges.start : edges.end
            return (
              <button
                key={dir}
                type="button"
                onClick={() => scroll(dir)}
                disabled={disabled}
                aria-label={dir === 'left' ? 'Scroll left' : 'Scroll right'}
                className={cn(
                  'tap-bounce absolute top-[38%] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-border transition-opacity duration-200 md:flex',
                  dir === 'left' ? '-left-5' : '-right-5',
                  disabled && 'pointer-events-none opacity-0'
                )}
              >
                {dir === 'left' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
