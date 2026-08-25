'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Lock, ArrowLeft, ShieldCheck, Pencil, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PermissionGroupEditor } from '@/components/admin/permission-group-editor'
import {
  getAdminRole,
  updateAdminRole,
  updateRolePermissions,
  createAdminRole,
  getPermissionCatalog,
  type AdminRoleDetail,
  type PermissionDef,
} from '@/lib/api/rbac'

function RoleDetailContent() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [role, setRole] = useState<AdminRoleDetail | null>(null)
  const [catalog, setCatalog] = useState<PermissionDef[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

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

  const handleDuplicate = async () => {
    if (!role) return
    setDuplicating(true)
    try {
      const copy = await createAdminRole({
        name: `${role.name} (Custom)`,
        description: role.description ?? '',
        permissions: role.permissions,
      })
      toast.success('Custom copy created — edit it freely')
      router.push(`/admin/roles/${copy.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate role')
    } finally {
      setDuplicating(false)
    }
  }

  if (!role) return <PageLoader label="Loading role..." />

  const readOnly = role.isSystemRole

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/roles')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Roles
      </Button>

      <div className={`${GLASS_PANEL} p-6 space-y-6`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              {readOnly ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold">{role.name} Permissions</h1>
              <p className="text-sm text-muted-foreground">
                {permissions.length} permission{permissions.length === 1 ? '' : 's'} granted
                {readOnly && ' · Built-in role, can’t be changed'}
              </p>
            </div>
          </div>
          {readOnly ? (
            <Can permission="roles.create">
              <Button variant="outline" onClick={handleDuplicate} disabled={duplicating}>
                <Copy className="h-4 w-4 mr-2" />
                {duplicating ? 'Duplicating...' : 'Duplicate as Custom Role'}
              </Button>
            </Can>
          ) : (
            <Can permission="roles.update">
              <Button onClick={handleSave} disabled={saving}>
                <Pencil className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Can>
          )}
        </div>

        {readOnly && (
          <p className="-mt-2 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Want different access for this role? Duplicate it — the copy is a normal custom role you can freely rename and edit.
          </p>
        )}

        {!readOnly && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={1} />
            </div>
          </div>
        )}

        <PermissionGroupEditor catalog={catalog} selected={permissions} onChange={setPermissions} readOnly={readOnly} />
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
