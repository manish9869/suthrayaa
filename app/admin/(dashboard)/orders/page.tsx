'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DualRangeSlider } from '@/components/ui/dual-range-slider'
import { Search, SlidersHorizontal, Sparkles, RefreshCw, Download, Mail, FileDown, ShoppingCart, IndianRupee, Clock, XCircle, Eye, Copy, X } from 'lucide-react'
import {
  getAdminOrders,
  exportAdminOrdersCsv,
  fetchInvoicePdfBlob,
  emailInvoice,
  type AdminOrderSummary,
  type AdminOrderListParams,
  type AdminOrderListStats,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { DateRangeFilter, dateRangeToParams, type DateRangeValue } from '@/components/admin/date-range-filter'
import { StatCard } from '@/components/admin/stat-card'
import { StatusDot, DOT_CLASSES, type DotTone } from '@/components/admin/status-dot'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { toast } from 'sonner'
import { SortableTh } from '@/components/admin/sortable-th'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { TableLoadingRow } from '@/components/admin/loading-state'
import type { SortDirection } from '@/lib/hooks/use-sortable-data'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { ApiError } from '@/lib/api/http'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { OrderPreviewSheet } from '@/components/admin/order-preview-sheet'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/admin/page-header'

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
const STATUS_LABELS: Record<string, string> = { pending_payment: 'Pending Payment', in_production: 'Making' }
const statusLabel = (s: string) => STATUS_LABELS[s] ?? s.replace(/_/g, ' ')
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}
const ALL_TIME: DateRangeValue = { days: 3650, label: 'Any time' }

