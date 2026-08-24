import { apiFetch } from './http'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/data'

async function token(): Promise<string | undefined> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, token: await token(), revalidate: false })
}

// ---- Me ----
export interface AdminMe {
  id: string
  role: string
  displayName: string | null
}
export const getAdminMe = () => adminFetch<AdminMe>('/admin/me')

// ---- Analytics ----
export interface AnalyticsSummary {
  revenue: number
  revenueChangePct: number | null
  orderCount: number
  avgOrderValue: number
  newCustomers: number
  pendingOrders: number
}
export const getAnalyticsSummary = (days = 30) => adminFetch<AnalyticsSummary>(`/admin/analytics/summary?days=${days}`)
export const getRevenueSeries = () =>
  adminFetch<{ date: string; orders: number; revenue: number }[]>('/admin/analytics/revenue')
export const getTopProducts = (limit = 10) =>
  adminFetch<{ productId: string | null; name: string; unitsSold: number; revenue: number }[]>(
    `/admin/analytics/top-products?limit=${limit}`
  )
export const getCustomizationPopularity = () =>
  adminFetch<{ total: number; customized: number; percentage: number }>('/admin/analytics/customization-popularity')
export const getStockAlerts = () =>
  adminFetch<{ id: string; name: string; slug: string; stock: number; low_stock_threshold: number }[]>(
    '/admin/analytics/stock-alerts'
  )

// ---- Products ----
export interface AdminProductListItem extends Product {
  isActive: boolean
}
export const getAdminProducts = (params: { page?: number; limit?: number; search?: string } = {}) => {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))
  if (params.search) q.set('search', params.search)
  return adminFetch<{ items: AdminProductListItem[]; total: number; page: number; limit: number }>(
    `/admin/products?${q.toString()}`
  )
}
export const getAdminProduct = (id: string) => adminFetch<AdminProductListItem>(`/admin/products/${id}`)

export interface ProductFormInput {
  name: string
  slug: string
  description: string
  shortDescription: string
  price: number
  comparePrice?: number | null
  categoryId?: string | null
  tags: string[]
  stock: number
  lowStockThreshold?: number
  featured?: boolean
  bestseller?: boolean
  newArrival?: boolean
  isActive?: boolean
  estimatedDelivery?: string
  dimensions?: string
  materials: string[]
  careInstructions: string[]
  colorIds?: string[]
}
export const createProduct = (input: ProductFormInput) =>
  adminFetch<Product>('/admin/products', { method: 'POST', body: JSON.stringify(input) })
export const updateProduct = (id: string, input: Partial<ProductFormInput>) =>
  adminFetch<Product>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteProduct = (id: string) => adminFetch<void>(`/admin/products/${id}`, { method: 'DELETE' })

