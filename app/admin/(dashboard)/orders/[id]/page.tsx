'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, FileText, Mail, RefreshCw, Download } from 'lucide-react'
import {
  getAdminOrder,
  updateOrderStatus,
  updateOrderNotes,
  emailInvoice,
  regenerateInvoice,
  fetchInvoicePdfBlob,
  type AdminOrderDetail,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'

const STATUSES = [
  'pending_payment',
  'confirmed',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'partially_refunded',
]
const STATUS_LABELS: Record<string, string> = { in_production: 'Making', pending_payment: 'Pending Payment' }

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [tracking, setTracking] = useState('')
  const [courier, setCourier] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [invoiceBusy, setInvoiceBusy] = useState(false)

  const load = () => {
    setLoading(true)
    getAdminOrder(params.id)
      .then((o) => {
        setOrder(o)
        setTracking(o.trackingNumber ?? '')
        setCourier(o.courier ?? '')
        setAdminNotes(o.adminNotes ?? '')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [params.id])

  const handleStatusChange = async (status: string) => {
    setUpdating(true)
    try {
      await updateOrderStatus(params.id, status, undefined, tracking || undefined, courier || undefined)
      toast.success('Order status updated')
      load()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveShippingDetails = async () => {
    setUpdating(true)
    try {
      await updateOrderStatus(params.id, order!.status, undefined, tracking || undefined, courier || undefined)
      toast.success('Shipping details saved')
      load()
    } catch {
      toast.error('Failed to save shipping details')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await updateOrderNotes(params.id, { adminNotes })
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleEmailInvoice = async () => {
    setInvoiceBusy(true)
    try {
      await emailInvoice(params.id)
      toast.success('Invoice emailed to customer')
    } catch {
      toast.error('Failed to email invoice')
    } finally {
      setInvoiceBusy(false)
    }
  }

  const handleViewInvoice = async () => {
    setInvoiceBusy(true)
    try {
      const blob = await fetchInvoicePdfBlob(params.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      toast.error('Failed to load invoice PDF')
    } finally {
      setInvoiceBusy(false)
    }
  }

  const handleRegenerateInvoice = async () => {
    setInvoiceBusy(true)
    try {
      await regenerateInvoice(params.id)
      toast.success('Invoice PDF regenerated')
      load()
    } catch {
      toast.error('Failed to regenerate invoice')
    } finally {
      setInvoiceBusy(false)
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
            {order.isCustomOrder && <Badge variant="secondary" className="ml-2 text-xs">Custom Order</Badge>}
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
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                    {item.customizations.length > 0 ? (
                      <div className="mt-1.5 space-y-0.5">
                        {item.customizations.map((c, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{c.label}:</span> {c.valueLabel ?? c.textValue}
                            {c.priceAdjustment !== 0 && ` (${c.priceAdjustment > 0 ? '+' : ''}${formatPrice(c.priceAdjustment)})`}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {item.selectedColor && <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.selectedColor }} />}
                        {item.customText && <span>&quot;{item.customText}&quot;</span>}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}</p>
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
              <p className="text-muted-foreground">{order.guestEmail}</p>
              {order.customerNotes && (
                <p className="text-muted-foreground pt-2 border-t mt-2">
                  <span className="font-medium text-foreground">Customer note:</span> {order.customerNotes}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Courier</Label>
                  <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tracking Number</Label>
                  <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleSaveShippingDetails} disabled={updating}>
                Save
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes — not visible to the customer" />
              <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes}>
                Save Notes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.statusHistory?.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium capitalize">{STATUS_LABELS[h.status] ?? h.status.replace(/_/g, ' ')}</p>
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
                      {STATUS_LABELS[s] ?? s.replace(/_/g, ' ')}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.invoiceNumber ? (
                <p className="text-sm text-muted-foreground">{order.invoiceNumber}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not generated yet.</p>
              )}
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={handleViewInvoice} disabled={invoiceBusy}>
                  <Download className="h-3.5 w-3.5 mr-2" /> View / Download PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleEmailInvoice} disabled={invoiceBusy}>
                  <Mail className="h-3.5 w-3.5 mr-2" /> Email Invoice
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerateInvoice} disabled={invoiceBusy}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Regenerate PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
