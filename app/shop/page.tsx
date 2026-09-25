import { Suspense } from 'react'
import { ShopContent } from '@/components/shop-content'
import { getCategories, getProducts, type Product } from '@/lib/data'
import { getContentBlock } from '@/lib/content'

const PAGE_SIZE = 100 // the API's max page size

/** Every active product — the shop filters and sorts client-side, so it needs the full catalogue,
 * not just the first page. Remaining pages are fetched in parallel. */
async function getAllProducts(): Promise<Product[]> {
  const first = await getProducts({ limit: PAGE_SIZE, page: 1 })
  const pages = Math.ceil(first.total / PAGE_SIZE)
  if (pages <= 1) return first.items
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => getProducts({ limit: PAGE_SIZE, page: i + 2 })))
  return [...first.items, ...rest.flatMap((r) => r.items)]
}

export default async function ShopPage() {
  const [products, categories, chrome] = await Promise.all([getAllProducts(), getCategories(), getContentBlock('site.chrome')])

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading shop" />}>
      <ShopContent products={products} categories={categories} bannerImage={chrome?.shopBannerImage || undefined} />
    </Suspense>
  )
}
