import { apiFetch, ApiError } from './http'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/data'

async function token(): Promise<string | undefined> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

async function meFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(`/me${path}`, { ...options, token: await token(), revalidate: false })
}

// ---- Profile ----
export interface CustomerProfile {
  id: string
  email: string | null
  phone: string | null
  firstName: string
  lastName: string
  marketingOptIn: boolean
  createdAt: string
}
export const getProfile = () => meFetch<CustomerProfile | null>('')
export const updateProfile = (input: Partial<Pick<CustomerProfile, 'firstName' | 'lastName' | 'phone' | 'marketingOptIn'>>) =>
  meFetch<CustomerProfile>('', { method: 'PATCH', body: JSON.stringify(input) })

// ---- Addresses ----
export interface SavedAddress {
  id: string
  label: string | null
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  landmark: string | null
  city: string
  district: string | null
  state: string
  pincode: string
  addressType: 'home' | 'work' | 'other' | null
  isDefault: boolean
  isDefaultBilling: boolean
  createdAt: string
}
export type AddressInput = {
  label?: string
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  addressType?: 'home' | 'work' | 'other'
  isDefault?: boolean
  isDefaultBilling?: boolean
}
export const getAddresses = () => meFetch<SavedAddress[]>('/addresses')
export const createAddress = (input: AddressInput) => meFetch<SavedAddress>('/addresses', { method: 'POST', body: JSON.stringify(input) })
export const updateAddress = (id: string, input: Partial<AddressInput>) =>
  meFetch<SavedAddress>(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteAddress = (id: string) => meFetch<void>(`/addresses/${id}`, { method: 'DELETE' })

// ---- Orders ----
export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export interface OrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'
  paymentMethod: 'cod' | 'razorpay' | string
  total: number
  itemCount: number
  previewItems: { name: string; image: string | null }[]
  placedAt: string | null
  createdAt: string
  canCancel: boolean
  canPay: boolean
}

export interface OrderAddress {
  firstName: string
  lastName: string
  phone?: string
  email?: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
}

export interface OrderDetail extends OrderSummary {
  subtotal: number
  discountAmount: number
  couponCode: string | null
  shippingCost: number
  giftWrapCost: number
  taxAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  shippingAddress: OrderAddress
  billingAddress: OrderAddress | null
  shippingMethod: string | null
  giftWrap: boolean
  giftMessage: string | null
  trackingNumber: string | null
  courier: string | null
  paymentReference: string | null
  invoiceNumber: string | null
  invoiceAvailable: boolean
  items: {
    id: string
    productId: string | null
    productSlug: string | null
    name: string
    sku: string | null
    image: string | null
    unitPrice: number
    quantity: number
    lineTotal: number
    selectedColor: string | null
    selectedColorName: string | null
    customText: string | null
    customizations: { label: string; value: string; priceAdjustment: number }[]
  }[]
  statusHistory: { status: string; note: string | null; at: string }[]
}

export const getOrders = () => meFetch<OrderSummary[]>('/orders')
export const getOrder = (id: string) => meFetch<OrderDetail>(`/orders/${id}`)
export const cancelOrder = (id: string, reason?: string) =>
  meFetch<OrderDetail>(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
export const payForOrder = (id: string) =>
  meFetch<{ order: { id: string; orderNumber: string; total: number }; razorpay: { orderId: string; amount: number; currency: string; keyId: string } }>(
    `/orders/${id}/pay`,
    { method: 'POST' }
  )

/** Downloads the order's invoice PDF and saves it with its invoice-number filename. */
export async function downloadInvoice(orderId: string, fallbackName = 'invoice') {
  const t = await token()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me/orders/${orderId}/invoice`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error?.message ?? 'Could not download the invoice')
  }
  const blob = await res.blob()
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? `${fallbackName}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Field-level messages from a backend zod "Validation failed" error, if any. */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {}
  const fe = (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors ?? {}
  return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? 'Invalid value']))
}

// ---- Reviews ----
export interface ReviewInput {
  productId: string
  rating: number
  title?: string
  content: string
}
/** Submits a product review; it's held for admin moderation before appearing publicly. */
export const submitReview = async (input: ReviewInput) =>
  apiFetch<{ id: string; pendingModeration: boolean }>('/reviews', {
    method: 'POST',
    body: JSON.stringify(input),
    token: await token(),
    revalidate: false,
  })

// ---- Cart & wishlist sync (signed-in customers; see components/account-sync.tsx) ----
export interface ServerCartItem {
  id: string
  product: Product
  quantity: number
  selectedColor?: string
  customText?: string
  customizations: {
    customizationId: string
    valueId?: string
    label: string
    valueLabel?: string
    textValue?: string
    priceAdjustment: number
  }[]
}
export interface CartSyncLine {
  productId: string
  quantity: number
  selectedColor?: string
  customText?: string
  customizations?: { customizationId: string; valueId?: string; textValue?: string }[]
}
export const getServerCart = () => meFetch<ServerCartItem[]>('/cart')
export const replaceServerCart = (items: CartSyncLine[]) =>
  meFetch<ServerCartItem[]>('/cart', { method: 'PUT', body: JSON.stringify({ items, mode: 'replace' }) })
export const getServerWishlist = () => meFetch<Product[]>('/wishlist')
export const replaceServerWishlist = (productIds: string[]) =>
  meFetch<void>('/wishlist', { method: 'PUT', body: JSON.stringify({ productIds }) })
