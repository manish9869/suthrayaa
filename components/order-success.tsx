'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Banknote, CheckCircle2, Clock, Copy, CreditCard, Loader2, Mail, MapPin, Package, Sparkles, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store'
import { getOrder, type OrderDetail } from '@/lib/api/account'
import { usePayOrder } from '@/lib/use-pay-order'
import { formatPrice } from '@/lib/data'
import { AddressLines } from '@/components/account/address-card'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const
const BURST = ['#6d4aff', '#ff9e7a', '#b9a8ff', '#f5b544', '#ffc9b5', '#8b6bff']

/** The success mark: a stitched ring that spins in, then a tick that draws itself. */
function SuccessMark({ pending }: { pending: boolean }) {
  const reduce = useReducedMotion()
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2 + (i % 2 ? 0.12 : -0.08)
        const dist = 92 + (i % 3) * 22
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: BURST[i % BURST.length], size: 6 + (i % 3) * 3, heart: i % 6 === 0 }
      }),
    []
  )
  const color = pending ? '#d98c1f' : '#6d4aff'
  return (
    <div className="relative mx-auto h-36 w-36">
      {!pending &&
        !reduce &&
        pieces.map((p, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: p.x, y: p.y, scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ delay: 0.75 + (i % 6) * 0.03, duration: 1.3, ease: EASE }}
          >
            {p.heart ? (
              <svg width={p.size + 6} height={p.size + 6} viewBox="0 0 24 24" fill={p.color} className="-translate-x-1/2 -translate-y-1/2">
                <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.5 1.1 4.3 2.6h2.6C14.1 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />
              </svg>
            ) : (
              <span className="block -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: p.size, height: p.size, background: p.color }} />
            )}
          </motion.span>
        ))}
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full overflow-visible">
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeDasharray="6 5"
          strokeLinecap="round"
          initial={reduce ? false : { rotate: -120, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          style={{ originX: '60px', originY: '60px' }}
        />
        <motion.circle
          cx="60"
          cy="60"
          r="44"
          fill={color}
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
          style={{ originX: '60px', originY: '60px' }}
        />
        {pending ? (
          <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M60 38v24l14 9" />
          </motion.g>
        ) : (
          <motion.path
            d="M40 61 L54 75 L81 46"
            fill="none"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.45, duration: 0.45, ease: 'easeOut' }}
          />
        )}
      </svg>
    </div>
  )
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: EASE },
})

const NEXT = [
  { icon: CheckCircle2, title: 'Order confirmed', text: 'Your confirmation and invoice are on their way to your inbox.' },
  { icon: Sparkles, title: 'Made by hand', text: 'Your pieces are crocheted to order — we’ll email you as they progress.' },
  { icon: Truck, title: 'On its way', text: 'You’ll get a tracking number the moment it’s with the courier.' },
]

