'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ChevronRight, CreditCard, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadInvoice, type OrderSummary } from '@/lib/api/account'
import { formatPrice } from '@/lib/data'
import { cn } from '@/lib/utils'
import { OrderStatusBadge, STATUS_META } from './order-status'

export const orderDate = (o: { placedAt: string | null; createdAt: string }) =>
  new Date(o.placedAt ?? o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/** One order in the history list: thumbnails, number/date, status, total and quick actions. */
export function OrderCard({ order, onPay }: { order: OrderSummary; onPay?: (o: OrderSummary) => void }) {
  const [downloading, setDownloading] = useState(false)
  const invoiceReady = order.status !== 'pending_payment' && !(order.status === 'cancelled' && order.paymentStatus !== 'paid')

  const handleInvoice = async () => {
    setDownloading(true)
    try {
      await downloadInvoice(order.id, order.orderNumber)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download the invoice')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-[0_1px_2px_rgb(49_32_140/0.04)] transition-shadow hover:shadow-[0_14px_40px_-24px_rgb(49_32_140/0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-muted/40 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
          <span>
            <span className="text-muted-foreground">Order </span>
            <span className="font-semibold tabular-nums">{order.orderNumber}</span>
          </span>
          <span className="text-muted-foreground">{orderDate(order)}</span>
          <span className="font-semibold tabular-nums">{formatPrice(order.total)}</span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Link href={`/account/orders/${order.id}`} className="group flex items-center gap-4 px-4 py-4 sm:px-5">
        <div className="flex shrink-0 -space-x-3">
          {order.previewItems.slice(0, 3).map((it, i) => (
            <span key={i} className={cn('relative h-14 w-14 overflow-hidden rounded-2xl bg-sand ring-2 ring-card sm:h-16 sm:w-16', i > 0 && 'hidden sm:block')}>
              {it.image ? <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" /> : null}
            </span>
          ))}
          {order.itemCount > 1 && (
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card sm:hidden">
              +{order.itemCount - 1}
            </span>
          )}
          {order.itemCount > 3 && (
            <span className="relative hidden h-16 w-16 items-center justify-center rounded-2xl bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card sm:flex">
              +{order.itemCount - 3}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">
            {order.previewItems[0]?.name}
            {order.previewItems.length > 1 && <span className="text-muted-foreground"> + {order.previewItems.length - 1} more</span>}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} · {STATUS_META[order.status]?.note}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      <div className="flex flex-wrap gap-2 border-t px-4 py-3 sm:px-5">
        {order.canPay && onPay && (
          <Button size="sm" className="h-9 rounded-full" onClick={() => onPay(order)}>
            <CreditCard className="h-4 w-4" /> Pay now
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="h-9 rounded-full">
          <Link href={`/account/orders/${order.id}`}>View details</Link>
        </Button>
        {invoiceReady && (
          <Button size="sm" variant="ghost" className="h-9 rounded-full" onClick={handleInvoice} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Invoice
          </Button>
        )}
      </div>
    </article>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="h-12 animate-pulse bg-muted/60" />
      <div className="flex items-center gap-4 p-5">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
