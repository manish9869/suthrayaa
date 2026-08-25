'use client'

import type { ReactNode } from 'react'
import { useRbac } from '@/lib/rbac/rbac-context'

interface CanProps {
  children: ReactNode
  permission?: string
  anyOf?: string[]
  allOf?: string[]
  /** Rendered instead of children when the permission check fails (e.g. a disabled-looking
   * placeholder). Omit to render nothing — the default, and what the spec asks for on
   * destructive actions (hide, don't just disable). */
  fallback?: ReactNode
}

/** `<Can permission="products.delete"><Button>Delete</Button></Can>` — button/section-level
 * gating. UX only; the backend enforces the same permission independently on the request
 * this button would trigger. */
export function Can({ children, permission, anyOf, allOf, fallback = null }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRbac()

  const allowed =
    (permission ? hasPermission(permission) : true) &&
    (anyOf ? hasAnyPermission(anyOf) : true) &&
    (allOf ? hasAllPermissions(allOf) : true)

  return <>{allowed ? children : fallback}</>
}
