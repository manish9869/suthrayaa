'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from './loading-state'
import { Can } from './can'
import { getAdminFooterLinks, createFooterLink, deleteFooterLink, type FooterLink } from '@/lib/api/settings'

const COLUMNS = ['shop', 'support', 'about', 'policies']

export function FooterLinksPanel() {
  const [links, setLinks] = useState<FooterLink[] | null>(null)
  const [open, setOpen] = useState(false)
  const [columnKey, setColumnKey] = useState('shop')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const load = () => getAdminFooterLinks().then(setLinks)
  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!label.trim() || !url.trim()) return
    try {
      await createFooterLink({ columnKey, label, url })
      toast.success('Footer link added')
      setOpen(false)
      setLabel('')
      setUrl('')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add link')
    }
  }
  const handleDelete = async (id: string, linkLabel: string) => {
    if (!confirm(`Remove "${linkLabel}" from the footer?`)) return
    await deleteFooterLink(id)
    load()
  }

  if (!links) return <PageLoader label="Loading footer links..." />

  return (
    <div className={`${GLASS_PANEL} overflow-hidden`}>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="font-medium">Footer Links</h3>
          <p className="text-xs text-muted-foreground">Grouped by column — Shop, Customer Support, About, Policies.</p>
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
            <TableHead>Column</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>URL</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="capitalize text-muted-foreground text-sm">{l.column_key}</TableCell>
              <TableCell className="font-medium">{l.label}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{l.url}</TableCell>
              <TableCell className="text-right">
                <Can permission="settings.storefront">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id, l.label)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Can>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Footer Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Column</Label>
              <Select value={columnKey} onValueChange={setColumnKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Shipping Policy" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/shipping" />
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
