'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Lock, ShieldCheck, Users, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { SortableTh } from '@/components/admin/sortable-th'
import { useSortableData } from '@/lib/hooks/use-sortable-data'
import { getAdminRoles, deleteAdminRole, type AdminRoleListItem } from '@/lib/api/rbac'
import { PageHeader } from '@/components/admin/page-header'
import { StatusDot } from '@/components/admin/status-dot'

function RolesPageContent() {
  const [roles, setRoles] = useState<AdminRoleListItem[] | null>(null)
  const load = () => getAdminRoles().then(setRoles)
  useEffect(() => {
    load()
  }, [])

  const { sorted, sortKey, direction, toggleSort } = useSortableData<AdminRoleListItem>(
    roles ?? [],
    {
      name: (r) => r.name,
      users: (r) => r.userCount,
      permissions: (r) => r.permissionCount,
      status: (r) => (r.isSystemRole ? 0 : 1),
    },
    { key: 'name', direction: 'asc' }
  )

  const handleDelete = async (r: AdminRoleListItem) => {
    if (!confirm(`Delete the "${r.name}" role? This cannot be undone.`)) return
    try {
      await deleteAdminRole(r.id)
      toast.success('Role deleted')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Roles"
        description={roles ? `${roles.length} roles · permissions are grouped by area` : 'Loading...'}
        actions={
          <>
          <Tabs defaultValue="roles">
            <TabsList>
              <TabsTrigger value="users" asChild>
                <Link href="/admin/users">Users</Link>
              </TabsTrigger>
              <TabsTrigger value="roles" asChild>
                <Link href="/admin/roles">Roles</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Can permission="roles.create">
            <Button asChild>
              <Link href="/admin/roles/new">
                <Plus className="h-4 w-4" /> Create Role
              </Link>
            </Button>
          </Can>
          </>
        }
      />

      <div className={`${GLASS_PANEL} overflow-hidden`}>
        {!roles ? (
          <PageLoader label="Loading roles..." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <SortableTh label="Role" sortKey="name" activeKey={sortKey} direction={direction} onSort={toggleSort} className="pl-5" />
                <SortableTh label="Users" sortKey="users" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Permissions" sortKey="permissions" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTh label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          r.isSystemRole ? 'bg-violet/10 text-violet' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {r.isSystemRole ? <Lock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{r.name}</p>
                        <p className="max-w-md truncate text-xs text-muted-foreground">{r.description || '—'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" /> {r.userCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> {r.permissionCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusDot label={r.isSystemRole ? 'System' : 'Custom'} tone={r.isSystemRole ? 'violet' : 'primary'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/roles/${r.id}`}>{r.isSystemRole ? 'View' : 'Edit'}</Link>
                      </Button>
                      {!r.isSystemRole && (
                        <Can permission="roles.delete">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} disabled={r.userCount > 0}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </Can>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

export default function AdminRolesPage() {
  return (
    <ProtectedRoute permission="roles.view">
      <RolesPageContent />
    </ProtectedRoute>
  )
}
