'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
} from 'lucide-react'
import {
  getAnalyticsSummary,
  getRevenueSeries,
  getTopProducts,
  getCustomizationPopularity,
  getStockAlerts,
  type AnalyticsSummary,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [revenue, setRevenue] = useState<{ date: string; orders: number; revenue: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; unitsSold: number; revenue: number }[]>([])
  const [customization, setCustomization] = useState<{ percentage: number; customized: number; total: number } | null>(null)
  const [stockAlerts, setStockAlerts] = useState<{ id: string; name: string; stock: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAnalyticsSummary(), getRevenueSeries(), getTopProducts(5), getCustomizationPopularity(), getStockAlerts()])
      .then(([s, r, t, c, alerts]) => {
        setSummary(s)
        setRevenue(r.map((d) => ({ ...d, date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) })))
        setTopProducts(t)
        setCustomization(c)
        setStockAlerts(alerts)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-muted-foreground">Loading dashboard...</div>
  }

  const kpis = [
    { label: 'Revenue (30d)', value: formatPrice(summary?.revenue ?? 0), icon: IndianRupee, change: summary?.revenueChangePct },
    { label: 'Orders (30d)', value: String(summary?.orderCount ?? 0), icon: ShoppingBag },
    { label: 'Avg Order Value', value: formatPrice(summary?.avgOrderValue ?? 0), icon: TrendingUp },
    { label: 'New Customers', value: String(summary?.newCustomers ?? 0), icon: Users },
    { label: 'Pending Orders', value: String(summary?.pendingOrders ?? 0), icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Last 30 days overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No paid orders yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--popover-foreground)' }}
                    labelStyle={{ color: 'var(--popover-foreground)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--chart-2)" fill="url(#revenueFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No sales yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--popover-foreground)' }}
                    labelStyle={{ color: 'var(--popover-foreground)' }}
                  />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
      </div>
    </div>
  )
}
