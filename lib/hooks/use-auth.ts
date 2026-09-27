'use client'

import { useEffect, useState } from 'react'
import { getSession, onSessionChange, type AuthUser } from '@/lib/auth/session'
import { signOut as apiSignOut } from '@/lib/api/auth'

/** The signed-in user (or null), kept in sync across the app and other tabs. */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(getSession()?.user ?? null)
    setLoading(false)
    return onSessionChange((session) => {
      const next = session?.user ?? null
      // Keep the same reference for the same account, so a token refresh isn't treated as a new sign-in
      setUser((prev) => (prev && next && prev.id === next.id && prev.email === next.email ? prev : next))
    })
  }, [])

  const signOut = async () => {
    await apiSignOut('local')
    setUser(null)
  }

  return { user, loading, signOut }
}
