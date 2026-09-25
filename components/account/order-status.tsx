import { Check, CircleDashed, Package, PackageCheck, ShoppingBag, Sparkles, Truck, XCircle } from 'lucide-react'
import type { OrderStatus } from '@/lib/api/account'
import { cn } from '@/lib/utils'

type Tone = 'violet' | 'green' | 'amber' | 'red' | 'muted' | 'sky'

export const STATUS_META: Record<string, { label: string; tone: Tone; note: string }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'amber', note: 'Complete your payment to confirm this order.' },
  confirmed: { label: 'Confirmed', tone: 'violet', note: 'We’ve received your order and will start making it soon.' },
  in_production: { label: 'Being made', tone: 'violet', note: 'Your pieces are being crocheted by hand.' },
  ready: { label: 'Ready to ship', tone: 'sky', note: 'Finished and being packed for the courier.' },
  shipped: { label: 'Shipped', tone: 'sky', note: 'On its way to you.' },
  delivered: { label: 'Delivered', tone: 'green', note: 'Delivered — we hope you love it!' },
  cancelled: { label: 'Cancelled', tone: 'red', note: 'This order was cancelled.' },
  refunded: { label: 'Refunded', tone: 'muted', note: 'This order was refunded.' },
  partially_refunded: { label: 'Partly refunded', tone: 'muted', note: 'Part of this order was refunded.' },
}

const TONE: Record<Tone, string> = {
  violet: 'bg-primary/10 text-primary ring-primary/20',
  green: 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-400/15 text-amber-800 ring-amber-500/25',
  red: 'bg-red-500/10 text-red-700 ring-red-600/20',
  muted: 'bg-muted text-muted-foreground ring-border',
  sky: 'bg-sky-500/10 text-sky-700 ring-sky-600/20',
}
const DOT: Record<Tone, string> = {
  violet: 'bg-primary',
  green: 'bg-emerald-600',
  amber: 'bg-amber-500',
  red: 'bg-red-600',
  muted: 'bg-muted-foreground',
  sky: 'bg-sky-600',
}

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const m = STATUS_META[status] ?? { label: status.replace(/_/g, ' '), tone: 'muted' as Tone }
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', TONE[m.tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[m.tone])} />
      {m.label}
    </span>
  )
}

export function PaymentStatusText({ status, method }: { status: string; method: string }) {
  const how = method === 'cod' ? 'Cash on Delivery' : 'Online payment'
  const map: Record<string, string> = { paid: 'Paid', pending: method === 'cod' ? 'Pay on delivery' : 'Awaiting payment', failed: 'Payment failed', refunded: 'Refunded', partially_refunded: 'Partly refunded' }
  return (
    <span>
      {how} · <span className={cn(status === 'paid' && 'text-emerald-700', status === 'failed' && 'text-red-700')}>{map[status] ?? status}</span>
    </span>
  )
}

const STEPS = [
  { key: 'placed', label: 'Placed', icon: ShoppingBag, statuses: ['pending_payment', 'confirmed'] },
  { key: 'confirmed', label: 'Confirmed', icon: Check, statuses: ['confirmed'] },
  { key: 'in_production', label: 'Being made', icon: Sparkles, statuses: ['in_production', 'ready'] },
  { key: 'shipped', label: 'Shipped', icon: Truck, statuses: ['shipped'] },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck, statuses: ['delivered'] },
]
const RANK: Record<string, number> = { pending_payment: 0, confirmed: 1, in_production: 2, ready: 2, shipped: 3, delivered: 4 }

/** Horizontal journey (Placed → Delivered) with the date each step was reached. */
export function OrderTimeline({ status, history, placedAt }: { status: OrderStatus; history: { status: string; at: string }[]; placedAt: string | null }) {
  if (status === 'cancelled' || status === 'refunded' || status === 'partially_refunded') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-500/[0.06] p-4 text-sm text-red-800 ring-1 ring-inset ring-red-500/15">
        <XCircle className="h-5 w-5 shrink-0" />
        <span>{STATUS_META[status]?.note}</span>
      </div>
    )
  }
  const rank = RANK[status] ?? 0
  const when = (i: number) => {
    const key = STEPS[i].key
    const hit = i === 0 ? placedAt ?? history[0]?.at : [...history].find((h) => (key === 'in_production' ? ['in_production', 'ready'] : [key]).includes(h.status))?.at
    return hit ? new Date(hit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null
  }
  return (
    <ol className="grid grid-cols-5">
      {STEPS.map((s, i) => {
        const done = i < rank || (i === rank && status === 'delivered')
        const current = i === rank && status !== 'delivered'
        const reached = done || current
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span className={cn('absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2', i <= rank ? 'bg-primary' : 'bg-border')} aria-hidden />
            )}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-card transition-colors',
                done ? 'bg-primary text-primary-foreground' : current ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              {done ? <Check className="h-4 w-4" /> : current ? <s.icon className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
            </span>
            <span className={cn('mt-2 text-[11.5px] font-semibold leading-tight sm:text-xs', reached ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">{reached ? when(i) ?? ' ' : ' '}</span>
          </li>
        )
      })}
    </ol>
  )
}

export { Package }
