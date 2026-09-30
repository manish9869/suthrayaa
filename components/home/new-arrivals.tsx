import type { Product } from '@/lib/data'
import { SectionHeading } from './section-heading'
import { ProductShelf } from './product-shelf'
import type { SectionHeadingContent } from '@/lib/content'

export function NewArrivals({ products, heading }: { products: Product[]; heading?: SectionHeadingContent | null }) {
  if (products.length === 0) return null
  return (
    <section className="py-14 sm:py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading eyebrow="Fresh off the hook" title="New" accent="arrivals" href="/shop?sort=newest" content={heading} />
        <ProductShelf products={products.slice(0, 5)} columns={5} listName="New arrivals" />
      </div>
    </section>
  )
}
