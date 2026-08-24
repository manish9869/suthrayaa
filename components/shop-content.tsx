'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SlidersHorizontal, X, Search, Grid3X3, Grid2X2, LayoutList } from 'lucide-react'
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

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : []
  )
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [viewMode, setViewMode] = useState<ViewMode>('grid-4')
  const [showFilters, setShowFilters] = useState(false)

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories])
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
  }, [products, searchQuery, selectedCategories, matchingSlugs, priceRange, sortBy])

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
    setPriceRange([0, 1000])
    setSortBy('featured')
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedCategories.length +
    (priceRange[0] > 0 || priceRange[1] < 1000 ? 1 : 0)

  const renderCategoryFilterNode = (node: CategoryNode, depth: number): ReactNode => (
    <div key={node.slug}>
      <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
        <Checkbox
          id={node.slug}
          checked={selectedCategories.includes(node.slug)}
          onCheckedChange={() => handleCategoryToggle(node.slug)}
        />
        <label
          htmlFor={node.slug}
          className={cn(
            'text-sm cursor-pointer flex-1 flex items-center justify-between py-0.5',
            depth === 0 && 'font-semibold'
          )}
        >
          <span>{node.name}</span>
          <span className="text-muted-foreground text-xs">({totalProductCount(node)})</span>
        </label>
      </div>
      {node.children.map((child) => renderCategoryFilterNode(child, depth + 1))}
    </div>
  )

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
          {categoryTree.map((node) => renderCategoryFilterNode(node, 0))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Price Range</Label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={1000}
          step={50}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatPrice(priceRange[0])}</span>
          <span>{formatPrice(priceRange[1])}</span>
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
                : 'All Products'}
            </h1>
            <p className="text-muted-foreground">
              Discover handcrafted crochet creations made with love
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-28 bg-card rounded-xl p-6 shadow-soft">
                <h2 className="font-semibold text-lg mb-4">Filters</h2>
                <FilterContent />
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
                        <FilterContent />
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
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  {selectedCategories.map((slug) => (
                    <Badge key={slug} variant="secondary" className="gap-1">
                      {categories.find((c) => c.slug === slug)?.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleCategoryToggle(slug)}
                      />
                    </Badge>
                  ))}
                  {(priceRange[0] > 0 || priceRange[1] < 1000) && (
                    <Badge variant="secondary" className="gap-1">
                      {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setPriceRange([0, 1000])}
                      />
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={clearFilters}
                  >
                    Clear all
                  </Button>
                </div>
              )}

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
                <div
                  className={cn(
                    'grid gap-6',
                    viewMode === 'grid-4' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                    viewMode === 'grid-3' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                    viewMode === 'list' && 'grid-cols-1'
                  )}
                >
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
