'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isOutOfStock, needsOptions } from '@/lib/product-rules'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react'
import { useCartStore, useWishlistStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { formatPrice, type Category } from '@/lib/data'
import { toast } from 'sonner'

export function WishlistContent({ categories }: { categories: Category[] }) {
  const { items, removeItem } = useWishlistStore()
  const { addItem: addToCart, openCart } = useCartStore()
  const hydrated = useHydrated()

  const router = useRouter()
  const handleMoveToCart = (productId: string) => {
    const product = items.find((p) => p.id === productId)
    if (!product) return
    if (isOutOfStock(product)) {
      toast.error(`${product.name} is sold out right now`)
      return
    }
    // Products needing a size / option / name are completed on the product page
    if (needsOptions(product)) {
      toast.info('Choose your options to add this to your cart')
      router.push(`/product/${product.slug}`)
      return
    }
    addToCart(product, product.colors[0] ?? '')
    removeItem(productId)
    openCart()
    toast.success(`${product.name} moved to cart`)
  }

  if (!hydrated) {
    return (
      <>
        <Navbar categories={categories} />
        <main className="min-h-screen" />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar categories={categories} />
        <main className="min-h-screen">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <div className="w-32 h-32 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
                <Heart className="h-16 w-16 text-muted-foreground" />
              </div>
              <h1 className="display text-3xl mb-3">Your Wishlist is Empty</h1>
              <p className="text-muted-foreground mb-8">
                Save your favorite handcrafted pieces here to find them easily later.
              </p>
              <Button size="lg" asChild>
                <Link href="/shop">
                  Explore the Collection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-6 w-6 text-destructive fill-current" />
            <h1 className="display text-4xl sm:text-5xl">My Wishlist ({items.length})</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence initial={false}>
              {items.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="overflow-hidden group hover-lift">
                    <Link href={`/product/${product.slug}`} className="relative aspect-square block bg-muted">
                      <Image
                        src={product.images[0] ?? '/placeholder.svg'}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </Link>
                    <CardContent className="p-4">
                      <Link href={`/product/${product.slug}`} className="font-medium line-clamp-2 hover:text-primary transition-colors">
                        {product.name}
                      </Link>
                      <p className="text-primary font-semibold mt-1 mb-3">{formatPrice(product.price)}</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 tap-bounce" onClick={() => handleMoveToCart(product.id)} disabled={isOutOfStock(product)}>
                          <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                          {isOutOfStock(product) ? 'Sold out' : needsOptions(product) ? 'Choose options' : 'Add to cart'}
                        </Button>
                        <Button size="icon" variant="outline" className="tap-bounce" onClick={() => removeItem(product.id)} aria-label="Remove from wishlist">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
