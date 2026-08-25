'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import { getAdminColors, createColor, deleteColor, type AdminColor } from '@/lib/api/admin'
import { ColorYarnSwatch } from '@/components/color-yarn-swatch'
import { toast } from 'sonner'

export default function AdminColorsPage() {
  const [colors, setColors] = useState<AdminColor[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [hex, setHex] = useState('#c9a15a')
  const [saving, setSaving] = useState(false)

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
      setOpen(false)
      load()
    } catch {
      toast.error('Failed to add color')
    } finally {
      setSaving(false)
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
        <Dialog open={open} onOpenChange={setOpen}>
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

      <div className="flex flex-wrap gap-3">
        {colors.map((c) => (
          <div key={c.id} className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-full border bg-background">
            <span className="w-6 h-6 rounded-full border bg-muted p-1">
              <ColorYarnSwatch color={c.hex} />
            </span>
            <span className="text-sm font-medium">{c.name}</span>
            <button onClick={() => handleDelete(c.id, c.name)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
