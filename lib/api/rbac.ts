import { apiFetch } from './http'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

async function token(): Promise<string | undefined> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, token: await token(), revalidate: false })
}

// ---- Users ----
export interface AdminRoleRef {
  id: string
  name: string
  slug: string
}
export interface AdminUserListItem {
  id: string
  displayName: string | null
  email: string | null
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  roles: AdminRoleRef[]
}
export interface AdminUserDetail extends AdminUserListItem {
  permissions: string[]
  isSuperAdmin: boolean
}
export const getAdminUsers = () => adminFetch<AdminUserListItem[]>('/admin/users')
export const getAdminUser = (id: string) => adminFetch<AdminUserDetail>(`/admin/users/${id}`)
export const updateAdminUser = (id: string, input: { displayName?: string; isActive?: boolean }) =>
  adminFetch<{ id: string; displayName: string | null; isActive: boolean }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
export const deleteAdminUser = (id: string) => adminFetch<void>(`/admin/users/${id}`, { method: 'DELETE' })
export const assignUserRole = (id: string, roleId: string) =>
  adminFetch<{ ok: boolean }>(`/admin/users/${id}/roles`, { method: 'POST', body: JSON.stringify({ roleId }) })
export const removeUserRole = (id: string, roleId: string) =>
  adminFetch<void>(`/admin/users/${id}/roles/${roleId}`, { method: 'DELETE' })
export const resetUserPassword = (id: string) => adminFetch<{ ok: boolean }>(`/admin/users/${id}/reset-password`, { method: 'POST' })

export interface InviteAdminInput {
  email: string
  roleIds: string[]
}
export interface InviteAdminResult {
  inviteUrl: string
  email: string
  roles: AdminRoleRef[]
  expiresAt: string
}
export const inviteAdminUser = (input: InviteAdminInput) =>
  adminFetch<InviteAdminResult>('/admin/users/invite', { method: 'POST', body: JSON.stringify(input) })

// ---- Roles ----
export interface AdminRoleListItem {
  id: string
  name: string
  slug: string
  description: string | null
  isSystemRole: boolean
  permissionCount: number
  userCount: number
}
export interface AdminRoleDetail {
  id: string
  name: string
  slug: string
  description: string | null
  isSystemRole: boolean
  permissions: string[]
}
export const getAdminRoles = () => adminFetch<AdminRoleListItem[]>('/admin/roles')
export const getAdminRole = (id: string) => adminFetch<AdminRoleDetail>(`/admin/roles/${id}`)
export const createAdminRole = (input: { name: string; description?: string; permissions: string[] }) =>
  adminFetch<AdminRoleDetail>('/admin/roles', { method: 'POST', body: JSON.stringify(input) })
export const updateAdminRole = (id: string, input: { name?: string; description?: string }) =>
  adminFetch<AdminRoleDetail>(`/admin/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteAdminRole = (id: string) => adminFetch<void>(`/admin/roles/${id}`, { method: 'DELETE' })
export const updateRolePermissions = (id: string, permissions: string[]) =>
  adminFetch<{ id: string; permissions: string[] }>(`/admin/roles/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  })

// ---- Permission catalog ----
export interface PermissionDef {
  id: string
  name: string
  slug: string
  resource: string
  action: string
  description: string | null
  group: string
}
export const getPermissionCatalog = () => adminFetch<PermissionDef[]>('/admin/permissions')

// ---- Audit logs ----
export interface AuditLogEntry {
  id: string
  userId: string | null
  userName: string
  action: string
  resource: string
  resourceId: string | null
  permission: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
export const getAuditLogs = (
  params: { userId?: string; action?: string; resource?: string; from?: string; to?: string; page?: number; limit?: number } = {}
) => {
  const q = new URLSearchParams()
  if (params.userId) q.set('userId', params.userId)
  if (params.action) q.set('action', params.action)
  if (params.resource) q.set('resource', params.resource)
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.page) q.set('page', String(params.page))
  q.set('limit', String(params.limit ?? 50))
  return adminFetch<{ items: AuditLogEntry[]; total: number; page: number; limit: number }>(`/admin/audit-logs?${q.toString()}`)
}

// ---- Invite acceptance (public, unauthenticated — the invitee has no session yet) ----
export interface InviteDetails {
  email: string
  roleNames: string[]
}
export const verifyInvite = (invitationToken: string) =>
  apiFetch<InviteDetails>(`/admin/invites/${invitationToken}`, { revalidate: false })
export const acceptInvite = (invitationToken: string, password: string) =>
  apiFetch<{ ok: boolean }>(`/admin/invites/${invitationToken}/accept`, {
    method: 'POST',
    body: JSON.stringify({ password }),
    revalidate: false,
  })
