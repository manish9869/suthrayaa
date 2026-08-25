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
import {
  ArrowLeft,
  FileText,
  Mail,
  RefreshCw,
  Download,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  IndianRupee,
  Package,
  CreditCard,
  Truck,
  History,
  Send,
} from 'lucide-react'
import {
  getAdminOrder,
  updateOrderStatus,
  updateOrderNotes,
  emailInvoice,
  regenerateInvoice,
  fetchInvoicePdfBlob,
  sendOrderEmail,
  ORDER_EMAIL_TYPE_LABELS,
  type AdminOrderDetail,
  type OrderEmailType,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'
import { PageLoader } from '@/components/admin/loading-state'
import { StatusDot, type DotTone } from '@/components/admin/status-dot'
import { StatCard } from '@/components/admin/stat-card'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'

const PAYMENT_DOT: Record<string, DotTone> = {
  paid: 'mint',
  pending: 'gold',
  failed: 'destructive',
  refunded: 'muted',
  partially_refunded: 'muted',
}
const STATUS_DOT: Record<string, DotTone> = {
  pending_payment: 'muted',
  confirmed: 'gold',
  in_production: 'gold',
  ready: 'gold',
  shipped: 'primary',
  delivered: 'mint',
  cancelled: 'destructive',
  refunded: 'destructive',
  partially_refunded: 'destructive',
}

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
  const [emailType, setEmailType] = useState<OrderEmailType>('order_shipped')
  const [sendingEmail, setSendingEmail] = useState(false)

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

  const handleSendEmail = async () => {
    setSendingEmail(true)
    try {
      await sendOrderEmail(params.id, emailType)
      toast.success(`${ORDER_EMAIL_TYPE_LABELS[emailType]} email sent`)
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) return <PageLoader />
  if (!order) return <p className="text-muted-foreground">Order not found</p>

  return (
    <ProtectedRoute permission="orders.view">
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            {order.orderNumber}
            {order.isCustomOrder && (
              <Badge variant="secondary" className="text-xs">
                Custom Order
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">Placed {order.placedAt ? new Date(order.placedAt).toLocaleString('en-IN') : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={IndianRupee} label="Order Total" value={formatPrice(order.total)} tone="primary" />
        <StatCard icon={Package} label="Items" value={order.itemCount} subtitle={`${order.items.length} line item${order.items.length === 1 ? '' : 's'}`} tone="gold" />
        <StatCard
          icon={CreditCard}
          label="Payment"
          value={<StatusDot label={order.paymentStatus} tone={PAYMENT_DOT[order.paymentStatus] ?? 'muted'} className="text-lg font-bold" />}
          tone={PAYMENT_DOT[order.paymentStatus] === 'destructive' ? 'destructive' : PAYMENT_DOT[order.paymentStatus] === 'mint' ? 'mint' : 'gold'}
        />
        <StatCard
          icon={Truck}
          label="Fulfilment"
          value={<StatusDot label={STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ')} tone={STATUS_DOT[order.status] ?? 'muted'} className="text-lg font-bold" />}
          tone="violet"
        />
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
              <Can permission="orders.update">
                <Button size="sm" variant="outline" onClick={handleSaveShippingDetails} disabled={updating}>
                  Save
                </Button>
              </Can>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes — not visible to the customer" />
              <Can permission="orders.update">
                <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes}>
                  Save Notes
                </Button>
              </Can>
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
              <Can anyOf={['orders.update', 'orders.cancel', 'orders.refund']}>
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
              </Can>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <StatusDot label={order.paymentStatus} tone={PAYMENT_DOT[order.paymentStatus] ?? 'muted'} />
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
                <div className="flex justify-between text-mint">
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
              {order.paymentStatus === 'paid' ? (
                <div className="flex items-center gap-2 rounded-lg bg-mint/10 text-mint px-3 py-2 text-xs font-medium mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> Fully paid — no balance due.
                </div>
              ) : order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded' ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted text-muted-foreground px-3 py-2 text-xs font-medium mt-1">
                  <RotateCcw className="h-3.5 w-3.5 flex-shrink-0" />
                  {order.paymentStatus === 'refunded' ? 'Fully refunded.' : 'Partially refunded.'}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-gold/10 text-gold px-3 py-2 text-xs font-medium mt-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {formatPrice(order.total)} balance due — payment {order.paymentStatus}.
                </div>
              )}
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
                <Can permission="orders.update">
                  <Button variant="outline" size="sm" onClick={handleEmailInvoice} disabled={invoiceBusy}>
                    <Mail className="h-3.5 w-3.5 mr-2" /> Email Invoice
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRegenerateInvoice} disabled={invoiceBusy}>
                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Regenerate PDF
                  </Button>
                </Can>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Send Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Manually send a lifecycle email to the customer — independent of the order&apos;s current status.
              </p>
              <Select value={emailType} onValueChange={(v) => setEmailType(v as OrderEmailType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_EMAIL_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Can permission="orders.update">
                <Button variant="outline" size="sm" className="w-full" onClick={handleSendEmail} disabled={sendingEmail}>
                  <Send className="h-3.5 w-3.5 mr-2" /> {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </Can>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
