'use client'

import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DualRangeSlider } from '@/components/ui/dual-range-slider'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SlidersHorizontal, X, Search, Grid3X3, Grid2X2, LayoutList, ChevronDown, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, type Product, type Category } from '@/lib/data'
import { buildCategoryTree, collectSlugs, totalProductCount, type CategoryNode } from '@/lib/utils/category-tree'

type ViewMode = 'grid-4' | 'grid-3' | 'list'
type SortOption = 'featured' | 'newest' | 'price-low' | 'price-high' | 'bestselling' | 'rating'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'rating', label: 'Top Rated' },
]

export function ShopContent({ products, categories }: { products: Product[]; categories: Category[] }) {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  const tagParam = searchParams.get('tag')
  const searchParam = searchParams.get('search')

  const [searchQuery, setSearchQuery] = useState(searchParam ?? '')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : []
  )
  const [selectedTag, setSelectedTag] = useState<string | null>(tagParam)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  // The slider's own live position — updates instantly while dragging for live price
  // labels, decoupled from `priceRange` (which drives filtering, the animated product grid,
  // and the active-filter badge) so a drag doesn't force a full filter recompute + grid
  // re-animation on every tick. Only `onValueCommit` (drag release) pushes into `priceRange`.
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, 1000])
  useEffect(() => setSliderRange(priceRange), [priceRange])
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [viewMode, setViewMode] = useState<ViewMode>('grid-4')
  const [showFilters, setShowFilters] = useState(false)

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories])

  // Top-level category groups collapse by default so a long category list doesn't dominate
  // the filter panel — except the branch containing a category the user arrived with, which
  // opens automatically so their current selection is visible rather than hidden in a closed group.
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const top of buildCategoryTree(categories)) {
      if (categoryParam && collectSlugs(top).includes(categoryParam)) initial.add(top.slug)
    }
    return initial
  })
  const toggleExpanded = (slug: string) =>
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  const nodeBySlug = useMemo(() => {
    const map = new Map<string, CategoryNode>()
    const walk = (nodes: CategoryNode[]) => {
      for (const n of nodes) {
        map.set(n.slug, n)
        walk(n.children)
      }
    }
    walk(categoryTree)
    return map
  }, [categoryTree])

  // A selected parent category (e.g. "Flowers & Floral") should match every product under
  // its whole branch, not just products whose categorySlug is that exact parent — products
  // only ever attach to leaf categories.
  const matchingSlugs = useMemo(() => {
    const set = new Set<string>()
    for (const slug of selectedCategories) {
      const node = nodeBySlug.get(slug)
      if (node) collectSlugs(node).forEach((s) => set.add(s))
      else set.add(slug)
    }
    return set
  }, [selectedCategories, nodeBySlug])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      )
    }

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter((p) => matchingSlugs.has(p.categorySlug))
    }

    // Tag filter (e.g. "clearance" from the navbar quick-link)
    if (selectedTag) {
      result = result.filter((p) => p.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()))
    }

    // Price filter
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])

    // Sort
    switch (sortBy) {
      case 'newest':
        result = result.filter((p) => p.newArrival).concat(result.filter((p) => !p.newArrival))
        break
      case 'price-low':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        result.sort((a, b) => b.price - a.price)
        break
      case 'bestselling':
        result = result.filter((p) => p.bestseller).concat(result.filter((p) => !p.bestseller))
        break
      case 'rating':
        result.sort((a, b) => b.rating - a.rating)
        break
      default:
        result = result.filter((p) => p.featured).concat(result.filter((p) => !p.featured))
    }

    return result
  }, [products, searchQuery, selectedCategories, selectedTag, matchingSlugs, priceRange, sortBy])

  const handleCategoryToggle = (categorySlug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categorySlug)
        ? prev.filter((c) => c !== categorySlug)
        : [...prev, categorySlug]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedTag(null)
    setPriceRange([0, 1000])
    setSortBy('featured')
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedCategories.length +
    (selectedTag ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 1000 ? 1 : 0)

  const renderCategoryFilterNode = (node: CategoryNode, depth: number): ReactNode => (
    <div key={node.slug}>
      <div
        className="flex items-center gap-2 rounded-md py-1 pr-1 transition-colors hover:bg-muted/60"
        style={{ paddingLeft: depth * 16 }}
      >
        <Checkbox
          id={node.slug}
          checked={selectedCategories.includes(node.slug)}
          onCheckedChange={() => handleCategoryToggle(node.slug)}
        />
        <label htmlFor={node.slug} className="text-sm cursor-pointer flex-1 flex items-center justify-between py-0.5">
          <span>{node.name}</span>
          <span className="text-muted-foreground text-xs">({totalProductCount(node)})</span>
        </label>
      </div>
      {node.children.map((child) => renderCategoryFilterNode(child, depth + 1))}
    </div>
  )

  // Top-level categories render as collapsible groups — the checkbox (selects the whole
  // branch) and the expand toggle (reveals subcategories) are deliberately separate
  // controls, since a checkbox can't safely nest inside a clickable toggle without also
  // triggering the expand/collapse on every selection.
  const renderTopLevelCategory = (node: CategoryNode): ReactNode => {
    const expanded = expandedCategories.has(node.slug)
    return (
      <div key={node.slug}>
        <div className="flex items-center gap-2 rounded-md py-1 pr-1 transition-colors hover:bg-muted/60">
          <Checkbox
            id={node.slug}
            checked={selectedCategories.includes(node.slug)}
            onCheckedChange={() => handleCategoryToggle(node.slug)}
          />
          <label htmlFor={node.slug} className="text-sm font-semibold cursor-pointer flex-1 flex items-center justify-between py-0.5">
            <span>{node.name}</span>
            <span className="text-muted-foreground text-xs font-normal">({totalProductCount(node)})</span>
          </label>
          {node.children.length > 0 && (
            <button
              type="button"
              onClick={() => toggleExpanded(node.slug)}
              className="tap-bounce rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              aria-expanded={expanded}
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')} />
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {node.children.length > 0 && expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {node.children.map((child) => renderCategoryFilterNode(child, 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Separator />

      {/* Categories */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Categories</Label>
        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {categoryTree.map((node) => renderTopLevelCategory(node))}
        </div>
      </div>

      <Separator />

      {/* Clearance */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="clearance-filter"
          checked={selectedTag?.toLowerCase() === 'clearance'}
          onCheckedChange={(checked) => setSelectedTag(checked ? 'clearance' : null)}
        />
        <label htmlFor="clearance-filter" className="text-sm cursor-pointer flex items-center gap-1.5 text-destructive font-medium">
          <Tag className="h-3.5 w-3.5" />
          Clearance only
        </label>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Price Range</Label>
        <DualRangeSlider
          value={sliderRange}
          onValueChange={setSliderRange}
          onValueCommit={setPriceRange}
          min={0}
          max={1000}
          step={1}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatPrice(sliderRange[0])}</span>
          <span>{formatPrice(sliderRange[1])}</span>
        </div>
      </div>

      <Separator />

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Clear All Filters
        </Button>
      )}
    </div>
  )

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        {/* Page Header */}
        <div className="bg-muted/50 py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
              {selectedCategories.length === 1
                ? categories.find((c) => c.slug === selectedCategories[0])?.name || 'Shop'
                : selectedTag
                ? `${selectedTag.charAt(0).toUpperCase()}${selectedTag.slice(1)}`
                : 'All Products'}
            </h1>
            <p className="text-muted-foreground">
              {selectedTag?.toLowerCase() === 'clearance'
                ? 'Limited pieces at limited-time prices — once they’re gone, they’re gone'
                : 'Discover handcrafted crochet creations made with love'}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-28 bg-card rounded-xl p-6 shadow-soft">
                <h2 className="font-semibold text-lg mb-4">Filters</h2>
                {FilterContent()}
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  {/* Mobile Filter Button */}
                  <Sheet open={showFilters} onOpenChange={setShowFilters}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filters
                        {activeFilterCount > 0 && (
                          <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        {FilterContent()}
                      </div>
                    </SheetContent>
                  </Sheet>

                  <span className="text-sm text-muted-foreground">
                    {filteredProducts.length} products
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View Mode */}
                  <div className="hidden sm:flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-9 w-9 rounded-none rounded-l-lg',
                        viewMode === 'grid-4' && 'bg-muted'
                      )}
                      onClick={() => setViewMode('grid-4')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-9 w-9 rounded-none', viewMode === 'grid-3' && 'bg-muted')}
                      onClick={() => setViewMode('grid-3')}
                    >
                      <Grid2X2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-9 w-9 rounded-none rounded-r-lg',
                        viewMode === 'list' && 'bg-muted'
                      )}
                      onClick={() => setViewMode('list')}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              <AnimatePresence initial={false}>
                {activeFilterCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                      <span className="text-sm text-muted-foreground">Active filters:</span>
                      <AnimatePresence initial={false}>
                        {searchQuery && (
                          <motion.div key="search" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                            <Badge variant="secondary" className="gap-1">
                              Search: {searchQuery}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                            </Badge>
                          </motion.div>
                        )}
                        {selectedCategories.map((slug) => (
                          <motion.div key={slug} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                            <Badge variant="secondary" className="gap-1">
                              {categories.find((c) => c.slug === slug)?.name}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => handleCategoryToggle(slug)} />
                            </Badge>
                          </motion.div>
                        ))}
                        {selectedTag && (
                          <motion.div key="tag" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                            <Badge variant="destructive" className="gap-1">
                              {selectedTag.charAt(0).toUpperCase() + selectedTag.slice(1)}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTag(null)} />
                            </Badge>
                          </motion.div>
                        )}
                        {(priceRange[0] > 0 || priceRange[1] < 1000) && (
                          <motion.div key="price" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                            <Badge variant="secondary" className="gap-1">
                              {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => setPriceRange([0, 1000])} />
                            </Badge>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
                        Clear all
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Search className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </div>
              ) : (
                <motion.div
                  layout
                  className={cn(
                    'grid gap-6',
                    viewMode === 'grid-4' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                    viewMode === 'grid-3' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                    viewMode === 'list' && 'grid-cols-1'
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
