'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProductForm } from '@/components/admin/product-form'
import { PageLoader } from '@/components/admin/loading-state'
import { getAdminProduct, type AdminProductListItem } from '@/lib/api/admin'

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
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold">Edit Product</h1>
      <ProductForm product={product} />
    </div>
  )
}
