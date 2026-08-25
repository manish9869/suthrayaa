'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { PermissionGroupEditor } from '@/components/admin/permission-group-editor'
import { createAdminRole, getPermissionCatalog, type PermissionDef } from '@/lib/api/rbac'

function NewRoleContent() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<PermissionDef[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPermissionCatalog().then(setCatalog)
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Enter a role name')
      return
    }
    setSaving(true)
    try {
      await createAdminRole({ name: name.trim(), description: description.trim(), permissions })
      toast.success('Role created')
      router.push('/admin/roles')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/roles')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Roles
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-serif font-bold">Create Role</h1>
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating...' : 'Create Role'}
        </Button>
      </div>

      <div className={`${GLASS_PANEL} p-6 space-y-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse Staff" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={1} placeholder="What this role is for" />
          </div>
        </div>

        <div>
          <p className="mb-4 text-sm font-medium">Permissions ({permissions.length})</p>
          <PermissionGroupEditor catalog={catalog} selected={permissions} onChange={setPermissions} />
        </div>
      </div>
    </div>
  )
}

export default function NewRolePage() {
  return (
    <ProtectedRoute permission="roles.create">
      <NewRoleContent />
    </ProtectedRoute>
  )
}
