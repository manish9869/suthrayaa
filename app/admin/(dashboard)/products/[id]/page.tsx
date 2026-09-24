'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProductForm } from '@/components/admin/product-form'
import { PageLoader } from '@/components/admin/loading-state'
import { getAdminProduct, type AdminProductListItem } from '@/lib/api/admin'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { PageHeader } from '@/components/admin/page-header'

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  const [product, setProduct] = useState<AdminProductListItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminProduct(params.id)
      .then(setProduct)
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <PageLoader />
  if (!product) return <p className="text-muted-foreground">Product not found</p>

  return (
    <ProtectedRoute permission="products.update">
    <div className="space-y-6">
      <PageHeader title="Edit Product" description="Update this listing. Changes go live when you save." backHref="/admin/products" backLabel="Products" />
      <ProductForm product={product} />
    </div>
    </ProtectedRoute>
  )
}
