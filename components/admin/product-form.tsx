'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, X, Sparkles, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  createProduct,
  updateProduct,
  getAdminProduct,
  uploadProductImage,
  deleteProductImage,
  updateCustomizationRules,
  getAdminCategories,
  getAdminColors,
  type AdminProductListItem,
  type AdminCategory,
  type AdminColor,
  type ProductStatus,
  type ProductType,
} from '@/lib/api/admin'
import { CustomizationEditor } from '@/components/admin/customization-editor'
import { ColorYarnSwatch } from '@/components/color-yarn-swatch'

interface ProductFormProps {
  product?: AdminProductListItem & { id: string }
  defaultCategoryId?: string
}

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'archived', label: 'Archived' },
]
const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'ready_to_ship', label: 'Ready to Ship' },
  { value: 'made_to_order', label: 'Made to Order' },
  { value: 'custom_order', label: 'Custom Order' },
]

/** The selected category's own ancestor chain (root first) — used to pre-fill the cascade below when editing. */
function categoryChain(categories: AdminCategory[], selectedId: string): AdminCategory[] {
  const chain: AdminCategory[] = []
  let current = categories.find((c) => c.id === selectedId)
  while (current) {
    chain.unshift(current)
    current = current.parentId ? categories.find((c) => c.id === current!.parentId) : undefined
  }
  return chain
}

