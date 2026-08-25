'use client'

import { useRbac } from '@/lib/rbac/rbac-context'

/** `usePermission("products.create")` — true if the current admin can perform this action. */
export function usePermission(permission: string): boolean {
  return useRbac().hasPermission(permission)
}

export function useHasAnyPermission(permissions: string[]): boolean {
  return useRbac().hasAnyPermission(permissions)
}

export function useHasAllPermissions(permissions: string[]): boolean {
  return useRbac().hasAllPermissions(permissions)
}

export function useHasRole(slug: string): boolean {
  return useRbac().hasRole(slug)
}

export function useIsSuperAdmin(): boolean {
  return useRbac().isSuperAdmin
}
