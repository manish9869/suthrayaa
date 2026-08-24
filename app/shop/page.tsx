import { Suspense } from 'react'
import { ShopContent } from '@/components/shop-content'
import { getCategories, getProducts } from '@/lib/data'

export default async function ShopPage() {
  const [{ items: products }, categories] = await Promise.all([
    getProducts({ limit: 100 }),
    getCategories(),
  ])

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading shop" />}>
      <ShopContent products={products} categories={categories} />
    </Suspense>
  )
}
