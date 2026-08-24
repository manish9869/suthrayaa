import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/product-detail'
import { getProductBySlug, getProductsByCategory, getProductReviews, getCategories } from '@/lib/data'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const [reviews, categoryProducts, categories] = await Promise.all([
    getProductReviews(product.slug),
    getProductsByCategory(product.categorySlug),
    getCategories(),
  ])

  const relatedProducts = categoryProducts.filter((p) => p.id !== product.id).slice(0, 4)

  return (
    <ProductDetail product={product} reviews={reviews} relatedProducts={relatedProducts} categories={categories} />
  )
}
