'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, RotateCcw, ChevronRight, Package, ChevronUp, ChevronDown } from 'lucide-react'
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getAdminProducts,
  type AdminCategory,
  type AdminProductListItem,
} from '@/lib/api/admin'
import { ApiError } from '@/lib/api/http'
import { toast } from 'sonner'
import { Can } from '@/components/admin/can'

const levelNames = ['Category', 'Subcategory', 'Sub-subcategory']
function depthOf(categories: AdminCategory[], id: string | null): number {
  let depth = 0
  let current = categories.find((c) => c.id === id)
  while (current?.parentId) {
    depth += 1
    current = categories.find((c) => c.id === current!.parentId)
  }
  return depth
}

export function CategoryManager({ nodeId }: { nodeId: string | null }) {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [products, setProducts] = useState<AdminProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<AdminCategory | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [showInNavigation, setShowInNavigation] = useState(true)
  const [showOnHomepage, setShowOnHomepage] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<{ productCount: number } | null>(null)
  const [reassignTo, setReassignTo] = useState<string>('remove')
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getAdminCategories(), getAdminProducts({ limit: 500 })])
      .then(([cats, prods]) => {
        setCategories(cats)
        setProducts(prods.items)
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
  }, [])

  const current = useMemo(() => (nodeId ? categories.find((c) => c.id === nodeId) ?? null : null), [categories, nodeId])
  const children = useMemo(
    () => categories.filter((c) => (c.parentId ?? null) === nodeId).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories, nodeId]
  )
  const childDepth = depthOf(categories, nodeId) + (nodeId ? 1 : 0)

  const breadcrumb = useMemo(() => {
    if (!current) return []
    const chain: AdminCategory[] = []
    let node: AdminCategory | undefined = current
    while (node) {
      chain.unshift(node)
      node = node.parentId ? categories.find((c) => c.id === node!.parentId) : undefined
    }
    return chain
  }, [current, categories])

  const productCount = (c: AdminCategory) => {
    const slugs = new Set<string>()
    const collect = (node: AdminCategory) => {
      slugs.add(node.slug)
      categories.filter((c2) => c2.parentId === node.id).forEach(collect)
    }
    collect(c)
    return products.filter((p) => slugs.has(p.categorySlug)).length
  }

  const productsHere = useMemo(
    () => (current ? products.filter((p) => p.categorySlug === current.slug) : []),
    [products, current]
  )

  const resetForm = () => {
    setEditingNode(null)
    setName('')
    setSlug('')
    setDescription('')
    setSeoTitle('')
    setSeoDescription('')
    setShowInNavigation(true)
    setShowOnHomepage(false)
    setIsFeatured(false)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (c: AdminCategory) => {
    setEditingNode(c)
    setName(c.name)
    setSlug(c.slug)
    setDescription(c.description ?? '')
    setSeoTitle(c.seoTitle ?? '')
    setSeoDescription(c.seoDescription ?? '')
    setShowInNavigation(c.showInNavigation)
    setShowOnHomepage(c.showOnHomepage)
    setIsFeatured(c.isFeatured)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name,
        slug: slug.trim() || undefined,
        description,
        seoTitle,
        seoDescription,
        showInNavigation,
        showOnHomepage,
        isFeatured,
      }
      if (editingNode) {
        await updateCategory(editingNode.id, payload)
        toast.success(`${levelNames[Math.min(childDepth - 1, 2)] ?? 'Category'} updated`)
      } else {
        await createCategory({ ...payload, parentId: nodeId })
        toast.success(`${levelNames[Math.min(childDepth, 2)] ?? 'Category'} created`)
      }
      setDialogOpen(false)
      resetForm()
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = async (c: AdminCategory) => {
    try {
      await deleteCategory(c.id)
      toast.success('Deactivated')
      load()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteTarget(c)
        setDeleteImpact((err.details as { productCount: number }) ?? { productCount: 0 })
        setReassignTo('remove')
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Failed to deactivate category')
      }
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (reassignTo === 'remove') {
        await deleteCategory(deleteTarget.id, { force: true })
      } else {
        await deleteCategory(deleteTarget.id, { reassignTo })
      }
      toast.success(`"${deleteTarget.name}" deactivated`)
      setDeleteTarget(null)
      setDeleteImpact(null)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to deactivate category')
    } finally {
      setDeleting(false)
    }
  }

  const handleReactivate = async (c: AdminCategory) => {
    await updateCategory(c.id, { isActive: true })
    toast.success('Reactivated')
    load()
  }

  const handleReorder = async (c: AdminCategory, direction: -1 | 1) => {
    const siblings = children
    const index = siblings.findIndex((s) => s.id === c.id)
    const swapWith = siblings[index + direction]
    if (!swapWith) return
    await reorderCategories([
      { id: c.id, sortOrder: swapWith.sortOrder },
      { id: swapWith.id, sortOrder: c.sortOrder },
    ])
    load()
  }

  const otherCategoriesForReassign = useMemo(
    () => categories.filter((c) => c.id !== deleteTarget?.id && c.isActive),
    [categories, deleteTarget]
  )

  if (loading) return <div className="text-muted-foreground text-sm">Loading categories...</div>

  if (nodeId && !current) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Category not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/categories">Back to Categories</Link>
        </Button>
      </div>
    )
  }

  const levelLabel = levelNames[Math.min(childDepth, 2)] ?? 'Sub-subcategory'
  const addLabel = nodeId ? `Add ${levelLabel}` : 'Add Category'

  return (
    <div className="space-y-6">
      {breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link href="/admin/categories" className="hover:text-foreground transition-colors">
            Categories
          </Link>
          {breadcrumb.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              {i === breadcrumb.length - 1 ? (
                <span className="text-foreground font-medium">{b.name}</span>
              ) : (
                <Link href={`/admin/categories/${b.id}`} className="hover:text-foreground transition-colors">
                  {b.name}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold">{current ? current.name : 'Categories'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {current
              ? `${levelNames[Math.min(childDepth, 2)] ?? 'Sub-subcategories'} within ${current.name}`
              : 'Master categories — click one to manage its subcategories.'}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(next) => {
            setDialogOpen(next)
            if (!next) resetForm()
          }}
        >
          <Can permission="categories.create">
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> {addLabel}
              </Button>
            </DialogTrigger>
          </Can>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNode ? `Edit ${levelLabel}` : addLabel}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Crochet Flowers" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Auto-generated from name if left blank" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Visibility</p>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show in navigation</Label>
                    <p className="text-xs text-muted-foreground">Appears in the Shop menu and category filters.</p>
                  </div>
                  <Switch checked={showInNavigation} onCheckedChange={setShowInNavigation} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show on homepage</Label>
                    <p className="text-xs text-muted-foreground">Appears as a tile in the homepage category grid.</p>
                  </div>
                  <Switch checked={showOnHomepage} onCheckedChange={setShowOnHomepage} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Featured</Label>
                    <p className="text-xs text-muted-foreground">Highlighted with extra emphasis where categories are listed.</p>
                  </div>
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">SEO</p>
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Defaults to category name" />
                </div>
                <div className="space-y-2">
                  <Label>SEO Description</Label>
                  <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? 'Saving...' : editingNode ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {children.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((c, i) => (
            <Card key={c.id} className={!c.isActive ? 'opacity-50' : undefined}>
              <CardContent className="p-4 flex flex-col gap-3">
                <Link href={`/admin/categories/${c.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold hover:text-primary transition-colors">{c.name}</h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {c.isFeatured && (
                        <Badge variant="secondary" className="text-xs">
                          Featured
                        </Badge>
                      )}
                      <Badge variant={c.isActive ? 'secondary' : 'outline'} className="text-xs">
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.slug}</p>
                  <p className="text-xs text-muted-foreground mt-1">{productCount(c)} products</p>
                </Link>
                <div className="flex items-center gap-1 justify-end -mb-1 -mr-1">
                  <Can permission="categories.update">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Move up"
                      disabled={i === 0}
                      onClick={() => handleReorder(c, -1)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Move down"
                      disabled={i === children.length - 1}
                      onClick={() => handleReorder(c, 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Can>
                  {c.isActive ? (
                    <Can permission="categories.delete">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Deactivate" onClick={() => requestDelete(c)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </Can>
                  ) : (
                    <Can permission="categories.update">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Reactivate" onClick={() => handleReactivate(c)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </Can>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {current && (
        <div className="border rounded-xl bg-background p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Products in {current.name}
              </h2>
              <p className="text-sm text-muted-foreground">{productsHere.length} product{productsHere.length === 1 ? '' : 's'}</p>
            </div>
            <Can permission="products.create">
              <Button asChild variant="outline">
                <Link href={`/admin/products/new?categoryId=${current.id}`}>
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Link>
              </Button>
            </Can>
          </div>
          {productsHere.length > 0 ? (
            <div className="space-y-2">
              {productsHere.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ₹{p.price} · {p.stock} in stock
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No products in this category yet.</p>
          )}
        </div>
      )}

      {current && children.length === 0 && productsHere.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — add a subcategory above, or add a product directly in {current.name}.
        </p>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate &quot;{deleteTarget?.name}&quot;?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This category contains <strong>{deleteImpact?.productCount ?? 0} product{deleteImpact?.productCount === 1 ? '' : 's'}</strong>.
              Choose what should happen to them.
            </p>
            <div className="space-y-2">
              <Label>Products should be</Label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remove">Unassigned (removed from this category only)</SelectItem>
                  {otherCategoriesForReassign.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Moved to {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deactivating...' : 'Deactivate Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
