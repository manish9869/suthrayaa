'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingBag, Star, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useCartStore, useWishlistStore } from '@/lib/store'
import { formatPrice, type Product } from '@/lib/data'
import { toast } from 'sonner'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem, openCart } = useCartStore()
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore()
  const inWishlist = isInWishlist(product.id)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product, product.colors[0])
    openCart()
    toast.success(`${product.name} added to cart`)
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        'group block bg-card rounded-xl overflow-hidden shadow-soft hover-lift',
        className
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.bestseller && (
            <Badge className="bg-secondary text-secondary-foreground text-xs">
              Bestseller
            </Badge>
          )}
          {product.newArrival && (
            <Badge className="bg-mint text-mint-foreground text-xs">
              New
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-xs">
              -{discount}%
            </Badge>
          )}
          {product.stock < 5 && product.stock > 0 && (
            <Badge variant="outline" className="bg-background/80 text-xs">
              Only {product.stock} left
            </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm transition-all',
            inWishlist ? 'text-destructive' : 'text-foreground opacity-0 group-hover:opacity-100'
          )}
          onClick={handleWishlistToggle}
        >
          <Heart className={cn('h-4 w-4', inWishlist && 'fill-current')} />
        </Button>

        {/* Quick Actions */}
        <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <Button
            size="sm"
            className="flex-1 bg-primary/90 backdrop-blur-sm hover:bg-primary"
            onClick={handleAddToCart}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 bg-background/90 backdrop-blur-sm"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
        <h3 className="font-medium text-foreground leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-3.5 w-3.5',
                  i < Math.floor(product.rating)
                    ? 'fill-secondary text-secondary'
                    : 'text-muted'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 mt-3">
          {product.colors.slice(0, 5).map((color) => (
            <div
              key={color}
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {product.colors.length > 5 && (
            <span className="text-xs text-muted-foreground ml-1">
              +{product.colors.length - 5}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
