'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Star } from 'lucide-react'
import { getAdminTestimonials, createTestimonial, deleteTestimonial, type AdminTestimonial } from '@/lib/api/admin'
import { toast } from 'sonner'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ customerName: '', location: '', content: '', rating: 5, productPurchased: '' })
  const [saving, setSaving] = useState(false)

  const load = () => getAdminTestimonials().then(setTestimonials)
  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!form.customerName.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      await createTestimonial(form)
      toast.success('Testimonial added')
      setForm({ customerName: '', location: '', content: '', rating: 5, productPurchased: '' })
      setOpen(false)
      load()
    } catch {
      toast.error('Failed to add testimonial')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return
    await deleteTestimonial(id)
    toast.success('Testimonial deleted')
    load()
  }

  return (
    <ProtectedRoute permission="content.view">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold">Testimonials</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Can permission="content.create">
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Testimonial
              </Button>
            </DialogTrigger>
          </Can>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Testimonial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea rows={3} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rating (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Product Purchased</Label>
                  <Input value={form.productPurchased} onChange={(e) => setForm((f) => ({ ...f, productPurchased: e.target.value }))} />
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

      <div className="grid md:grid-cols-2 gap-4">
        {testimonials.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? 'fill-secondary text-secondary' : 'text-muted'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">&quot;{t.content}&quot;</p>
                  <p className="text-sm font-medium mt-2">
                    {t.customer_name} {t.location && `· ${t.location}`}
                  </p>
                </div>
                <Can permission="content.delete">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Can>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </ProtectedRoute>
  )
}
