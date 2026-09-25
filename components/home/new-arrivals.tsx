import { ProductCard } from '@/components/product-card'
import type { Product } from '@/lib/data'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { SectionHeading } from './section-heading'
import type { SectionHeadingContent } from '@/lib/content'

export function NewArrivals({ products, heading }: { products: Product[]; heading?: SectionHeadingContent | null }) {
  if (products.length === 0) return null
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading eyebrow="Fresh off the hook" title="New" accent="arrivals" href="/shop?sort=newest" content={heading} />
        <Stagger className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-5">
          {products.slice(0, 5).map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
