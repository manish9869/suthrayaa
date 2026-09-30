import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CheckoutContent } from '@/components/checkout-content'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = { title: 'Checkout | Suthrayaa', robots: { index: false } }

export default async function CheckoutPage() {
  const categories = await getCategories()

  return (
    <Suspense fallback={<div className="min-h-svh bg-background" aria-label="Loading checkout" />}>
      <CheckoutContent categories={categories} />
    </Suspense>
  )
}