export function OrderSuccess({ orderNumber, payment, orderId }: { orderNumber: string; payment?: string; orderId?: string }) {
  const router = useRouter()
  const clearCart = useCartStore((s) => s.clearCart)
  const pending = payment === 'pending'
  const isCod = payment === 'cod'
  const [order, setOrder] = useState<OrderDetail | null>(null)

  // Safety net — the checkout already clears the cart behind its hand-off screen
  useEffect(() => {
    clearCart()
  }, [clearCart])

  useEffect(() => {
    if (orderId) getOrder(orderId).then(setOrder).catch(() => {})
  }, [orderId])

  const { pay, payingId } = usePayOrder(() => router.replace(`/order-confirmation?order=${orderNumber}&payment=online&id=${orderId}`))

  const copy = () => navigator.clipboard?.writeText(orderNumber).then(() => toast.success('Order number copied'))
  const eta = order?.status === 'pending_payment' ? null : 'We’ll email you delivery updates'

  return (
    <div className="relative overflow-hidden">
      {/* soft background thread */}
      <svg className="pointer-events-none absolute inset-x-0 top-24 -z-0 h-40 w-full text-primary/15" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M-20 110 C 180 20, 320 150, 520 80 S 860 10, 1000 90 S 1180 130, 1240 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="8 7"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
        />
      </svg>

      <div className="container relative mx-auto px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <SuccessMark pending={pending} />
            <motion.p {...rise(0.55)} className="eyebrow mt-6">
              {pending ? 'Payment not completed' : isCod ? 'Order placed · pay on delivery' : 'Payment successful'}
            </motion.p>
            <motion.h1 {...rise(0.65)} className="display mt-2 text-4xl leading-tight sm:text-5xl">
              {pending ? (
                'Your order is saved'
              ) : (
                <>
                  Thank you{order?.shippingAddress?.firstName ? `, ${order.shippingAddress.firstName}` : ''}! <span className="italic text-primary">It’s on the hook.</span>
                </>
              )}
            </motion.h1>
            <motion.p {...rise(0.75)} className="mx-auto mt-3 max-w-lg text-muted-foreground">
              {pending
                ? 'The payment didn’t go through, but we’ve kept your order. Complete it whenever you’re ready — we start making it as soon as it’s paid.'
                : 'We’ve received your order and our makers are getting their yarn ready. A confirmation is on its way to your inbox.'}
            </motion.p>

            <motion.div {...rise(0.85)} className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card py-1.5 pl-4 pr-1.5 shadow-sm">
              <span className="text-sm text-muted-foreground">Order</span>
              <span className="font-semibold tabular-nums">{orderNumber}</span>
              <button type="button" onClick={copy} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted" aria-label="Copy order number">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </motion.div>

            <motion.div {...rise(0.95)} className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {pending && orderId ? (
                <Button size="lg" className="h-12 rounded-full px-7" disabled={payingId === orderId} onClick={() => pay(orderId)}>
                  {payingId === orderId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Complete payment
                </Button>
              ) : orderId ? (
                <Button asChild size="lg" className="h-12 rounded-full px-7">
                  <Link href={`/account/orders/${orderId}`}>
                    <Package className="h-4 w-4" /> Track your order
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="lg" variant={orderId ? 'outline' : 'default'} className="h-12 rounded-full px-7">
                <Link href="/shop">
                  Continue shopping <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-5">
            {/* order recap (signed-in) or what's next */}
            <motion.section {...rise(1.05)} className="rounded-3xl border bg-card p-6 shadow-[0_18px_50px_-34px_rgb(49_32_140/0.45)] md:col-span-3">
              {order ? (
                <>
                  <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Your order</h2>
                  <ul className="space-y-3">
                    {order.items.map((it, i) => (
                      <motion.li key={it.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.15 + i * 0.06 }} className="flex items-center gap-3">
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-sand">
                          {it.image && <Image src={it.image} alt={it.name} fill sizes="56px" className="object-cover" />}
                          <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink/80 px-1 text-[11px] font-semibold text-white">{it.quantity}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{it.name}</p>
                          {it.customizations.length > 0 && <p className="truncate text-xs text-muted-foreground">{it.customizations.map((c) => c.value).join(' · ')}</p>}
                        </div>
                        <span className="text-sm font-medium tabular-nums">{formatPrice(it.lineTotal)}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                    {order.discountAmount > 0 && (
                      <p className="flex justify-between text-emerald-700">
                        <span>Discount</span>
                        <span>−{formatPrice(order.discountAmount)}</span>
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{order.shippingCost ? formatPrice(order.shippingCost) : 'Free'}</span>
                    </p>
                    <p className="flex items-baseline justify-between pt-1">
                      <span className="font-semibold">Total</span>
                      <span className="font-serif text-2xl tabular-nums">{formatPrice(order.total)}</span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">What happens next</h2>
                  <ol className="space-y-5">
                    {NEXT.map((s, i) => (
                      <motion.li key={s.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.15 + i * 0.1 }} className="flex gap-4">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', i === 0 && !pending ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          <s.icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-sm text-muted-foreground">{s.text}</p>
                        </div>
                      </motion.li>
                    ))}
                  </ol>
                </>
              )}
            </motion.section>

            <div className="space-y-5 md:col-span-2">
              <motion.section {...rise(1.15)} className="rounded-3xl border bg-card p-5">
                <p className="flex items-center gap-2 font-medium">
                  {pending ? <Clock className="h-4 w-4 text-amber-600" /> : isCod ? <Banknote className="h-4 w-4 text-primary" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {pending ? 'Awaiting payment' : isCod ? 'Pay on delivery' : 'Paid online'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pending
                    ? 'If money was debited, your bank reverses failed payments automatically — usually within 5–7 business days.'
                    : isCod
                      ? `Keep ${order ? formatPrice(order.total) : 'the order total'} ready in cash or UPI when it arrives.`
                      : 'Your payment is verified and your order is confirmed.'}
                </p>
              </motion.section>

              {order && (
                <motion.section {...rise(1.25)} className="rounded-3xl border bg-card p-5">
                  <p className="mb-2 flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-primary" /> Delivering to
                  </p>
                  <AddressLines a={order.shippingAddress} compact />
                  {eta && <p className="mt-2 text-xs text-muted-foreground">{eta}</p>}
                </motion.section>
              )}

              <motion.section {...rise(1.35)} className="flex items-start gap-3 rounded-3xl bg-secondary/15 p-5 text-sm">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p>
                  Questions? <Link href={`/contact?order=${orderNumber}`} className="font-semibold text-primary hover:underline">Contact us</Link> with your order number — we reply within 1–2 business days.
                </p>
              </motion.section>

              {!orderId && !pending && (
                <motion.section {...rise(1.45)} className="rounded-3xl border border-dashed bg-card p-5 text-sm">
                  <p className="font-medium">Shop faster next time</p>
                  <p className="mt-1 text-muted-foreground">With an account you can track orders, download invoices and save addresses. We’ll email you updates for this order.</p>
                  <Link href="/login?redirect=/account" className="mt-2 inline-flex font-semibold text-primary hover:underline">
                    Create an account
                  </Link>
                </motion.section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
