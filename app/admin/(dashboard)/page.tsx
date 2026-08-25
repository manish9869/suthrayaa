'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  IndianRupee,
  ShoppingBag,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  UserPlus,
  CreditCard,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Package,
  PackageX,
  PackageCheck,
  Wallet,
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
  type AnalyticsSummary,
  type InventorySummary,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { DateRangeFilter, DEFAULT_DATE_RANGE, type DateRangeValue } from '@/components/admin/date-range-filter'

// Payment status is a genuine status encoding (good/warning/critical/neutral), not
// arbitrary series identity — colors carry that meaning, never the categorical palette.
const PAYMENT_COLORS: Record<string, string> = {
  paid: 'var(--mint)',
  pending: 'var(--gold)',
  failed: 'var(--destructive)',
  refunded: 'var(--muted-foreground)',
  partially_refunded: 'var(--muted-foreground)',
}
const PAYMENT_LABELS: Record<string, string> = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
}

// Order status is ordinal (a fulfilment funnel), not nominal — one hue, monotone
// lightness (via fill-opacity) walks the reader through the pipeline; the two
// terminal "went wrong" states break out in the status-critical color instead.
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
function funnelOpacity(status: string) {
  const i = FUNNEL_STAGES.indexOf(status)
  if (i === -1) return 1
  return 0.32 + (i / (FUNNEL_STAGES.length - 1)) * 0.68
}

