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
import { getAdminCustomers, type AdminCustomer } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { DateRangeFilter, type DateRangeValue } from '@/components/admin/date-range-filter'
import { StatCard } from '@/components/admin/stat-card'
import { GLASS_PANEL, exportRowsToCsv } from '@/lib/admin-ui'
import { toast } from 'sonner'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { usePaginated } from '@/lib/hooks/use-paginated'
import { TableLoadingRow } from '@/components/admin/loading-state'

const ALL_TIME: DateRangeValue = { days: 3650, label: 'Any time joined' }

type SortKey = 'newest' | 'oldest' | 'spent_desc' | 'orders_desc' | 'name_asc'
const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  spent_desc: 'Highest Spent',
  orders_desc: 'Most Orders',
  name_asc: 'Name (A–Z)',
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [joinedRange, setJoinedRange] = useState<DateRangeValue>(ALL_TIME)
  const [minOrders, setMinOrders] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')

  const maxSpent = useMemo(() => Math.max(1000, ...customers.map((c) => Math.ceil(c.totalSpent / 100) * 100)), [customers])
  const [spentRange, setSpentRange] = useState<[number, number]>([0, 100000])
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, 100000])
  useEffect(() => setSliderRange(spentRange), [spentRange])
  useEffect(() => {
    setSpentRange([0, maxSpent])
    setSliderRange([0, maxSpent])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers.length])

  const load = () => {
    setLoading(true)
    getAdminCustomers({ limit: 300 })
      .then((res) => setCustomers(res.items))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const sinceCutoff = useMemo(() => {
    if (joinedRange.from) return new Date(joinedRange.from).getTime()
    if (joinedRange.days && joinedRange.days < 3650) {
      const d = new Date()
      d.setDate(d.getDate() - joinedRange.days)
      return d.getTime()
    }
    return null
  }, [joinedRange])
  const untilCutoff = useMemo(() => (joinedRange.to ? new Date(`${joinedRange.to}T23:59:59`).getTime() : null), [joinedRange])

  const filtered = useMemo(() => {
    let result = [...customers]
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((c) => {
        const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase()
        return name.includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.phone ?? '').includes(q)
      })
    }
    if (sinceCutoff != null) result = result.filter((c) => new Date(c.createdAt).getTime() >= sinceCutoff)
    if (untilCutoff != null) result = result.filter((c) => new Date(c.createdAt).getTime() <= untilCutoff)
    if (minOrders !== 'all') {
      const n = Number(minOrders)
      result = result.filter((c) => c.orderCount >= n)
    }
    result = result.filter((c) => c.totalSpent >= spentRange[0] && c.totalSpent <= spentRange[1])

    result.sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'spent_desc':
          return b.totalSpent - a.totalSpent
        case 'orders_desc':
          return b.orderCount - a.orderCount
        case 'name_asc':
          return `${a.firstName ?? ''}${a.lastName ?? ''}`.localeCompare(`${b.firstName ?? ''}${b.lastName ?? ''}`)
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
    return result
  }, [customers, search, sinceCutoff, untilCutoff, minOrders, spentRange, sortKey])

  const { pageItems, page, setPage, pageCount, total: pageTotal } = usePaginated(filtered, 15)

  const stats = useMemo(
    () => ({
      totalSpent: filtered.reduce((sum, c) => sum + c.totalSpent, 0),
      avgOrders: filtered.length ? filtered.reduce((sum, c) => sum + c.orderCount, 0) / filtered.length : 0,
      loyal: filtered.filter((c) => c.orderCount >= 5).length,
    }),
    [filtered]
  )

  const handleExport = () => {
    exportRowsToCsv(
      `customers-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Email', 'Phone', 'Orders', 'Total Spent', 'Joined'],
      filtered.map((c) => [
        c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Unnamed',
        c.email ?? '',
        c.phone ?? '',
        c.orderCount,
        c.totalSpent,
        new Date(c.createdAt).toLocaleDateString('en-IN'),
      ])
    )
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
    (spentRange[0] > 0 || spentRange[1] < maxSpent ? 1 : 0)

  const clearFilters = () => {
    setJoinedRange(ALL_TIME)
    setMinOrders('all')
    setSpentRange([0, maxSpent])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {customers.length} registered
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
        <StatCard icon={Users} label={`Shown of ${customers.length}`} value={filtered.length} tone="primary" />
        <StatCard icon={Wallet} label="Total Spent (shown)" value={formatPrice(stats.totalSpent)} tone="mint" />
        <StatCard icon={ShoppingBag} label="Avg Orders / Customer" value={stats.avgOrders.toFixed(1)} tone="gold" />
        <StatCard icon={Crown} label="Loyal Customers (5+ orders)" value={stats.loyal} tone="violet" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, or phone..." className="pl-10 rounded-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="rounded-full w-44">
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
          <SelectTrigger className="rounded-full w-40">
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
            <Button variant="outline" className="rounded-full font-normal">
              <Wallet className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              {spentRange[0] > 0 || spentRange[1] < maxSpent ? `${formatPrice(spentRange[0])} – ${formatPrice(spentRange[1])}` : 'Any spend'}
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

      <div className={`${GLASS_PANEL} overflow-x-auto`}>
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
            {loading ? (
              <TableLoadingRow colSpan={6} />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No customers match these filters
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link href={`/admin/customers/${c.id}`} className="text-primary hover:underline flex items-center gap-1.5">
                      {c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Unnamed'}
                      {c.orderCount >= 5 && (
                        <span title="Loyal customer">
                          <Sparkles className="h-3.5 w-3.5 text-secondary" />
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
        <DataTablePagination page={page} pageCount={pageCount} total={pageTotal} pageSize={15} onPageChange={setPage} />
      </div>
    </div>
  )
}
