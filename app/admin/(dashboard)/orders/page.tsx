'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DualRangeSlider } from '@/components/ui/dual-range-slider'
import { Search, SlidersHorizontal, Sparkles, RefreshCw, Download, Mail, FileDown, ShoppingCart, IndianRupee, Clock, XCircle, Eye, Copy } from 'lucide-react'
import { getAdminOrders, fetchInvoicePdfBlob, emailInvoice, type AdminOrderSummary } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { DateRangeFilter, type DateRangeValue } from '@/components/admin/date-range-filter'
import { StatCard } from '@/components/admin/stat-card'
import { StatusDot, type DotTone } from '@/components/admin/status-dot'
import { GLASS_PANEL, exportRowsToCsv } from '@/lib/admin-ui'
import { toast } from 'sonner'

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
const ALL_TIME: DateRangeValue = { days: 3650, label: 'Any time' }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [status, setStatus] = useState<string>('all')
  const [paymentStatus, setPaymentStatus] = useState<string>('all')
  const [custom, setCustom] = useState<string>('all')
  const [placedRange, setPlacedRange] = useState<DateRangeValue>(ALL_TIME)

  const maxTotal = useMemo(() => Math.max(1000, ...orders.map((o) => Math.ceil(o.total / 100) * 100)), [orders])
  const [totalRange, setTotalRange] = useState<[number, number]>([0, 100000])
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, 100000])
  useEffect(() => setSliderRange(totalRange), [totalRange])
  useEffect(() => {
    setTotalRange([0, maxTotal])
    setSliderRange([0, maxTotal])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length])

  const load = () => {
    setLoading(true)
    getAdminOrders({ limit: 300 })
      .then((res) => setOrders(res.items))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const sinceCutoff = useMemo(() => {
    if (placedRange.from) return new Date(placedRange.from).getTime()
    if (placedRange.days && placedRange.days < 3650) {
      const d = new Date()
      d.setDate(d.getDate() - placedRange.days)
      return d.getTime()
    }
    return null
  }, [placedRange])
  const untilCutoff = useMemo(() => (placedRange.to ? new Date(`${placedRange.to}T23:59:59`).getTime() : null), [placedRange])

  const filtered = useMemo(() => {
    let result = [...orders]
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (o) => o.orderNumber.toLowerCase().includes(q) || (o.customerName ?? '').toLowerCase().includes(q) || (o.trackingNumber ?? '').toLowerCase().includes(q)
      )
    }
    if (status !== 'all') result = result.filter((o) => o.status === status)
    if (paymentStatus !== 'all') result = result.filter((o) => o.paymentStatus === paymentStatus)
    if (custom !== 'all') result = result.filter((o) => (custom === 'custom' ? o.isCustomOrder : !o.isCustomOrder))
    if (sinceCutoff != null) result = result.filter((o) => new Date(o.createdAt).getTime() >= sinceCutoff)
    if (untilCutoff != null) result = result.filter((o) => new Date(o.createdAt).getTime() <= untilCutoff)
    result = result.filter((o) => o.total >= totalRange[0] && o.total <= totalRange[1])
    return result
  }, [orders, search, status, paymentStatus, custom, sinceCutoff, untilCutoff, totalRange])

  const stats = useMemo(() => {
    const paid = filtered.filter((o) => o.paymentStatus === 'paid')
    return {
      revenue: paid.reduce((sum, o) => sum + o.total, 0),
      paid: paid.length,
      pending: filtered.filter((o) => o.paymentStatus === 'pending').length,
      cancelledOrRefunded: filtered.filter((o) => ['cancelled', 'refunded', 'partially_refunded'].includes(o.status)).length,
    }
  }, [filtered])

  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
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
    } catch {
      toast.error('Failed to email invoice')
    } finally {
      setBusyOrderId(null)
    }
  }
  const handleCopyOrderNumber = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(orderNumber)
      toast.success('Order number copied to clipboard')
    } catch {
      toast.error('Failed to copy order number')
    }
  }

  const handleExport = () => {
    exportRowsToCsv(
      `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Tracking', 'Date'],
      filtered.map((o) => [
        o.orderNumber,
        o.customerName ?? 'Guest',
        o.itemCount,
        o.total,
        o.paymentStatus,
        o.status.replace(/_/g, ' '),
        o.trackingNumber ?? '',
        new Date(o.createdAt).toLocaleString('en-IN'),
      ])
    )
  }

  const activeFilterCount =
    (status !== 'all' ? 1 : 0) +
    (paymentStatus !== 'all' ? 1 : 0) +
    (custom !== 'all' ? 1 : 0) +
    (placedRange.label !== ALL_TIME.label ? 1 : 0) +
    (totalRange[0] > 0 || totalRange[1] < maxTotal ? 1 : 0)

  const clearFilters = () => {
    setStatus('all')
    setPaymentStatus('all')
    setCustom('all')
    setPlacedRange(ALL_TIME)
    setTotalRange([0, maxTotal])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {orders.length} orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <FileDown className="h-3.5 w-3.5 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label={`Shown of ${orders.length}`} value={filtered.length} tone="primary" />
        <StatCard icon={IndianRupee} label="Revenue (shown)" value={formatPrice(stats.revenue)} tone="mint" />
        <StatCard icon={Clock} label="Pending Payment" value={stats.pending} tone="gold" />
        <StatCard icon={XCircle} label="Cancelled / Refunded" value={stats.cancelledOrRefunded} tone="destructive" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search order #, customer, tracking..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">{activeFilterCount}</Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-sm">Order Type</Label>
                <Select value={custom} onValueChange={setCustom}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="custom">Custom Orders</SelectItem>
                    <SelectItem value="standard">Standard Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Order Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
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
                    <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Payment Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Placed On</Label>
                <DateRangeFilter value={placedRange} onChange={setPlacedRange} />
              </div>
              <div className="space-y-3">
                <Label className="text-sm">Order Total</Label>
                <DualRangeSlider value={sliderRange} onValueChange={setSliderRange} onValueCommit={setTotalRange} min={0} max={maxTotal} step={50} />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatPrice(sliderRange[0])}</span>
                  <span>{formatPrice(sliderRange[1])}</span>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="outline" className="w-full" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className={`${GLASS_PANEL} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No orders match these filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline flex items-center gap-1.5">
                      {o.orderNumber}
                      {o.isCustomOrder && (
                        <span title="Custom order">
                          <Sparkles className="h-3.5 w-3.5 text-secondary" />
                        </span>
                      )}
                    </Link>
                    <span className="text-xs text-muted-foreground">{o.customerName ?? 'Guest'}</span>
                  </TableCell>
                  <TableCell>{o.itemCount}</TableCell>
                  <TableCell>{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <StatusDot label={o.paymentStatus} tone={PAYMENT_DOT[o.paymentStatus] ?? 'muted'} />
                  </TableCell>
                  <TableCell>
                    <StatusDot label={o.status.replace(/_/g, ' ')} tone={STATUS_DOT[o.status] ?? 'muted'} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{o.trackingNumber ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="View order" asChild>
                        <Link href={`/admin/orders/${o.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Copy order number" onClick={() => handleCopyOrderNumber(o.orderNumber)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Download invoice PDF" disabled={busyOrderId === o.id} onClick={() => handleDownloadInvoice(o.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Email invoice to customer" disabled={busyOrderId === o.id} onClick={() => handleEmailInvoice(o.id)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
