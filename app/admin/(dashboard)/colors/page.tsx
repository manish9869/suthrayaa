'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, Palette } from 'lucide-react'
import { getAdminColors, createColor, updateColor, deleteColor, type AdminColor } from '@/lib/api/admin'
import { ColorYarnSwatch } from '@/components/color-yarn-swatch'
import { toast } from 'sonner'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/admin/admin-bits'
import { PageLoader } from '@/components/admin/loading-state'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/admin/page-header'

export default function AdminColorsPage() {
  const [colors, setColors] = useState<AdminColor[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#c9a15a')
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<AdminColor | null>(null)
  const [editName, setEditName] = useState('')
  const [editHex, setEditHex] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [loading, setLoading] = useState(true)

  const load = () => getAdminColors().then(setColors).finally(() => setLoading(false))
  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createColor({ name, hex })
      toast.success('Color added')
      setName('')
      setAddOpen(false)
      load()
    } catch {
      toast.error('Failed to add color')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (c: AdminColor) => {
    setEditing(c)
    setEditName(c.name)
    setEditHex(c.hex)
  }

  const handleSaveEdit = async () => {
    if (!editing || !editName.trim()) return
    setEditSaving(true)
    try {
      await updateColor(editing.id, { name: editName, hex: editHex })
      toast.success('Color updated')
      setEditing(null)
      load()
    } catch {
      toast.error('Failed to update color')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the palette?`)) return
    await deleteColor(id)
    toast.success('Color removed')
    load()
  }

  return (
    <ProtectedRoute permission="colors.view">
    <div className="space-y-6">
      <PageHeader
        title="Colors"
        description={`${colors.length} yarn colors customers can choose from`}
        actions={
          <>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Can permission="colors.create">
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Color
              </Button>
            </DialogTrigger>
          </Can>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Color</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blush Pink" />
              </div>
              <div className="space-y-2">
                <Label>Hex</Label>
                <div className="flex gap-2">
                  <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border bg-card p-1" />
                  <Input value={hex} onChange={(e) => setHex(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Saving...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </>
        }
      />

      {loading ? (
        <PageLoader />
      ) : colors.length === 0 ? (
        <Card>
          <EmptyState icon={Palette} title="No colors yet" description="Add the yarn colors your products are available in." />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {colors.map((c) => (
            <Card key={c.id} className={cn('group gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md', c.is_active === false && 'opacity-60')}>
              <div className="relative flex h-32 items-center justify-center" style={{ background: `color-mix(in oklab, ${c.hex} 18%, var(--card))` }}>
                <span className="h-20 w-20 rounded-full shadow-sm ring-4 ring-card transition-transform duration-300 group-hover:scale-105">
                  <ColorYarnSwatch color={c.hex} />
                </span>
                <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <Can permission="colors.update">
                    <button
                      onClick={() => openEdit(c)}
                      title="Edit"
                      className="rounded-lg bg-card/90 p-1.5 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </Can>
                  <Can permission="colors.delete">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      title="Delete"
                      className="rounded-lg bg-card/90 p-1.5 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Can>
                </div>
              </div>
              <CardContent className="flex items-center gap-2.5 px-4 py-3">
                <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(c.hex).then(() => toast.success(`Copied ${c.hex}`))}
                    className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground"
                    title="Copy hex"
                  >
                    {c.hex}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Color</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <span className="w-20 h-20 rounded-full border">
                <ColorYarnSwatch color={editHex} />
              </span>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hex</Label>
              <div className="flex gap-2">
                <input type="color" value={editHex} onChange={(e) => setEditHex(e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border bg-card p-1" />
                <Input value={editHex} onChange={(e) => setEditHex(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}
