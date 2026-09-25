'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Copy, CreditCard, Download, Gift, HelpCircle, Loader2, Package, RotateCcw, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyBlock, useAccount } from '@/components/account/account-shell'
import { AddressLines } from '@/components/account/address-card'
import { OrderStatusBadge, OrderTimeline, PaymentStatusText, STATUS_META } from '@/components/account/order-status'
import { cancelOrder, downloadInvoice, getOrder, type OrderDetail } from '@/lib/api/account'
import { usePayOrder } from '@/lib/use-pay-order'
import { formatPrice } from '@/lib/data'
import { cn } from '@/lib/utils'

const CANCEL_REASONS = ['Ordered by mistake', 'Want to change items or options', 'Delivery will take too long', 'Found a better price', 'Other']

function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgb(49_32_140/0.04)] sm:p-6', className)}>
      {title && <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>}
      {children}
    </section>
  )
}

function Row({ label, value, strong, tone }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; tone?: 'green' }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-1.5 text-sm', strong && 'text-base font-semibold')}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={cn('tabular-nums', tone === 'green' && 'text-emerald-700')}>{value}</span>
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { profile, email } = useAccount()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [otherReason, setOtherReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(() => {
    setError(null)
    getOrder(id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this order'))
  }, [id])
  useEffect(load, [load])
  const { pay, payingId } = usePayOrder(load)

  if (error) {
    return (
      <EmptyBlock
        icon={error.toLowerCase().includes('not found') ? Package : RotateCcw}
        title={error.toLowerCase().includes('not found') ? 'Order not found' : 'Couldn’t load this order'}
        text={error.toLowerCase().includes('not found') ? 'This order doesn’t exist or belongs to a different account.' : error}
        action={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/account/orders">Back to my orders</Link>
          </Button>
        }
      />
    )
  }
  if (!order) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-3xl bg-muted/70" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted/70" />
      </div>
    )
  }

  const placed = new Date(order.placedAt ?? order.createdAt)
  const handleInvoice = async () => {
    setDownloading(true)
    try {
      await downloadInvoice(order.id, order.invoiceNumber ?? order.orderNumber)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download the invoice')
    } finally {
      setDownloading(false)
    }
  }
  const handleCancel = async () => {
    const why = reason === 'Other' ? otherReason.trim() || 'Other' : reason
    setCancelling(true)
    try {
      setOrder(await cancelOrder(order.id, why))
      setCancelOpen(false)
      toast.success(order.paymentStatus === 'paid' ? 'Order cancelled — we’ll refund your payment shortly.' : 'Your order has been cancelled.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel this order')
    } finally {
      setCancelling(false)
    }
  }
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'))
  const billingSame = !order.billingAddress

  return (
    <>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      {/* header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="display text-2xl tabular-nums sm:text-[28px]">Order {order.orderNumber}</h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on {placed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at{' '}
            {placed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.canPay && (
            <Button
              className="rounded-full"
              disabled={payingId === order.id}
              onClick={() => pay(order.id, { name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' '), email: email ?? undefined, contact: profile?.phone ?? undefined })}
            >
              {payingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay {formatPrice(order.total)}
            </Button>
          )}
          {order.invoiceAvailable && (
            <Button variant="outline" className="rounded-full" onClick={handleInvoice} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Invoice
            </Button>
          )}
          {order.canCancel && (
            <Button variant="ghost" className="rounded-full text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4" /> Cancel order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <p className="mb-5 text-sm text-muted-foreground">{STATUS_META[order.status]?.note}</p>
            <OrderTimeline status={order.status} history={order.statusHistory} placedAt={order.placedAt} />
          </Panel>

          {order.trackingNumber && (
            <Panel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">{order.courier ? `Shipped with ${order.courier}` : 'Tracking number'}</p>
                    <p className="text-lg font-semibold tracking-wide tabular-nums">{order.trackingNumber}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => copy(order.trackingNumber!)}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
              </div>
            </Panel>
          )}

          <Panel title={`Items (${order.itemCount})`}>
            <ul className="divide-y">
              {order.items.map((it) => {
                const options = [
                  ...it.customizations.map((c) => `${c.label}: ${c.value}`),
                  ...(it.customizations.length === 0 && it.selectedColorName ? [`Colour: ${it.selectedColorName}`] : []),
                  ...(it.customizations.length === 0 && it.customText ? [`“${it.customText}”`] : []),
                ]
                return (
                  <li key={it.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-sand">
                      {it.image && <Image src={it.image} alt={it.name} fill sizes="80px" className="object-cover" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                        <p className="font-medium">
                          {it.productSlug ? (
                            <Link href={`/product/${it.productSlug}`} className="hover:text-primary">
                              {it.name}
                            </Link>
                          ) : (
                            it.name
                          )}
                        </p>
                        <p className="shrink-0 font-semibold tabular-nums">{formatPrice(it.lineTotal)}</p>
                      </div>
                      {options.length > 0 && <p className="mt-1 text-[13px] text-muted-foreground">{options.join(' · ')}</p>}
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        Qty {it.quantity} × {formatPrice(it.unitPrice)}
                        {it.sku && <span className="ml-2 text-xs text-muted-foreground/80">SKU {it.sku}</span>}
                      </p>
                      {it.productSlug && order.status === 'delivered' && (
                        <Link href={`/product/${it.productSlug}`} className="mt-2 inline-flex text-[13px] font-semibold text-primary hover:underline">
                          Buy it again
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          {order.statusHistory.length > 0 && (
            <Panel title="Activity">
              <ol className="space-y-4">
                {[...order.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', i === 0 ? 'bg-primary' : 'bg-border')} />
                    <div className="text-sm">
                      <p className="font-medium">{STATUS_META[h.status]?.label ?? h.status.replace(/_/g, ' ')}</p>
                      {h.note && <p className="text-muted-foreground">{h.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel title="Order summary">
            <Row label="Subtotal" value={formatPrice(order.subtotal)} />
            {order.discountAmount > 0 && (
              <Row label={order.couponCode ? `Discount (${order.couponCode})` : 'Discount'} value={`−${formatPrice(order.discountAmount)}`} tone="green" />
            )}
            <Row label="Shipping" value={order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Free'} tone={order.shippingCost > 0 ? undefined : 'green'} />
            {order.giftWrapCost > 0 && <Row label="Gift wrap" value={formatPrice(order.giftWrapCost)} />}
            <div className="my-2 border-t" />
            <Row label="Total" value={formatPrice(order.total)} strong />
            {order.taxAmount > 0 && <p className="mt-1 text-right text-xs text-muted-foreground">Includes {formatPrice(order.taxAmount)} GST</p>}
          </Panel>

          <Panel title="Payment">
            <p className="text-sm">
              <PaymentStatusText status={order.paymentStatus} method={order.paymentMethod} />
            </p>
            {order.paymentReference && (
              <p className="mt-1.5 break-all text-xs text-muted-foreground">Ref. {order.paymentReference}</p>
            )}
            {order.invoiceNumber && <p className="mt-1.5 text-xs text-muted-foreground">Invoice {order.invoiceNumber}</p>}
          </Panel>

          <Panel title="Delivery address">
            <AddressLines a={order.shippingAddress} />
            {order.shippingMethod && <p className="mt-3 text-xs capitalize text-muted-foreground">{order.shippingMethod} delivery</p>}
          </Panel>

          <Panel title="Billing address">
            {billingSame ? <p className="text-sm text-muted-foreground">Same as delivery address</p> : <AddressLines a={order.billingAddress!} />}
          </Panel>

          {order.giftWrap && (
            <Panel title="Gift">
              <p className="flex items-start gap-2 text-sm">
                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{order.giftMessage ? `“${order.giftMessage}”` : 'Gift wrapped, no message'}</span>
              </p>
            </Panel>
          )}

          <Panel>
            <div className="flex items-start gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Need help with this order?</p>
                <p className="mt-0.5 text-muted-foreground">We usually reply within 1–2 business days.</p>
                <Link href={`/contact?order=${order.orderNumber}`} className="mt-2 inline-flex font-semibold text-primary hover:underline">
                  Contact us
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {order.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              {order.paymentStatus === 'paid'
                ? 'Your payment will be refunded to the original method, usually within 5–7 business days.'
                : 'We won’t make or ship this order. This can’t be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Why are you cancelling?</p>
            <div className="grid gap-2">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors', reason === r ? 'border-primary bg-primary/5' : 'hover:border-primary/40')}>
                  <input type="radio" name="reason" className="accent-[var(--primary)]" checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            {reason === 'Other' && (
              <Textarea value={otherReason} onChange={(e) => setOtherReason(e.target.value.slice(0, 300))} placeholder="Tell us a little more (optional)" rows={3} className="rounded-xl" />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={cancelling}>
              Keep order
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault()
                handleCancel()
              }}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
