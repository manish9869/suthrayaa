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
}

export async function validateCart(
  items: CartItemInput[],
  opts: { shippingMethod?: string; couponCode?: string; giftWrap?: boolean } = {}
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
  city: string
  state: string
  pincode: string
}

export interface PlaceOrderInput {
  items: CartItemInput[]
  shippingAddress: ShippingAddressInput
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
