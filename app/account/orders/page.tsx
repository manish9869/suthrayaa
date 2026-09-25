'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Package, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountPageHeader, EmptyBlock, useAccount } from '@/components/account/account-shell'
import { OrderCard, OrderCardSkeleton } from '@/components/account/order-card'
import { getOrders, type OrderSummary } from '@/lib/api/account'
import { usePayOrder } from '@/lib/use-pay-order'
import { cn } from '@/lib/utils'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'In progress', statuses: ['pending_payment', 'confirmed', 'in_production', 'ready', 'shipped'] },
  { key: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'refunded', 'partially_refunded'] },
] as const

export default function OrdersPage() {
  const { profile, email } = useAccount()
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [query, setQuery] = useState('')

  const load = useCallback(() => {
    setError(false)
    getOrders()
      .then(setOrders)
      .catch(() => setError(true))
  }, [])
  useEffect(load, [load])
  const { pay } = usePayOrder(load)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const f of FILTERS) c[f.key] = f.key === 'all' ? orders?.length ?? 0 : orders?.filter((o) => (f as { statuses: readonly string[] }).statuses.includes(o.status)).length ?? 0
    return c
  }, [orders])

  const shown = useMemo(() => {
    let list = orders ?? []
    const f = FILTERS.find((x) => x.key === filter)
    if (f && 'statuses' in f) list = list.filter((o) => (f.statuses as readonly string[]).includes(o.status))
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((o) => o.orderNumber.toLowerCase().includes(q) || o.previewItems.some((i) => i.name.toLowerCase().includes(q)))
    return list
  }, [orders, filter, query])

  return (
    <>
      <AccountPageHeader title="My orders" description="Track, pay for and download invoices for every order." />

      {orders && orders.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  filter === f.key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40'
                )}
              >
                {f.label}
                <span className={cn('ml-1.5 text-xs', filter === f.key ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders or items" className="h-10 rounded-full bg-card pl-10" aria-label="Search orders" />
          </div>
        </div>
      )}

      {error ? (
        <EmptyBlock
          icon={RotateCcw}
          title="Couldn’t load your orders"
          text="Please check your connection and try again."
          action={<Button onClick={load} className="rounded-full">Try again</Button>}
        />
      ) : !orders ? (
        <div className="space-y-4">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      ) : orders.length === 0 ? (
        <EmptyBlock
          icon={Package}
          title="No orders yet"
          text="When you place an order, you’ll be able to track it and download its invoice here."
          action={
            <Button asChild className="rounded-full">
              <Link href="/shop">Start shopping</Link>
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyBlock icon={Search} title="No matching orders" text="Try a different filter or search term." action={<Button variant="outline" className="rounded-full" onClick={() => { setFilter('all'); setQuery('') }}>Clear filters</Button>} />
      ) : (
        <div className="space-y-4">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} onPay={(ord) => pay(ord.id, { name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' '), email: email ?? undefined, contact: profile?.phone ?? undefined })} />
          ))}
        </div>
      )}
    </>
  )
}
