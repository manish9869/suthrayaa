import { Suspense } from 'react'
import { CheckoutContent } from '@/components/checkout-content'
import { getCategories } from '@/lib/data'

export default async function CheckoutPage() {
  const categories = await getCategories()

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading checkout" />}>
      <CheckoutContent categories={categories} />
    </Suspense>
  )
}
