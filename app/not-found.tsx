import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/home/section-heading'
import { ProductShelf } from '@/components/home/product-shelf'
import { getBestsellerProducts, getCategories } from '@/lib/data'

export const metadata: Metadata = { title: 'Page not found | Suthrayaa', robots: { index: false } }

/** Branded 404: says what happened, and offers the way back plus a few popular pieces. */
export default async function NotFound() {
  const [categories, popular] = await Promise.all([getCategories().catch(() => []), getBestsellerProducts(4).catch(() => [])])
  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-svh">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 -top-24 h-80 w-80 rounded-full bg-blush/60 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-sage/20 blur-3xl" />
          <div className="container relative mx-auto px-4 pb-14 pt-14 text-center lg:pb-20 lg:pt-24">
            <p className="eyebrow">Error 404 · Page not found</p>
            <h1 className="display mx-auto mt-4 max-w-3xl text-balance text-[2.6rem] sm:text-6xl">
              This stitch <em className="font-normal italic text-primary">came loose</em>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-pretty text-foreground/70">
              The page you&apos;re looking for has moved or no longer exists. Everything we make is still in the shop.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-2 min-[400px]:flex-row min-[400px]:gap-3">
              <Button size="lg" asChild className="group h-12 px-7">
                <Link href="/shop">
                  Browse the Shop <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild className="h-12 px-6">
                <Link href="/">Go to the Homepage</Link>
              </Button>
            </div>
          </div>
        </section>
        {popular.length > 0 && (
          <section className="pb-16 lg:pb-24">
            <div className="container mx-auto px-4">
              <SectionHeading eyebrow="Loved by our customers" title="Popular" accent="right now" href="/shop?sort=bestselling" />
              <ProductShelf products={popular} listName="404 popular" />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
