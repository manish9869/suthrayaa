'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { getAdminRoles, deleteAdminRole, type AdminRoleListItem } from '@/lib/api/rbac'

function RolesPageContent() {
  const [roles, setRoles] = useState<AdminRoleListItem[] | null>(null)
  const load = () => getAdminRoles().then(setRoles)
  useEffect(() => {
    load()
  }, [])

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Users &amp; Roles</h1>
          <p className="text-muted-foreground text-sm">{roles ? `${roles.length} roles` : 'Loading...'}</p>
        </div>
        <div className="flex items-center gap-2">
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
                <Plus className="h-4 w-4 mr-2" /> Create Role
              </Link>
            </Button>
          </Can>
        </div>
      </div>

      <div className={`${GLASS_PANEL} overflow-hidden`}>
        {!roles ? (
          <PageLoader label="Loading roles..." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id} className="border-white/10">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {r.name}
                      {r.isSystemRole && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{r.description}</TableCell>
                  <TableCell>{r.userCount}</TableCell>
                  <TableCell>{r.permissionCount}</TableCell>
                  <TableCell>
                    <Badge variant={r.isSystemRole ? 'outline' : 'secondary'}>{r.isSystemRole ? 'System' : 'Custom'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/roles/${r.id}`}>{r.isSystemRole ? 'View' : 'Edit'}</Link>
                      </Button>
                      {!r.isSystemRole && (
                        <Can permission="roles.delete">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} disabled={r.userCount > 0}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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
