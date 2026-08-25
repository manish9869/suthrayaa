'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getAdminMe, type AdminMe, type AdminRoleRef } from '@/lib/api/admin'
import { useAuth } from '@/lib/hooks/use-auth'

interface RbacContextValue {
  admin: AdminMe | null
  /** True while the Supabase session or the /admin/me profile is still loading. */
  loading: boolean
  /** True once loading has finished and this account has no admin access at all. */
  denied: boolean
  isSuperAdmin: boolean
  roles: AdminRoleRef[]
  hasPermission: (slug: string) => boolean
  hasAnyPermission: (slugs: string[]) => boolean
  hasAllPermissions: (slugs: string[]) => boolean
  hasRole: (slug: string) => boolean
  refresh: () => Promise<void>
}

const RbacContext = createContext<RbacContextValue | null>(null)

// This is a UX convenience only — every permission it reports is re-checked by the backend
// on every request. Hiding a nav item or button here never substitutes for server-side
// enforcement; see requirePermission on the backend for the actual authorization boundary.
export function RbacProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [admin, setAdmin] = useState<AdminMe | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  const load = useCallback(async () => {
    try {
      const me = await getAdminMe()
      setAdmin(me)
      setDenied(false)
    } catch {
      setAdmin(null)
      setDenied(true)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setAdmin(null)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    load()
  }, [user, authLoading, load])

  const permissions = new Set(admin?.permissions ?? [])
  const isSuperAdmin = admin?.isSuperAdmin ?? false

  const value: RbacContextValue = {
    admin,
    loading: authLoading || profileLoading,
    denied,
    isSuperAdmin,
    roles: admin?.roles ?? [],
    hasPermission: (slug) => isSuperAdmin || permissions.has(slug),
    hasAnyPermission: (slugs) => isSuperAdmin || slugs.some((s) => permissions.has(s)),
    hasAllPermissions: (slugs) => isSuperAdmin || slugs.every((s) => permissions.has(s)),
    hasRole: (slug) => (admin?.roles ?? []).some((r) => r.slug === slug),
    refresh: load,
  }

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>
}

export function useRbac(): RbacContextValue {
  const ctx = useContext(RbacContext)
  if (!ctx) throw new Error('useRbac must be used within an RbacProvider')
  return ctx
}
