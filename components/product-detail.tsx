'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
import { toast } from 'sonner'

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

  const displayUnitPrice = usesNewCustomizer ? product.price + customizationPriceAdjustment : product.price

  const handleAddToCart = () => {
    if (usesNewCustomizer) {
      if (missingRequired.length > 0) {
        toast.error(`Please choose ${missingRequired[0].toLowerCase()}`)
        return
      }
      addItem(
        product,
        '',
        undefined,
        resolvedCustomizations.map((c) => ({
          customizationId: c.customizationId,
          valueId: c.valueId,
          textValue: c.textValue,
          label: c.label,
          displayValue: c.displayValue,
          priceAdjustment: c.priceAdjustment,
        }))
      )
      openCart()
      toast.success(`${product.name} added to cart!`)
      return
    }

    if (isCustomizing && !customText.trim()) {
      toast.error('Please enter your custom text')
      return
    }
    addItem(product, effectiveColor, customText || undefined)
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

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        {/* Breadcrumb */}
        <div className="bg-muted/50 py-4">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/shop" className="hover:text-foreground transition-colors">
                Shop
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link
                href={`/shop?category=${product.categorySlug}`}
                className="hover:text-foreground transition-colors"
              >
                {product.category}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium truncate">{product.name}</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                <Image
                  src={product.images[selectedImage] ?? '/placeholder.svg'}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.bestseller && (
                    <Badge className="bg-secondary text-secondary-foreground">Bestseller</Badge>
                  )}
                  {product.newArrival && (
                    <Badge className="bg-mint text-mint-foreground">New Arrival</Badge>
                  )}
                  {rules?.isLimitedEdition && (
                    <Badge className="bg-lavender text-lavender-foreground gap-1">
                      <Sparkles className="h-3 w-3" /> Limited Edition
                    </Badge>
                  )}
                  {discount > 0 && (
                    <Badge className="bg-destructive text-destructive-foreground">
                      {discount}% OFF
                    </Badge>
                  )}
                </div>
              </div>

              {product.images.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={cn(
                        'relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                        selectedImage === index
                          ? 'border-secondary'
                          : 'border-transparent hover:border-border'
                      )}
                    >
                      <Image src={image} alt={`${product.name} view ${index + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:sticky lg:top-28 lg:self-start space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{product.category}</p>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-3">{product.name}</h1>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < Math.floor(product.rating) ? 'fill-secondary text-secondary' : 'text-muted'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{product.rating}</span>
                  <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-primary">
                    {usesNewCustomizer ? formatPrice(displayUnitPrice) : formatPrice(product.price)}
                  </span>
                  {product.comparePrice && !usesNewCustomizer && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPrice(product.comparePrice)}
                      </span>
                      <Badge variant="destructive">{discount}% OFF</Badge>
                    </>
                  )}
                  {usesNewCustomizer && customizationPriceAdjustment > 0 && (
                    <span className="text-sm text-muted-foreground">
                      (base {formatPrice(product.price)} + {formatPrice(customizationPriceAdjustment)})
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {usesNewCustomizer && (
                <ProductCustomizer
                  customizations={product.customizations}
                  onChange={(resolved, priceAdjustment, missing) => {
                    setResolvedCustomizations(resolved)
                    setCustomizationPriceAdjustment(priceAdjustment)
                    setMissingRequired(missing)
                  }}
                />
              )}

              {/* Color Selection — locked while customizing if the admin disabled color choice */}
              {!usesNewCustomizer && product.colors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Select Color: <span className="text-muted-foreground capitalize">{effectiveColor}</span>
                    {isCustomizing && customText && !allowColorChoice && (
                      <span className="text-xs text-muted-foreground ml-2">(fixed for personalized orders)</span>
                    )}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => {
                      const disabledForCustomization =
                        isCustomizing && customText.length > 0 && !allowColorChoice && color !== allowedColors[0]
                      return (
                        <button
                          key={color}
                          onClick={() => !disabledForCustomization && setSelectedColor(color)}
                          disabled={disabledForCustomization}
                          className={cn(
                            'w-10 h-10 rounded-full border-2 transition-all relative',
                            effectiveColor === color
                              ? 'border-primary ring-2 ring-primary ring-offset-2'
                              : 'border-border hover:border-muted-foreground',
                            disabledForCustomization && 'opacity-30 cursor-not-allowed'
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        >
                          {effectiveColor === color && (
                            <Check
                              className={cn(
                                'absolute inset-0 m-auto h-5 w-5',
                                LIGHT_HEXES.includes(color.toUpperCase()) ? 'text-foreground' : 'text-white'
                              )}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Customization */}
              {!product.isCustomizable && rules?.isLimitedEdition && (
                <div className="p-4 bg-lavender/20 rounded-xl flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-lavender-foreground flex-shrink-0" />
                  This is a limited-edition piece and isn&apos;t available for personalization.
                </div>
              )}

              {isCustomizing && (
                <div className="p-4 bg-peach/30 rounded-xl">
                  <Label className="text-sm font-medium mb-2 block">Personalize Your Item</Label>
                  <Input
                    type="text"
                    placeholder={rules?.textPlaceholder}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value.slice(0, rules?.maxTextLength))}
                    className="bg-background"
                    maxLength={rules?.maxTextLength}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {customText.length}/{rules?.maxTextLength} characters
                  </p>

                  {customText && (
                    <div className="mt-4 p-4 bg-background rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-2">Preview</p>
                      <div
                        className="text-2xl font-serif font-bold py-2 px-4 rounded inline-block"
                        style={{
                          backgroundColor: effectiveColor,
                          color: LIGHT_HEXES.includes(effectiveColor.toUpperCase()) ? '#1a365d' : '#FFFFFF',
                        }}
                      >
                        {customText}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Quantity</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.stock < 10 ? (
                      <span className="text-destructive">Only {product.stock} left in stock!</span>
                    ) : (
                      `${product.stock} available`
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg" className="flex-1" onClick={handleAddToCart} disabled={product.stock === 0}>
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  {product.stock === 0 ? 'Out of Stock' : `Add to Cart - ${formatPrice(displayUnitPrice * quantity)}`}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleWishlistToggle}
                  aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={cn(inWishlist && 'text-destructive border-destructive')}
                >
                  <Heart className={cn('h-5 w-5', inWishlist && 'fill-current')} />
                </Button>
                <Button size="lg" variant="outline" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-xl">
                <div className="text-center">
                  <Truck className="h-6 w-6 mx-auto mb-1 text-secondary" />
                  <p className="text-xs font-medium">Free Shipping</p>
                  <p className="text-xs text-muted-foreground">Above Rs. 999</p>
                </div>
                <div className="text-center">
                  <ShieldCheck className="h-6 w-6 mx-auto mb-1 text-secondary" />
                  <p className="text-xs font-medium">Secure Payment</p>
                  <p className="text-xs text-muted-foreground">100% Protected</p>
                </div>
                <div className="text-center">
                  <RotateCcw className="h-6 w-6 mx-auto mb-1 text-secondary" />
                  <p className="text-xs font-medium">Easy Returns</p>
                  <p className="text-xs text-muted-foreground">7 Day Policy</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-xl">
                <Package className="h-10 w-10 text-secondary flex-shrink-0" />
                <div>
                  <p className="font-medium">Estimated Delivery</p>
                  <p className="text-sm text-muted-foreground">{product.estimatedDelivery}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="mt-12">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="description"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-secondary data-[state=active]:bg-transparent"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-secondary data-[state=active]:bg-transparent"
                >
                  Details & Care
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-secondary data-[state=active]:bg-transparent"
                >
                  Reviews ({product.reviewCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-4">Product Details</h3>
                    <dl className="space-y-3">
                      {product.dimensions && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Dimensions</dt>
                          <dd className="font-medium">{product.dimensions}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Materials</dt>
                        <dd className="font-medium">{product.materials.join(', ')}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Handmade</dt>
                        <dd className="font-medium">Yes, 100%</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Care Instructions</h3>
                    <ul className="space-y-2">
                      {product.careInstructions.map((instruction, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-6 last:border-0">
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarFallback className="bg-peach">
                              {review.customerName.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{review.customerName}</span>
                              {review.verified && (
                                <Badge variant="secondary" className="text-xs">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'h-3.5 w-3.5',
                                      i < review.rating ? 'fill-secondary text-secondary' : 'text-muted'
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <h4 className="font-medium mb-1">{review.title}</h4>
                            <p className="text-sm text-muted-foreground">{review.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No reviews yet. Be the first to review!</p>
                    <Button variant="outline">Write a Review</Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <h2 className="text-2xl font-serif font-bold mb-6">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How long does it take to make my order?</AccordionTrigger>
                <AccordionContent>
                  Since each piece is handmade to order, it typically takes 3-5 business days to craft your item.
                  Customized items may take an additional 1-2 days.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What if I want to change my customization?</AccordionTrigger>
                <AccordionContent>
                  You can contact us within 24 hours of placing your order to make changes. After that, we may have
                  already started crafting your piece.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is gift wrapping available?</AccordionTrigger>
                <AccordionContent>
                  Yes! We offer beautiful gift wrapping at checkout. You can also add a personalized note to make
                  your gift extra special.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-serif font-bold mb-8">You May Also Like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
