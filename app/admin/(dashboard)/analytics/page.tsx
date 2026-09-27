'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts'
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Package,
  FileDown,
  Printer,
  Boxes,
  AlertTriangle,
  RefreshCw,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/admin/page-header'
import { StatCard, ChangeBadge } from '@/components/admin/stat-card'
import { StatusDot } from '@/components/admin/status-dot'
import { SegmentedControl } from '@/components/admin/segmented-control'
import { DateRangeFilter, DEFAULT_DATE_RANGE, type DateRangeValue } from '@/components/admin/date-range-filter'
import { ReportTable, type ReportColumn } from '@/components/admin/report-table'
import { EmptyState } from '@/components/admin/admin-bits'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { getAnalyticsReport, downloadReportCsv, type AnalyticsReport, type ReportExportSection, type DateRangeParams } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { cn } from '@/lib/utils'

type Report = AnalyticsReport

const QUICK_RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: '365', label: '1Y' },
]
const QUICK_LABELS: Record<string, string> = { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months' }

const PAYMENT_METHOD_LABELS: Record<string, string> = { razorpay: 'Online (Razorpay)', cod: 'Cash on Delivery', upi: 'UPI', card: 'Card' }
const ATTEMPT_LABELS: Record<string, string> = {
  paid: 'Paid',
  pending: 'Pending / abandoned',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partly refunded',
}

const n = (v: number) => v.toLocaleString('en-IN')
const pct = (v: number) => `${v.toFixed(1)}%`
const fmtDate = (ymd: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN', opts)

// ---- Table column definitions (module-level so sort accessors stay stable) ----

const productColumns: ReportColumn<Report['products'][number]>[] = [
  {
    key: 'name',
    label: 'Product',
    sortValue: (r) => r.name,
    render: (r) =>
      r.productId ? (
        <Link href={`/admin/products/${r.productId}`} className="font-medium hover:text-primary">
          {r.name}
        </Link>
      ) : (
        <span className="font-medium">{r.name}</span>
      ),
  },
  { key: 'sku', label: 'SKU', sortValue: (r) => r.sku, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.sku ?? '—'}</span> },
  { key: 'units', label: 'Units', align: 'right', sortValue: (r) => r.unitsSold, render: (r) => n(r.unitsSold) },
  { key: 'orders', label: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => n(r.orders) },
  { key: 'revenue', label: 'Revenue', align: 'right', sortValue: (r) => r.revenue, render: (r) => formatPrice(r.revenue) },
]

const variantColumns: ReportColumn<Report['variants'][number]>[] = [
  { key: 'name', label: 'Product', sortValue: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'variant', label: 'Variant / options', sortValue: (r) => r.variant },
  { key: 'units', label: 'Units', align: 'right', sortValue: (r) => r.unitsSold, render: (r) => n(r.unitsSold) },
  { key: 'revenue', label: 'Revenue', align: 'right', sortValue: (r) => r.revenue, render: (r) => formatPrice(r.revenue) },
]

const couponColumns: ReportColumn<Report['coupons'][number]>[] = [
  { key: 'code', label: 'Code', sortValue: (r) => r.code, render: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span> },
  { key: 'orders', label: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => n(r.orders) },
  { key: 'discount', label: 'Discount given', align: 'right', sortValue: (r) => r.discount, render: (r) => formatPrice(r.discount) },
  { key: 'avg', label: 'Avg. discount', align: 'right', sortValue: (r) => r.avgDiscount, render: (r) => formatPrice(r.avgDiscount) },
  { key: 'sales', label: 'Order sales', align: 'right', sortValue: (r) => r.sales, render: (r) => formatPrice(r.sales) },
]

const refundColumns: ReportColumn<Report['refunds']['recent'][number]>[] = [
  { key: 'date', label: 'Date', sortValue: (r) => r.createdAt, render: (r) => new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
  {
    key: 'order',
    label: 'Order',
    sortValue: (r) => r.orderNumber,
    render: (r) => (
      <Link href={`/admin/orders/${r.orderId}`} className="font-mono text-xs font-medium hover:text-primary">
        {r.orderNumber ?? '—'}
      </Link>
    ),
  },
  { key: 'method', label: 'Method', sortValue: (r) => r.method, render: (r) => (r.method === 'razorpay' ? 'Razorpay' : 'Manual') },
  { key: 'reason', label: 'Reason', render: (r) => <span className="line-clamp-1 max-w-[260px] text-muted-foreground">{r.reason ?? '—'}</span> },
  { key: 'amount', label: 'Amount', align: 'right', sortValue: (r) => r.amount, render: (r) => formatPrice(r.amount) },
]

const customerColumns: ReportColumn<Report['customers']['topCustomers'][number]>[] = [
  {
    key: 'name',
    label: 'Customer',
    sortValue: (r) => r.name,
    render: (r) => (
      <div className="min-w-0">
        {r.customerId ? (
          <Link href={`/admin/customers/${r.customerId}`} className="font-medium hover:text-primary">
            {r.name}
          </Link>
        ) : (
          <span className="font-medium">
            {r.name} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">Guest</span>
          </span>
        )}
        {r.email && <p className="truncate text-xs text-muted-foreground">{r.email}</p>}
      </div>
    ),
  },
  { key: 'type', label: 'Type', sortValue: (r) => (r.returning ? 1 : 0), render: (r) => <StatusDot label={r.returning ? 'Returning' : 'First order'} tone={r.returning ? 'primary' : 'mint'} /> },
  { key: 'orders', label: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => n(r.orders) },
  { key: 'spent', label: 'Net spent', align: 'right', sortValue: (r) => r.spent, render: (r) => formatPrice(r.spent) },
]

const gstColumns: ReportColumn<Report['tax'][number]>[] = [
  { key: 'state', label: 'Place of supply', sortValue: (r) => r.state, render: (r) => <span className="font-medium">{r.state}</span> },
  { key: 'orders', label: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => n(r.orders) },
  { key: 'taxable', label: 'Taxable value', align: 'right', sortValue: (r) => r.taxableValue, render: (r) => formatPrice(r.taxableValue) },
  { key: 'cgst', label: 'CGST', align: 'right', sortValue: (r) => r.cgst, render: (r) => formatPrice(r.cgst) },
  { key: 'sgst', label: 'SGST', align: 'right', sortValue: (r) => r.sgst, render: (r) => formatPrice(r.sgst) },
  { key: 'igst', label: 'IGST', align: 'right', sortValue: (r) => r.igst, render: (r) => formatPrice(r.igst) },
  { key: 'tax', label: 'Total tax', align: 'right', sortValue: (r) => r.totalTax, render: (r) => formatPrice(r.totalTax) },
  { key: 'invoice', label: 'Invoice value', align: 'right', sortValue: (r) => r.invoiceValue, render: (r) => formatPrice(r.invoiceValue) },
]

const shippingColumns: ReportColumn<Report['shipping']['byState'][number]>[] = [
  { key: 'state', label: 'State', sortValue: (r) => r.state, render: (r) => <span className="font-medium">{r.state}</span> },
  { key: 'orders', label: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => n(r.orders) },
  { key: 'shipping', label: 'Shipping collected', align: 'right', sortValue: (r) => r.shippingCollected, render: (r) => formatPrice(r.shippingCollected) },
  { key: 'sales', label: 'Order value', align: 'right', sortValue: (r) => r.sales, render: (r) => formatPrice(r.sales) },
]

const inventoryColumns: ReportColumn<Report['inventory']['products'][number]>[] = [
  {
    key: 'name',
    label: 'Product',
    sortValue: (r) => r.name,
    render: (r) => (
      <Link href={`/admin/products/${r.id}`} className="font-medium hover:text-primary">
        {r.name}
      </Link>
    ),
  },
  { key: 'sku', label: 'SKU', sortValue: (r) => r.sku, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.sku ?? '—'}</span> },
  { key: 'status', label: 'Status', sortValue: (r) => r.status, render: (r) => <StatusDot label={r.status.replace(/_/g, ' ')} tone={r.status === 'active' ? 'mint' : 'muted'} /> },
  {
    key: 'stock',
    label: 'Stock',
    align: 'right',
    sortValue: (r) => (r.tracked ? r.stock : null),
    render: (r) =>
      !r.tracked ? (
        <span className="text-muted-foreground">Not tracked</span>
      ) : (
        <span className={cn(r.stock <= 0 ? 'font-semibold text-destructive' : r.stock <= r.lowStockThreshold && 'font-semibold text-gold')}>{n(r.stock)}</span>
      ),
  },
  { key: 'price', label: 'Price', align: 'right', sortValue: (r) => r.price, render: (r) => formatPrice(r.price) },
  { key: 'cost', label: 'Cost', align: 'right', sortValue: (r) => r.costPrice, render: (r) => (r.costPrice == null ? '—' : formatPrice(r.costPrice)) },
  { key: 'value', label: 'Stock value', align: 'right', sortValue: (r) => (r.tracked ? Math.max(0, r.stock) * r.price : null), render: (r) => (r.tracked ? formatPrice(Math.max(0, r.stock) * r.price) : '—') },
]

// ---- Small building blocks ----

function ExportButton({ section, params }: { section: ReportExportSection; params: DateRangeParams }) {
  const [busy, setBusy] = useState(false)
  return (
    <Can permission="analytics.export">
      <Button
        variant="ghost"
        size="sm"
        className="print:hidden"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await downloadReportCsv(section, params)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Export failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <FileDown className="h-3.5 w-3.5" /> {busy ? 'Exporting…' : 'CSV'}
      </Button>
    </Can>
  )
}

function Section({
  title,
  description,
  section,
  params,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  section?: ReportExportSection
  params: DateRangeParams
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('gap-4 break-inside-avoid', className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {section && (
          <CardAction>
            <ExportButton section={section} params={params} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** A figure with its previous-period value; for "bad when up" metrics the colour flips. */
function Metric({ label, value, previous, change, invert, hint }: { label: string; value: string; previous?: string; change?: number | null; invert?: boolean; hint?: string }) {
  return (
    <div className="rounded-xl border px-4 py-3" title={hint}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {previous !== undefined && (
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {change != null &&
            (invert ? (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', change > 0 ? 'bg-destructive/10 text-destructive' : 'bg-mint/10 text-mint')}>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
            ) : (
              <ChangeBadge change={change} />
            ))}
          <span>was {previous}</span>
        </p>
      )}
    </div>
  )
}

/** Horizontal share bars — for small ranked breakdowns (categories, payment methods, options). */
function ShareBars({ rows, format }: { rows: { key: string; label: string; value: number; meta?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{format(r.value)}</span>
              <span className="ml-2 text-muted-foreground">
                {total ? `${((r.value / total) * 100).toFixed(0)}%` : '—'}
                {r.meta && ` · ${r.meta}`}
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

type TrendMetric = 'revenue' | 'orders' | 'signups'
const TREND_METRICS: { value: TrendMetric; label: string }[] = [
  { value: 'revenue', label: 'Net revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'signups', label: 'Sign-ups' },
]
const TREND_COLOR: Record<TrendMetric, string> = { revenue: 'var(--primary)', orders: 'var(--violet)', signups: 'var(--teal)' }

function compactPrice(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1e7) return `₹${+(v / 1e7).toFixed(1)}Cr`
  if (abs >= 1e5) return `₹${+(v / 1e5).toFixed(1)}L`
  if (abs >= 1e3) return `₹${+(v / 1e3).toFixed(1)}K`
  return `₹${Math.round(v)}`
}

function TrendTooltip({ active, payload, metric }: TooltipProps<number, string> & { metric: TrendMetric }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as { date: string; value: number; paidOrders: number }
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      <p className="text-[11px] font-medium text-muted-foreground">{fmtDate(row.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{metric === 'revenue' ? formatPrice(row.value) : n(row.value)}</p>
      {metric === 'revenue' && <p className="text-xs text-muted-foreground tabular-nums">from {row.paidOrders} paid order{row.paidOrders === 1 ? '' : 's'}</p>}
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-[1.1rem]" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
      <Skeleton className="h-[380px] rounded-[1.1rem]" />
    </div>
  )
}

// ---- Page ----

export default function AnalyticsReportsPage() {
  const [range, setRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metric, setMetric] = useState<TrendMetric>('revenue')
  const [tab, setTab] = useState('sales')
  const [reloadKey, setReloadKey] = useState(0)

  const params: DateRangeParams = useMemo(() => (range.from && range.to ? { from: range.from, to: range.to } : { days: range.days }), [range])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAnalyticsReport(params)
      .then((r) => !cancelled && setReport(r))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load reports'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [params, reloadKey])

  const trend = useMemo(
    () =>
      (report?.series ?? []).map((d) => ({
        date: d.date,
        label: fmtDate(d.date),
        paidOrders: d.paidOrders,
        value: metric === 'revenue' ? d.revenue : metric === 'orders' ? d.orders : d.signups,
      })),
    [report, metric]
  )

  if (loading && !report && !error) return <ReportSkeleton />

  if (error && !report) {
    return (
      <ProtectedRoute permission="analytics.view">
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Reports couldn't load"
            description={error}
            action={
              <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            }
          />
        </Card>
      </ProtectedRoute>
    )
  }
  if (!report) return null

  const s = report.summary
  const p = report.previous
  const activeQuick = !range.from && range.days && QUICK_LABELS[String(range.days)] ? String(range.days) : null
  const prevLabel = `${fmtDate(report.range.previousFrom)} – ${fmtDate(report.range.previousTo, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const noSales = s.placedOrders === 0
  const gstTotals = report.tax.reduce(
    (t, r) => ({ orders: t.orders + r.orders, taxable: t.taxable + r.taxableValue, cgst: t.cgst + r.cgst, sgst: t.sgst + r.sgst, igst: t.igst + r.igst, tax: t.tax + r.totalTax, invoice: t.invoice + r.invoiceValue }),
    { orders: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, invoice: 0 }
  )
  const buyersTotal = Math.max(1, report.customers.buyers)
  const inv = report.inventory.summary

  return (
    <ProtectedRoute permission="analytics.view">
      <div className={cn('space-y-6 transition-opacity', loading && 'pointer-events-none opacity-60')}>
        <PageHeader
          title="Analytics & reports"
          description={
            <>
              {range.label} · compared with {prevLabel} · days in {report.range.timezone.replace('_', ' ')} time
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <SegmentedControl options={QUICK_RANGES} value={activeQuick} onChange={(v) => setRange({ days: Number(v), label: QUICK_LABELS[v] })} />
              <DateRangeFilter value={range} onChange={setRange} />
              <Button variant="outline" className="rounded-xl" onClick={() => window.print()} title="Print, or choose “Save as PDF” in the print dialog">
                <Printer className="h-4 w-4" /> Print / PDF
              </Button>
            </div>
          }
        />

        {/* Headline KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={IndianRupee}
            label="Net revenue"
            value={formatPrice(s.netRevenue)}
            change={report.changes.netRevenue}
            changeLabel="vs prev."
            trend={report.series.map((d) => d.revenue)}
            subtitle={`${formatPrice(s.grossSales)} gross · ${formatPrice(s.refunds)} refunded`}
            tone="primary"
          />
          <StatCard
            icon={ShoppingBag}
            label="Orders placed"
            value={n(s.placedOrders)}
            change={report.changes.placedOrders}
            changeLabel="vs prev."
            trend={report.series.map((d) => d.orders)}
            subtitle={`${n(s.paidOrders)} paid · ${n(s.codToCollectOrders)} COD to collect`}
            tone="violet"
          />
          <StatCard icon={TrendingUp} label="Avg. order value" value={formatPrice(s.avgOrderValue)} change={report.changes.avgOrderValue} changeLabel="vs prev." subtitle="Paid orders only" tone="gold" />
          <StatCard icon={Package} label="Units sold" value={n(s.unitsSold)} change={report.changes.unitsSold} changeLabel="vs prev." subtitle={`${n(report.customers.buyers)} buyers`} tone="accent" />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <div className="overflow-x-auto print:hidden">
            <TabsList>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="payments">Payments &amp; coupons</TabsTrigger>
              <TabsTrigger value="tax">Tax &amp; shipping</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>
          </div>

          {/* ---- Sales ---- */}
          <TabsContent value="sales" className="space-y-6">
            <Section
              title="Performance"
              description="Per day, by the date each order was placed"
              section="sales"
              params={params}
            >
              <div className="mb-3 print:hidden">
                <SegmentedControl options={TREND_METRICS} value={metric} onChange={setMetric} />
              </div>
              {trend.every((d) => d.value === 0) ? (
                <EmptyState icon={BarChart3} title="No activity in this period" description="Try a longer date range." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="report-trend-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TREND_COLOR[metric]} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={TREND_COLOR[metric]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} minTickGap={24} dy={8} />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      width={metric === 'revenue' ? 64 : 36}
                      allowDecimals={false}
                      tickFormatter={(v: number) => (metric === 'revenue' ? compactPrice(v) : String(v))}
                    />
                    <Tooltip content={<TrendTooltip metric={metric} />} cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.35, strokeDasharray: '4 4' }} />
                    <Area
                      key={metric}
                      type="monotone"
                      dataKey="value"
                      stroke={TREND_COLOR[metric]}
                      fill="url(#report-trend-fill)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: TREND_COLOR[metric], stroke: 'var(--card)', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Section>

            <Section title="Sales breakdown" description={`Compared with ${prevLabel}`} params={params}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Gross sales" value={formatPrice(s.grossSales)} previous={formatPrice(p.grossSales)} change={report.changes.grossSales} hint="Totals of paid orders, including shipping and tax" />
                <Metric label="Discounts given" value={formatPrice(s.discounts)} previous={formatPrice(p.discounts)} change={report.changes.discounts} invert />
                <Metric label="Refunds" value={formatPrice(s.refunds)} previous={formatPrice(p.refunds)} change={report.changes.refunds} invert hint="Refunded on orders placed in this period" />
                <Metric label="Net revenue" value={formatPrice(s.netRevenue)} previous={formatPrice(p.netRevenue)} change={report.changes.netRevenue} />
                <Metric label="Shipping collected" value={formatPrice(s.shipping)} previous={formatPrice(p.shipping)} />
                <Metric label="Tax collected" value={formatPrice(s.tax)} previous={formatPrice(p.tax)} />
                <Metric
                  label="Cancellations"
                  value={`${n(s.cancelledOrders)} · ${pct(s.cancellationRatePct)}`}
                  previous={`${n(p.cancelledOrders)} · ${pct(p.cancellationRatePct)}`}
                  change={report.changes.cancelledOrders}
                  invert
                  hint={`${formatPrice(s.cancelledValue)} of orders cancelled`}
                />
                <Metric label="COD still to collect" value={formatPrice(s.codToCollectValue)} hint="Cash on Delivery orders not yet delivered — revenue once collected" />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Net revenue counts money actually collected — online payments once captured, Cash on Delivery once delivered — minus refunds. Visitor conversion
                rates come from Google Analytics.
              </p>
            </Section>
          </TabsContent>

          {/* ---- Products ---- */}
          <TabsContent value="products" className="space-y-6">
            {noSales && (
              <Card>
                <EmptyState icon={Package} title="No sales in this period" description="Product, category and variant figures appear once orders are paid." />
              </Card>
            )}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Section title="Products" description={`${n(report.products.length)} products sold`} section="products" params={params} className="xl:col-span-2">
                <ReportTable
                  rows={report.products}
                  columns={productColumns}
                  rowKey={(r, i) => r.productId ?? `${r.name}-${i}`}
                  initialSort={{ key: 'revenue', direction: 'desc' }}
                  searchText={(r) => `${r.name} ${r.sku ?? ''}`}
                  searchPlaceholder="Search products"
                  empty="No products sold in this period"
                />
              </Section>
              <Section title="Categories" description="By each product's primary category" section="categories" params={params}>
                {report.categories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No category sales in this period</p>
                ) : (
                  <ShareBars
                    rows={report.categories.map((c) => ({ key: c.categoryId ?? 'none', label: c.name, value: c.revenue, meta: `${n(c.unitsSold)} units` }))}
                    format={formatPrice}
                  />
                )}
              </Section>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Section title="Variants" description="Colour and option combinations" section="variants" params={params} className="xl:col-span-2">
                <ReportTable
                  rows={report.variants}
                  columns={variantColumns}
                  rowKey={(r, i) => `${r.productId ?? r.name}-${r.variant}-${i}`}
                  initialSort={{ key: 'revenue', direction: 'desc' }}
                  searchText={(r) => `${r.name} ${r.variant}`}
                  searchPlaceholder="Search variants"
                  empty="No variants sold in this period"
                />
              </Section>
              <Section title="Personalization" description="Items customers customized" params={params}>
                <div className="flex items-center gap-4">
                  <div
                    className="relative h-24 w-24 shrink-0 rounded-full"
                    style={{ background: `conic-gradient(var(--violet) ${report.customization.percentage * 3.6}deg, var(--muted) 0deg)` }}
                    role="img"
                    aria-label={`${report.customization.percentage}% personalized`}
                  >
                    <div className="absolute inset-[9px] flex items-center justify-center rounded-full bg-card">
                      <span className="text-xl font-semibold tabular-nums">{report.customization.percentage}%</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{n(report.customization.customized)}</span> of {n(report.customization.items)} items ·{' '}
                    <span className="font-semibold text-foreground">{formatPrice(report.customization.customizedRevenue)}</span> in personalized sales
                  </p>
                </div>
                {report.customization.topOptions.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Most chosen options</p>
                    <ShareBars
                      rows={report.customization.topOptions.slice(0, 6).map((o) => ({ key: `${o.label}-${o.value}`, label: `${o.label}: ${o.value}`, value: o.count }))}
                      format={n}
                    />
                  </div>
                )}
              </Section>
            </div>
          </TabsContent>

          {/* ---- Customers ---- */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Section title="Buyers" description="Who ordered in this period" params={params}>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="New sign-ups" value={n(report.customers.newSignups)} />
                  <Metric label="Repeat rate" value={pct(report.customers.repeatRatePct)} hint="Buyers who had ordered before this period" />
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-mint" /> First order <span className="font-semibold tabular-nums">{n(report.customers.firstTimeBuyers)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      Returning <span className="font-semibold tabular-nums">{n(report.customers.returningBuyers)}</span> <span className="h-2 w-2 rounded-full bg-primary" />
                    </span>
                  </div>
                  <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-mint" style={{ width: `${(report.customers.firstTimeBuyers / buyersTotal) * 100}%` }} />
                    <div className="h-full bg-primary" style={{ width: `${(report.customers.returningBuyers / buyersTotal) * 100}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {n(report.customers.buyers)} buyers · {n(report.customers.guestOrders)} guest orders. Guests are matched by email.
                  </p>
                </div>
              </Section>
              <Section title="Top customers" description="By net spend in this period" section="customers" params={params} className="xl:col-span-2">
                <ReportTable
                  rows={report.customers.topCustomers}
                  columns={customerColumns}
                  rowKey={(r, i) => `${r.customerId ?? r.email ?? r.name}-${i}`}
                  initialSort={{ key: 'spent', direction: 'desc' }}
                  empty="No buyers in this period"
                />
              </Section>
            </div>
          </TabsContent>

          {/* ---- Payments & coupons ---- */}
          <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Section title="Payment methods" description="Net revenue by how customers paid" section="payments" params={params}>
                {report.payments.methods.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No orders in this period</p>
                ) : (
                  <ShareBars
                    rows={report.payments.methods.map((m) => ({
                      key: m.method,
                      label: PAYMENT_METHOD_LABELS[m.method] ?? m.method,
                      value: m.revenue,
                      meta: `${n(m.paidOrders)}/${n(m.orders)} paid`,
                    }))}
                    format={formatPrice}
                  />
                )}
              </Section>
              <Section
                title="Checkout attempts"
                description={`${n(report.payments.attempts.total)} started · ${pct(report.payments.attempts.successRatePct)} paid`}
                params={params}
              >
                <ul className="divide-y text-[13px]">
                  {report.payments.attempts.byStatus
                    .filter((b) => b.count > 0)
                    .map((b) => (
                      <li key={b.status} className="flex items-center justify-between gap-2 py-2">
                        <StatusDot
                          label={ATTEMPT_LABELS[b.status] ?? b.status}
                          tone={b.status === 'paid' ? 'mint' : b.status === 'failed' ? 'destructive' : b.status === 'pending' ? 'gold' : 'muted'}
                          className="normal-case"
                        />
                        <span className="tabular-nums">
                          <span className="font-semibold">{n(b.count)}</span>
                          <span className="ml-2 text-muted-foreground">{formatPrice(b.amount)}</span>
                        </span>
                      </li>
                    ))}
                  {report.payments.attempts.total === 0 && <li className="py-6 text-center text-muted-foreground">No checkouts in this period</li>}
                </ul>
              </Section>
            </div>
            <Section title="Coupon performance" description="Paid orders that used a coupon" section="coupons" params={params}>
              <ReportTable rows={report.coupons} columns={couponColumns} rowKey={(r) => r.couponId} initialSort={{ key: 'sales', direction: 'desc' }} empty="No coupons were used in this period" />
            </Section>
            <Section
              title="Refunds issued"
              description={`${n(report.refunds.count)} refunds · ${formatPrice(report.refunds.amount)} · by the date they were issued`}
              section="refunds"
              params={params}
            >
              <ReportTable
                rows={report.refunds.recent}
                columns={refundColumns}
                rowKey={(r) => r.id}
                initialSort={{ key: 'date', direction: 'desc' }}
                empty="No refunds in this period"
              />
              {report.refunds.count > report.refunds.recent.length && (
                <p className="mt-2 text-xs text-muted-foreground">Showing the latest {report.refunds.recent.length}. Export for the full list.</p>
              )}
            </Section>
          </TabsContent>

          {/* ---- Tax & shipping ---- */}
          <TabsContent value="tax" className="space-y-6">
            <Section
              title="GST by place of supply"
              description="Paid orders by shipping state · fully refunded orders are left out (reversed by credit note)"
              section="gst"
              params={params}
            >
              <ReportTable
                rows={report.tax}
                columns={gstColumns}
                rowKey={(r) => r.state}
                initialSort={{ key: 'invoice', direction: 'desc' }}
                pageSize={40}
                empty="No taxable sales in this period"
                totals={{
                  orders: n(gstTotals.orders),
                  taxable: formatPrice(gstTotals.taxable),
                  cgst: formatPrice(gstTotals.cgst),
                  sgst: formatPrice(gstTotals.sgst),
                  igst: formatPrice(gstTotals.igst),
                  tax: formatPrice(gstTotals.tax),
                  invoice: formatPrice(gstTotals.invoice),
                }}
              />
            </Section>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Section title="Shipping by state" description="Orders that weren't cancelled" section="shipping" params={params} className="xl:col-span-2">
                <ReportTable rows={report.shipping.byState} columns={shippingColumns} rowKey={(r) => r.state} initialSort={{ key: 'orders', direction: 'desc' }} empty="No shipments in this period" />
              </Section>
              <Section title="Shipping methods" description={`${n(report.shipping.freeShippingOrders)} orders shipped free`} params={params}>
                {report.shipping.byMethod.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No shipments in this period</p>
                ) : (
                  <ShareBars
                    rows={report.shipping.byMethod.map((m) => ({ key: m.method, label: m.method.charAt(0).toUpperCase() + m.method.slice(1), value: m.orders, meta: `${formatPrice(m.shippingCollected)} collected` }))}
                    format={(v) => `${n(v)} orders`}
                  />
                )}
              </Section>
            </div>
          </TabsContent>

          {/* ---- Inventory ---- */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Stock value (at price)" value={formatPrice(inv.inventoryValue)} hint={`${n(inv.totalStockUnits)} units`} />
              <Metric label="Stock value (at cost)" value={formatPrice(inv.inventoryCostValue)} hint="Only products with a cost price set" />
              <Metric label="Low stock" value={n(inv.lowStockCount)} />
              <Metric label="Out of stock" value={n(inv.outOfStockCount)} />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Section title="All products" description="Current stock — not limited to the date range" section="inventory" params={params} className="xl:col-span-2">
                <ReportTable
                  rows={report.inventory.products}
                  columns={inventoryColumns}
                  rowKey={(r) => r.id}
                  initialSort={{ key: 'stock', direction: 'asc' }}
                  searchText={(r) => `${r.name} ${r.sku ?? ''}`}
                  searchPlaceholder="Search products"
                  empty="No products yet"
                />
              </Section>
              <Section title="Needs restocking" description="At or below each product's low-stock threshold" params={params}>
                {report.inventory.alerts.length === 0 ? (
                  <EmptyState icon={Boxes} title="All products well stocked" className="py-8" />
                ) : (
                  <ul className="space-y-1">
                    {report.inventory.alerts.slice(0, 12).map((a) => (
                      <li key={a.id}>
                        <Link href={`/admin/products/${a.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60">
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{a.name}</span>
                          <StatusDot label={a.stock <= 0 ? 'Out of stock' : `${a.stock} left`} tone={a.stock <= 0 ? 'destructive' : 'gold'} className="normal-case" />
                        </Link>
                      </li>
                    ))}
                    {report.inventory.alerts.length > 12 && <li className="pt-2 text-xs text-muted-foreground">+{report.inventory.alerts.length - 12} more</li>}
                  </ul>
                )}
              </Section>
            </div>
          </TabsContent>
        </Tabs>

        <p className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
          <FileDown className="h-3.5 w-3.5" /> CSV exports open in Excel and Google Sheets. For a PDF, use Print / PDF — it prints the tab you&apos;re on.
        </p>
      </div>
    </ProtectedRoute>
  )
}
