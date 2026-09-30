import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/home/section-heading'
import { ProductShelf } from '@/components/home/product-shelf'
import type { Product } from '@/lib/data'

/**
 * An empty cart / wishlist / list: a stitched badge, what to do next, and — so the page is
 * never a dead end — a row of popular pieces.
 */
export function EmptyState({
  icon: Icon,
  title,
  text,
  cta,
  href = '/shop',
  suggestions = [],
  listName,
}: {
  icon: LucideIcon
  title: string
  text: string
  cta: string
  href?: string
  suggestions?: Product[]
  listName: string
}) {
  return (
    <>
      <div className="container mx-auto px-4 pb-4 pt-12 sm:pt-16">
        <div className="mx-auto max-w-md text-center">
          <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-blush/70">
            <span className="stitch-ring absolute inset-1.5 rounded-full" aria-hidden />
            <Icon className="h-11 w-11 text-primary" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="display text-balance text-3xl sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-muted-foreground">{text}</p>
          <Button size="lg" asChild className="group mt-7 h-12 px-7">
            <Link href={href}>
              {cta} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
      {suggestions.length > 0 && (
        <section className="py-14 sm:py-20">
          <div className="container mx-auto px-4">
            <SectionHeading eyebrow="Loved by our customers" title="Popular" accent="right now" href="/shop?sort=bestselling" />
            <ProductShelf products={suggestions} listName={listName} />
          </div>
        </section>
      )}
    </>
  )
}
