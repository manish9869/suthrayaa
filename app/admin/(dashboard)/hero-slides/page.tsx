'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, ArrowRight, Link2, Image as ImageIcon, Pencil, Upload, X } from 'lucide-react'
import {
  getAdminHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  uploadHeroSlideImage,
  type AdminHeroSlide,
} from '@/lib/api/admin'
import { toast } from 'sonner'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { EmptyState } from '@/components/admin/admin-bits'
import { StatusDot } from '@/components/admin/status-dot'
import { PageLoader } from '@/components/admin/loading-state'
import { PageHeader } from '@/components/admin/page-header'

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  ctaLabel: 'Shop Collection',
  ctaHref: '/shop',
  sortOrder: 0,
  isActive: true,
}

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<AdminHeroSlide[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => getAdminHeroSlides().then(setSlides).finally(() => setLoading(false))
  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sortOrder: slides.length })
    setOpen(true)
  }

  const openEdit = (s: AdminHeroSlide) => {
    setEditingId(s.id)
    setForm({
      title: s.title,
      subtitle: s.subtitle ?? '',
      description: s.description ?? '',
      imageUrl: s.image_url ?? '',
      ctaLabel: s.cta_label ?? '',
      ctaHref: s.cta_href ?? '',
      sortOrder: s.sort_order,
      isActive: s.is_active,
    })
    setOpen(true)
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadHeroSlideImage(file)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      if (editingId) await updateHeroSlide(editingId, form)
      else await createHeroSlide(form)
      toast.success(editingId ? 'Hero slide updated' : 'Hero slide added')
      setOpen(false)
      load()
    } catch {
      toast.error(editingId ? 'Failed to update hero slide' : 'Failed to add hero slide')
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
        <PageHeader
          title="Hero Slides"
          description={`${slides.length} slide${slides.length === 1 ? '' : 's'} in the homepage hero carousel`}
          actions={
            <Can permission="banners.create">
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add Slide
              </Button>
            </Can>
          }
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Hero Slide' : 'New Hero Slide'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="relative aspect-[16/7] overflow-hidden rounded-lg border bg-muted">
                  {form.imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-black/55 p-1 text-white hover:bg-black/70"
                        onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                      No image — the storefront uses a built-in photo
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://… or upload"
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  />
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImage} />
                  <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Wide landscape images work best (JPEG, PNG or WEBP, under 4 MB).</p>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display order</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex items-end justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <Label>Live</Label>
                    <p className="text-xs text-muted-foreground">Show on the homepage</p>
                  </div>
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || uploading}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <PageLoader />
        ) : slides.length === 0 ? (
          <Card>
            <EmptyState
              icon={ImageIcon}
              title="No custom slides yet"
              description="The homepage is showing its built-in default slides. Add one to take over the hero carousel."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {slides.map((s, i) => (
              <Card key={s.id} className="group gap-0 overflow-hidden py-0">
                <div className="relative aspect-[16/7] overflow-hidden bg-muted">
                  {s.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-gold/20 to-violet/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-center gap-1.5 p-6 text-white">
                    {s.subtitle && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">{s.subtitle}</p>}
                    <p className="max-w-[75%] text-xl font-semibold leading-tight sm:text-2xl">{s.title}</p>
                    {s.description && <p className="line-clamp-2 max-w-[70%] text-[13px] text-white/80">{s.description}</p>}
                    {s.cta_label && (
                      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-900">
                        {s.cta_label} <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <span className="absolute left-4 top-4 rounded-md bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                    Slide {i + 1}
                  </span>
                </div>
                <CardContent className="flex items-center gap-3 px-5 py-3.5">
                  <StatusDot label={s.is_active ? 'Live' : 'Hidden'} tone={s.is_active ? 'mint' : 'muted'} />
                  {s.cta_href && (
                    <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5 shrink-0" /> {s.cta_href}
                    </span>
                  )}
                  <div className="ml-auto flex items-center">
                    <Can permission="banners.update">
                      <Button variant="ghost" size="icon" className="text-muted-foreground" title="Edit slide" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Can>
                    <Can permission="banners.delete">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete slide"
                        onClick={() => handleDelete(s.id)}
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
