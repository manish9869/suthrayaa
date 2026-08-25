import { apiFetch } from "@/lib/api/http"
import { getCachedStoreSettings } from "@/lib/store-settings-cache"

// Types stay identical to what every component already expects — only the data source
// (a live Express API instead of hardcoded arrays) changed. customizationOptions gained
// three admin-controlled fields (allowColorChoice, isLimitedEdition, allowedColors) that
// are additive and safe for existing call sites that only read allowText/maxTextLength.

export interface CustomizationValue {
  id: string
  label: string
  value: string
  priceAdjustment: number
  enabled: boolean
  sku?: string
}

export interface ProductCustomization {
  id: string
  name: string
  label: string
  type: 'choice' | 'color' | 'text' | 'number' | 'checkbox'
  required: boolean
  enabled: boolean
  sortOrder: number
  maxLength?: number
  placeholder?: string
  defaultValue?: string
  conditionalParentValueId?: string
  values: CustomizationValue[]
}

export interface Product {
  id: string
  sku?: string | null
  name: string
  slug: string
  description: string
  shortDescription: string
  price: number
  originalPrice?: number
  discountPercent?: number
  comparePrice?: number
  images: string[]
  category: string
  categorySlug: string
  tags: string[]
  colors: string[]
  isCustomizable: boolean
  customizationOptions?: {
    allowText?: boolean
    maxTextLength?: number
    textPlaceholder?: string
    allowColorChoice?: boolean
    isLimitedEdition?: boolean
    allowedColors?: string[]
  }
  /** New admin-controlled customization engine — independent of the legacy fields above. */
  customizable: boolean
  customizations: ProductCustomization[]
  /** Lowest possible total price once required customizations are factored in. */
  fromPrice?: number
  stock: number
  featured: boolean
  bestseller: boolean
  newArrival: boolean
  rating: number
  reviewCount: number
  estimatedDelivery: string
  dimensions?: string
  materials: string[]
  careInstructions: string[]
  status: 'draft' | 'active' | 'hidden' | 'out_of_stock' | 'archived'
  productType: 'ready_to_ship' | 'made_to_order' | 'custom_order'
  processingMinDays?: number
  processingMaxDays?: number
  processingMessage?: string
  trackInventory: boolean
  allowBackorders: boolean
  continueSellingWhenOutOfStock: boolean
  freeShipping: boolean
  localPickupAvailable: boolean
  metaTitle?: string
  metaDescription?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  image: string
  productCount: number
  parentId: string | null
  isDummy: boolean
  showInNavigation: boolean
  showOnHomepage: boolean
  isFeatured: boolean
  seoTitle?: string
  seoDescription?: string
}

export interface Review {
  id: string
  productId: string
  customerName: string
  rating: number
  title: string
  content: string
  date: string
  verified: boolean
  images?: string[]
}

export interface Testimonial {
  id: string
  customerName: string
  location: string
  content: string
  rating: number
  avatar?: string
  productPurchased?: string
}

export interface HeroSlide {
  id: string
  title: string
  subtitle?: string
  description?: string
  image?: string
  ctaLabel?: string
  ctaHref?: string
  accentToken?: string
}

interface ProductListResponse {
  items: Product[]
  total: number
  page: number
  limit: number
}

export async function getProducts(params: {
  category?: string
  search?: string
  featured?: boolean
  bestseller?: boolean
  newArrival?: boolean
  limit?: number
  page?: number
  sort?: string
} = {}): Promise<ProductListResponse> {
  const query = new URLSearchParams()
  if (params.category) query.set("category", params.category)
  if (params.search) query.set("search", params.search)
  if (params.featured) query.set("featured", "true")
  if (params.bestseller) query.set("bestseller", "true")
  if (params.newArrival) query.set("newArrival", "true")
  if (params.limit) query.set("limit", String(params.limit))
  if (params.page) query.set("page", String(params.page))
  if (params.sort) query.set("sort", params.sort)

  return apiFetch<ProductListResponse>(`/products?${query.toString()}`)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return await apiFetch<Product>(`/products/${slug}`)
  } catch {
    return null
  }
}

export async function getProductsByCategory(categorySlug: string, limit = 24): Promise<Product[]> {
  const { items } = await getProducts({ category: categorySlug, limit })
  return items
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const { items } = await getProducts({ featured: true, limit })
  return items
}

export async function getBestsellerProducts(limit = 8): Promise<Product[]> {
  const { items } = await getProducts({ bestseller: true, limit })
  return items
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const { items } = await getProducts({ newArrival: true, limit })
  return items
}

export async function searchProducts(query: string, limit = 24): Promise<Product[]> {
  const { items } = await getProducts({ search: query, limit })
  return items
}

export async function getProductReviews(productSlug: string): Promise<Review[]> {
  return apiFetch<Review[]>(`/products/${productSlug}/reviews`)
}

export async function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/categories")
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return apiFetch<Testimonial[]>("/testimonials")
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  return apiFetch<HeroSlide[]>("/hero-slides")
}

export function formatPrice(price: number): string {
  const { currency, locale, decimalPlaces } = getCachedStoreSettings()
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(price)
}
