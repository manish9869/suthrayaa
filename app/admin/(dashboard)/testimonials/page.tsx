'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Star, Quote, MessageSquareQuote, Pencil } from 'lucide-react'
import { getAdminTestimonials, createTestimonial, updateTestimonial, deleteTestimonial, type AdminTestimonial } from '@/lib/api/admin'
import { toast } from 'sonner'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { InitialsAvatar, EmptyState } from '@/components/admin/admin-bits'
import { StatusDot } from '@/components/admin/status-dot'
import { PageLoader } from '@/components/admin/loading-state'

const EMPTY_FORM = { customerName: '', location: '', content: '', rating: 5, productPurchased: '', isPublished: true }

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => getAdminTestimonials().then(setTestimonials).finally(() => setLoading(false))
  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (t: AdminTestimonial) => {
    setEditingId(t.id)
    setForm({
      customerName: t.customer_name,
      location: t.location ?? '',
      content: t.content,
      rating: t.rating,
      productPurchased: t.product_purchased ?? '',
      isPublished: t.is_published,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.content.trim()) return toast.error('Name and content are required')
    setSaving(true)
    try {
      if (editingId) await updateTestimonial(editingId, form)
      else await createTestimonial(form)
      toast.success(editingId ? 'Testimonial updated' : 'Testimonial added')
      setOpen(false)
      load()
    } catch {
      toast.error(editingId ? 'Failed to update testimonial' : 'Failed to add testimonial')
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

  const published = testimonials.filter((t) => t.is_published).length
  const avgRating = testimonials.length ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length : 0

  const addDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <Can permission="content.create">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Testimonial
        </Button>
      </Can>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Testimonial' : 'New Testimonial'}</DialogTitle>
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
              <Label>Rating</Label>
              <div className="flex h-9 items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setForm((f) => ({ ...f, rating: i + 1 }))} aria-label={`${i + 1} star${i ? 's' : ''}`}>
                    <Star className={`h-5 w-5 transition-colors ${i < form.rating ? 'fill-gold text-gold' : 'text-muted-foreground/40 hover:text-gold'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product Purchased</Label>
              <Input value={form.productPurchased} onChange={(e) => setForm((f) => ({ ...f, productPurchased: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Hidden testimonials stay here but don’t appear on the storefront.</p>
            </div>
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm((f) => ({ ...f, isPublished: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <ProtectedRoute permission="content.view">
    <div className="space-y-6">
      <PageHeader
        title="Testimonials"
        description={
          testimonials.length
            ? `${testimonials.length} reviews · ${published} published · ${avgRating.toFixed(1)} average rating`
            : 'Customer quotes featured on the storefront'
        }
        actions={addDialog}
      />

      {loading ? (
        <PageLoader />
      ) : testimonials.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquareQuote} title="No testimonials yet" description="Add a customer quote to feature it on the homepage." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.id} className="group relative gap-0 py-0 transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < t.rating ? 'fill-gold text-gold' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <StatusDot label={t.is_published ? 'Published' : 'Hidden'} tone={t.is_published ? 'mint' : 'muted'} />
                </div>
                <Quote className="mt-4 h-5 w-5 text-primary/30" />
                <p className="mt-1 flex-1 text-[14.5px] leading-relaxed text-foreground/85">{t.content}</p>
                <div className="mt-5 flex items-center gap-3 border-t pt-4">
                  <InitialsAvatar name={t.customer_name} tone="brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.customer_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[t.location, t.product_purchased].filter(Boolean).join(' · ') || 'Verified buyer'}
                    </p>
                  </div>
                  <Can permission="content.update">
                    <Button variant="ghost" size="icon" className="text-muted-foreground" title="Edit testimonial" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Can>
                  <Can permission="content.delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete testimonial"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Can>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </ProtectedRoute>
  )
}
