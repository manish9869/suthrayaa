'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CreditCard, Heart, MapPin, Package, ShieldCheck, Truck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/components/account/account-shell'
import { OrderCard, OrderCardSkeleton } from '@/components/account/order-card'
import { AddressLines } from '@/components/account/address-card'
import { getAddresses, getOrders, type OrderSummary, type SavedAddress } from '@/lib/api/account'
import { useWishlistStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { usePayOrder } from '@/lib/use-pay-order'
import { formatPrice } from '@/lib/data'

const ACTIVE = ['pending_payment', 'confirmed', 'in_production', 'ready', 'shipped']

function Stat({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="group rounded-3xl border bg-card p-4 transition-shadow hover:shadow-[0_14px_40px_-24px_rgb(49_32_140/0.35)] sm:p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-serif text-2xl tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
        {label} <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </Link>
  )
}

export default function AccountOverviewPage() {
  const { profile, email } = useAccount()
  const hydrated = useHydrated()
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null)

  const load = useCallback(() => {
    getOrders().then(setOrders).catch(() => setOrders([]))
    getAddresses().then(setAddresses).catch(() => setAddresses([]))
  }, [])
  useEffect(load, [load])
  const { pay } = usePayOrder(load)

  const awaiting = orders?.filter((o) => o.canPay) ?? []
  const active = orders?.filter((o) => ACTIVE.includes(o.status)).length ?? 0
  const spent = orders?.filter((o) => o.paymentStatus === 'paid' || o.status === 'delivered').reduce((s, o) => s + o.total, 0) ?? 0
  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0]
  const profileIncomplete = !profile?.firstName || !profile?.lastName || !profile?.phone
  const prefill = { name: [profile?.firstName, profile?.lastName].filter(Boolean).join(' '), email: email ?? undefined, contact: profile?.phone ?? undefined }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={Package} label="Orders" value={orders ? orders.length : '–'} href="/account/orders" />
        <Stat icon={Truck} label="In progress" value={orders ? active : '–'} href="/account/orders" />
        <Stat icon={Heart} label="Wishlist" value={hydrated ? wishlistCount : '–'} href="/wishlist" />
        <Stat icon={CreditCard} label="Spent with us" value={orders ? formatPrice(spent) : '–'} href="/account/orders" />
      </div>

      {awaiting.length > 0 && (
        <section className="rounded-3xl border border-amber-400/40 bg-amber-50/70 p-5 dark:bg-amber-500/10">
          <h3 className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
            <CreditCard className="h-4 w-4" /> {awaiting.length === 1 ? 'An order is' : `${awaiting.length} orders are`} waiting for payment
          </h3>
          <ul className="mt-3 space-y-2">
            {awaiting.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm">
                <span>
                  <span className="font-semibold tabular-nums">{o.orderNumber}</span>
                  <span className="text-muted-foreground"> · {formatPrice(o.total)}</span>
                </span>
                <Button size="sm" className="h-9 rounded-full" onClick={() => pay(o.id, prefill)}>
                  Pay now
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-2xl">Recent orders</h2>
          {orders && orders.length > 0 && (
            <Link href="/account/orders" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        {!orders ? (
          <OrderCardSkeleton />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">You haven’t placed an order yet</p>
              <p className="text-sm text-muted-foreground">Handmade crochet flowers, bags and gifts — made to order.</p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/shop">Browse the shop</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 2).map((o) => (
              <OrderCard key={o.id} order={o} onPay={(ord) => pay(ord.id, prefill)} />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Default delivery address
            </h3>
            <Link href="/account/addresses" className="text-sm font-semibold text-primary hover:underline">
              {defaultAddress ? 'Manage' : 'Add'}
            </Link>
          </div>
          {!addresses ? (
            <div className="h-20 animate-pulse rounded-2xl bg-muted/70" />
          ) : defaultAddress ? (
            <AddressLines a={defaultAddress} />
          ) : (
            <p className="text-sm text-muted-foreground">Save an address to check out in seconds.</p>
          )}
        </section>

        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <UserRound className="h-4 w-4 text-primary" /> Account details
          </h3>
          <p className="text-sm">{[profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || '—'}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          {profile?.phone && <p className="text-sm text-muted-foreground">+91 {profile.phone.replace(/\D/g, '').slice(-10)}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant={profileIncomplete ? 'default' : 'outline'} className="h-9 rounded-full">
              <Link href="/account/profile">{profileIncomplete ? 'Complete your profile' : 'Edit profile'}</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-9 rounded-full">
              <Link href="/account/security">
                <ShieldCheck className="h-4 w-4" /> Password
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
