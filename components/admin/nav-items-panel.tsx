'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from './loading-state'
import { Can } from './can'
import { getAdminNavItems, createNavItem, updateNavItem, deleteNavItem, type NavItem } from '@/lib/api/settings'

export function NavItemsPanel() {
  const [items, setItems] = useState<NavItem[] | null>(null)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const load = () => getAdminNavItems().then((i) => setItems(i.slice().sort((a, b) => a.sort_order - b.sort_order)))
  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!label.trim() || !url.trim()) return
    try {
      await createNavItem({ label, url, sortOrder: (items?.length ?? 0) * 10 })
      toast.success('Nav item added')
      setOpen(false)
      setLabel('')
      setUrl('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add nav item')
    }
  }

  const handleDelete = async (id: string, itemLabel: string) => {
    if (!confirm(`Remove "${itemLabel}" from the navigation?`)) return
    await deleteNavItem(id)
    load()
  }

  const move = async (index: number, direction: -1 | 1) => {
    if (!items) return
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const a = items[index]
    const b = items[target]
    await Promise.all([updateNavItem(a.id, { sortOrder: b.sort_order }), updateNavItem(b.id, { sortOrder: a.sort_order })])
    load()
  }

  if (!items) return <PageLoader label="Loading navigation..." />

  return (
    <div className={`${GLASS_PANEL} overflow-hidden`}>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="font-medium">Main Navigation</h3>
          <p className="text-xs text-muted-foreground">Shown in the storefront header.</p>
        </div>
        <Can permission="settings.storefront">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Link
          </Button>
        </Can>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.label}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{item.url}</TableCell>
              <TableCell className="text-right">
                <Can permission="settings.storefront">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, item.label)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Can>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Nav Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New Arrivals" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/shop?sort=newest" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
