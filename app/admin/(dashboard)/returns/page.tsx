'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/admin/page-header'
import { SegmentedControl } from '@/components/admin/segmented-control'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { EmptyState } from '@/components/admin/admin-bits'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { ReturnRequestCard } from '@/components/admin/return-request-card'
import { getAdminReturns, type AdminReturnListItem } from '@/lib/api/admin'
import { ApiError } from '@/lib/api/http'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { formatPrice } from '@/lib/data'
import { cn } from '@/lib/utils'

type Filter = 'open' | 'requested' | 'approved' | 'received' | 'refunded' | 'exchanged' | 'rejected' | 'all'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'requested', label: 'To review' },
  { value: 'approved', label: 'Awaiting parcel' },
  { value: 'received', label: 'Received' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'exchanged', label: 'Exchanged' },
  { value: 'rejected', label: 'Declined' },
  { value: 'all', label: 'All' },
]
const EMPTY: Record<Filter, string> = {
  open: 'Nothing waiting on you — new return and exchange requests show up here.',
  requested: 'No requests to review.',
  approved: 'No approved returns waiting for their parcel.',
  received: 'No received parcels waiting to be settled.',
  refunded: 'No refunded returns yet.',
  exchanged: 'No completed exchanges yet.',
  rejected: 'No declined requests.',
  all: 'No return or exchange requests yet.',
}
const PAGE_SIZE = 20

export default function AdminReturnsPage() {
  const [filter, setFilter] = useState<Filter>('open')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AdminReturnListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [openCount, setOpenCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getAdminReturns({ status: filter, page, limit: PAGE_SIZE })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
        setOpenCount(res.openCount)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load returns'))
      .finally(() => setLoading(false))
  }, [filter, page])
  useEffect(load, [load])

  if (items === null && !error) return <PageLoader />

  return (
    <ProtectedRoute permission="orders.view">
      <div className="space-y-6">
        <PageHeader
          title="Returns"
          description={openCount === 0 ? 'No open requests' : `${openCount} open request${openCount === 1 ? '' : 's'} · review, receive the parcel, then refund or send the replacement`}
          actions={
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
          }
        />

        <div className="overflow-x-auto">
          <SegmentedControl
            options={FILTERS}
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setPage(1)
            }}
          />
        </div>

        {error ? (
          <div className={GLASS_PANEL}>
            <EmptyState
              icon={RotateCcw}
              title="Returns couldn’t load"
              description={error}
              action={
                <Button variant="outline" onClick={load}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : items && items.length === 0 ? (
          <div className={GLASS_PANEL}>
            <EmptyState icon={RotateCcw} title="No requests here" description={EMPTY[filter]} />
          </div>
        ) : (
          <div className={cn(GLASS_PANEL, 'transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
            <ul className="divide-y">
              {items?.map((r) => (
                <li key={r.id} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="min-w-0 text-sm">
                    <Link href={`/admin/orders/${r.order.id}`} className="font-mono font-semibold hover:text-primary">
                      {r.order.orderNumber}
                    </Link>
                    <p className="mt-0.5 truncate">{r.order.customerName ?? 'Guest'}</p>
                    {r.order.customerEmail && <p className="truncate text-xs text-muted-foreground">{r.order.customerEmail}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatPrice(r.order.total)} · {r.order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}
                      {r.order.refundedAmount > 0 && ` · ${formatPrice(r.order.refundedAmount)} refunded`}
                    </p>
                  </div>
                  <ReturnRequestCard request={r} orderHref={`/admin/orders/${r.order.id}`} onChanged={load} className="border-0 bg-muted/40" />
                </li>
              ))}
            </ul>
            <DataTablePagination page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
