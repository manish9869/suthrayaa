'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard, ChangeBadge } from '@/components/admin/stat-card'
import { StatusDot, type DotTone } from '@/components/admin/status-dot'
import { SegmentedControl } from '@/components/admin/segmented-control'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from 'recharts'
import {
  IndianRupee,
  ShoppingBag,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileDown,
  Package,
  Sparkles,
  CreditCard,
  Boxes,
  Users,
  Clock,
} from 'lucide-react'
import {
  getAnalyticsSummary,
  getRevenueSeries,
  getOrdersSeries,
  getCustomersSeries,
  getTransactionsBreakdown,
  getOrderStatusBreakdown,
  getInventorySummary,
  getTopProducts,
  getCustomizationPopularity,
  getStockAlerts,
  getAdminOrders,
  type AnalyticsSummary,
  type InventorySummary,
  type AdminOrderSummary,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { getCachedStoreSettings } from '@/lib/store-settings-cache'
import { DateRangeFilter, DEFAULT_DATE_RANGE, type DateRangeValue } from '@/components/admin/date-range-filter'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { useRbac } from '@/lib/rbac/rbac-context'
import { exportRowsToCsv } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'

// Payment status is a genuine status encoding (good/warning/critical/neutral), not
// arbitrary series identity — colors carry that meaning, never a categorical palette.
const PAYMENT_META: Record<string, { label: string; color: string }> = {
  paid: { label: 'Paid', color: 'var(--mint)' },
  pending: { label: 'Pending', color: 'var(--gold)' },
  failed: { label: 'Failed', color: 'var(--destructive)' },
  refunded: { label: 'Refunded', color: 'var(--muted-foreground)' },
  partially_refunded: { label: 'Part. refunded', color: 'color-mix(in oklab, var(--muted-foreground) 55%, transparent)' },
}

// Order status is ordinal (a fulfilment funnel), not nominal — one hue, monotone
// lightness walks the reader through the pipeline; the terminal "went wrong" states
// break out in the status-critical color instead.
const FUNNEL_STAGES = ['pending_payment', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered']
const TERMINAL_STATES = ['cancelled', 'refunded', 'partially_refunded']
const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  in_production: 'Making',
  ready: 'Ready',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
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
function funnelOpacity(status: string) {
  const i = FUNNEL_STAGES.indexOf(status)
  if (i === -1) return 1
  return 0.35 + (i / (FUNNEL_STAGES.length - 1)) * 0.65
}
function stageOrder(status: string) {
  return FUNNEL_STAGES.includes(status) ? FUNNEL_STAGES.indexOf(status) : 100 + TERMINAL_STATES.indexOf(status)
}

const QUICK_RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: '365', label: '1Y' },
]
const QUICK_LABELS: Record<string, string> = { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months' }

type TrendMetric = 'revenue' | 'orders' | 'customers'
const TREND_METRICS: { value: TrendMetric; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'customers', label: 'Sign-ups' },
]
const TREND_COLOR: Record<TrendMetric, string> = { revenue: 'var(--primary)', orders: 'var(--violet)', customers: 'var(--teal)' }

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}
/** Short axis labels: ₹950, ₹12K, ₹3.4L, ₹1.2Cr for INR (lakh/crore are what Indian readers
 * expect — Intl's en-IN compact notation renders thousands as "T"), K/M/B otherwise. */
