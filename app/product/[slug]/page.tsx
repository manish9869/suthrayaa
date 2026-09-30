import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from '@/components/product-detail'
import { getProductBySlug, getProductsByCategory, getProductReviews, getCategories } from '@/lib/data'

// Each product page is rendered on its first visit, then served from cache and refreshed at
// most once a minute (same freshness as the rest of the storefront) — traffic spikes on a
// product never turn into one render + API round-trip per shopper.
export const revalidate = 60
export async function generateStaticParams() {
  return []
}

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

/** Search/social title, description and image for the product (its SEO fields win when set). */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Product not found | Suthrayaa', robots: { index: false } }
  const title = product.metaTitle?.trim() || `${product.name} | Handmade Crochet | Suthrayaa`
  const description = (product.metaDescription?.trim() || product.shortDescription || product.description || '').slice(0, 160)
  const images = product.images[0] ? [{ url: product.images[0], alt: product.name }] : undefined
  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title, description, type: 'website', siteName: 'Suthrayaa', locale: 'en_IN', images },
    twitter: { card: 'summary_large_image', title, description, images: images?.map((i) => i.url) },
  }
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

  // Structured data: lets search engines show the price, availability and rating
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.images,
    sku: product.sku ?? undefined,
    brand: { '@type': 'Brand', name: 'Suthrayaa' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.fromPrice ?? product.price,
      availability:
        product.status === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : product.productType === 'made_to_order' || product.productType === 'custom_order'
            ? 'https://schema.org/MadeToOrder'
            : 'https://schema.org/InStock',
    },
    ...(product.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProductDetail product={product} reviews={reviews} relatedProducts={relatedProducts} categories={categories} />
    </>
  )
}
