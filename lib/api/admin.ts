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
export interface AdminRoleRef {
  id: string
  name: string
  slug: string
}
export interface AdminMe {
  id: string
  email: string | null
  displayName: string | null
  isActive: boolean
  /** @deprecated legacy single-role column, kept only for the rare consumer that hasn't moved to `roles`/`permissions` */
  role: string
  roles: AdminRoleRef[]
  permissions: string[]
  isSuperAdmin: boolean
}
export const getAdminMe = () => adminFetch<AdminMe>('/admin/me')

// ---- Analytics ----
export interface DateRangeParams {
  days?: number
  from?: string
  to?: string
}
function rangeQuery(params: DateRangeParams = {}): string {
  const q = new URLSearchParams()
  if (params.from && params.to) {
    q.set('from', params.from)
    q.set('to', params.to)
  } else if (params.days) {
    q.set('days', String(params.days))
  } else {
    q.set('days', '30')
  }
  return q.toString()
}

export interface AnalyticsSummary {
  revenue: number
  revenueChangePct: number | null
  orderCount: number
  orderCountChangePct: number | null
  avgOrderValue: number
  newCustomers: number
  newCustomersChangePct: number | null
  totalCustomers: number
  pendingOrders: number
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  refundedTransactions: number
  pendingTransactions: number
  successRatePct: number
  totalProducts: number
  activeProducts: number
  lowStockCount: number
  outOfStockCount: number
  inventoryValue: number
}
export const getAnalyticsSummary = (params: DateRangeParams = {}) =>
  adminFetch<AnalyticsSummary>(`/admin/analytics/summary?${rangeQuery(params)}`)
export const getRevenueSeries = (params: DateRangeParams = {}) =>
  adminFetch<{ date: string; orders: number; revenue: number }[]>(`/admin/analytics/revenue?${rangeQuery(params)}`)
export const getOrdersSeries = (params: DateRangeParams = {}) =>
  adminFetch<{ date: string; count: number }[]>(`/admin/analytics/orders-series?${rangeQuery(params)}`)
export const getCustomersSeries = (params: DateRangeParams = {}) =>
  adminFetch<{ date: string; count: number }[]>(`/admin/analytics/customers-series?${rangeQuery(params)}`)
export const getTransactionsBreakdown = (params: DateRangeParams = {}) =>
  adminFetch<{ status: string; count: number; amount: number }[]>(`/admin/analytics/transactions-breakdown?${rangeQuery(params)}`)
export const getOrderStatusBreakdown = (params: DateRangeParams = {}) =>
  adminFetch<{ status: string; count: number }[]>(`/admin/analytics/order-status-breakdown?${rangeQuery(params)}`)
export interface InventorySummary {
  totalProducts: number
  activeProducts: number
  draftProducts: number
  hiddenProducts: number
  archivedProducts: number
  outOfStockCount: number
  lowStockCount: number
  totalStockUnits: number
  inventoryValue: number
}
export const getInventorySummary = () => adminFetch<InventorySummary>('/admin/analytics/inventory-summary')
export const getTopProducts = (limit = 10, params: DateRangeParams = {}) => {
  const q = new URLSearchParams(rangeQuery(params))
  q.set('limit', String(limit))
  return adminFetch<{ productId: string | null; name: string; unitsSold: number; revenue: number }[]>(
    `/admin/analytics/top-products?${q.toString()}`
  )
}
export const getCustomizationPopularity = () =>
  adminFetch<{ total: number; customized: number; percentage: number }>('/admin/analytics/customization-popularity')
export const getStockAlerts = () =>
  adminFetch<{ id: string; name: string; slug: string; stock: number; low_stock_threshold: number }[]>(
    '/admin/analytics/stock-alerts'
  )

