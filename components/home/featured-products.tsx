import { ProductCard } from '@/components/product-card'
import type { Product } from '@/lib/data'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { SectionHeading } from './section-heading'

export function FeaturedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <SectionHeading eyebrow="Handpicked for you" title="Featured" accent="creations" href="/shop" linkLabel="View all products" />
        <Stagger className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
          {products.slice(0, 4).map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
