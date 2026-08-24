import { WishlistContent } from '@/components/wishlist-content'
import { getCategories } from '@/lib/data'

export default async function WishlistPage() {
  const categories = await getCategories()
  return <WishlistContent categories={categories} />
}
