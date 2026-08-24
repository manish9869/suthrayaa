import { ProductForm } from '@/components/admin/product-form'

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>
}) {
  const { categoryId } = await searchParams
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold">Add Product</h1>
      <ProductForm defaultCategoryId={categoryId} />
    </div>
  )
}
