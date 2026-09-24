'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot, type DotTone } from '@/components/admin/status-dot'
import { getAdminOrder, type AdminOrderDetail } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { ArrowUpRight, Download, Mail, MapPin, Package, Phone, Sparkles, Truck } from 'lucide-react'

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/** Right-hand quick-look drawer for an order: customer, items and totals at a glance, with
 * shortcuts to the full order page and the invoice — so scanning a queue of orders doesn't
 * need a full page navigation per row. */
export function OrderPreviewSheet({
  orderId,
  onOpenChange,
  statusDot,
  paymentDot,
  statusLabel,
  onDownloadInvoice,
  busy,
}: {
  orderId: string | null
  onOpenChange: (open: boolean) => void
  statusDot: Record<string, DotTone>
  paymentDot: Record<string, DotTone>
  statusLabel: (status: string) => string
  onDownloadInvoice: (orderId: string) => void
  busy?: boolean
}) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    setOrder(null)
    setError(false)
    getAdminOrder(orderId)
      .then((o) => !cancelled && setOrder(o))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [orderId])

  const name =
    order?.customerName ??
    ([order?.shippingAddress?.firstName, order?.shippingAddress?.lastName].filter(Boolean).join(' ') || 'Guest')
  const email = order?.guestEmail
  const phone = order?.shippingAddress?.phone

  return (
    <Sheet open={!!orderId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 bg-card p-0 sm:max-w-md [&>button]:top-5 [&>button]:right-5 [&>button]:!bg-transparent">
        <div className="border-b px-6 pt-5 pb-4">
          <SheetTitle className="text-lg font-semibold tracking-tight">{order ? `Order ${order.orderNumber}` : 'Order'}</SheetTitle>
          <SheetDescription asChild>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {order ? (
                <>
                  <StatusDot label={order.paymentStatus.replace(/_/g, ' ')} tone={paymentDot[order.paymentStatus] ?? 'muted'} />
                  <StatusDot label={statusLabel(order.status)} tone={statusDot[order.status] ?? 'muted'} />
                  <span>
                    {new Date(order.placedAt ?? order.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </>
              ) : (
                <span>{error ? 'Could not load this order' : 'Loading…'}</span>
              )}
            </div>
          </SheetDescription>
        </div>

        {!order && !error ? (
          <div className="space-y-4 p-6">
            <Skeleton className="mx-auto h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto h-4 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : order ? (
          <>
            <div className="flex-1 overflow-y-auto">
              {/* Customer */}
              <div className="flex flex-col items-center border-b px-6 py-5 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-lg font-semibold text-primary-foreground">
                  {initialsOf(name) || '?'}
                </span>
                <p className="mt-2.5 font-semibold">{name}</p>
                {!order.customerName && <p className="text-xs text-muted-foreground">Guest checkout</p>}
                <div className="mt-3 flex items-center gap-2">
                  {email && (
                    <Button asChild variant="outline" size="icon" className="rounded-full" title={email}>
                      <a href={`mailto:${email}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {phone && (
                    <Button asChild variant="outline" size="icon" className="rounded-full" title={phone}>
                      <a href={`tel:${phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="px-6 py-5">
                <p className="mb-3 text-sm font-semibold">
                  Order items <span className="font-normal text-muted-foreground">· {order.itemCount}</span>
                </p>
                <ul className="space-y-3">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                        ) : (
                          <Package className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatPrice(item.unitPrice)}
                          {item.customizations.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-violet">
                              <Sparkles className="h-3 w-3" /> Custom
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatPrice(item.lineTotal)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shipping */}
              {order.shippingAddress?.addressLine1 && (
                <div className="mx-6 mb-5 rounded-xl bg-muted/60 p-4 text-[13px]">
                  <p className="mb-1 flex items-center gap-1.5 font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Ship to
                  </p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.addressLine1}
                    {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}, {order.shippingAddress.city},{' '}
                    {order.shippingAddress.state} {order.shippingAddress.pincode}
                  </p>
                  {order.trackingNumber && (
                    <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" /> {order.courier ? `${order.courier} · ` : ''}
                      <span className="font-medium text-foreground">{order.trackingNumber}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Totals */}
              <dl className="mx-6 mb-6 space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular-nums text-mint">−{formatPrice(order.discountAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="tabular-nums">{order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Free'}</dd>
                </div>
                {order.giftWrapCost > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Gift wrap</dt>
                    <dd className="tabular-nums">{formatPrice(order.giftWrapCost)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="border-t px-6 py-4">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatPrice(order.total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className="h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  <Link href={`/admin/orders/${order.id}`}>
                    Open order <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" className="h-11 rounded-xl" disabled={busy} onClick={() => onDownloadInvoice(order.id)}>
                  Invoice <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