export async function uploadProductImage(productId: string, file: File) {
  const form = new FormData()
  form.append('image', file)
  const t = await token()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/products/${productId}/images`, {
    method: 'POST',
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    body: form,
  })
  if (!res.ok) throw new Error('Image upload failed')
  return res.json() as Promise<{ id: string; url: string; thumbnailUrl: string; sortOrder: number; isPrimary: boolean }>
}
export const deleteProductImage = (productId: string, imageId: string) =>
  adminFetch<void>(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' })

export interface CustomizationRulesInput {
  isCustomizable?: boolean
  allowColorChoice?: boolean
  allowText?: boolean
  maxTextLength?: number | null
  textPlaceholder?: string | null
  isLimitedEdition?: boolean
  adminNote?: string | null
  allowedColorIds?: string[]
}
export const updateCustomizationRules = (productId: string, input: CustomizationRulesInput) =>
  adminFetch<Product>(`/admin/products/${productId}/customization-rules`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

// ---- Categories / Colors / Testimonials / Hero Slides ----
export interface AdminCategory {
  id: string
  name: string
  slug: string
  description?: string
  image_url?: string
  sort_order: number
  is_active: boolean
}
export const getAdminCategories = () => adminFetch<AdminCategory[]>('/admin/categories')
export const createCategory = (input: Partial<AdminCategory> & { name: string; slug: string }) =>
  adminFetch<AdminCategory>('/admin/categories', { method: 'POST', body: JSON.stringify(input) })
export const updateCategory = (id: string, input: Partial<AdminCategory>) =>
  adminFetch<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteCategory = (id: string) => adminFetch<void>(`/admin/categories/${id}`, { method: 'DELETE' })

export interface AdminColor {
  id: string
  name: string
  hex: string
  sort_order: number
  is_active: boolean
}
export const getAdminColors = () => adminFetch<AdminColor[]>('/admin/colors')
export const createColor = (input: { name: string; hex: string; sortOrder?: number }) =>
  adminFetch<AdminColor>('/admin/colors', { method: 'POST', body: JSON.stringify(input) })
export const deleteColor = (id: string) => adminFetch<void>(`/admin/colors/${id}`, { method: 'DELETE' })

export interface AdminTestimonial {
  id: string
  customer_name: string
  location?: string
  content: string
  rating: number
  product_purchased?: string
  is_published: boolean
  sort_order: number
}
export const getAdminTestimonials = () => adminFetch<AdminTestimonial[]>('/admin/testimonials')
export const createTestimonial = (input: {
  customerName: string
  location?: string
  content: string
  rating: number
  productPurchased?: string
}) => adminFetch<AdminTestimonial>('/admin/testimonials', { method: 'POST', body: JSON.stringify(input) })
export const deleteTestimonial = (id: string) => adminFetch<void>(`/admin/testimonials/${id}`, { method: 'DELETE' })

export interface AdminHeroSlide {
  id: string
  title: string
  subtitle?: string
  description?: string
  image_url?: string
  cta_label?: string
  cta_href?: string
  sort_order: number
  is_active: boolean
}
export const getAdminHeroSlides = () => adminFetch<AdminHeroSlide[]>('/admin/hero-slides')
export const createHeroSlide = (input: Partial<AdminHeroSlide> & { title: string }) =>
  adminFetch<AdminHeroSlide>('/admin/hero-slides', { method: 'POST', body: JSON.stringify(input) })
export const deleteHeroSlide = (id: string) => adminFetch<void>(`/admin/hero-slides/${id}`, { method: 'DELETE' })

// ---- Orders ----
export interface AdminOrderSummary {
  id: string
  orderNumber: string
  customerName: string | null
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  itemCount: number
  placedAt: string | null
  createdAt: string
}
export const getAdminOrders = (params: { status?: string; paymentStatus?: string; page?: number } = {}) => {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.paymentStatus) q.set('paymentStatus', params.paymentStatus)
  if (params.page) q.set('page', String(params.page))
  return adminFetch<{ items: AdminOrderSummary[]; total: number; page: number; limit: number }>(
    `/admin/orders?${q.toString()}`
  )
}
export const getAdminOrder = (id: string) => adminFetch<any>(`/admin/orders/${id}`)
export const updateOrderStatus = (id: string, status: string, note?: string) =>
  adminFetch<{ ok: boolean }>(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) })

// ---- Coupons ----
export interface AdminCoupon {
  id: string
  code: string
  type: 'percent' | 'flat'
  value: number
  min_subtotal: number
  max_uses: number | null
  uses_count: number
  is_active: boolean
}
export const getAdminCoupons = () => adminFetch<AdminCoupon[]>('/admin/coupons')
export const createCoupon = (input: {
  code: string
  type: 'percent' | 'flat'
  value: number
  minSubtotal?: number
  maxUses?: number
}) => adminFetch<AdminCoupon>('/admin/coupons', { method: 'POST', body: JSON.stringify(input) })
export const deleteCoupon = (id: string) => adminFetch<void>(`/admin/coupons/${id}`, { method: 'DELETE' })

// ---- Customers ----
export interface AdminCustomer {
  id: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  createdAt: string
  orderCount: number
  totalSpent: number
}
export const getAdminCustomers = (page = 1) =>
  adminFetch<{ items: AdminCustomer[]; total: number; page: number; limit: number }>(`/admin/customers?page=${page}`)

// ---- Reviews ----
export const getAdminReviews = (status: 'pending' | 'published' = 'pending') =>
  adminFetch<any[]>(`/admin/reviews?status=${status}`)
export const moderateReview = (id: string, isPublished: boolean) =>
  adminFetch<any>(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ isPublished }) })