/** Main Category → Subcategory → Sub-subcategory, each level only showing once its parent is picked. */
function CascadingCategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: AdminCategory[]
  value: string
  onChange: (v: string) => void
}) {
  const chain = useMemo(() => categoryChain(categories, value), [categories, value])
  const mainId = chain[0]?.id ?? ''
  const subId = chain[1]?.id ?? ''

  const mainOptions = useMemo(
    () => categories.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  )
  const subOptions = useMemo(
    () => (mainId ? categories.filter((c) => c.parentId === mainId).sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [categories, mainId]
  )
  const leafOptions = useMemo(
    () => (subId ? categories.filter((c) => c.parentId === subId).sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [categories, subId]
  )

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label className="text-xs">Main Category</Label>
        <Select value={mainId} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select main category" />
          </SelectTrigger>
          <SelectContent>
            {mainOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {subOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Subcategory</Label>
          <Select value={subId} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              {subOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {leafOptions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Sub-subcategory</Label>
          <Select value={subId && chain[2] ? chain[2].id : ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select sub-subcategory" />
            </SelectTrigger>
            <SelectContent>
              {leafOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

export function ProductForm({ product, defaultCategoryId }: ProductFormProps) {
  const router = useRouter()
  const isEditing = Boolean(product)

  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [colors, setColors] = useState<AdminColor[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    shortDescription: product?.shortDescription ?? '',
    description: product?.description ?? '',
    price: product?.price ?? 0,
    comparePrice: product?.comparePrice ?? undefined,
    categoryId: defaultCategoryId ?? ('' as string),
    additionalCategoryIds: product?.additionalCategoryIds ?? ([] as string[]),
    tags: product?.tags.join(', ') ?? '',
    stock: product?.stock ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 5,
    featured: product?.featured ?? false,
    bestseller: product?.bestseller ?? false,
    newArrival: product?.newArrival ?? false,
    status: (product?.status ?? 'active') as ProductStatus,
    estimatedDelivery: product?.estimatedDelivery ?? '5-7 business days',
    dimensions: product?.dimensions ?? '',
    materials: product?.materials.join(', ') ?? '',
    careInstructions: product?.careInstructions.join(', ') ?? '',
    productType: (product?.productType ?? 'ready_to_ship') as ProductType,
    processingMinDays: product?.processingMinDays ?? undefined,
    processingMaxDays: product?.processingMaxDays ?? undefined,
    processingMessage: product?.processingMessage ?? '',
    costPrice: product?.costPrice ?? undefined,
    isTaxable: product?.isTaxable ?? true,
    taxClass: product?.taxClass ?? '',
    salePrice: product?.salePrice ?? undefined,
    saleStartDate: product?.saleStartDate?.slice(0, 10) ?? '',
    saleEndDate: product?.saleEndDate?.slice(0, 10) ?? '',
    allowBackorders: product?.allowBackorders ?? false,
    continueSellingWhenOutOfStock: product?.continueSellingWhenOutOfStock ?? false,
    trackInventory: product?.trackInventory ?? true,
    isPhysical: product?.isPhysical ?? true,
    weight: product?.weight ?? undefined,
    length: product?.length ?? undefined,
    width: product?.width ?? undefined,
    height: product?.height ?? undefined,
    freeShipping: product?.freeShipping ?? false,
    shippingClass: product?.shippingClass ?? '',
    localPickupAvailable: product?.localPickupAvailable ?? false,
    metaTitle: product?.metaTitle ?? '',
    metaDescription: product?.metaDescription ?? '',
    searchKeywords: product?.searchKeywords ?? '',
  })
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([])
  const [images, setImages] = useState<{ id: string; url: string }[]>(
    product?.images.map((url, i) => ({ id: String(i), url })) ?? []
  )

  // Legacy simple customization rules — only takes effect when no option groups (below) exist.
  const rules = product?.customizationOptions
  const [isCustomizable, setIsCustomizable] = useState(product?.isCustomizable ?? false)
  const [allowText, setAllowText] = useState(rules?.allowText ?? false)
  const [maxTextLength, setMaxTextLength] = useState(rules?.maxTextLength ?? 15)
  const [textPlaceholder, setTextPlaceholder] = useState(rules?.textPlaceholder ?? 'Enter your text')
  const [allowColorChoice, setAllowColorChoice] = useState(rules?.allowColorChoice ?? true)
  const [isLimitedEdition, setIsLimitedEdition] = useState(rules?.isLimitedEdition ?? false)
  const [allowedColorHexes, setAllowedColorHexes] = useState<string[]>(rules?.allowedColors ?? [])

  const [savedProduct, setSavedProduct] = useState(product)

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

  const discountPercent =
    form.salePrice && form.price && form.salePrice < form.price
      ? Math.round((1 - form.salePrice / form.price) * 100)
      : null

  const handleSave = async (statusOverride?: ProductStatus) => {
    if (!form.name.trim()) {
      toast.error('Product name is required')
      return
    }
    if (form.price < 0) {
      toast.error('Price cannot be negative')
      return
    }
    setSaving(true)
    try {
      const payload = {
        sku: form.sku || null,
        name: form.name,
        slug: form.slug || undefined,
        shortDescription: form.shortDescription,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
        categoryId: form.categoryId || null,
        additionalCategoryIds: form.additionalCategoryIds,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        featured: form.featured,
        bestseller: form.bestseller,
        newArrival: form.newArrival,
        status: statusOverride ?? form.status,
        estimatedDelivery: form.estimatedDelivery,
        dimensions: form.dimensions,
        materials: form.materials.split(',').map((t) => t.trim()).filter(Boolean),
        careInstructions: form.careInstructions.split(',').map((t) => t.trim()).filter(Boolean),
        colorIds: selectedColorIds,
        productType: form.productType,
        processingMinDays: form.processingMinDays != null ? Number(form.processingMinDays) : null,
        processingMaxDays: form.processingMaxDays != null ? Number(form.processingMaxDays) : null,
        processingMessage: form.processingMessage || null,
        costPrice: form.costPrice != null ? Number(form.costPrice) : null,
        isTaxable: form.isTaxable,
        taxClass: form.taxClass || null,
        salePrice: form.salePrice != null ? Number(form.salePrice) : null,
        saleStartDate: form.saleStartDate || null,
        saleEndDate: form.saleEndDate || null,
        allowBackorders: form.allowBackorders,
        continueSellingWhenOutOfStock: form.continueSellingWhenOutOfStock,
        trackInventory: form.trackInventory,
        isPhysical: form.isPhysical,
        weight: form.weight != null ? Number(form.weight) : null,
        length: form.length != null ? Number(form.length) : null,
        width: form.width != null ? Number(form.width) : null,
        height: form.height != null ? Number(form.height) : null,
        freeShipping: form.freeShipping,
        shippingClass: form.shippingClass || null,
        localPickupAvailable: form.localPickupAvailable,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        searchKeywords: form.searchKeywords || null,
      }

      const saved = product ? await updateProduct(product.id, payload) : await createProduct(payload)
      const productId = product?.id ?? saved.id
      setSavedProduct(saved as AdminProductListItem & { id: string })

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

      if (statusOverride) setForm((f) => ({ ...f, status: statusOverride }))
      toast.success(isEditing ? 'Product updated' : 'Product created')
      if (!isEditing) {
        router.push(`/admin/products/${productId}`)
      } else {
        router.refresh()
      }
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
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="category">Category</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="customization">Customization</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* ---- Basic Info ---- */}
        <TabsContent value="basic" className="space-y-4 pt-4">
          <div className={isEditing ? 'grid sm:grid-cols-2 gap-4' : 'space-y-2'}>
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
            )}
          </div>
          {!isEditing && (
            <p className="text-xs text-muted-foreground -mt-2">SKU is generated automatically once you pick a category — you can edit it after creating the product.</p>
          )}
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Full Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProductStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product Type</Label>
              <Select value={form.productType} onValueChange={(v) => setForm((f) => ({ ...f, productType: v as ProductType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.productType !== 'ready_to_ship' && (
            <div className="grid sm:grid-cols-3 gap-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label className="text-xs">Min Processing Days</Label>
                <Input
                  type="number"
                  value={form.processingMinDays ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, processingMinDays: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max Processing Days</Label>
                <Input
                  type="number"
                  value={form.processingMaxDays ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, processingMaxDays: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label className="text-xs">Customer Message</Label>
                <Input
                  value={form.processingMessage}
                  onChange={(e) => setForm((f) => ({ ...f, processingMessage: e.target.value }))}
                  placeholder="Handmade specially for you. Usually ready within 5-7 business days."
                />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-6 pt-2">
            {(['featured', 'bestseller', 'newArrival'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
                {key === 'newArrival' ? 'New Arrival' : key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
        </TabsContent>

        {/* ---- Category ---- */}
        <TabsContent value="category" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <CascadingCategoryPicker categories={categories} value={form.categoryId} onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))} />
            <p className="text-xs text-muted-foreground">
              Pick as deep as the taxonomy goes — most products belong in a sub-subcategory (e.g. Flowers &amp; Floral → Crochet Flowers → Sunflowers).
            </p>
          </div>
          <div className="space-y-2">
            <Label>Additional Categories (optional)</Label>
            <div className="border rounded-lg max-h-56 overflow-y-auto p-2 space-y-1">
              {categories
                .filter((c) => c.id !== form.categoryId)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={form.additionalCategoryIds.includes(c.id)}
                      onCheckedChange={(checked) =>
                        setForm((f) => ({
                          ...f,
                          additionalCategoryIds: checked
                            ? [...f.additionalCategoryIds, c.id]
                            : f.additionalCategoryIds.filter((id) => id !== c.id),
                        }))
                      }
                    />
                    {c.name}
                  </label>
                ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
        </TabsContent>

        {/* ---- Media ---- */}
        <TabsContent value="media" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={img.id} className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted group">
                    <Image src={img.url} alt="" fill className="object-cover" />
                    {i === 0 && <Badge className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0">Primary</Badge>}
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
              <p className="text-xs text-muted-foreground mt-3">
                {product ? 'The first image is the main storefront image. Drag support coming soon — delete and re-add to reorder.' : 'Save the product first to enable image uploads.'}
              </p>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-4">
              <Label className="mb-3 block">Colors</Label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const selected = selectedColorIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColorIds((prev) => (selected ? prev.filter((id) => id !== c.id) : [...prev, c.id]))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border bg-muted p-0.5">
                        <ColorYarnSwatch color={c.hex} />
                      </span>
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Pricing ---- */}
        <TabsContent value="pricing" className="space-y-4 pt-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Base Price (₹)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Compare At Price (₹)</Label>
              <Input
                type="number"
                value={form.comparePrice ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, comparePrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cost Price (₹)</Label>
              <Input
                type="number"
                value={form.costPrice ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.isTaxable} onCheckedChange={(v) => setForm((f) => ({ ...f, isTaxable: v }))} />
              Taxable
            </label>
            {form.isTaxable && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Tax Class</Label>
                <Input className="w-40 h-8" value={form.taxClass} onChange={(e) => setForm((f) => ({ ...f, taxClass: e.target.value }))} />
              </div>
            )}
          </div>

          <Separator />
          <p className="text-sm font-medium">Sale</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Sale Price (₹)</Label>
              <Input
                type="number"
                value={form.salePrice ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sale Start Date</Label>
              <Input type="date" value={form.saleStartDate} onChange={(e) => setForm((f) => ({ ...f, saleStartDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sale End Date</Label>
              <Input type="date" value={form.saleEndDate} onChange={(e) => setForm((f) => ({ ...f, saleEndDate: e.target.value }))} />
            </div>
          </div>
          {discountPercent != null && (
            <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
              <span className="font-semibold text-primary">₹{form.salePrice}</span>
              <span className="text-muted-foreground line-through">₹{form.price}</span>
              <Badge variant="secondary">{discountPercent}% OFF</Badge>
            </div>
          )}
        </TabsContent>

        {/* ---- Customization ---- */}
        <TabsContent value="customization" className="space-y-6 pt-4">
          <CustomizationEditor
            productId={savedProduct?.id}
            customizations={savedProduct?.customizations ?? []}
            colors={colors}
            onChange={async () => {
              if (!savedProduct) return
              const fresh = await getAdminProduct(savedProduct.id)
              setSavedProduct(fresh as AdminProductListItem & { id: string })
            }}
          />

          <Separator />

          <Card>
            <CardContent className="p-4 space-y-5">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-secondary" /> Simple Text Personalization (legacy)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only used if this product has no option groups above. Prefer option groups for new products.
                </p>
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <p className="font-medium text-sm">Allow customization</p>
                <Switch checked={isCustomizable} onCheckedChange={setIsCustomizable} />
              </label>
              {isCustomizable && (
                <>
                  <label className="flex items-center justify-between cursor-pointer">
                    <p className="font-medium text-sm">Allow text personalization</p>
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
                  <label className="flex items-center justify-between cursor-pointer">
                    <p className="font-medium text-sm">Allow color choice while customizing</p>
                    <Switch checked={allowColorChoice} onCheckedChange={setAllowColorChoice} />
                  </label>
                  <div className="space-y-2">
                    <Label className="text-xs">Colors allowed for customization</Label>
                    <div className="flex flex-wrap gap-2">
                      {colors
                        .filter((c) => selectedColorIds.includes(c.id))
                        .map((c) => {
                          const selected = allowedColorHexes.includes(c.hex)
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setAllowedColorHexes((prev) => (selected ? prev.filter((h) => h !== c.hex) : [...prev, c.hex]))}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                              }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full border bg-muted p-0.5">
                        <ColorYarnSwatch color={c.hex} />
                      </span>
                              {c.name}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <p className="font-medium text-sm">Limited Edition badge</p>
                    <Switch checked={isLimitedEdition} onCheckedChange={setIsLimitedEdition} />
                  </label>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Inventory ---- */}
        <TabsContent value="inventory" className="space-y-4 pt-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium text-sm">Track Inventory</p>
              <p className="text-xs text-muted-foreground">Off = always purchasable regardless of stock count</p>
            </div>
            <Switch checked={form.trackInventory} onCheckedChange={(v) => setForm((f) => ({ ...f, trackInventory: v }))} />
          </label>
          {form.trackInventory && (
            <div className="grid sm:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label className="text-xs">Quantity Available</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Low Stock Threshold</Label>
                <Input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.allowBackorders} onCheckedChange={(v) => setForm((f) => ({ ...f, allowBackorders: v }))} />
              Allow Backorders
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch
                checked={form.continueSellingWhenOutOfStock}
                onCheckedChange={(v) => setForm((f) => ({ ...f, continueSellingWhenOutOfStock: v }))}
              />
              Continue Selling When Out of Stock
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {form.stock <= 0 ? 'Out of Stock' : form.stock <= form.lowStockThreshold ? 'Low Stock' : 'In Stock'}
          </p>
        </TabsContent>

        {/* ---- Shipping ---- */}
        <TabsContent value="shipping" className="space-y-4 pt-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={form.isPhysical} onCheckedChange={(v) => setForm((f) => ({ ...f, isPhysical: v }))} />
            Physical Product
          </label>
          {form.isPhysical && (
            <>
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Weight (g)</Label>
                  <Input type="number" value={form.weight ?? ''} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Length (cm)</Label>
                  <Input type="number" value={form.length ?? ''} onChange={(e) => setForm((f) => ({ ...f, length: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Width (cm)</Label>
                  <Input type="number" value={form.width ?? ''} onChange={(e) => setForm((f) => ({ ...f, width: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Height (cm)</Label>
                  <Input type="number" value={form.height ?? ''} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Estimated Delivery</Label>
                <Input value={form.estimatedDelivery} onChange={(e) => setForm((f) => ({ ...f, estimatedDelivery: e.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form.freeShipping} onCheckedChange={(v) => setForm((f) => ({ ...f, freeShipping: v }))} />
                  Free Shipping
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form.localPickupAvailable} onCheckedChange={(v) => setForm((f) => ({ ...f, localPickupAvailable: v }))} />
                  Local Pickup Available
                </label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Shipping Class</Label>
                <Input value={form.shippingClass} onChange={(e) => setForm((f) => ({ ...f, shippingClass: e.target.value }))} />
              </div>
            </>
          )}
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs">Materials (comma separated)</Label>
            <Input value={form.materials} onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Care Instructions (comma separated)</Label>
            <Input value={form.careInstructions} onChange={(e) => setForm((f) => ({ ...f, careInstructions: e.target.value }))} />
          </div>
        </TabsContent>

        {/* ---- SEO ---- */}
        <TabsContent value="seo" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>URL Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="Auto-generated from name if left blank" />
          </div>
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input value={form.metaTitle} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} placeholder="Defaults to product name" />
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea rows={2} value={form.metaDescription} onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Search Keywords</Label>
            <Input value={form.searchKeywords} onChange={(e) => setForm((f) => ({ ...f, searchKeywords: e.target.value }))} />
          </div>
          <div className="border rounded-lg p-4 bg-muted/40">
            <p className="text-xs text-muted-foreground mb-2">Search result preview</p>
            <p className="text-primary text-sm truncate">suthrayaa.com/product/{form.slug || 'your-product-slug'}</p>
            <p className="text-blue-700 text-base leading-tight">{form.metaTitle || form.name || 'Product name'}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{form.metaDescription || form.shortDescription || 'Product description...'}</p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/products')}>
          Cancel
        </Button>
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
          Save as Draft
        </Button>
        <Button onClick={() => handleSave()} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Product'}
        </Button>
      </div>
    </div>
  )
}