// ---- Products ----
export interface AdminProductListItem extends Product {
  isActive: boolean
  costPrice?: number
  isTaxable: boolean
  taxClass?: string
  taxCategoryId?: string
  salePrice?: number
  saleStartDate?: string
  saleEndDate?: string
  lowStockThreshold: number
  isPhysical: boolean
  weight?: number
  length?: number
  width?: number
  height?: number
  shippingClass?: string
  searchKeywords?: string
  categoryId: string | null
  additionalCategoryIds: string[]
  updatedAt?: string
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

export type ProductStatus = 'draft' | 'active' | 'hidden' | 'out_of_stock' | 'archived'
export type ProductType = 'ready_to_ship' | 'made_to_order' | 'custom_order'

export interface ProductFormInput {
  sku?: string | null
  name: string
  slug?: string
  description: string
  shortDescription: string
  price: number
  comparePrice?: number | null
  categoryId?: string | null
  additionalCategoryIds?: string[]
  tags: string[]
  stock: number
  lowStockThreshold?: number
  featured?: boolean
  bestseller?: boolean
  newArrival?: boolean
  status?: ProductStatus
  estimatedDelivery?: string
  dimensions?: string
  materials: string[]
  careInstructions: string[]
  colorIds?: string[]
  customizable?: boolean
  productType?: ProductType
  processingMinDays?: number | null
  processingMaxDays?: number | null
  processingMessage?: string | null
  costPrice?: number | null
  isTaxable?: boolean
  taxClass?: string | null
  taxCategoryId?: string | null
  salePrice?: number | null
  saleStartDate?: string | null
  saleEndDate?: string | null
  allowBackorders?: boolean
  continueSellingWhenOutOfStock?: boolean
  trackInventory?: boolean
  isPhysical?: boolean
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  freeShipping?: boolean
  shippingClass?: string | null
  localPickupAvailable?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  searchKeywords?: string | null
}
export const createProduct = (input: ProductFormInput) =>
  adminFetch<AdminProductListItem>('/admin/products', { method: 'POST', body: JSON.stringify(input) })
export const updateProduct = (id: string, input: Partial<ProductFormInput>) =>
  adminFetch<AdminProductListItem>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteProduct = (id: string) => adminFetch<void>(`/admin/products/${id}`, { method: 'DELETE' })
export const duplicateProduct = (id: string) =>
  adminFetch<AdminProductListItem>(`/admin/products/${id}/duplicate`, { method: 'POST' })

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

// ---- Customization engine (admin-defined option groups: choice/color/text/number/checkbox) ----
export interface CustomizationGroupInput {
  name: string
  label: string
  type: 'choice' | 'color' | 'text' | 'number' | 'checkbox'
  required?: boolean
  enabled?: boolean
  sortOrder?: number
  maxLength?: number | null
  placeholder?: string | null
  defaultValue?: string | null
  conditionalParentValueId?: string | null
}
export const createCustomizationGroup = (productId: string, input: CustomizationGroupInput) =>
  adminFetch<AdminProductListItem>(`/admin/products/${productId}/customizations`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
export const updateCustomizationGroup = (productId: string, groupId: string, input: Partial<CustomizationGroupInput>) =>
  adminFetch<AdminProductListItem>(`/admin/products/${productId}/customizations/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
export const deleteCustomizationGroup = (productId: string, groupId: string) =>
  adminFetch<AdminProductListItem>(`/admin/products/${productId}/customizations/${groupId}`, { method: 'DELETE' })

export interface CustomizationValueInput {
  label: string
  value: string
  priceAdjustment?: number
  sortOrder?: number
  enabled?: boolean
  sku?: string | null
}
export const createCustomizationValue = (productId: string, groupId: string, input: CustomizationValueInput) =>
  adminFetch<AdminProductListItem>(`/admin/products/${productId}/customizations/${groupId}/values`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
export const updateCustomizationValue = (
  productId: string,
  groupId: string,
  valueId: string,
  input: Partial<CustomizationValueInput>
) =>
  adminFetch<AdminProductListItem>(`/admin/products/${productId}/customizations/${groupId}/values/${valueId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
export const deleteCustomizationValue = (productId: string, groupId: string, valueId: string) =>
  adminFetch<AdminProductListItem>(`/admin/products/${productId}/customizations/${groupId}/values/${valueId}`, {
    method: 'DELETE',
  })

// ---- Categories / Colors / Testimonials / Hero Slides ----
export interface AdminCategory {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  sortOrder: number
  isActive: boolean
  parentId: string | null
  seoTitle?: string
  seoDescription?: string
  showInNavigation: boolean
  showOnHomepage: boolean
  isFeatured: boolean
}
export const getAdminCategories = () => adminFetch<AdminCategory[]>('/admin/categories')
export const createCategory = (input: Partial<AdminCategory> & { name: string; slug?: string }) =>
  adminFetch<AdminCategory>('/admin/categories', { method: 'POST', body: JSON.stringify(input) })
export const updateCategory = (id: string, input: Partial<AdminCategory>) =>
  adminFetch<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const reorderCategories = (items: { id: string; sortOrder: number }[]) =>
  adminFetch<void>('/admin/categories/reorder', { method: 'PATCH', body: JSON.stringify({ items }) })
export const getCategoryDeletionImpact = (id: string) =>
  adminFetch<{ childCategories: { id: string; name: string }[]; productCount: number }>(`/admin/categories/${id}/impact`)
export const deleteCategory = (id: string, input: { reassignTo?: string; force?: boolean } = {}) =>
  adminFetch<void>(`/admin/categories/${id}`, { method: 'DELETE', body: JSON.stringify(input) })

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
export const updateColor = (id: string, input: Partial<{ name: string; hex: string; sortOrder: number; isActive: boolean }>) =>
  adminFetch<AdminColor>(`/admin/colors/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
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
  isCustomOrder: boolean
  trackingNumber: string | null
  placedAt: string | null
  createdAt: string
}
export const getAdminOrders = (
  params: { status?: string; paymentStatus?: string; custom?: boolean; page?: number; limit?: number } = {}
) => {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.paymentStatus) q.set('paymentStatus', params.paymentStatus)
  if (params.custom !== undefined) q.set('custom', String(params.custom))
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))
  return adminFetch<{ items: AdminOrderSummary[]; total: number; page: number; limit: number }>(
    `/admin/orders?${q.toString()}`
  )
}

export interface AdminOrderItem {
  id: string
  productId: string | null
  name: string
  sku: string | null
  image?: string
  unitPrice: number
  quantity: number
  lineTotal: number
  selectedColor?: string
  customText?: string
  customizations: { label: string; type: string; valueLabel?: string; textValue?: string; priceAdjustment: number }[]
}
export interface AdminOrderDetail extends AdminOrderSummary {
  subtotal: number
  discountAmount: number
  shippingCost: number
  giftWrapCost: number
  shippingAddress: Record<string, string>
  shippingMethod: string
  guestEmail: string | null
  guestPhone: string | null
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  courier: string | null
  adminNotes: string | null
  customerNotes: string | null
  invoiceNumber: string | null
  items: AdminOrderItem[]
  statusHistory: { status: string; note?: string; created_at: string }[]
}
export const getAdminOrder = (id: string) => adminFetch<AdminOrderDetail>(`/admin/orders/${id}`)
export const updateOrderStatus = (id: string, status: string, note?: string, trackingNumber?: string, courier?: string) =>
  adminFetch<{ ok: boolean }>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note, trackingNumber, courier }),
  })
export const updateOrderNotes = (id: string, input: { adminNotes?: string; customerNotes?: string }) =>
  adminFetch<{ ok: boolean }>(`/admin/orders/${id}/notes`, { method: 'PATCH', body: JSON.stringify(input) })

export type OrderEmailType =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_making'
  | 'order_ready'
  | 'order_shipped'
  | 'order_tracking_updated'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_successful'
  | 'payment_failed'
  | 'refund_processed'
  | 'custom_order_confirmation'
export const ORDER_EMAIL_TYPE_LABELS: Record<OrderEmailType, string> = {
  order_placed: 'Order Received',
  order_confirmed: 'Order Confirmed',
  order_making: 'In Production',
  order_ready: 'Ready to Ship',
  order_shipped: 'Shipped',
  order_tracking_updated: 'Tracking Updated',
  order_delivered: 'Delivered',
  order_cancelled: 'Order Cancelled',
  payment_successful: 'Payment Received',
  payment_failed: 'Payment Failed',
  refund_processed: 'Refund Processed',
  custom_order_confirmation: 'Custom Order Confirmed',
}
export const sendOrderEmail = (orderId: string, type: OrderEmailType) =>
  adminFetch<{ ok: boolean }>(`/admin/orders/${orderId}/send-email`, { method: 'POST', body: JSON.stringify({ type }) })

// ---- Invoices ----
export const getOrderInvoice = (orderId: string) =>
  adminFetch<{ invoiceNumber: string; createdAt: string; snapshot: unknown; orderStatus: string; paymentStatus: string }>(
    `/admin/orders/${orderId}/invoice`
  )
export const regenerateInvoice = (orderId: string) =>
  adminFetch<{ invoiceNumber: string }>(`/admin/orders/${orderId}/invoice/regenerate`, { method: 'POST' })
export const emailInvoice = (orderId: string) =>
  adminFetch<{ ok: boolean }>(`/admin/orders/${orderId}/invoice/email`, { method: 'POST' })
export async function fetchInvoicePdfBlob(orderId: string): Promise<Blob> {
  const t = await token()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/orders/${orderId}/invoice/pdf`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  })
  if (!res.ok) throw new Error('Failed to load invoice PDF')
  return res.blob()
}

// ---- Email templates & logs ----
export interface AdminEmailTemplate {
  id: string
  type: string
  subject: string
  bodyHtml: string
  enabled: boolean
  updatedAt: string
}
export const getEmailTemplates = () => adminFetch<AdminEmailTemplate[]>('/admin/emails/templates')
export const updateEmailTemplate = (id: string, input: Partial<Pick<AdminEmailTemplate, 'subject' | 'bodyHtml' | 'enabled'>>) =>
  adminFetch<AdminEmailTemplate>(`/admin/emails/templates/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const previewEmailTemplate = (id: string) =>
  adminFetch<{ subject: string; bodyHtml: string }>(`/admin/emails/templates/${id}/preview`, { method: 'POST' })
export const testSendEmailTemplate = (id: string, to: string) =>
  adminFetch<{ ok: boolean }>(`/admin/emails/templates/${id}/test-send`, { method: 'POST', body: JSON.stringify({ to }) })

export interface AdminEmailLog {
  id: string
  type: string
  recipient: string
  orderId: string | null
  subject: string | null
  status: 'sent' | 'failed' | 'pending'
  errorMessage: string | null
  sentAt: string
}
export const getEmailLogs = (params: { status?: string; type?: string; page?: number; limit?: number } = {}) => {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  if (params.type) q.set('type', params.type)
  if (params.page) q.set('page', String(params.page))
  q.set('limit', String(params.limit ?? 300))
  return adminFetch<{ items: AdminEmailLog[]; total: number; page: number; limit: number }>(`/admin/emails/logs?${q.toString()}`)
}
export const retryEmailLog = (id: string) => adminFetch<{ ok: boolean }>(`/admin/emails/logs/${id}/retry`, { method: 'POST' })

// ---- Invoice settings ----
export interface AdminInvoiceSettings {
  businessName: string
  logoUrl: string
  address: string
  email: string
  phone: string
  taxNumber: string
  invoicePrefix: string
  footer: string
  terms: string
  currency: string
  showSku: boolean
  showTax: boolean
  showCustomizationPricing: boolean
  // GST identity fields — only present in the response for a caller with settings.tax;
  // absent (not just empty) for anyone else, so treat all of these as optional.
  isGstRegistered?: boolean
  gstin?: string
  gstLegalName?: string
  gstState?: string
  gstStateCode?: string
  pan?: string
  customerGstinOptional?: boolean
}
export const getInvoiceSettings = () => adminFetch<AdminInvoiceSettings>('/admin/settings/invoice')
export const updateInvoiceSettings = (input: Partial<AdminInvoiceSettings>) =>
  adminFetch<AdminInvoiceSettings>('/admin/settings/invoice', { method: 'PATCH', body: JSON.stringify(input) })

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
export const getAdminCustomers = (params: { page?: number; limit?: number } = {}) => {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 1))
  q.set('limit', String(params.limit ?? 300))
  return adminFetch<{ items: AdminCustomer[]; total: number; page: number; limit: number }>(`/admin/customers?${q.toString()}`)
}

export interface AdminCustomerOrder {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  itemCount: number
  trackingNumber: string | null
  placedAt: string | null
  createdAt: string
}
export interface AdminCustomerAddress {
  id: string
  label: string | null
  first_name: string
  last_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  is_default: boolean
}
export interface AdminCustomerDetail {
  id: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  marketingOptIn: boolean
  createdAt: string
  stats: {
    orderCount: number
    paidOrderCount: number
    failedOrderCount: number
    refundedOrderCount: number
    totalSpent: number
    avgOrderValue: number
    lastOrderAt: string | null
  }
  orders: AdminCustomerOrder[]
  addresses: AdminCustomerAddress[]
}
export const getAdminCustomer = (id: string) => adminFetch<AdminCustomerDetail>(`/admin/customers/${id}`)
export const getCustomerEmails = (id: string) => adminFetch<AdminEmailLog[]>(`/admin/customers/${id}/emails`)
export const sendCustomerWelcomeEmail = (id: string) =>
  adminFetch<{ ok: boolean }>(`/admin/customers/${id}/send-welcome-email`, { method: 'POST' })

// ---- Reviews ----
export const getAdminReviews = (status: 'pending' | 'published' = 'pending') =>
  adminFetch<any[]>(`/admin/reviews?status=${status}`)
export const moderateReview = (id: string, isPublished: boolean) =>
  adminFetch<any>(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ isPublished }) })
