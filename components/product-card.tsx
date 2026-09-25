'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Star, Check, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCartStore, useWishlistStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { formatPrice, type Product } from '@/lib/data'
import { toast } from 'sonner'
import { isOutOfStock, needsOptions } from '@/lib/product-rules'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem, openCart } = useCartStore()
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore()
  const hydrated = useHydrated()
  const inWishlist = hydrated && isInWishlist(product.id)
  const [justAdded, setJustAdded] = useState(false)

  const router = useRouter()
  const chooseFirst = needsOptions(product)
  const soldOut = isOutOfStock(product)

  const handleAddToCart = () => {
    if (soldOut) return
    // Products with a required size / option / name go to the product page to choose it —
    // adding them bare would only fail at payment.
    if (chooseFirst) {
      router.push(`/product/${product.slug}`)
      return
    }
    addItem(product, product.colors[0] ?? '')
    openCart()
    toast.success(`${product.name} added to cart`)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id)
      toast.info(`Removed from wishlist`)
    } else {
      addToWishlist(product)
      toast.success(`Added to wishlist`)
    }
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0
  const isClearance = product.tags.some((t) => t.toLowerCase() === 'clearance')
  const href = `/product/${product.slug}`

  const colorDots = product.colors.slice(0, 4)

  return (
    // Interactive buttons (wishlist, quick-add) are SIBLINGS of the image Link, not nested
    // inside it — a <button> inside an <a> is invalid HTML and produced unreliable click
    // targeting (clicks meant for the link could silently land on a hover-only button instead).
    <div className={cn('group relative', className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-sand">
        <Link href={href} className="absolute inset-0 z-0" aria-label={product.name}>
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className={cn('zoom-img object-cover', product.images[1] && 'transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-0')}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {product.images[1] && (
            <Image
              src={product.images[1]}
              alt=""
              fill
              aria-hidden
              className="zoom-img object-cover opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {isClearance && <span className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-white">Clearance</span>}
          {!isClearance && discount > 0 && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">−{discount}%</span>
          )}
          {product.bestseller && (
            <span className="rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">Bestseller</span>
          )}
          {product.newArrival && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">New</span>
          )}
          {soldOut && <span className="rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-foreground/70 backdrop-blur">Sold out</span>}
          {!soldOut && product.trackInventory !== false && product.stock < 5 && product.stock > 0 && (
            <span className="rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-rose backdrop-blur">Only {product.stock} left</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          className={cn(
            'tap-bounce absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 shadow-sm backdrop-blur transition-colors',
            inWishlist ? 'text-rose' : 'text-foreground/70 hover:text-rose'
          )}
          onClick={handleWishlistToggle}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={inWishlist}
        >
          <Heart className={cn('h-4 w-4', inWishlist && 'fill-current animate-pop-in')} />
        </button>

        {/* Quick add — slides up on hover devices, a compact button on touch */}
        <div className="absolute inset-x-3 bottom-3 z-10 hidden translate-y-3 opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100">
          <Button className="h-11 flex-1 overflow-hidden shadow-lg" onClick={handleAddToCart} disabled={justAdded || soldOut} variant={soldOut ? 'secondary' : 'default'}>
            <AnimatePresence mode="wait" initial={false}>
              {justAdded ? (
                <motion.span
                  key="added"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" /> Added
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  {soldOut ? (
                    'Sold out'
                  ) : chooseFirst ? (
                    <>
                      <SlidersHorizontal className="h-4 w-4" /> Choose options
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" /> Add to cart
                    </>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={justAdded || soldOut}
          aria-label={soldOut ? `${product.name} is sold out` : chooseFirst ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
          className={cn(
            'tap-bounce absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-50 [@media(hover:hover)]:hidden',
            soldOut && 'hidden'
          )}
        >
          {justAdded ? <Check className="h-4 w-4" /> : chooseFirst ? <SlidersHorizontal className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {/* Content */}
      <Link href={href} className="block px-1 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{product.category}</p>
          {product.reviewCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>({product.reviewCount})
            </span>
          )}
        </div>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            {product.fromPrice != null ? (
              <span className="font-semibold">From {formatPrice(product.fromPrice)}</span>
            ) : (
              <span className="font-semibold">{formatPrice(product.price)}</span>
            )}
            {product.comparePrice && product.fromPrice == null && (
              <span className="text-sm text-muted-foreground line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
          {colorDots.length > 0 && (
            <div className="flex items-center -space-x-1">
              {colorDots.map((color) => (
                <span key={color} className="h-3.5 w-3.5 rounded-full ring-2 ring-background" style={{ backgroundColor: color }} title={color} />
              ))}
              {product.colors.length > 4 && <span className="pl-2 text-[11px] text-muted-foreground">+{product.colors.length - 4}</span>}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}
