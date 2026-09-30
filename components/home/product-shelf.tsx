import { ProductCard } from '@/components/product-card'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/data'

// Full class names so Tailwind sees them
const LG_COLS: Record<number, string> = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }

/**
 * The products of a homepage section. On phones: one swipeable row (a peek of the next card
 * says "there's more") instead of a tall two-column grid, which kept the homepage short. From
 * tablets up: a grid whose column count follows the number of products (up to `columns`), so
 * a short list doesn't leave empty slots.
 */
export function ProductShelf({ products, columns = 4, listName }: { products: Product[]; columns?: 4 | 5; listName?: string }) {
  const lg = Math.max(3, Math.min(columns, products.length))
  return (
    <Stagger
      className={cn(
        '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 scrollbar-hide',
        'md:mx-0 md:grid md:grid-cols-3 md:gap-x-5 md:gap-y-10 md:overflow-visible md:px-0 md:pb-0 lg:gap-x-6',
        LG_COLS[lg]
      )}
    >
      {products.map((product) => (
        <StaggerItem key={product.id} className="w-[42vw] max-w-[220px] shrink-0 snap-start md:w-auto md:max-w-none">
          <ProductCard product={product} listName={listName} />
        </StaggerItem>
      ))}
    </Stagger>
  )
}
