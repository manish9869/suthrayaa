'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { payForOrder } from '@/lib/api/account'
import { verifyPayment } from '@/lib/api/checkout'
import { openRazorpayPayment } from '@/lib/razorpay'

/** "Pay now" for an order still awaiting payment; calls onPaid after verification. */
export function usePayOrder(onPaid: () => void) {
  const [payingId, setPayingId] = useState<string | null>(null)
  const pay = async (orderId: string, prefill?: { name?: string; email?: string; contact?: string }) => {
    setPayingId(orderId)
    try {
      const res = await payForOrder(orderId)
      const paid = await openRazorpayPayment({ razorpay: res.razorpay, orderNumber: res.order.orderNumber, prefill, verify: verifyPayment })
      if (paid) {
        toast.success('Payment received — your order is confirmed!')
        onPaid()
      } else {
        toast.info('Payment window closed — you can pay any time from your orders.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment could not be completed')
    } finally {
      setPayingId(null)
    }
  }
  return { pay, payingId }
}
