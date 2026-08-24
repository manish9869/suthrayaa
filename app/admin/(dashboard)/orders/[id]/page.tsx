'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft } from 'lucide-react'
import { getAdminOrder, updateOrderStatus } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'

const STATUSES = ['pending_payment', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded']

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const load = () => {
    setLoading(true)
    getAdminOrder(params.id)
      .then(setOrder)
      .finally(() => setLoading(false))
  }

  useEffect(load, [params.id])

  const handleStatusChange = async (status: string) => {
    setUpdating(true)
    try {
      await updateOrderStatus(params.id, status)
      toast.success('Order status updated')
      load()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>
  if (!order) return <p className="text-muted-foreground">Order not found</p>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-bold">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Placed {order.placedAt ? new Date(order.placedAt).toLocaleString('en-IN') : '—'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {order.items.map((item: any) => (
                <div key={item.id} className="py-3 flex gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {item.selectedColor && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.selectedColor }} />
                        </span>
                      )}
                      {item.customText && <span>&quot;{item.customText}&quot;</span>}
                      <span>× {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-medium text-sm">{formatPrice(item.lineTotal)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">
                {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
              </p>
              <p>{order.shippingAddress?.addressLine1}</p>
              {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
              </p>
              <p className="text-muted-foreground">{order.shippingAddress?.phone}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.statusHistory?.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium capitalize">{h.status.replace('_', ' ')}</p>
                    {h.note && <p className="text-muted-foreground text-xs">{h.note}</p>}
                    <p className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={order.status} onValueChange={handleStatusChange} disabled={updating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <Badge variant={order.paymentStatus === 'paid' ? 'secondary' : 'outline'}>{order.paymentStatus}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-mint-foreground">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              {order.giftWrapCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gift Wrap</span>
                  <span>{formatPrice(order.giftWrapCost)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
