import { apiFetch } from "@/lib/api/http"
import { getCachedStoreSettings } from "@/lib/store-settings-cache"
import { withStudioImages, withStudioImage } from "@/lib/studio-images"

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
  /** Color groups only: false when the colour isn't in the Colors library (hidden from customers). */
  inLibrary?: boolean
  /** Color groups only: the Colors library entry and its family (e.g. "Red"), for filtering. */
  colorId?: string
  family?: string
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

/** One region of a live colour preview, painted by the value chosen in its colour option.
 * The mask is the source of truth for which pixels belong to it; the name is informational. */
export interface PreviewLayer {
  id: string
  customizationId: string
  /** svg mode: the template zone this part fills. */
  zone?: string
  /** photo mode: black/white mask (white = this region), same aspect ratio as the base photo. */
  maskUrl?: string
  sortOrder: number
  name?: string
  regionType?: 'region' | 'fixed' | 'background'
  groupId?: string
  allowOverlap?: boolean
}

/** A named set of regions. sharedColor: one choice colours them all; otherwise one choice each. */
export interface PreviewGroup {
  id: string
  name: string
  sharedColor: boolean
  sortOrder: number
}

/** Optional live color preview ("Customize & Preview"). Only present when the admin has
 * switched the feature on AND configured this product — absent otherwise. */
export interface ProductPreview {
  mode: 'photo' | 'svg'
  svgTemplate?: string
  baseUrl?: string
  width?: number
  height?: number
  layers: PreviewLayer[]
  groups?: PreviewGroup[]
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
  preview?: ProductPreview
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

  const res = await apiFetch<ProductListResponse>(`/products?${query.toString()}`)
  return { ...res, items: res.items.map(withProductImages) }
}

/** Placeholder-only products fall back to the matching studio shot (see lib/studio-images). */
function withProductImages(p: Product): Product {
  return { ...p, images: withStudioImages(p.images, p.name, p.category, p.categorySlug) }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return withProductImages(await apiFetch<Product>(`/products/${slug}`, { tags: [`product:${slug}`] }))
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
  const categories = await apiFetch<Category[]>("/categories")
  return categories.map((c) => ({ ...c, image: withStudioImage(c.image, c.name, c.slug) ?? c.image }))
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
