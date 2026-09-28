'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DualRangeSlider } from '@/components/ui/dual-range-slider'
import {
  Search,
  SlidersHorizontal,
  Mail,
  Phone,
  Sparkles,
  RefreshCw,
  FileDown,
  Users,
  Wallet,
  ShoppingBag,
  Crown,
  Eye,
  Copy,
  PhoneCall,
  X,
} from 'lucide-react'
import { getAdminCustomers, exportAdminCustomersCsv, type AdminCustomer, type AdminCustomerListParams } from '@/lib/api/admin'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { ApiError } from '@/lib/api/http'
import { Can } from '@/components/admin/can'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/data'
import { DateRangeFilter, dateRangeToParams, type DateRangeValue } from '@/components/admin/date-range-filter'
import { StatCard } from '@/components/admin/stat-card'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { toast } from 'sonner'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { TableLoadingRow } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { PageHeader } from '@/components/admin/page-header'

const ALL_TIME: DateRangeValue = { days: 3650, label: 'Any time joined' }

type SortKey = 'newest' | 'oldest' | 'spent_desc' | 'orders_desc' | 'recent_order' | 'name_asc'
const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  spent_desc: 'Highest Spent',
  orders_desc: 'Most Orders',
  recent_order: 'Ordered Recently',
  name_asc: 'Name (A–Z)',
}
const SORT_PARAMS: Record<SortKey, Pick<AdminCustomerListParams, 'sort' | 'dir'>> = {
  newest: { sort: 'joined', dir: 'desc' },
  oldest: { sort: 'joined', dir: 'asc' },
  spent_desc: { sort: 'spent', dir: 'desc' },
  orders_desc: { sort: 'orders', dir: 'desc' },
  recent_order: { sort: 'lastOrder', dir: 'desc' },
  name_asc: { sort: 'name', dir: 'asc' },
}
const PAGE_SIZE = 20

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ totalSpent: 0, avgOrders: 0, loyal: 0, maxSpent: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const [joinedRange, setJoinedRange] = useState<DateRangeValue>(ALL_TIME)
  const [minOrders, setMinOrders] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)

  const maxSpent = Math.max(1000, Math.ceil(stats.maxSpent / 100) * 100)
  const [spentRange, setSpentRange] = useState<[number, number] | null>(null)
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, maxSpent])
  useEffect(() => setSliderRange(spentRange ?? [0, maxSpent]), [spentRange, maxSpent])

  const params: AdminCustomerListParams = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      ...dateRangeToParams(joinedRange),
      minOrders: minOrders === 'all' ? undefined : Number(minOrders),
      minSpent: spentRange && spentRange[0] > 0 ? spentRange[0] : undefined,
      maxSpent: spentRange && spentRange[1] < maxSpent ? spentRange[1] : undefined,
      ...SORT_PARAMS[sortKey],
    }),
    [debouncedSearch, joinedRange, minOrders, spentRange, maxSpent, sortKey]
  )
  useEffect(() => setPage(1), [params])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAdminCustomers({ ...params, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setCustomers(res.items)
        setTotal(res.total)
        setStats(res.stats)
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load customers'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [params, page, reloadKey])
  const load = () => setReloadKey((k) => k + 1)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAdminCustomersCsv(params)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      toast.success('Email copied to clipboard')
    } catch {
      toast.error('Failed to copy email')
    }
  }

  const activeFilterCount =
    (joinedRange.label !== ALL_TIME.label ? 1 : 0) +
    (minOrders !== 'all' ? 1 : 0) +
    (spentRange && (spentRange[0] > 0 || spentRange[1] < maxSpent) ? 1 : 0)

  const clearFilters = () => {
    setJoinedRange(ALL_TIME)
    setMinOrders('all')
    setSpentRange(null)
  }

  return (
    <ProtectedRoute permission="customers.view">
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${total.toLocaleString('en-IN')} registered customer${total === 1 ? '' : 's'}${activeFilterCount || debouncedSearch ? ' match' : ''}`}
        actions={
          <>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Can permission="customers.export">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={total === 0 || exporting}>
              <FileDown className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export'}
            </Button>
          </Can>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Customers" value={total.toLocaleString('en-IN')} tone="primary" />
        <StatCard icon={Wallet} label="Net spent" value={formatPrice(stats.totalSpent)} subtitle="Paid orders, minus refunds" tone="mint" />
        <StatCard icon={ShoppingBag} label="Avg Orders / Customer" value={stats.avgOrders.toFixed(1)} tone="gold" />
        <StatCard icon={Crown} label="Loyal Customers (5+ orders)" value={stats.loyal} tone="violet" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-sm sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, or phone..." className="pl-10 h-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangeFilter value={joinedRange} onChange={setJoinedRange} />

        <Select value={minOrders} onValueChange={setMinOrders}>
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-40">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-muted-foreground flex-shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any orders</SelectItem>
            <SelectItem value="1">1+ orders</SelectItem>
            <SelectItem value="3">3+ orders</SelectItem>
            <SelectItem value="5">5+ orders</SelectItem>
            <SelectItem value="10">10+ orders</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 rounded-xl font-normal">
              <Wallet className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              {spentRange && (spentRange[0] > 0 || spentRange[1] < maxSpent) ? `${formatPrice(spentRange[0])} – ${formatPrice(spentRange[1])}` : 'Any spend'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <p className="text-sm font-medium mb-3">Total Spent</p>
            <DualRangeSlider value={sliderRange} onValueChange={setSliderRange} onValueCommit={setSpentRange} min={0} max={maxSpent} step={100} />
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

      <div className={cn(GLASS_PANEL, 'overflow-x-auto transition-opacity', loading && customers.length > 0 && 'opacity-60')} aria-busy={loading}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && customers.length === 0 ? (
              <TableLoadingRow colSpan={6} />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={load}>
                    <RefreshCw className="h-3.5 w-3.5" /> Try again
                  </Button>
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {activeFilterCount || debouncedSearch ? 'No customers match these filters' : 'No customers yet — they appear here when people sign up'}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/customers/${c.id}`} className="text-primary hover:underline flex items-center gap-1.5">
                      {c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Unnamed'}
                      {c.orderCount >= 5 && (
                        <span title="Loyal customer">
                          <Sparkles className="h-3.5 w-3.5 text-violet" />
                        </span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex flex-col gap-0.5">
                      {c.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                      {!c.email && !c.phone && '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.orderCount}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatPrice(c.totalSpent)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="View customer" asChild>
                        <Link href={`/admin/customers/${c.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {c.email && (
                        <>
                          <Button variant="ghost" size="icon" title="Copy email" onClick={() => handleCopyEmail(c.email!)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Email customer" asChild>
                            <a href={`mailto:${c.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
                      {c.phone && (
                        <Button variant="ghost" size="icon" title="Call customer" asChild>
                          <a href={`tel:${c.phone}`}>
                            <PhoneCall className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataTablePagination page={Math.min(page, pageCount)} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
    </ProtectedRoute>
  )
}
