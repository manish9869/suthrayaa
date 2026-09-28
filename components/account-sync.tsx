'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useCartStore, useWishlistStore, type CartItem } from '@/lib/store'
import {
  getServerCart,
  getServerWishlist,
  replaceServerCart,
  replaceServerWishlist,
  type CartSyncLine,
  type ServerCartItem,
} from '@/lib/api/account'

// Keeps a signed-in customer's cart and wishlist in their account, so they follow them across
// devices. Guests keep the browser-only (localStorage) cart exactly as before.
//
//  • On sign-in: the browser cart/wishlist and the account's are merged once (a line in both keeps
//    the larger quantity, so re-signing-in on the same device never doubles items), and the
//    merged result is written back to the account.
//  • While signed in: every change is pushed (debounced) as a full replace.
//  • On sign-out: the browser copies are cleared, so the next person on a shared device
//    doesn't see them; they're safe in the account.

const SYNC_DELAY_MS = 800

const lineKey = (l: { productId: string; selectedColor?: string; customText?: string; customizations?: { customizationId: string; valueId?: string; textValue?: string }[] }) =>
  [
    l.productId,
    l.selectedColor ?? '',
    l.customText ?? '',
    (l.customizations ?? [])
      .map((c) => `${c.customizationId}:${c.valueId ?? ''}:${c.textValue ?? ''}`)
      .sort()
      .join('|'),
  ].join('~')

function toSyncLine(item: CartItem): CartSyncLine {
  return {
    productId: item.product.id,
    quantity: item.quantity,
    selectedColor: item.selectedColor || undefined,
    customText: item.customText || undefined,
    customizations: item.customizations?.map(({ customizationId, valueId, textValue }) => ({ customizationId, valueId, textValue })),
  }
}

function fromServerItem(s: ServerCartItem): CartItem {
  return {
    product: s.product,
    quantity: s.quantity,
    selectedColor: s.selectedColor ?? '',
    customText: s.customText || undefined,
    customizations: s.customizations.length
      ? s.customizations.map((c) => ({
          customizationId: c.customizationId,
          valueId: c.valueId,
          textValue: c.textValue,
          label: c.label,
          displayValue: c.valueLabel ?? c.textValue ?? '',
          priceAdjustment: c.priceAdjustment,
        }))
      : undefined,
  }
}

export function AccountSync() {
  const { user, loading } = useAuth()
  const syncedUserId = useRef<string | null>(null)
  const ready = useRef(false)

  // Sign-in merge / sign-out clear
  useEffect(() => {
    if (loading) return
    const userId = user?.id ?? null

    if (!userId) {
      if (syncedUserId.current) {
        // Transition from signed-in to signed-out (not a guest's first load)
        ready.current = false
        syncedUserId.current = null
        useCartStore.getState().clearCart()
        useWishlistStore.getState().clearWishlist()
      }
      return
    }
    if (syncedUserId.current === userId) return
    syncedUserId.current = userId
    ready.current = false

    let cancelled = false
    ;(async () => {
      try {
        const [serverCart, serverWishlist] = await Promise.all([getServerCart(), getServerWishlist()])
        if (cancelled) return

        // Cart: union by line, keeping the larger quantity for lines present on both sides
        const merged = new Map<string, CartItem>()
        for (const s of serverCart) merged.set(lineKey(toSyncLine(fromServerItem(s))), fromServerItem(s))
        for (const local of useCartStore.getState().items) {
          const key = lineKey(toSyncLine(local))
          const existing = merged.get(key)
          merged.set(key, existing ? { ...existing, quantity: Math.max(existing.quantity, local.quantity) } : local)
        }
        const mergedItems = [...merged.values()]
        useCartStore.setState({ items: mergedItems })

        // Wishlist: union by product id
        const wish = new Map(serverWishlist.map((p) => [p.id, p]))
        for (const p of useWishlistStore.getState().items) if (!wish.has(p.id)) wish.set(p.id, p)
        useWishlistStore.setState({ items: [...wish.values()] })

        await Promise.all([replaceServerCart(mergedItems.map(toSyncLine)), replaceServerWishlist([...wish.keys()])])
      } catch {
        // Offline / API hiccup: the local cart still works; changes sync on the next edit
      } finally {
        if (!cancelled) ready.current = true
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, loading])

  // Push changes while signed in
  useEffect(() => {
    let cartTimer: ReturnType<typeof setTimeout> | undefined
    let wishTimer: ReturnType<typeof setTimeout> | undefined

    const unsubCart = useCartStore.subscribe((state, prev) => {
      if (!ready.current || state.items === prev.items) return
      clearTimeout(cartTimer)
      cartTimer = setTimeout(() => {
        replaceServerCart(useCartStore.getState().items.map(toSyncLine)).catch(() => {})
      }, SYNC_DELAY_MS)
    })
    const unsubWish = useWishlistStore.subscribe((state, prev) => {
      if (!ready.current || state.items === prev.items) return
      clearTimeout(wishTimer)
      wishTimer = setTimeout(() => {
        replaceServerWishlist(useWishlistStore.getState().items.map((p) => p.id)).catch(() => {})
      }, SYNC_DELAY_MS)
    })

    return () => {
      clearTimeout(cartTimer)
      clearTimeout(wishTimer)
      unsubCart()
      unsubWish()
    }
  }, [])

  return null
}
