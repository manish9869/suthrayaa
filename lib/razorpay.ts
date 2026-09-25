export interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void
  modal?: { ondismiss?: () => void }
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}

let loadingPromise: Promise<void> | null = null

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Razorpay) return Promise.resolve()
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load the Razorpay checkout script'))
    document.body.appendChild(script)
  })
  return loadingPromise
}

/**
 * Opens Razorpay for an order and resolves once the payment is verified by our backend.
 * Resolves `false` when the customer closes the window; rejects if verification fails.
 */
export async function openRazorpayPayment(opts: {
  razorpay: { orderId: string; amount: number; currency: string; keyId: string }
  orderNumber: string
  prefill?: { name?: string; email?: string; contact?: string }
  verify: (r: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => Promise<unknown>
}): Promise<boolean> {
  await loadRazorpayScript()
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: opts.razorpay.keyId,
      amount: opts.razorpay.amount,
      currency: opts.razorpay.currency,
      name: 'Suthrayaa',
      description: `Order ${opts.orderNumber}`,
      order_id: opts.razorpay.orderId,
      prefill: opts.prefill,
      theme: { color: '#6d4aff' },
      handler: async (response) => {
        try {
          await opts.verify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
          resolve(true)
        } catch (err) {
          reject(err)
        }
      },
      modal: { ondismiss: () => resolve(false) },
    })
    rz.open()
  })
}
