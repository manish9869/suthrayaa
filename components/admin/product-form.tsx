'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Upload, X, Sparkles, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  updateCustomizationRules,
  getAdminCategories,
  getAdminColors,
  type AdminProductListItem,
  type AdminCategory,
  type AdminColor,
} from '@/lib/api/admin'

interface ProductFormProps {
  product?: AdminProductListItem & { id: string }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const isEditing = Boolean(product)

  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [colors, setColors] = useState<AdminColor[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    shortDescription: product?.shortDescription ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    comparePrice: product?.comparePrice ?? undefined,
    categoryId: '' as string,
    tags: product?.tags.join(', ') ?? '',
    stock: product?.stock ?? 0,
    lowStockThreshold: 5,
    featured: product?.featured ?? false,
    bestseller: product?.bestseller ?? false,
    newArrival: product?.newArrival ?? false,
    isActive: product?.isActive ?? true,
    estimatedDelivery: product?.estimatedDelivery ?? '5-7 business days',
    dimensions: product?.dimensions ?? '',
    materials: product?.materials.join(', ') ?? '',
    careInstructions: product?.careInstructions.join(', ') ?? '',
  })
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([])
  const [images, setImages] = useState<{ id: string; url: string }[]>(
    product?.images.map((url, i) => ({ id: String(i), url })) ?? []
  )
  const [slugTouched, setSlugTouched] = useState(isEditing)

  // Customization rules
  const rules = product?.customizationOptions
  const [isCustomizable, setIsCustomizable] = useState(product?.isCustomizable ?? false)
  const [allowText, setAllowText] = useState(rules?.allowText ?? false)
  const [maxTextLength, setMaxTextLength] = useState(rules?.maxTextLength ?? 15)
  const [textPlaceholder, setTextPlaceholder] = useState(rules?.textPlaceholder ?? 'Enter your text')
  const [allowColorChoice, setAllowColorChoice] = useState(rules?.allowColorChoice ?? true)
  const [isLimitedEdition, setIsLimitedEdition] = useState(rules?.isLimitedEdition ?? false)
  const [allowedColorHexes, setAllowedColorHexes] = useState<string[]>(rules?.allowedColors ?? [])

  useEffect(() => {
    getAdminCategories().then(setCategories)
    getAdminColors().then((cs) => {
      setColors(cs)
      if (product) {
        const matched = cs.filter((c) => product.colors.includes(c.hex)).map((c) => c.id)
        setSelectedColorIds(matched)
      }
    })
    if (product) {
      getAdminCategories().then((cats) => {
        const match = cats.find((c) => c.slug === product.categorySlug)
        if (match) setForm((f) => ({ ...f, categoryId: match.id }))
      })
    }
  }, [product])

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        shortDescription: form.shortDescription,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
        categoryId: form.categoryId || null,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        featured: form.featured,
        bestseller: form.bestseller,
        newArrival: form.newArrival,
        isActive: form.isActive,
        estimatedDelivery: form.estimatedDelivery,
        dimensions: form.dimensions,
        materials: form.materials.split(',').map((t) => t.trim()).filter(Boolean),
        careInstructions: form.careInstructions.split(',').map((t) => t.trim()).filter(Boolean),
        colorIds: selectedColorIds,
      }

      const saved = product ? await updateProduct(product.id, payload) : await createProduct(payload)
      const productId = product?.id ?? (saved as any).id

      const allowedColorIds = colors.filter((c) => allowedColorHexes.includes(c.hex)).map((c) => c.id)
      await updateCustomizationRules(productId, {
        isCustomizable,
        allowText,
        maxTextLength: allowText ? Number(maxTextLength) : null,
        textPlaceholder: allowText ? textPlaceholder : null,
        allowColorChoice,
        isLimitedEdition,
        allowedColorIds,
      })

      toast.success(isEditing ? 'Product updated' : 'Product created')
      router.push('/admin/products')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !product) {
      if (!product) toast.error('Save the product first, then add images')
      return
    }
    setUploading(true)
    try {
      const result = await uploadProductImage(product.id, file)
      setImages((prev) => [...prev, { id: result.id, url: result.url }])
      toast.success('Image uploaded')
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleImageDelete = async (imageId: string) => {
    if (!product) return
    try {
      await deleteProductImage(product.id, imageId)
      setImages((prev) => prev.filter((i) => i.id !== imageId))
    } catch {
      toast.error('Failed to remove image')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Full Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Compare Price (₹)</Label>
              <Input
                type="number"
                value={form.comparePrice ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            {(['featured', 'bestseller', 'newArrival', 'isActive'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
                {key === 'newArrival' ? 'New Arrival' : key === 'isActive' ? 'Active (visible on storefront)' : key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const selected = selectedColorIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setSelectedColorIds((prev) => (selected ? prev.filter((id) => id !== c.id) : [...prev, c.id]))
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: c.hex }} />
                  {c.name}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted group">
                <Image src={img.url} alt="" fill className="object-cover" />
                <button
                  onClick={() => handleImageDelete(img.id)}
                  className="absolute top-1 right-1 bg-background/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-muted-foreground text-muted-foreground">
              <Upload className="h-5 w-5" />
              <span className="text-xs">{uploading ? 'Uploading...' : 'Add'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          {!product && <p className="text-xs text-muted-foreground mt-3">Save the product first to enable image uploads.</p>}
        </CardContent>
      </Card>

      {/* Customization Rules — admin-side control over what customers can personalize */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" /> Customization Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-sm">Allow customization</p>
              <p className="text-xs text-muted-foreground">Customers can personalize this product at checkout</p>
            </div>
            <Switch checked={isCustomizable} onCheckedChange={setIsCustomizable} />
          </label>

          {isCustomizable && (
            <>
              <Separator />
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-sm">Allow text personalization</p>
                  <p className="text-xs text-muted-foreground">Name, initial, or custom message</p>
                </div>
                <Switch checked={allowText} onCheckedChange={setAllowText} />
              </label>

              {allowText && (
                <div className="grid sm:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label className="text-xs">Max Characters</Label>
                    <Input type="number" value={maxTextLength} onChange={(e) => setMaxTextLength(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Placeholder Text</Label>
                    <Input value={textPlaceholder} onChange={(e) => setTextPlaceholder(e.target.value)} />
                  </div>
                </div>
              )}

              <Separator />

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-sm">Allow color choice while customizing</p>
                  <p className="text-xs text-muted-foreground">
                    Off = customer&apos;s color is fixed to the first allowed color below
                  </p>
                </div>
                <Switch checked={allowColorChoice} onCheckedChange={setAllowColorChoice} />
              </label>

              <div className="space-y-2">
                <Label className="text-xs">
                  Colors allowed for customization {allowedColorHexes.length === 0 && '(empty = all base colors allowed)'}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {colors
                    .filter((c) => selectedColorIds.includes(c.id))
                    .map((c) => {
                      const selected = allowedColorHexes.includes(c.hex)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setAllowedColorHexes((prev) =>
                              selected ? prev.filter((h) => h !== c.hex) : [...prev, c.hex]
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                            selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: c.hex }} />
                          {c.name}
                        </button>
                      )
                    })}
                  {selectedColorIds.length === 0 && (
                    <p className="text-xs text-muted-foreground">Select base colors above first</p>
                  )}
                </div>
              </div>

              <Separator />

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    Limited Edition <Badge variant="outline" className="text-xs">badge on storefront</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">Marketing flag only — doesn&apos;t change functional rules above</p>
                </div>
                <Switch checked={isLimitedEdition} onCheckedChange={setIsLimitedEdition} />
              </label>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/products')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </div>
  )
}
