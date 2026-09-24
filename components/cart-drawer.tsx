'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, ShoppingBag, X, Truck, Check, ArrowRight, ShieldCheck } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/store'
import { formatPrice } from '@/lib/data'
import { EASE_OUT } from '@/components/motion/reveal'

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getTotalPrice, getItemUnitPrice } = useCartStore()
  const totalPrice = getTotalPrice()
  const shippingThreshold = 999
  const freeShipping = totalPrice >= shippingThreshold
  const itemCount = items.reduce((n, i) => n + i.quantity, 0)
  const progress = Math.min((totalPrice / shippingThreshold) * 100, 100)

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex w-full flex-col gap-0 bg-background p-0 sm:max-w-[440px] [&>button]:top-6 [&>button]:right-5">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="flex items-baseline gap-2 font-serif text-2xl font-normal">
            Your bag <span className="font-sans text-sm text-muted-foreground">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          </SheetTitle>
          <SheetDescription className="sr-only">View and manage items in your shopping cart</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-blush"
            >
              <ShoppingBag className="h-9 w-9 text-rose" />
            </motion.div>
            <h3 className="display text-3xl">Your bag is empty</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">Handmade pieces are waiting for you — find something that feels like you.</p>
            <Button onClick={closeCart} asChild size="lg" className="mt-6 h-12 px-7">
              <Link href="/shop">
                Start shopping <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="border-b bg-sand/60 px-6 py-4">
              <p className="flex items-center gap-2 text-[13px]">
                {freeShipping ? (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="font-medium">You&apos;ve unlocked free shipping!</span>
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 text-primary" />
                    <span>
                      Add <span className="font-semibold">{formatPrice(shippingThreshold - totalPrice)}</span> more for free shipping
                    </span>
                  </>
                )}
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const itemKey = `${item.product.id}-${item.selectedColor}-${item.customText || ''}-${(item.customizations ?? []).map((c) => c.valueId ?? c.textValue).join(',')}`
                  const unitPrice = getItemUnitPrice(item)
                  return (
                    <motion.div
                      key={itemKey}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                      className="flex gap-4 border-b py-5 last:border-0"
                    >
                      <Link href={`/product/${item.product.slug}`} onClick={closeCart} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-sand">
                        <Image src={item.product.images[0]} alt={item.product.name} fill sizes="80px" className="object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/product/${item.product.slug}`} onClick={closeCart} className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
                            {item.product.name}
                          </Link>
                          <button
                            type="button"
                            className="tap-bounce -mr-1 -mt-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => removeItem(item.product.id, item.selectedColor, item.customText, item.customizations)}
                            aria-label={`Remove ${item.product.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {item.customizations && item.customizations.length > 0 ? (
                          <p className="mt-1 truncate text-xs text-muted-foreground">{item.customizations.map((c) => c.displayValue).join(' · ')}</p>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            {item.selectedColor && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-border" style={{ backgroundColor: item.selectedColor }} />}
                            {item.customText && <span className="truncate text-xs text-muted-foreground">&ldquo;{item.customText}&rdquo;</span>}
                          </div>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="flex h-9 items-center rounded-full border bg-card">
                            <button
                              type="button"
                              className="tap-bounce flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:text-foreground"
                              aria-label="Decrease quantity"
                              onClick={() => updateQuantity(item.product.id, item.selectedColor, item.quantity - 1, item.customText, item.customizations)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                            <button
                              type="button"
                              className="tap-bounce flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:text-foreground"
                              aria-label="Increase quantity"
                              onClick={() => updateQuantity(item.product.id, item.selectedColor, item.quantity + 1, item.customText, item.customizations)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{formatPrice(unitPrice * item.quantity)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="space-y-4 border-t bg-card px-6 py-5">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{freeShipping ? 'Free' : 'Calculated at checkout'}</span>
                </div>
                <div className="flex justify-between pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(totalPrice)}</span>
                </div>
              </div>
              <Button className="h-12 w-full text-[15px]" size="lg" asChild onClick={closeCart}>
                <Link href="/checkout">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center justify-between text-xs">
                <Link href="/cart" onClick={closeCart} className="link-underline font-medium">
                  View full bag
                </Link>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Secure checkout
                </span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
