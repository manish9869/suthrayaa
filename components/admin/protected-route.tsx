'use client'

import type { ReactNode } from 'react'
import { useRbac } from '@/lib/rbac/rbac-context'
import { AccessDenied } from './access-denied'
import { Spinner } from '@/components/ui/spinner'

interface ProtectedRouteProps {
  children: ReactNode
  /** Requires this single permission. */
  permission?: string
  /** Requires at least one of these permissions. */
  anyOf?: string[]
  /** Requires all of these permissions. */
  allOf?: string[]
}

/** Wraps a page's content so navigating straight to its URL is blocked with the 403 page
 * instead of a broken/empty page. This is UX only — the backend independently rejects the
 * underlying API calls regardless of what this component decides. */
export function ProtectedRoute({ children, permission, anyOf, allOf }: ProtectedRouteProps) {
  const { loading, hasPermission, hasAnyPermission, hasAllPermissions } = useRbac()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  const allowed =
    (permission ? hasPermission(permission) : true) &&
    (anyOf ? hasAnyPermission(anyOf) : true) &&
    (allOf ? hasAllPermissions(allOf) : true)

  if (!allowed) return <AccessDenied variant="inline" />

  return <>{children}</>
}
