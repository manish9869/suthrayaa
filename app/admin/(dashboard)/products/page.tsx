'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DualRangeSlider } from '@/components/ui/dual-range-slider'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  EyeOff,
  Archive,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  FileDown,
  X,
  PackageCheck,
  AlertTriangle,
  PackageX,
  Wallet,
} from 'lucide-react'
import {
  getAdminProducts,
  deleteProduct,
  duplicateProduct,
  updateProduct,
  getAdminCategories,
  type AdminProductListItem,
  type AdminCategory,
  type ProductStatus,
  type ProductType,
} from '@/lib/api/admin'
import { flattenCategoryTree, collectDescendantSlugs } from '@/lib/utils/admin-category-tree'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'
import { GLASS_PANEL, exportRowsToCsv } from '@/lib/admin-ui'
import { SortableTh } from '@/components/admin/sortable-th'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { useSortableData } from '@/lib/hooks/use-sortable-data'
import { usePaginated } from '@/lib/hooks/use-paginated'
import { StatCard } from '@/components/admin/stat-card'
import { StatusDot, DOT_CLASSES, type DotTone } from '@/components/admin/status-dot'

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  hidden: 'Hidden',
  out_of_stock: 'Out of Stock',
  archived: 'Archived',
}
const STATUS_DOT: Record<ProductStatus, DotTone> = {
  draft: 'muted',
  active: 'mint',
  hidden: 'gold',
  out_of_stock: 'destructive',
  archived: 'muted',
}
const STOCK_DOT = { in_stock: 'mint', low_stock: 'gold', out_of_stock: 'destructive' } as const
const TYPE_LABELS: Record<ProductType, string> = {
  ready_to_ship: 'Ready to Ship',
  made_to_order: 'Made to Order',
  custom_order: 'Custom Order',
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductListItem[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000])
  // Live drag position, decoupled from priceRange (which drives the filtered table) so
  // dragging doesn't force a full re-filter on every tick — only on release.
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, 5000])
  useEffect(() => setSliderRange(priceRange), [priceRange])

  const load = () => {
    setLoading(true)
    Promise.all([getAdminProducts({ limit: 200, search: search || undefined }), getAdminCategories()])
      .then(([res, cats]) => {
        setProducts(res.items)
        setCategories(cats)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const categoryOptions = useMemo(() => flattenCategoryTree(categories), [categories])

  const filtered = useMemo(() => {
    let result = [...products]
    if (categoryFilter !== 'all') {
      const slugs = new Set(collectDescendantSlugs(categories, categoryFilter))
      result = result.filter((p) => slugs.has(p.categorySlug))
    }
    if (statusFilter !== 'all') result = result.filter((p) => p.status === statusFilter)
    if (typeFilter !== 'all') result = result.filter((p) => p.productType === typeFilter)
    if (stockFilter === 'in_stock') result = result.filter((p) => p.stock > p.lowStockThreshold)
    if (stockFilter === 'low_stock') result = result.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold)
    if (stockFilter === 'out_of_stock') result = result.filter((p) => p.stock <= 0)
    if (featuredOnly) result = result.filter((p) => p.featured)
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    return result
  }, [products, categories, categoryFilter, statusFilter, typeFilter, stockFilter, featuredOnly, priceRange])

  const { sorted, sortKey, direction, toggleSort } = useSortableData(filtered, {
    name: (p) => p.name,
    sku: (p) => p.sku,
    category: (p) => p.category,
    price: (p) => p.price,
    stock: (p) => p.stock,
    type: (p) => TYPE_LABELS[p.productType],
    status: (p) => STATUS_LABELS[p.status],
    updated: (p) => p.updatedAt,
  })
  const { pageItems, page, setPage, pageCount, total: pageTotal } = usePaginated(sorted, 15)

  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (stockFilter !== 'all' ? 1 : 0) +
    (featuredOnly ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 5000 ? 1 : 0)

  const clearFilters = () => {
    setCategoryFilter('all')
    setStatusFilter('all')
    setTypeFilter('all')
    setStockFilter('all')
    setFeaturedOnly(false)
    setPriceRange([0, 5000])
  }

  const stats = useMemo(
    () => ({
      active: filtered.filter((p) => p.status === 'active').length,
      lowStock: filtered.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
      outOfStock: filtered.filter((p) => p.stock <= 0).length,
      inventoryValue: filtered.reduce((sum, p) => sum + p.price * Math.max(p.stock, 0), 0),
    }),
    [filtered]
  )

  const handleExport = () => {
    exportRowsToCsv(
      `products-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'SKU', 'Category', 'Price', 'Stock', 'Type', 'Status', 'Updated'],
      filtered.map((p) => [p.name, p.sku ?? '', p.category, p.price, p.stock, TYPE_LABELS[p.productType], STATUS_LABELS[p.status], p.updatedAt ?? ''])
    )
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? It will be hidden from the storefront but order history is kept.`)) return
    try {
      await deleteProduct(id)
      toast.success('Product deactivated')
      load()
    } catch {
      toast.error('Failed to deactivate product')
    }
  }

  const handleSetStatus = async (id: string, status: ProductStatus, label: string) => {
    try {
      await updateProduct(id, { status })
      toast.success(label)
      load()
    } catch {
      toast.error('Failed to update product')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateProduct(id)
      toast.success('Product duplicated as a draft')
      load()
    } catch {
      toast.error('Failed to duplicate product')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Products</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {products.length} products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <FileDown className="h-3.5 w-3.5 mr-2" /> Export
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={PackageCheck} label="Active" value={stats.active} tone="mint" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} tone="gold" />
        <StatCard icon={PackageX} label="Out of Stock" value={stats.outOfStock} tone="destructive" />
        <StatCard icon={Wallet} label="Inventory Value (shown)" value={formatPrice(stats.inventoryValue)} tone="violet" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-10 rounded-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="rounded-full w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {'—'.repeat(c.depth)} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="rounded-full w-36">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${statusFilter === 'all' ? DOT_CLASSES.muted : DOT_CLASSES[STATUS_DOT[statusFilter as ProductStatus]]}`} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[STATUS_DOT[s]]}`} />
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="rounded-full w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.keys(TYPE_LABELS) as ProductType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="rounded-full w-36">
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${
                stockFilter === 'all' ? DOT_CLASSES.muted : DOT_CLASSES[STOCK_DOT[stockFilter as keyof typeof STOCK_DOT]]
              }`}
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Stock</SelectItem>
            <SelectItem value="in_stock">
              <span className={`h-2 w-2 rounded-full ${DOT_CLASSES.mint}`} /> In Stock
            </SelectItem>
            <SelectItem value="low_stock">
              <span className={`h-2 w-2 rounded-full ${DOT_CLASSES.gold}`} /> Low Stock
            </SelectItem>
            <SelectItem value="out_of_stock">
              <span className={`h-2 w-2 rounded-full ${DOT_CLASSES.destructive}`} /> Out of Stock
            </SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="rounded-full font-normal">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              {priceRange[0] > 0 || priceRange[1] < 5000 ? `${formatPrice(priceRange[0])} – ${formatPrice(priceRange[1])}` : 'Any price'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <p className="text-sm font-medium mb-3">Price Range</p>
            <DualRangeSlider value={sliderRange} onValueChange={setSliderRange} onValueCommit={setPriceRange} min={0} max={5000} step={1} />
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
              <span>{formatPrice(sliderRange[0])}</span>
              <span>{formatPrice(sliderRange[1])}</span>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant={featuredOnly ? 'secondary' : 'outline'}
          size="sm"
          className="h-9 rounded-full"
          onClick={() => setFeaturedOnly((v) => !v)}
        >
          Featured only
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1.5" /> Clear filters
          </Button>
        )}
      </div>

      <div className={`${GLASS_PANEL} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <SortableTh label="Product" sortKey="name" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="SKU" sortKey="sku" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Category" sortKey="category" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Price" sortKey="price" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Stock" sortKey="stock" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Type" sortKey="type" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Updated" sortKey="updated" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {p.images[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                      {p.featured && (
                        <Badge variant="outline" className="text-[10px] px-1">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.sku ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell>
                    {p.originalPrice ? (
                      <span className="flex flex-col">
                        <span className="font-medium text-primary">{formatPrice(p.price)}</span>
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(p.originalPrice)}</span>
                      </span>
                    ) : (
                      formatPrice(p.price)
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={p.stock <= p.lowStockThreshold ? 'text-destructive font-medium' : ''}>{p.stock}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{TYPE_LABELS[p.productType]}</TableCell>
                  <TableCell>
                    <StatusDot label={STATUS_LABELS[p.status]} tone={STATUS_DOT[p.status]} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Edit">
                        <Link href={`/admin/products/${p.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicate(p.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {p.status !== 'hidden' ? (
                        <Button variant="ghost" size="icon" title="Hide" onClick={() => handleSetStatus(p.id, 'hidden', 'Product hidden')}>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Unhide" onClick={() => handleSetStatus(p.id, 'active', 'Product unhidden')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {p.status !== 'archived' && (
                        <Button variant="ghost" size="icon" title="Archive" onClick={() => handleSetStatus(p.id, 'archived', 'Product archived')}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(p.id, p.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageCount={pageCount} total={pageTotal} pageSize={15} onPageChange={setPage} />
      </div>
    </div>
  )
}
