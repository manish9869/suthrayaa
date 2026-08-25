'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Lock, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PermissionGroupEditor } from '@/components/admin/permission-group-editor'
import { getAdminRole, updateAdminRole, updateRolePermissions, getPermissionCatalog, type AdminRoleDetail, type PermissionDef } from '@/lib/api/rbac'

function RoleDetailContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [role, setRole] = useState<AdminRoleDetail | null>(null)
  const [catalog, setCatalog] = useState<PermissionDef[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getAdminRole(params.id), getPermissionCatalog()]).then(([r, cat]) => {
      setRole(r)
      setCatalog(cat)
      setName(r.name)
      setDescription(r.description ?? '')
      setPermissions(r.permissions)
    })
  }, [params.id])

  const handleSave = async () => {
    if (!role) return
    setSaving(true)
    try {
      await updateAdminRole(role.id, { name, description })
      await updateRolePermissions(role.id, permissions)
      toast.success('Role updated')
      router.push('/admin/roles')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  if (!role) return <PageLoader label="Loading role..." />

  const readOnly = role.isSystemRole

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/roles')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Roles
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-serif font-bold">
            {role.name}
            {readOnly && <Lock className="h-4 w-4 text-muted-foreground" />}
          </h1>
          {readOnly && (
            <p className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">
                System Role
              </Badge>
              Default roles are read-only so the RBAC seed can always re-assert them. Create a custom role instead if you need something different.
            </p>
          )}
        </div>
        {!readOnly && (
          <Can permission="roles.update">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Can>
        )}
      </div>

      <div className={`${GLASS_PANEL} p-6 space-y-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={readOnly} rows={1} />
          </div>
        </div>

        <div>
          <p className="mb-4 text-sm font-medium">Permissions ({permissions.length})</p>
          <PermissionGroupEditor catalog={catalog} selected={permissions} onChange={setPermissions} readOnly={readOnly} />
        </div>
      </div>
    </div>
  )
}

export default function RoleDetailPage() {
  return (
    <ProtectedRoute permission="roles.view">
      <RoleDetailContent />
    </ProtectedRoute>
  )
}
