'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Wallet,
  TrendingUp,
  XCircle,
  RotateCcw,
  MapPin,
  Download,
  Send,
  History,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  getAdminCustomer,
  getCustomerEmails,
  emailInvoice,
  fetchInvoicePdfBlob,
  regenerateInvoice,
  retryEmailLog,
  type AdminCustomerDetail,
  type AdminEmailLog,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'
import { StatCard, type StatTone } from '@/components/admin/stat-card'
import { StatusDot, type DotTone } from '@/components/admin/status-dot'

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
const PAYMENT_DOT: Record<string, DotTone> = {
  paid: 'mint',
  pending: 'gold',
  failed: 'destructive',
  refunded: 'muted',
  partially_refunded: 'muted',
}
const EMAIL_STATUS_DOT: Record<string, DotTone> = {
  sent: 'mint',
  failed: 'destructive',
  pending: 'gold',
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null)
  const [emails, setEmails] = useState<AdminEmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const load = () => {
    setLoading(true)
    Promise.all([getAdminCustomer(params.id), getCustomerEmails(params.id)])
      .then(([c, e]) => {
        setCustomer(c)
        setEmails(e)
      })
      .finally(() => setLoading(false))
  }
  useEffect(load, [params.id])

  const filteredOrders = useMemo(() => {
    if (!customer) return []
    return customer.orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false
      return true
    })
  }, [customer, statusFilter, paymentFilter])

  const handleDownloadInvoice = async (orderId: string) => {
    setBusyOrderId(orderId)
    try {
      const blob = await fetchInvoicePdfBlob(orderId)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      toast.error('Failed to load invoice PDF')
    } finally {
      setBusyOrderId(null)
    }
  }

  const handleEmailInvoice = async (orderId: string) => {
    setBusyOrderId(orderId)
    try {
      await emailInvoice(orderId)
      toast.success('Invoice emailed to customer')
      load()
    } catch {
      toast.error('Failed to email invoice')
    } finally {
      setBusyOrderId(null)
    }
  }

  const handleRegenerateInvoice = async (orderId: string) => {
    setBusyOrderId(orderId)
    try {
      await regenerateInvoice(orderId)
      toast.success('Invoice regenerated')
    } catch {
      toast.error('Failed to regenerate invoice')
    } finally {
      setBusyOrderId(null)
    }
  }

  const handleResendEmail = async (id: string) => {
    setRetryingEmailId(id)
    try {
      await retryEmailLog(id)
      toast.success('Email resent')
      load()
    } catch {
      toast.error('Failed to resend email')
    } finally {
      setRetryingEmailId(null)
    }
  }

  if (loading && !customer) return <p className="text-muted-foreground">Loading...</p>
  if (!customer) return <p className="text-muted-foreground">Customer not found</p>

  const fullName = customer.firstName || customer.lastName ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Unnamed Customer'

  const stats: { label: string; value: string; icon: typeof ShoppingBag; tone: StatTone }[] = [
    { label: 'Total Orders', value: String(customer.stats.orderCount), icon: ShoppingBag, tone: 'primary' },
    { label: 'Total Spent', value: formatPrice(customer.stats.totalSpent), icon: Wallet, tone: 'mint' },
    { label: 'Avg Order Value', value: formatPrice(customer.stats.avgOrderValue), icon: TrendingUp, tone: 'gold' },
    { label: 'Failed Orders', value: String(customer.stats.failedOrderCount), icon: XCircle, tone: 'destructive' },
    { label: 'Refunded Orders', value: String(customer.stats.refundedOrderCount), icon: RotateCcw, tone: 'violet' },
    {
      label: 'Last Order',
      value: customer.stats.lastOrderAt ? new Date(customer.stats.lastOrderAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
      icon: Calendar,
      tone: 'primary',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            {fullName}
            {customer.marketingOptIn && (
              <Badge variant="outline" className="text-xs font-normal">
                <Sparkles className="h-3 w-3 mr-1" /> Marketing opt-in
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {customer.email}
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {customer.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Order History</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_production">Making</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No orders match these filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>
                            <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                              {o.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell>{o.itemCount}</TableCell>
                          <TableCell>{formatPrice(o.total)}</TableCell>
                          <TableCell>
                            <StatusDot label={o.paymentStatus} tone={PAYMENT_DOT[o.paymentStatus] ?? 'muted'} />
                          </TableCell>
                          <TableCell>
                            <StatusDot label={o.status.replace(/_/g, ' ')} tone={STATUS_DOT[o.status] ?? 'muted'} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Download invoice PDF"
                                disabled={busyOrderId === o.id}
                                onClick={() => handleDownloadInvoice(o.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Email invoice to customer"
                                disabled={busyOrderId === o.id}
                                onClick={() => handleEmailInvoice(o.id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Regenerate invoice"
                                disabled={busyOrderId === o.id}
                                onClick={() => handleRegenerateInvoice(o.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-secondary" /> Email History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No emails sent to this customer yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      emails.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{l.type.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-sm truncate max-w-[200px]">{l.subject}</TableCell>
                          <TableCell>
                            {l.orderId ? (
                              <Link href={`/admin/orders/${l.orderId}`} className="text-primary hover:underline text-xs">
                                View order
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusDot label={l.status} tone={EMAIL_STATUS_DOT[l.status] ?? 'muted'} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(l.sentAt).toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Resend"
                              disabled={retryingEmailId === l.id}
                              onClick={() => handleResendEmail(l.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-secondary" /> Addresses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved addresses</p>
              ) : (
                customer.addresses.map((a, i) => (
                  <div key={a.id}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div className="text-sm space-y-0.5">
                      <p className="font-medium flex items-center gap-2">
                        {a.first_name} {a.last_name}
                        {a.is_default && (
                          <Badge variant="outline" className="text-[10px]">
                            Default
                          </Badge>
                        )}
                        {a.label && <span className="text-xs text-muted-foreground font-normal">({a.label})</span>}
                      </p>
                      <p className="text-muted-foreground">{a.address_line1}</p>
                      {a.address_line2 && <p className="text-muted-foreground">{a.address_line2}</p>}
                      <p className="text-muted-foreground">
                        {a.city}, {a.state} {a.pincode}
                      </p>
                      <p className="text-muted-foreground">{a.phone}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
