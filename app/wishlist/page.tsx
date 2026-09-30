import type { Metadata } from 'next'
import { WishlistContent } from '@/components/wishlist-content'
import { getBestsellerProducts, getCategories } from '@/lib/data'

export const metadata: Metadata = { title: 'Your Wishlist | Suthrayaa', robots: { index: false } }

export default async function WishlistPage() {
  const [categories, suggestions] = await Promise.all([getCategories(), getBestsellerProducts(4).catch(() => [])])
  return <WishlistContent categories={categories} suggestions={suggestions} />
}
