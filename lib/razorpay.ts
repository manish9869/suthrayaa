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