const tooltipStyle = {
  contentStyle: { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--popover-foreground)' },
  labelStyle: { color: 'var(--popover-foreground)' },
  cursor: { fill: 'var(--muted)', opacity: 0.4 },
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [revenue, setRevenue] = useState<{ date: string; orders: number; revenue: number }[]>([])
  const [ordersSeries, setOrdersSeries] = useState<{ date: string; count: number }[]>([])
  const [customersSeries, setCustomersSeries] = useState<{ date: string; count: number }[]>([])
  const [txnBreakdown, setTxnBreakdown] = useState<{ status: string; count: number; amount: number }[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([])
  const [inventory, setInventory] = useState<InventorySummary | null>(null)
  const [topProducts, setTopProducts] = useState<{ name: string; unitsSold: number; revenue: number }[]>([])
  const [customization, setCustomization] = useState<{ percentage: number; customized: number; total: number } | null>(null)
  const [stockAlerts, setStockAlerts] = useState<{ id: string; name: string; stock: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = range.from && range.to ? { from: range.from, to: range.to } : { days: range.days }
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
    ])
      .then(([s, r, o, c, txn, st, inv, t, cust, alerts]) => {
        setSummary(s)
        setRevenue(r)
        setOrdersSeries(o)
        setCustomersSeries(c)
        setTxnBreakdown(txn.filter((x) => x.count > 0))
        setStatusBreakdown(st.filter((x) => x.count > 0))
        setInventory(inv)
        setTopProducts(t)
        setCustomization(cust)
        setStockAlerts(alerts)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  if (loading && !summary) {
    return <div className="text-muted-foreground">Loading dashboard...</div>
  }

  const kpiPrimary = [
    { label: 'Revenue', value: formatPrice(summary?.revenue ?? 0), icon: IndianRupee, change: summary?.revenueChangePct },
    { label: 'New Orders', value: String(summary?.orderCount ?? 0), icon: ShoppingBag, change: summary?.orderCountChangePct },
    { label: 'Avg Order Value', value: formatPrice(summary?.avgOrderValue ?? 0), icon: TrendingUp },
    { label: 'New Registrations', value: String(summary?.newCustomers ?? 0), icon: UserPlus, change: summary?.newCustomersChangePct },
    { label: 'Total Customers', value: String(summary?.totalCustomers ?? 0), icon: Users },
  ]

  const kpiTransactions = [
    { label: 'Total Transactions', value: String(summary?.totalTransactions ?? 0), icon: CreditCard },
    { label: 'Successful', value: String(summary?.successfulTransactions ?? 0), icon: CheckCircle2, tone: 'text-mint-foreground' },
    { label: 'Failed', value: String(summary?.failedTransactions ?? 0), icon: XCircle, tone: 'text-destructive' },
    { label: 'Refunded', value: String(summary?.refundedTransactions ?? 0), icon: RotateCcw },
    { label: 'Success Rate', value: `${(summary?.successRatePct ?? 0).toFixed(1)}%`, icon: TrendingUp },
    { label: 'Pending Orders', value: String(summary?.pendingOrders ?? 0), icon: Clock },
  ]

  const kpiInventory = [
    { label: 'Total Products', value: String(inventory?.totalProducts ?? 0), icon: Package },
    { label: 'Active Products', value: String(inventory?.activeProducts ?? 0), icon: PackageCheck },
    { label: 'Low Stock', value: String(inventory?.lowStockCount ?? 0), icon: AlertTriangle, tone: 'text-amber-500' },
    { label: 'Out of Stock', value: String(inventory?.outOfStockCount ?? 0), icon: PackageX, tone: 'text-destructive' },
    { label: 'Inventory Value', value: formatPrice(inventory?.inventoryValue ?? 0), icon: Wallet },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{range.label} overview</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Sales KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiPrimary.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className="h-5 w-5 text-secondary" />
                {kpi.change != null && (
                  <span className={`text-xs flex items-center gap-0.5 ${kpi.change >= 0 ? 'text-mint-foreground' : 'text-destructive'}`}>
                    {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(kpi.change).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Transactions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {kpiTransactions.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <kpi.icon className={`h-5 w-5 mb-2 ${kpi.tone ?? 'text-secondary'}`} />
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Inventory KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Inventory</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiInventory.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <kpi.icon className={`h-5 w-5 mb-2 ${kpi.tone ?? 'text-secondary'}`} />
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.every((d) => d.revenue === 0) ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No paid orders in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenue.map((d) => ({ ...d, label: formatShortDate(d.date) }))} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} width={56} />
                  <Tooltip formatter={(value: number) => formatPrice(value)} {...tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="var(--chart-2)"
                    fill="url(#revenueFill)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--chart-2)', stroke: 'var(--card)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-secondary" /> Transactions by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {txnBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No transactions in this period</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground">{txnBreakdown.reduce((s, x) => s + x.count, 0)}</span> total transactions
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={txnBreakdown} dataKey="count" nameKey="status" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="var(--card)" strokeWidth={2}>
                      {txnBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={PAYMENT_COLORS[entry.status] ?? 'var(--muted-foreground)'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name, item: any) => [`${value} (${formatPrice(item?.payload?.amount ?? 0)})`, PAYMENT_LABELS[item?.payload?.status] ?? item?.payload?.status]}
                      {...tooltipStyle}
                      cursor={false}
                    />
                    <Legend formatter={(value: string) => PAYMENT_LABELS[value] ?? value} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersSeries.every((d) => d.count === 0) ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No orders in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ordersSeries.map((d) => ({ ...d, label: formatShortDate(d.date) }))} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" name="Orders" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* New Customers Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-secondary" /> New Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customersSeries.every((d) => d.count === 0) ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No new registrations</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={customersSeries.map((d) => ({ ...d, label: formatShortDate(d.date) }))} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" allowDecimals={false} tickLine={false} axisLine={false} width={32} domain={[0, 'auto']} />
                  <Tooltip {...tooltipStyle} labelFormatter={(label: string) => label} formatter={(value: number) => [value, 'New registrations']} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Registrations"
                    stroke="var(--mint)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={{ r: 4, fill: 'var(--mint)', stroke: 'var(--card)', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: 'var(--mint)', stroke: 'var(--card)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No sales in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number) => formatPrice(value)} {...tooltipStyle} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    <LabelList dataKey="revenue" position="right" formatter={(v: number) => formatPrice(v)} fill="var(--muted-foreground)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No orders in this period</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" opacity={0.6} />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="status"
                      width={92}
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => STATUS_LABELS[v] ?? v.replace(/_/g, ' ')}
                    />
                    <Tooltip
                      formatter={(value: number, _name, item: any) => [value, STATUS_LABELS[item?.payload?.status] ?? item?.payload?.status]}
                      {...tooltipStyle}
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
                      {statusBreakdown.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={TERMINAL_STATES.includes(entry.status) ? 'var(--destructive)' : 'var(--gold)'}
                          fillOpacity={TERMINAL_STATES.includes(entry.status) ? 0.85 : funnelOpacity(entry.status)}
                        />
                      ))}
                      <LabelList dataKey="count" position="right" fill="var(--muted-foreground)" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-muted-foreground text-center -mt-2">Fulfilment pipeline (light → dark) · red = cancelled or refunded</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stockAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products well stocked</p>
            ) : (
              stockAlerts.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{p.name}</span>
                  <Badge variant={p.stock === 0 ? 'destructive' : 'outline'}>{p.stock} left</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Customization Popularity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" /> Customization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{customization?.percentage ?? 0}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              {customization?.customized ?? 0} of {customization?.total ?? 0} line items were personalized
            </p>
          </CardContent>
        </Card>

        {/* Inventory Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-secondary" /> Catalog Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active</span>
              <span className="font-medium">{inventory?.activeProducts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-medium">{inventory?.draftProducts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hidden</span>
              <span className="font-medium">{inventory?.hiddenProducts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Archived</span>
              <span className="font-medium">{inventory?.archivedProducts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-muted-foreground">Total Stock Units</span>
              <span className="font-medium">{inventory?.totalStockUnits ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
