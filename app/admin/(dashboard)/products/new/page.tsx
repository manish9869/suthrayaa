import { ProductForm } from '@/components/admin/product-form'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { PageHeader } from '@/components/admin/page-header'

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>
}) {
  const { categoryId } = await searchParams
  return (
    <ProtectedRoute permission="products.create">
    <div className="space-y-6">
      <PageHeader title="Add Product" description="Create a new listing — fill in the basics, then pricing, media and inventory." backHref="/admin/products" backLabel="Products" />
      <ProductForm defaultCategoryId={categoryId} />
    </div>
    </ProtectedRoute>
  )
}
