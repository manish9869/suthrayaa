import type { Metadata } from 'next'
import { CartContent } from '@/components/cart-content'
import { getBestsellerProducts, getCategories } from '@/lib/data'

export const metadata: Metadata = { title: 'Your Cart | Suthrayaa', robots: { index: false } }

export default async function CartPage() {
  const [categories, suggestions] = await Promise.all([getCategories(), getBestsellerProducts(4).catch(() => [])])
  return <CartContent categories={categories} suggestions={suggestions} />
}
