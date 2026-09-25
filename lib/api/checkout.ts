import { apiFetch } from './http'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

async function getBrowserToken(): Promise<string | undefined> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

export interface CustomizationSelectionInput {
  customizationId: string
  valueId?: string
  textValue?: string
}

export interface CartItemInput {
  productId: string
  quantity: number
  selectedColor?: string
  customText?: string
  customizations?: CustomizationSelectionInput[]
}

export interface PricedCart {
  lines: Array<{
    productId: string
    name: string
    image?: string
    unitPrice: number
    quantity: number
    selectedColorHex?: string
    selectedColorName?: string
    customText?: string
    lineTotal: number
  }>
  subtotal: number
  discount: number
  coupon: { code: string; type: string; value: number } | null
  shippingCost: number
  giftWrapCost: number
  total: number
  taxAmount?: number
  shippingEstimate?: { min: number; max: number }
  /** Delivery options for the chosen state (newer backends). */
  shipping?: {
    method: 'standard' | 'express'
    fee: number
    standardFee: number
    expressFee: number
    freeShippingApplied: boolean
    estimateDays: { min: number; max: number }
    zoneName: string
    codAvailable: boolean
  }
  giftWrapFee?: number
}

export interface CheckoutOptions {
  payment: { razorpayEnabled: boolean; codEnabled: boolean; codMin: number; codMax: number }
  order: { min: number; max: number }
  giftWrap: { fee: number }
  freeShipping?: { enabled: boolean; threshold: number }
}
export const getCheckoutOptions = () => apiFetch<CheckoutOptions>('/checkout/options', { revalidate: false })

export interface CartLineIssue {
  index: number
  productId: string
  message: string
  kind: 'unavailable' | 'options' | 'quantity'
}
/** Checks every cart line independently — returns all problems at once. */
export async function checkCart(items: CartItemInput[]) {
  const token = await getBrowserToken()
  return apiFetch<{ issues: CartLineIssue[] }>('/checkout/check-cart', { method: 'POST', token, revalidate: false, body: JSON.stringify({ items }) })
}

export async function validateCart(
  items: CartItemInput[],
  opts: { shippingMethod?: string; couponCode?: string; giftWrap?: boolean; shippingState?: string } = {}
) {
  const token = await getBrowserToken()
  return apiFetch<PricedCart>('/checkout/validate-cart', {
    method: 'POST',
    token,
    revalidate: false,
    body: JSON.stringify({ items, ...opts }),
  })
}

export async function validateCoupon(code: string, subtotal: number) {
  const token = await getBrowserToken()
  return apiFetch<{ valid: boolean; code: string; type: string; value: number; discount: number }>(
    '/coupons/validate',
    {
      method: 'POST',
      token,
      revalidate: false,
      body: JSON.stringify({ code, subtotal }),
    }
  )
}

export interface ShippingAddressInput {
  firstName: string
  lastName: string
  phone: string
  email?: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  district?: string
  state: string
  pincode: string
}

export interface PlaceOrderInput {
  items: CartItemInput[]
  shippingAddress: ShippingAddressInput
  billingAddress?: Omit<ShippingAddressInput, 'email'>
  shippingMethod: 'standard' | 'express'
  paymentMethod: 'cod' | 'razorpay'
  couponCode?: string
  giftWrap?: boolean
  giftMessage?: string
}

export interface PlaceOrderResult {
  order: { id: string; orderNumber: string; status: string; paymentStatus: string; total: number }
  razorpay: { orderId: string; amount: number; currency: string; keyId: string } | null
}

/** Cart lines in the shape the checkout API expects. */
export function toCartItemInputs(
  items: { product: { id: string }; quantity: number; selectedColor?: string; customText?: string; customizations?: { customizationId: string; valueId?: string; textValue?: string }[] }[]
): CartItemInput[] {
  return items.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
    selectedColor: item.selectedColor || undefined,
    customText: item.customText,
    customizations: item.customizations?.map((c) => ({ customizationId: c.customizationId, valueId: c.valueId, textValue: c.textValue })),
  }))
}

export async function placeOrder(input: PlaceOrderInput) {
  const token = await getBrowserToken()
  return apiFetch<PlaceOrderResult>('/checkout/place-order', {
    method: 'POST',
    token,
    revalidate: false,
    body: JSON.stringify(input),
  })
}

export async function verifyPayment(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) {
  return apiFetch<{ ok: boolean; orderId: string }>('/checkout/verify-payment', {
    method: 'POST',
    revalidate: false,
    body: JSON.stringify(input),
  })
}
