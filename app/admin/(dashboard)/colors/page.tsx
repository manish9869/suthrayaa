'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { getAdminColors, createColor, updateColor, deleteColor, type AdminColor } from '@/lib/api/admin'
import { ColorYarnSwatch } from '@/components/color-yarn-swatch'
import { toast } from 'sonner'

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

  const load = () => getAdminColors().then(setColors)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold">Colors</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Color
            </Button>
          </DialogTrigger>
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
                  <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="w-12 h-10 rounded border" />
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {colors.map((c) => (
          <div key={c.id} className="relative flex flex-col items-center gap-2 rounded-xl border bg-background p-4 pt-3 text-center">
            <div className="absolute top-2 right-2 flex items-center gap-0.5">
              <button
                onClick={() => openEdit(c)}
                title="Edit"
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(c.id, c.name)}
                title="Delete"
                className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="w-16 h-16 rounded-full border">
              <ColorYarnSwatch color={c.hex} />
            </span>
            <span className="text-sm font-medium">{c.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{c.hex}</span>
          </div>
        ))}
      </div>

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
                <input type="color" value={editHex} onChange={(e) => setEditHex(e.target.value)} className="w-12 h-10 rounded border" />
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
  )
}