const PAGE_SIZE = 20
type SortKey = NonNullable<AdminOrderListParams['sort']>

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<AdminOrderListStats>({ revenue: 0, paid: 0, pendingPayment: 0, cancelledOrRefunded: 0, maxTotal: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const [status, setStatus] = useState<string>('all')
  const [paymentStatus, setPaymentStatus] = useState<string>('all')
  const [custom, setCustom] = useState<string>('all')
  const [placedRange, setPlacedRange] = useState<DateRangeValue>(ALL_TIME)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [direction, setDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)

  // The slider's upper bound comes from the largest order in the store (sent by the server)
  const maxTotal = Math.max(1000, Math.ceil(stats.maxTotal / 100) * 100)
  const [totalRange, setTotalRange] = useState<[number, number] | null>(null)
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, maxTotal])
  useEffect(() => setSliderRange(totalRange ?? [0, maxTotal]), [totalRange, maxTotal])

  const params: AdminOrderListParams = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
      paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
      custom: custom === 'all' ? undefined : custom === 'custom',
      ...dateRangeToParams(placedRange),
      minTotal: totalRange && totalRange[0] > 0 ? totalRange[0] : undefined,
      maxTotal: totalRange && totalRange[1] < maxTotal ? totalRange[1] : undefined,
      sort: sortKey,
      dir: direction,
    }),
    [debouncedSearch, status, paymentStatus, custom, placedRange, totalRange, maxTotal, sortKey, direction]
  )

  // Any filter or sort change starts again from page 1
  useEffect(() => setPage(1), [params])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAdminOrders({ ...params, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setOrders(res.items)
        setTotal(res.total)
        setStats(res.stats)
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load orders'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [params, page, reloadKey])
  const load = () => setReloadKey((k) => k + 1)

  const toggleSort = (key: string) => {
    if (key === sortKey) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key as SortKey)
      setDirection(key === 'order' || key === 'status' || key === 'payment' ? 'asc' : 'desc')
    }
  }
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
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

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAdminOrdersCsv(params)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const activeFilterCount =
    (status !== 'all' ? 1 : 0) +
    (paymentStatus !== 'all' ? 1 : 0) +
    (custom !== 'all' ? 1 : 0) +
    (placedRange.label !== ALL_TIME.label ? 1 : 0) +
    (totalRange && (totalRange[0] > 0 || totalRange[1] < maxTotal) ? 1 : 0)

  const clearFilters = () => {
    setStatus('all')
    setPaymentStatus('all')
    setCustom('all')
    setPlacedRange(ALL_TIME)
    setTotalRange(null)
  }

  return (
    <ProtectedRoute permission="orders.view">
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description={`${total.toLocaleString('en-IN')} order${total === 1 ? '' : 's'}${activeFilterCount || debouncedSearch ? ' match' : ''} · click a row for a quick look`}
        actions={
          <>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Can permission="orders.export">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={total === 0 || exporting}>
              <FileDown className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export'}
            </Button>
          </Can>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Orders" value={total.toLocaleString('en-IN')} subtitle={`${stats.paid.toLocaleString('en-IN')} paid`} tone="primary" />
        <StatCard icon={IndianRupee} label="Net revenue" value={formatPrice(stats.revenue)} subtitle="Collected, minus refunds" tone="mint" />
        <StatCard icon={Clock} label="Payment Pending" value={stats.pendingPayment} subtitle="COD to collect or awaiting payment" tone="gold" />
        <StatCard icon={XCircle} label="Cancelled / Refunded" value={stats.cancelledOrRefunded} tone="destructive" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-sm sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search order #, customer, tracking..." className="pl-10 h-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={custom} onValueChange={setCustom}>
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-36">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${custom === 'all' ? DOT_CLASSES.muted : DOT_CLASSES.primary}`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="custom">Custom Orders</SelectItem>
            <SelectItem value="standard">Standard Orders</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-40">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${status === 'all' ? DOT_CLASSES.muted : DOT_CLASSES[STATUS_DOT[status] ?? 'muted']}`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(STATUS_DOT) as (keyof typeof STATUS_DOT)[]).map((s) => (
              <SelectItem key={s} value={s}>
                <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[STATUS_DOT[s]]}`} />
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-40">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${paymentStatus === 'all' ? DOT_CLASSES.muted : DOT_CLASSES[PAYMENT_DOT[paymentStatus] ?? 'muted']}`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Payment</SelectItem>
            {(Object.keys(PAYMENT_DOT) as (keyof typeof PAYMENT_DOT)[]).map((s) => (
              <SelectItem key={s} value={s}>
                <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[PAYMENT_DOT[s]]}`} />
                {s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangeFilter value={placedRange} onChange={setPlacedRange} />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 rounded-xl font-normal">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              {totalRange && (totalRange[0] > 0 || totalRange[1] < maxTotal) ? `${formatPrice(totalRange[0])} – ${formatPrice(totalRange[1])}` : 'Any total'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <p className="text-sm font-medium mb-3">Order Total</p>
            <DualRangeSlider value={sliderRange} onValueChange={setSliderRange} onValueCommit={setTotalRange} min={0} max={maxTotal} step={50} />
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
              <span>{formatPrice(sliderRange[0])}</span>
              <span>{formatPrice(sliderRange[1])}</span>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1.5" /> Clear filters
          </Button>
        )}
      </div>

      <div className={cn(GLASS_PANEL, 'overflow-x-auto transition-opacity', loading && orders.length > 0 && 'opacity-60')} aria-busy={loading}>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTh label="Order" sortKey="order" activeKey={sortKey} direction={direction} onSort={toggleSort} className="pl-5" />
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <SortableTh label="Total" sortKey="total" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Payment" sortKey="payment" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <TableHead>Tracking</TableHead>
              <SortableTh label="Date" sortKey="date" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && orders.length === 0 ? (
              <TableLoadingRow colSpan={9} />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={load}>
                    <RefreshCw className="h-3.5 w-3.5" /> Try again
                  </Button>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {activeFilterCount || debouncedSearch ? 'No orders match these filters' : 'No orders yet — they appear here as customers check out'}
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow
                  key={o.id}
                  onClick={(e) => {
                    // Row click opens the quick-look drawer; links/buttons inside keep their own behavior
                    if ((e.target as HTMLElement).closest('a,button')) return
                    setPreviewId(o.id)
                  }}
                  className={cn('cursor-pointer hover:bg-muted/50', previewId === o.id && 'bg-primary/5 hover:bg-primary/5')}
                >
                  <TableCell className="pl-5">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-primary flex items-center gap-1.5">
                      {o.orderNumber}
                      {o.isCustomOrder && (
                        <span title="Custom order">
                          <Sparkles className="h-3.5 w-3.5 text-violet" />
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {initialsOf(o.customerName ?? 'Guest') || '?'}
                      </span>
                      <span className={cn('max-w-[180px] truncate', !o.customerName && 'text-muted-foreground')}>{o.customerName ?? 'Guest'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.itemCount}</TableCell>
                  <TableCell className="font-medium">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <StatusDot label={o.paymentStatus.replace(/_/g, ' ')} tone={PAYMENT_DOT[o.paymentStatus] ?? 'muted'} />
                  </TableCell>
                  <TableCell>
                    <StatusDot label={statusLabel(o.status)} tone={STATUS_DOT[o.status] ?? 'muted'} />
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
                      <Can permission="orders.update">
                        <Button variant="ghost" size="icon" title="Email invoice to customer" disabled={busyOrderId === o.id} onClick={() => handleEmailInvoice(o.id)}>
                          <Mail className="h-4 w-4" />
                        </Button>
                      </Can>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataTablePagination page={Math.min(page, pageCount)} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <OrderPreviewSheet
        orderId={previewId}
        onOpenChange={(open) => !open && setPreviewId(null)}
        statusDot={STATUS_DOT}
        paymentDot={PAYMENT_DOT}
        statusLabel={statusLabel}
        onDownloadInvoice={handleDownloadInvoice}
        busy={busyOrderId === previewId}
      />
    </div>
    </ProtectedRoute>
  )
}
