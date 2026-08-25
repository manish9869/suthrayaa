'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import { getAdminHeroSlides, createHeroSlide, deleteHeroSlide, type AdminHeroSlide } from '@/lib/api/admin'
import { toast } from 'sonner'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<AdminHeroSlide[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', subtitle: '', description: '', ctaLabel: 'Shop Collection', ctaHref: '/shop' })
  const [saving, setSaving] = useState(false)

  const load = () => getAdminHeroSlides().then(setSlides)
  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await createHeroSlide(form)
      toast.success('Hero slide added')
      setForm({ title: '', subtitle: '', description: '', ctaLabel: 'Shop Collection', ctaHref: '/shop' })
      setOpen(false)
      load()
    } catch {
      toast.error('Failed to add hero slide')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hero slide?')) return
    await deleteHeroSlide(id)
    toast.success('Hero slide deleted')
    load()
  }

  return (
    <ProtectedRoute permission="banners.view">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Hero Slides</h1>
          <p className="text-muted-foreground text-sm">Shown on the homepage hero carousel</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Can permission="banners.create">
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Slide
              </Button>
            </DialogTrigger>
          </Can>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Hero Slide</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTA Label</Label>
                  <Input value={form.ctaLabel} onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>CTA Link</Label>
                  <Input value={form.ctaHref} onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))} />
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

      <div className="space-y-3">
        {slides.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.subtitle}</p>
              </div>
              <Can permission="banners.delete">
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Can>
            </CardContent>
          </Card>
        ))}
        {slides.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No custom slides yet — the homepage is showing its built-in default slides.
          </p>
        )}
      </div>
    </div>
    </ProtectedRoute>
  )
}
