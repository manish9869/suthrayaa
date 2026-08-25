'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MoreHorizontal, Copy, Check, KeyRound, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { useRbac } from '@/lib/rbac/rbac-context'
import {
  getAdminUsers,
  getAdminRoles,
  inviteAdminUser,
  updateAdminUser,
  deleteAdminUser,
  assignUserRole,
  removeUserRole,
  resetUserPassword,
  type AdminUserListItem,
  type AdminRoleListItem,
} from '@/lib/api/rbac'

function formatDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function UsersPageContent() {
  const { admin: currentAdmin, isSuperAdmin } = useRbac()
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null)
  const [roles, setRoles] = useState<AdminRoleListItem[]>([])

  const load = () => {
    getAdminUsers().then(setUsers)
    getAdminRoles().then(setRoles)
  }
  useEffect(load, [])

  // ---- Invite dialog ----
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleIds, setInviteRoleIds] = useState<string[]>([])
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const closeInvite = () => {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteRoleIds([])
    setInviteLink(null)
    setLinkCopied(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteRoleIds.length) {
      toast.error('Enter an email and select at least one role')
      return
    }
    setInviting(true)
    try {
      const result = await inviteAdminUser({ email: inviteEmail.trim(), roleIds: inviteRoleIds })
      setInviteLink(result.inviteUrl)
      toast.success('Invite created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setInviting(false)
    }
  }

  const copyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setLinkCopied(true)
    toast.success('Link copied')
  }

  // ---- Edit dialog (display name, active status, role assignment) ----
  const [editUser, setEditUser] = useState<AdminUserListItem | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editRoleIds, setEditRoleIds] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  const openEdit = (u: AdminUserListItem) => {
    setEditUser(u)
    setEditDisplayName(u.displayName ?? '')
    setEditRoleIds(u.roles.map((r) => r.id))
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setSavingEdit(true)
    try {
      if (editDisplayName !== (editUser.displayName ?? '')) {
        await updateAdminUser(editUser.id, { displayName: editDisplayName })
      }
      const currentIds = new Set(editUser.roles.map((r) => r.id))
      const nextIds = new Set(editRoleIds)
      for (const id of nextIds) if (!currentIds.has(id)) await assignUserRole(editUser.id, id)
      for (const id of currentIds) if (!nextIds.has(id)) await removeUserRole(editUser.id, id)
      toast.success('User updated')
      setEditUser(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSavingEdit(false)
    }
  }

  const toggleActive = async (u: AdminUserListItem) => {
    try {
      await updateAdminUser(u.id, { isActive: !u.isActive })
      toast.success(u.isActive ? 'User deactivated' : 'User activated')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleResetPassword = async (u: AdminUserListItem) => {
    if (!confirm(`Send a password reset link to ${u.email ?? u.displayName}?`)) return
    try {
      await resetUserPassword(u.id)
      toast.success('Password reset email sent')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email')
    }
  }

  const handleDelete = async (u: AdminUserListItem) => {
    if (!confirm(`Permanently delete ${u.displayName ?? u.email}? This removes their admin access entirely and cannot be undone.`)) return
    try {
      await deleteAdminUser(u.id)
      toast.success('User deleted')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const selectableRoles = useMemo(() => (isSuperAdmin ? roles : roles.filter((r) => r.slug !== 'super-admin')), [roles, isSuperAdmin])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Users &amp; Roles</h1>
          <p className="text-muted-foreground text-sm">{users ? `${users.length} admin users` : 'Loading...'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users" asChild>
                <Link href="/admin/users">Users</Link>
              </TabsTrigger>
              <TabsTrigger value="roles" asChild>
                <Link href="/admin/roles">Roles</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Can permission="users.create">
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Invite Admin
            </Button>
          </Can>
        </div>
      </div>

      <div className={`${GLASS_PANEL} overflow-hidden`}>
        {!users ? (
          <PageLoader label="Loading users..." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No admin users yet
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className="border-white/10">
                    <TableCell className="font-medium">
                      {u.displayName ?? '—'}
                      {u.id === currentAdmin?.id && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length ? (
                          u.roles.map((r) => (
                            <Badge key={r.id} variant="secondary" className="text-[10px]">
                              {r.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? 'secondary' : 'outline'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(u.lastLoginAt)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Can anyOf={['users.update', 'users.assign_role']}>
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <ShieldCheck className="h-4 w-4 mr-2" /> Edit &amp; Manage Roles
                            </DropdownMenuItem>
                          </Can>
                          <Can permission="users.update">
                            <DropdownMenuItem onClick={() => toggleActive(u)} disabled={u.id === currentAdmin?.id}>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(u)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Send Password Reset
                            </DropdownMenuItem>
                          </Can>
                          <Can permission="users.delete">
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(u)}
                              disabled={u.id === currentAdmin?.id}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </Can>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => (o ? setInviteOpen(true) : closeInvite())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Admin</DialogTitle>
            <DialogDescription>
              They'll get a one-time link to set their own password. Nobody, including you, ever sees or sets it for them.
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share this link with <strong>{inviteEmail}</strong>. It expires in 7 days and can only be used once.
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteLink} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="new-admin@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="space-y-2 max-h-56 overflow-y-auto rounded-md border p-3">
                  {selectableRoles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={inviteRoleIds.includes(r.id)}
                        onCheckedChange={(c) =>
                          setInviteRoleIds((prev) => (c ? [...prev, r.id] : prev.filter((id) => id !== r.id)))
                        }
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {inviteLink ? (
              <Button onClick={closeInvite}>Done</Button>
            ) : (
              <Button onClick={handleInvite} disabled={inviting}>
                {inviting ? 'Creating...' : 'Create Invite'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editUser?.displayName ?? editUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Can permission="users.update">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
              </div>
            </Can>
            <Can permission="users.assign_role">
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="space-y-2 max-h-56 overflow-y-auto rounded-md border p-3">
                  {selectableRoles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={editRoleIds.includes(r.id)}
                        onCheckedChange={(c) => setEditRoleIds((prev) => (c ? [...prev, r.id] : prev.filter((id) => id !== r.id)))}
                      />
                      {r.name}
                    </label>
                  ))}
                  {editUser?.roles.some((r) => r.slug === 'super-admin') && !isSuperAdmin && (
                    <p className="text-xs text-muted-foreground">This user holds Super Admin — only a Super Admin can change that.</p>
                  )}
                </div>
              </div>
            </Can>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute permission="users.view">
      <UsersPageContent />
    </ProtectedRoute>
  )
}
