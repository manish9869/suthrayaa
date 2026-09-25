'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ShoppingBag,
  Heart,
  Share2,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
  Minus,
  Plus,
  Check,
  ChevronRight,
  Package,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore, useWishlistStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { formatPrice, type Product, type Review, type Category } from '@/lib/data'
import { ProductCustomizer, type ResolvedCustomization } from '@/components/product-customizer'
import { YarnColorPicker } from '@/components/yarn-color-picker'
import { toast } from 'sonner'
import { EASE_OUT, Stagger, StaggerItem } from '@/components/motion/reveal'
import { SectionHeading } from '@/components/home/section-heading'

interface ProductDetailProps {
  product: Product
  reviews: Review[]
  relatedProducts: Product[]
  categories: Category[]
}

const LIGHT_HEXES = ['#FFFFFF', '#F5F5DC', '#FFE5B5', '#FFB5BA']

export function ProductDetail({ product, reviews, relatedProducts, categories }: ProductDetailProps) {
  const rules = product.customizationOptions
  const allowColorChoice = rules?.allowColorChoice ?? true
  const allowedColors = rules?.allowedColors && rules.allowedColors.length > 0 ? rules.allowedColors : product.colors

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState(product.colors[0])
  const [customText, setCustomText] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%')

  // Show a compact buy bar on mobile once the main Add to cart button has scrolled away
  const buyRef = useRef<HTMLDivElement>(null)
  const [showStickyBuy, setShowStickyBuy] = useState(false)
  useEffect(() => {
    const el = buyRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setShowStickyBuy(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // New admin-controlled customization engine — takes over entirely when configured.
  const usesNewCustomizer = product.customizations.length > 0
  const [resolvedCustomizations, setResolvedCustomizations] = useState<ResolvedCustomization[]>([])
  const [customizationPriceAdjustment, setCustomizationPriceAdjustment] = useState(0)
  const [missingRequired, setMissingRequired] = useState<string[]>([])

  const { addItem, openCart } = useCartStore()
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore()
  const hydrated = useHydrated()
  const inWishlist = hydrated && isInWishlist(product.id)

  const isCustomizing = !usesNewCustomizer && product.isCustomizable && rules?.allowText
  // When the admin has fixed the color for customized orders, the customer's swatch
  // choice while customizing collapses to the first admin-allowed color.
  const effectiveColor = isCustomizing && customText && !allowColorChoice ? allowedColors[0] : selectedColor

  // The new customization engine can define its own "color" type group (with its own swatch
  // list). Only fall back to the product's base color list when no such group exists —
  // otherwise a product with e.g. a "Size" group only would silently lose color selection
  // entirely, since the two color pickers would fight over which one is authoritative.
  const hasCustomColorGroup = usesNewCustomizer && product.customizations.some((c) => c.enabled && c.type === 'color')
  const showBaseColorPicker = product.colors.length > 0 && !hasCustomColorGroup

  const displayUnitPrice = usesNewCustomizer ? product.price + customizationPriceAdjustment : product.price

  const handleAddToCart = () => {
    if (usesNewCustomizer) {
      if (missingRequired.length > 0) {
        toast.error(`Please choose ${missingRequired[0].toLowerCase()}`)
        return
      }
      addItem(
        product,
        showBaseColorPicker ? selectedColor : '',
        undefined,
        resolvedCustomizations.map((c) => ({
          customizationId: c.customizationId,
          valueId: c.valueId,
          textValue: c.textValue,
          label: c.label,
          displayValue: c.displayValue,
          priceAdjustment: c.priceAdjustment,
        })),
        quantity
      )
      openCart()
      toast.success(`${product.name} added to cart!`)
      return
    }

    if (isCustomizing && !customText.trim()) {
      toast.error('Please enter your custom text')
      return
    }
    addItem(product, effectiveColor, customText || undefined, undefined, quantity)
    openCart()
    toast.success(`${product.name} added to cart!`)
  }

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id)
      toast.info('Removed from wishlist')
    } else {
      addToWishlist(product)
      toast.success('Added to wishlist')
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: product.shortDescription,
        url: window.location.href,
      })
    } catch {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  const reviewAvg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : product.rating
  const ratingBars = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    share: reviews.length ? reviews.filter((r) => Math.round(r.rating) === stars).length / reviews.length : 0,
  }))
  const outOfStock = product.stock === 0
  const lowStock = product.stock > 0 && product.stock < 10

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 pb-8 pt-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-hidden text-[13px] text-muted-foreground">
            <Link href="/" className="shrink-0 transition-colors hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link href="/shop" className="shrink-0 transition-colors hover:text-foreground">
              Shop
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link href={`/shop?category=${product.categorySlug}`} className="shrink-0 transition-colors hover:text-foreground">
              {product.category}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium text-foreground">{product.name}</span>
          </nav>

          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
            {/* Gallery */}
            <div className="mx-auto flex w-full max-w-[560px] flex-col-reverse gap-3 lg:mx-0 lg:max-w-none lg:flex-row lg:gap-4">
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide lg:w-20 lg:flex-col lg:overflow-visible">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View image ${index + 1}`}
                      aria-current={selectedImage === index}
                      className={cn(
                        'tap-bounce relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl bg-sand ring-2 ring-offset-2 ring-offset-background transition-all duration-200',
                        selectedImage === index ? 'ring-primary' : 'ring-transparent opacity-70 hover:opacity-100'
                      )}
                    >
                      <Image src={image} alt={`${product.name} view ${index + 1}`} fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div
                className="group relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-[2rem] bg-sand"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setZoomOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
                }}
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={selectedImage}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  >
                    <Image
                      src={product.images[selectedImage] ?? '/placeholder.svg'}
                      alt={product.name}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      style={{ transformOrigin: zoomOrigin }}
                      className="object-cover transition-transform duration-500 ease-[var(--ease-out)] [@media(hover:hover)]:group-hover:scale-[1.6]"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-2">
                  {discount > 0 && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-white">−{discount}% off</span>}
                  {product.bestseller && <span className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold backdrop-blur">Bestseller</span>}
                  {product.newArrival && <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">New arrival</span>}
                  {rules?.isLimitedEdition && (
                    <span className="flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-xs font-semibold text-rose">
                      <Sparkles className="h-3 w-3" /> Limited edition
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="lg:sticky lg:top-[124px] lg:self-start">
              <Link href={`/shop?category=${product.categorySlug}`} className="eyebrow hover:opacity-80">
                {product.category}
              </Link>
              <h1 className="display mt-3 text-[2.3rem] sm:text-5xl">{product.name}</h1>

              <a href="#details" className="mt-4 inline-flex items-center gap-2 text-sm">
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-4 w-4', i < Math.round(product.rating) ? 'fill-gold text-gold' : 'text-muted-foreground/30')} />
                  ))}
                </span>
                <span className="font-semibold">{product.rating}</span>
                <span className="link-underline text-muted-foreground">{product.reviewCount} reviews</span>
              </a>

              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight">
                  {usesNewCustomizer ? formatPrice(displayUnitPrice) : formatPrice(product.price)}
                </span>
                {product.comparePrice && !usesNewCustomizer && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>
                    <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs font-semibold text-rose">Save {discount}%</span>
                  </>
                )}
                {usesNewCustomizer && customizationPriceAdjustment > 0 && (
                  <span className="text-sm text-muted-foreground">
                    (base {formatPrice(product.price)} + {formatPrice(customizationPriceAdjustment)})
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>

              {product.shortDescription && <p className="mt-5 text-[15.5px] leading-relaxed text-foreground/75">{product.shortDescription}</p>}

              <div className="my-7 h-px bg-border" />

              <div className="space-y-6">
                {usesNewCustomizer && (
                  <div className="rounded-[1.5rem] bg-blush/50 p-5 ring-1 ring-blush">
                    <ProductCustomizer
                      customizations={product.customizations}
                      onChange={(resolved, priceAdjustment, missing) => {
                        setResolvedCustomizations(resolved)
                        setCustomizationPriceAdjustment(priceAdjustment)
                        setMissingRequired(missing)
                      }}
                    />
                  </div>
                )}

                {/* Color selection — locked while customizing if the admin disabled color choice */}
                {showBaseColorPicker && (
                  <YarnColorPicker
                    options={product.colors.map((color) => ({
                      value: color,
                      color,
                      disabled: isCustomizing && customText.length > 0 && !allowColorChoice && color !== allowedColors[0],
                    }))}
                    value={effectiveColor}
                    onChange={setSelectedColor}
                    note={
                      isCustomizing && customText && !allowColorChoice ? (
                        <span className="text-xs text-muted-foreground">(fixed for personalized orders)</span>
                      ) : undefined
                    }
                  />
                )}

                {!product.isCustomizable && rules?.isLimitedEdition && (
                  <div className="flex items-center gap-2 rounded-2xl bg-blush/50 p-4 text-sm">
                    <Sparkles className="h-4 w-4 shrink-0 text-rose" />
                    This is a limited-edition piece and isn&apos;t available for personalization.
                  </div>
                )}

                {isCustomizing && (
                  <div className="rounded-[1.5rem] bg-blush/50 p-5 ring-1 ring-blush">
                    <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-rose" /> Personalise your piece
                    </Label>
                    <Input
                      type="text"
                      placeholder={rules?.textPlaceholder}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value.slice(0, rules?.maxTextLength))}
                      maxLength={rules?.maxTextLength}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {customText.length}/{rules?.maxTextLength} characters
                    </p>
                    <AnimatePresence>
                      {customText && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.2, ease: EASE_OUT }}
                          className="mt-4 rounded-2xl bg-card p-4 text-center"
                        >
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Live preview</p>
                          <div
                            className="inline-block rounded-full px-5 py-2 font-serif text-2xl"
                            style={{
                              backgroundColor: effectiveColor,
                              color: LIGHT_HEXES.includes(effectiveColor.toUpperCase()) ? '#1f1a33' : '#FFFFFF',
                            }}
                          >
                            {customText}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Quantity + actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-[52px] items-center rounded-full border bg-card">
                    <button
                      type="button"
                      className="tap-bounce flex h-[52px] w-12 items-center justify-center rounded-full text-foreground/70 hover:text-foreground disabled:opacity-30"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="tap-bounce flex h-[52px] w-12 items-center justify-center rounded-full text-foreground/70 hover:text-foreground disabled:opacity-30"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm">
                    {outOfStock ? (
                      <span className="font-medium text-destructive">Out of stock</span>
                    ) : lowStock ? (
                      <span className="flex items-center gap-1.5 font-medium text-rose">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-rose" /> Only {product.stock} left
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-sage" /> In stock, ready to be made
                      </span>
                    )}
                  </span>
                </div>

                <div ref={buyRef} className="flex gap-2.5">
                  <Button size="lg" className="h-[52px] min-w-0 flex-1 px-4 text-[15px]" onClick={handleAddToCart} disabled={outOfStock}>
                    <ShoppingBag className="h-5 w-5 shrink-0" />
                    {outOfStock ? (
                      'Out of stock'
                    ) : (
                      <>
                        <span className="min-[380px]:hidden">Add · {formatPrice(displayUnitPrice * quantity)}</span>
                        <span className="hidden min-[380px]:inline">Add to cart · {formatPrice(displayUnitPrice * quantity)}</span>
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleWishlistToggle}
                    aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={inWishlist}
                    className={cn('h-[52px] w-[48px] shrink-0 px-0 min-[380px]:w-[52px]', inWishlist && 'border-rose text-rose')}
                  >
                    <Heart className={cn('h-5 w-5', inWishlist && 'fill-current animate-pop-in')} />
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleShare} aria-label="Share" className="h-[52px] w-[48px] shrink-0 px-0 min-[380px]:w-[52px]">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 divide-x rounded-[1.5rem] bg-card py-4 ring-1 ring-border">
                  {[
                    { icon: Truck, title: 'Free shipping', text: 'Above ₹999' },
                    { icon: ShieldCheck, title: 'Secure payment', text: '100% protected' },
                    { icon: RotateCcw, title: 'Easy returns', text: '7-day policy' },
                  ].map((p) => (
                    <div key={p.title} className="px-2 text-center">
                      <p.icon className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                      <p className="text-xs font-semibold">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground">{p.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 rounded-[1.5rem] bg-accent p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-primary">
                    <Package className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Estimated delivery</p>
                    <p className="text-sm text-muted-foreground">{product.estimatedDelivery}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details tabs */}
          <section id="details" className="mt-20 scroll-mt-32">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="h-auto max-w-full justify-start overflow-x-auto rounded-full bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  ['description', 'Description'],
                  ['details', 'Details & care'],
                  ['reviews', `Reviews (${product.reviewCount})`],
                ].map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="shrink-0 rounded-full px-4 py-2 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm sm:px-5"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="description" className="mt-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                <p className="max-w-3xl text-[16px] leading-relaxed text-foreground/75">{product.description}</p>
              </TabsContent>

              <TabsContent value="details" className="mt-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-card p-6 ring-1 ring-border">
                    <h3 className="font-serif text-xl">Product details</h3>
                    <dl className="mt-4 divide-y text-sm">
                      {product.dimensions && (
                        <div className="flex justify-between py-2.5">
                          <dt className="text-muted-foreground">Dimensions</dt>
                          <dd className="font-medium">{product.dimensions}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4 py-2.5">
                        <dt className="text-muted-foreground">Materials</dt>
                        <dd className="text-right font-medium">{product.materials.join(', ')}</dd>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <dt className="text-muted-foreground">Handmade</dt>
                        <dd className="font-medium">Yes, 100%</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-[1.5rem] bg-card p-6 ring-1 ring-border">
                    <h3 className="font-serif text-xl">Care instructions</h3>
                    <ul className="mt-4 space-y-2.5">
                      {product.careInstructions.map((instruction, index) => (
                        <li key={index} className="flex items-start gap-2.5 text-sm text-foreground/75">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                            <Check className="h-3 w-3" />
                          </span>
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
                  <div className="self-start rounded-[1.5rem] bg-card p-6 ring-1 ring-border">
                    <p className="display text-6xl">{reviewAvg.toFixed(1)}</p>
                    <div className="mt-2 flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn('h-4 w-4', i < Math.round(reviewAvg) ? 'fill-gold text-gold' : 'text-muted-foreground/30')} />
                      ))}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Based on {product.reviewCount} reviews</p>
                    {reviews.length > 0 && (
                      <div className="mt-5 space-y-1.5">
                        {ratingBars.map((b) => (
                          <div key={b.stars} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-muted-foreground">{b.stars}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <motion.div
                                className="h-full rounded-full bg-gold"
                                initial={{ width: 0 }}
                                whileInView={{ width: `${b.share * 100}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, ease: EASE_OUT }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <article key={review.id} className="rounded-[1.5rem] bg-card p-6 ring-1 ring-border">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-11 w-11">
                              <AvatarFallback className="bg-blush font-medium text-rose">
                                {review.customerName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{review.customerName}</span>
                                {review.verified && (
                                  <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">
                                    <Check className="h-3 w-3" /> Verified buyer
                                  </span>
                                )}
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {new Date(review.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="mt-1 flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={cn('h-3.5 w-3.5', i < review.rating ? 'fill-gold text-gold' : 'text-muted-foreground/30')} />
                                ))}
                              </div>
                              <h4 className="mt-3 font-medium">{review.title}</h4>
                              <p className="mt-1 text-sm leading-relaxed text-foreground/70">{review.content}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] bg-card p-10 text-center ring-1 ring-border">
                      <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                      <Button variant="outline" className="mt-4">
                        Write a review
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </section>

          {/* FAQ */}
          <section className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Good to know</p>
              <h2 className="display mt-3 text-4xl">
                Questions, <em className="font-normal italic text-primary">answered</em>
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Still curious?{' '}
                <Link href="/contact" className="link-underline font-medium text-primary">
                  Get in touch
                </Link>
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full rounded-[1.5rem] bg-card px-6 ring-1 ring-border">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-[15px]">How long does it take to make my order?</AccordionTrigger>
                <AccordionContent className="text-foreground/70">
                  Since each piece is handmade to order, it typically takes 3-5 business days to craft your item. Customized items may take an additional 1-2
                  days.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-[15px]">What if I want to change my customization?</AccordionTrigger>
                <AccordionContent className="text-foreground/70">
                  You can contact us within 24 hours of placing your order to make changes. After that, we may have already started crafting your piece.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-b-0">
                <AccordionTrigger className="text-[15px]">Is gift wrapping available?</AccordionTrigger>
                <AccordionContent className="text-foreground/70">
                  Yes! We offer beautiful gift wrapping at checkout. You can also add a personalized note to make your gift extra special.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <section className="mt-24">
              <SectionHeading eyebrow="Complete the set" title="You may" accent="also like" href={`/shop?category=${product.categorySlug}`} />
              <Stagger className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
                {relatedProducts.map((p) => (
                  <StaggerItem key={p.id}>
                    <ProductCard product={p} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          )}
        </div>

        {/* Mobile sticky buy bar — appears once the main button scrolls out of view */}
        <AnimatePresence>
          {showStickyBuy && !outOfStock && (
            <motion.div
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sand">
                  <Image src={product.images[0] ?? '/placeholder.svg'} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-sm font-semibold">{formatPrice(displayUnitPrice * quantity)}</p>
                </div>
                <Button className="h-11 px-5" onClick={handleAddToCart}>
                  <ShoppingBag className="h-4 w-4" /> Add
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </>
  )
}
