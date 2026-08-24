'use client'

import { useEffect, useState } from 'react'

/**
 * True only after the client has mounted. Zustand's persist middleware rehydrates
 * cart/wishlist state from localStorage synchronously on the client but not during SSR —
 * gating persisted-state-dependent UI behind this avoids a hydration mismatch between the
 * server's always-empty render and the client's localStorage-backed one.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
