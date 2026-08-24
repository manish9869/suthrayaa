import { CartContent } from '@/components/cart-content'
import { getCategories } from '@/lib/data'

export default async function CartPage() {
  const categories = await getCategories()
  return <CartContent categories={categories} />
}