function formatCompactPrice(value: number) {
  const { currency, locale } = getCachedStoreSettings()
  const symbol =
    new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? ''
  const steps: [number, string][] =
    currency === 'INR'
      ? [[1e7, 'Cr'], [1e5, 'L'], [1e3, 'K']]
      : [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]
  const abs = Math.abs(value)
  for (const [n, suffix] of steps) {
    if (abs >= n) return `${symbol}${+(value / n).toFixed(1)}${suffix}`
  }
  return `${symbol}${Math.round(value)}`
}
function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function TrendTooltip({ active, payload, metric }: TooltipProps<number, string> & { metric: TrendMetric }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload as { date: string; value: number; orders?: number }
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      <p className="text-[11px] font-medium text-muted-foreground">
        {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full" style={{ background: TREND_COLOR[metric] }} />
        <span className="text-muted-foreground">{TREND_METRICS.find((m) => m.value === metric)?.label}</span>
        <span className="ml-auto pl-4 font-semibold tabular-nums">{metric === 'revenue' ? formatPrice(row.value) : row.value}</span>
      </div>
      {metric === 'revenue' && row.orders != null && (
        <p className="mt-0.5 pl-4 text-xs text-muted-foreground tabular-nums">
          from {row.orders} order{row.orders === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-[1.1rem]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[400px] rounded-[1.1rem] lg:col-span-2" />
        <Skeleton className="h-[400px] rounded-[1.1rem]" />
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { admin, hasPermission } = useRbac()
  const canViewOrders = hasPermission('orders.view')
  const canViewProducts = hasPermission('products.view')

  const [range, setRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [revenue, setRevenue] = useState<{ date: string; orders: number; revenue: number }[]>([])
  const [ordersSeries, setOrdersSeries] = useState<{ date: string; count: number }[]>([])
  const [customersSeries, setCustomersSeries] = useState<{ date: string; count: number }[]>([])
  const [txnBreakdown, setTxnBreakdown] = useState<{ status: string; count: number; amount: number }[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([])
  const [inventory, setInventory] = useState<InventorySummary | null>(null)
  const [topProducts, setTopProducts] = useState<{ productId: string | null; name: string; unitsSold: number; revenue: number }[]>([])
  const [customization, setCustomization] = useState<{ percentage: number; customized: number; total: number } | null>(null)
  const [stockAlerts, setStockAlerts] = useState<{ id: string; name: string; stock: number }[]>([])
  const [recentOrders, setRecentOrders] = useState<AdminOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<TrendMetric>('revenue')

  useEffect(() => {
    const params = range.from && range.to ? { from: range.from, to: range.to } : { days: range.days }
    const noOrders = { items: [] as AdminOrderSummary[] }
    setLoading(true)
    Promise.all([
      getAnalyticsSummary(params),
      getRevenueSeries(params),
      getOrdersSeries(params),
      getCustomersSeries(params),
      getTransactionsBreakdown(params),
      getOrderStatusBreakdown(params),
      getInventorySummary(),
      getTopProducts(5, params),
      getCustomizationPopularity(),
      getStockAlerts(),
      // Recent orders are a convenience panel — a role without orders.view just doesn't get it
      canViewOrders ? getAdminOrders({ limit: 6 }).catch(() => noOrders) : Promise.resolve(noOrders),
    ])
      .then(([s, r, o, c, txn, st, inv, t, cust, alerts, recent]) => {
        setSummary(s)
        setRevenue(r)
        setOrdersSeries(o)
        setCustomersSeries(c)
        setTxnBreakdown(txn.filter((x) => x.count > 0))
        setStatusBreakdown(st.filter((x) => x.count > 0).sort((a, b) => stageOrder(a.status) - stageOrder(b.status)))
        setInventory(inv)
        setTopProducts(t)
        setCustomization(cust)
        setStockAlerts(alerts)
        setRecentOrders(recent.items.slice(0, 6))
      })
      .finally(() => setLoading(false))
  }, [range, canViewOrders])

  const trendData = useMemo(() => {
    if (metric === 'revenue') return revenue.map((d) => ({ date: d.date, label: formatShortDate(d.date), value: d.revenue, orders: d.orders }))
    const series = metric === 'orders' ? ordersSeries : customersSeries
    return series.map((d) => ({ date: d.date, label: formatShortDate(d.date), value: d.count }))
  }, [metric, revenue, ordersSeries, customersSeries])
  const aovTrend = useMemo(() => revenue.map((d) => (d.orders > 0 ? d.revenue / d.orders : 0)), [revenue])

  if (loading && !summary) return <DashboardSkeleton />

  const trendTotal = trendData.reduce((s, d) => s + d.value, 0)
  const trendPeak = trendData.reduce<{ label: string; value: number } | null>((best, d) => (!best || d.value > best.value ? d : best), null)
  const trendChange =
    metric === 'revenue' ? summary?.revenueChangePct : metric === 'orders' ? summary?.orderCountChangePct : summary?.newCustomersChangePct
  const orderStatusTotal = statusBreakdown.reduce((s, x) => s + x.count, 0)
  const txnTotal = txnBreakdown.reduce((s, x) => s + x.count, 0)
  const topMax = Math.max(1, ...topProducts.map((p) => p.revenue))
  const activeQuick = !range.from && range.days && QUICK_LABELS[String(range.days)] ? String(range.days) : null
  const firstName = (admin?.displayName ?? '').split(/\s+/)[0]

  const handleExport = () => {
    const byDate = new Map<string, { revenue: number; orders: number; customers: number }>()
    revenue.forEach((d) => byDate.set(d.date, { revenue: d.revenue, orders: d.orders, customers: 0 }))
    customersSeries.forEach((d) => {
      const row = byDate.get(d.date) ?? { revenue: 0, orders: 0, customers: 0 }
      row.customers = d.count
      byDate.set(d.date, row)
    })
    exportRowsToCsv(
      `dashboard-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Date', 'Revenue', 'Paid Orders', 'New Registrations'],
      [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, r]) => [date, r.revenue, r.orders, r.customers])
    )
  }

  const inventoryRows = [
    { label: 'Active', value: inventory?.activeProducts ?? 0 },
    { label: 'Draft', value: inventory?.draftProducts ?? 0 },
    { label: 'Hidden', value: inventory?.hiddenProducts ?? 0 },
    { label: 'Archived', value: inventory?.archivedProducts ?? 0 },
  ]

  return (
    <ProtectedRoute permission="analytics.view">
      <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60 pointer-events-none')}>
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[26px]">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Here&apos;s how your store is performing · {range.label}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl options={QUICK_RANGES} value={activeQuick} onChange={(v) => setRange({ days: Number(v), label: QUICK_LABELS[v] })} />
            <DateRangeFilter value={range} onChange={setRange} />
            <Button onClick={handleExport} className="rounded-xl">
              <FileDown className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* Headline KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={IndianRupee}
            label="Total Revenue"
            value={formatPrice(summary?.revenue ?? 0)}
            change={summary?.revenueChangePct}
            changeLabel="vs prev."
            trend={revenue.map((d) => d.revenue)}
            tone="primary"
          />
          <StatCard
            icon={ShoppingBag}
            label="Orders"
            value={(summary?.orderCount ?? 0).toLocaleString('en-IN')}
            change={summary?.orderCountChangePct}
            changeLabel="vs prev."
            trend={ordersSeries.map((d) => d.count)}
            tone="violet"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg. Order Value"
            value={formatPrice(summary?.avgOrderValue ?? 0)}
            trend={aovTrend}
            subtitle={`${(summary?.pendingOrders ?? 0).toLocaleString('en-IN')} orders awaiting payment`}
            tone="gold"
          />
          <StatCard
            icon={UserPlus}
            label="New Customers"
            value={(summary?.newCustomers ?? 0).toLocaleString('en-IN')}
            change={summary?.newCustomersChangePct}
            changeLabel="vs prev."
            trend={customersSeries.map((d) => d.count)}
            subtitle={`${(summary?.totalCustomers ?? 0).toLocaleString('en-IN')} customers in total`}
            tone="accent"
          />
        </div>

        {/* Trend + top products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 gap-4">
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {metric === 'revenue' ? formatPrice(trendTotal) : trendTotal.toLocaleString('en-IN')}
                </span>
                {trendChange != null && <ChangeBadge change={trendChange} suffix="vs prev." />}
              </div>
              {trendPeak && trendPeak.value > 0 && (
                <p className="text-xs text-muted-foreground">
                  Best day: <span className="font-medium text-foreground">{trendPeak.label}</span> ·{' '}
                  {metric === 'revenue' ? formatPrice(trendPeak.value) : trendPeak.value.toLocaleString('en-IN')}
                </p>
              )}
              <CardAction>
                <SegmentedControl options={TREND_METRICS} value={metric} onChange={setMetric} />
              </CardAction>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-2">
              {trendData.every((d) => d.value === 0) ? (
                <EmptyState icon={TrendingUp} text="No activity in this period" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <defs>
                      {TREND_METRICS.map((m) => (
                        <linearGradient key={m.value} id={`trend-fill-${m.value}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={TREND_COLOR[m.value]} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={TREND_COLOR[m.value]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} minTickGap={24} dy={8} />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      tickLine={false}
                      axisLine={false}
                      width={metric === 'revenue' ? 64 : 36}
                      allowDecimals={false}
                      tickFormatter={(v: number) => (metric === 'revenue' ? formatCompactPrice(v) : String(v))}
                    />
                    <Tooltip content={<TrendTooltip metric={metric} />} cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.35, strokeDasharray: '4 4' }} />
                    <Area
                      key={metric}
                      type="monotone"
                      dataKey="value"
                      stroke={TREND_COLOR[metric]}
                      fill={`url(#trend-fill-${metric})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: TREND_COLOR[metric], stroke: 'var(--card)', strokeWidth: 2 }}
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Top Selling Products</CardTitle>
              <CardDescription>By revenue · {range.label.toLowerCase()}</CardDescription>
              {canViewProducts && (
                <CardAction>
                  <Link href="/admin/products" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    See all
                  </Link>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {topProducts.length === 0 ? (
                <EmptyState icon={Package} text="No sales in this period" />
              ) : (
                topProducts.map((p, i) => {
                  const row = (
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="shrink-0 text-sm font-semibold tabular-nums">{formatPrice(p.revenue)}</p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(p.revenue / topMax) * 100}%` }} />
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{p.unitsSold} sold</span>
                        </div>
                      </div>
                    </div>
                  )
                  return p.productId && canViewProducts ? (
                    <Link key={p.productId} href={`/admin/products/${p.productId}`} className="-mx-2 block rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60">
                      {row}
                    </Link>
                  ) : (
                    <div key={`${p.name}-${i}`} className="py-1.5">
                      {row}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent orders + pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {canViewOrders && (
            <Card className="lg:col-span-2 gap-0 pb-0 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription>Latest activity across the store</CardDescription>
                <CardAction>
                  <Button asChild size="sm" variant="outline" className="rounded-lg">
                    <Link href="/admin/orders">
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              {recentOrders.length === 0 ? (
                <EmptyState icon={ShoppingBag} text="No orders yet" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-6 py-2.5 text-left font-semibold">Order</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Customer</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                        <th className="px-6 py-2.5 text-right font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recentOrders.map((o) => {
                        const name = o.customerName ?? 'Guest'
                        return (
                          <tr key={o.id} className="group transition-colors hover:bg-muted/40">
                            <td className="px-6 py-3">
                              <Link href={`/admin/orders/${o.id}`} className="font-medium group-hover:text-primary">
                                {o.orderNumber}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                                {o.isCustomOrder && ' · Custom'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                                  {initialsOf(name) || '?'}
                                </span>
                                <span className="max-w-[160px] truncate">{name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-medium tabular-nums">{formatPrice(o.total)}</td>
                            <td className="px-3 py-3">
                              <StatusDot label={STATUS_LABELS[o.status] ?? o.status.replace(/_/g, ' ')} tone={STATUS_DOT[o.status] ?? 'muted'} />
                            </td>
                            <td className="whitespace-nowrap px-6 py-3 text-right text-muted-foreground">
                              {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          <Card className={cn('gap-4', !canViewOrders && 'lg:col-span-3')}>
            <CardHeader>
              <CardTitle className="text-base">Order Pipeline</CardTitle>
              <CardDescription>{orderStatusTotal.toLocaleString('en-IN')} orders by fulfilment stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {statusBreakdown.length === 0 ? (
                <EmptyState icon={Boxes} text="No orders in this period" />
              ) : (
                statusBreakdown.map((s) => {
                  const terminal = TERMINAL_STATES.includes(s.status)
                  const pct = orderStatusTotal ? (s.count / orderStatusTotal) * 100 : 0
                  const label = STATUS_LABELS[s.status] ?? s.status.replace(/_/g, ' ')
                  return (
                    <div key={s.status} title={`${label}: ${s.count} (${pct.toFixed(1)}%)`}>
                      <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className={cn('font-medium', terminal && 'text-destructive')}>{label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          <span className="font-semibold text-foreground">{s.count}</span> · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', terminal ? 'bg-destructive' : 'bg-violet')}
                          style={{ width: `${Math.max(pct, 2)}%`, opacity: terminal ? 0.85 : funnelOpacity(s.status) }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
              {statusBreakdown.length > 0 && (
                <p className="pt-1 text-[11px] text-muted-foreground">Pipeline stages deepen in color as orders progress · red marks cancellations and refunds</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Operational health */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
          {/* Payments */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" /> Payments
              </CardTitle>
              <CardDescription>{txnTotal.toLocaleString('en-IN')} transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{(summary?.successRatePct ?? 0).toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">success rate</span>
              </div>
              {txnTotal > 0 ? (
                <>
                  <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                    {txnBreakdown.map((t) => (
                      <div
                        key={t.status}
                        title={`${PAYMENT_META[t.status]?.label ?? t.status}: ${t.count}`}
                        className="h-full"
                        style={{ width: `${(t.count / txnTotal) * 100}%`, background: PAYMENT_META[t.status]?.color ?? 'var(--muted-foreground)' }}
                      />
                    ))}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {txnBreakdown.map((t) => (
                      <li key={t.status} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="h-2 w-2 rounded-full" style={{ background: PAYMENT_META[t.status]?.color ?? 'var(--muted-foreground)' }} />
                          {PAYMENT_META[t.status]?.label ?? t.status}
                        </span>
                        <span className="tabular-nums">
                          <span className="font-semibold">{t.count}</span>
                          <span className="ml-2 text-muted-foreground">{formatPrice(t.amount)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No transactions in this period</p>
              )}
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Boxes className="h-4 w-4 text-muted-foreground" /> Inventory
              </CardTitle>
              <CardDescription>{(inventory?.totalProducts ?? 0).toLocaleString('en-IN')} products in catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatPrice(inventory?.inventoryValue ?? 0)}</p>
              <p className="text-xs text-muted-foreground">stock value · {(inventory?.totalStockUnits ?? 0).toLocaleString('en-IN')} units</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-gold/10 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Low stock</p>
                  <p className="text-lg font-semibold tabular-nums">{inventory?.lowStockCount ?? 0}</p>
                </div>
                <div className="rounded-xl bg-destructive/10 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Out of stock</p>
                  <p className="text-lg font-semibold tabular-nums text-destructive">{inventory?.outOfStockCount ?? 0}</p>
                </div>
              </div>
              <ul className="mt-3 divide-y text-[13px]">
                {inventoryRows.map((r) => (
                  <li key={r.label} className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium tabular-nums">{r.value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Stock alerts */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-gold" /> Stock Alerts
              </CardTitle>
              <CardDescription>Products at or below threshold</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {stockAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/10">
                    <CheckCircle2 className="h-5 w-5 text-mint" />
                  </span>
                  <p className="text-sm text-muted-foreground">All products well stocked</p>
                </div>
              ) : (
                stockAlerts.slice(0, 6).map((p) => {
                  const row = (
                    <>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                      <StatusDot label={p.stock === 0 ? 'Out of stock' : `${p.stock} left`} tone={p.stock === 0 ? 'destructive' : 'gold'} className="normal-case" />
                    </>
                  )
                  return canViewProducts ? (
                    <Link key={p.id} href={`/admin/products/${p.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60">
                      {row}
                    </Link>
                  ) : (
                    <div key={p.id} className="flex items-center gap-3 py-1.5">
                      {row}
                    </div>
                  )
                })
              )}
              {stockAlerts.length > 6 && <p className="pt-2 text-xs text-muted-foreground">+{stockAlerts.length - 6} more</p>}
            </CardContent>
          </Card>

          {/* Personalization + customer snapshot */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" /> Personalization
              </CardTitle>
              <CardDescription>Share of line items customized</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div
                  className="relative h-24 w-24 shrink-0 rounded-full"
                  style={{ background: `conic-gradient(var(--violet) ${(customization?.percentage ?? 0) * 3.6}deg, var(--muted) 0deg)` }}
                  role="img"
                  aria-label={`${customization?.percentage ?? 0}% personalized`}
                >
                  <div className="absolute inset-[9px] flex items-center justify-center rounded-full bg-card">
                    <span className="text-xl font-semibold tabular-nums">{customization?.percentage ?? 0}%</span>
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{customization?.customized ?? 0}</span> of {customization?.total ?? 0} items sold were
                  personalized by customers.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl border px-3 py-2">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Users className="h-3 w-3" /> Customers
                  </p>
                  <p className="text-lg font-semibold tabular-nums">{(summary?.totalCustomers ?? 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border px-3 py-2">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" /> Pending
                  </p>
                  <p className="text-lg font-semibold tabular-nums">{(summary?.pendingOrders ?? 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
