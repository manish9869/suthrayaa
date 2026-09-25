'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  Tag,
  Truck,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { formatPrice, type Category } from '@/lib/data'
import { checkCart, getCheckoutOptions, toCartItemInputs, validateCart, validateCoupon, type CartLineIssue, type CheckoutOptions, type PricedCart } from '@/lib/api/checkout'
import { toast } from 'sonner'
import { useEffect, useMemo, useState } from 'react'

export function CartContent({ categories }: { categories: Category[] }) {
  const { items, updateQuantity, removeItem, getTotalPrice, getItemUnitPrice, clearCart } = useCartStore()
  const hydrated = useHydrated()
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  const subtotal = getTotalPrice()
  const [options, setOptions] = useState<CheckoutOptions | null>(null)
  const [priced, setPriced] = useState<PricedCart | null>(null)
  const [issues, setIssues] = useState<CartLineIssue[]>([])
  const [checking, setChecking] = useState(false)
  const cartInputs = useMemo(() => toCartItemInputs(items), [items])
  const cartKey = JSON.stringify(cartInputs)

  useEffect(() => {
    getCheckoutOptions().then(setOptions).catch(() => {})
  }, [])

  // Check every line (missing required options, sold out, too many) as soon as the cart
  // changes, and price it on the server — the customer sees problems here, not at payment.
  useEffect(() => {
    if (!hydrated || !items.length) return
    let cancelled = false
    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const { issues: found } = await checkCart(cartInputs)
        if (cancelled) return
        setIssues(found)
        if (!found.length) {
          const res = await validateCart(cartInputs, { couponCode: appliedCoupon?.code }).catch(() => null)
          if (!cancelled) setPriced(res)
        }
      } catch {
        if (!cancelled) setIssues([])
      } finally {
        if (!cancelled) setChecking(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cartKey, appliedCoupon?.code])

  const shippingThreshold = options?.freeShipping?.enabled ? options.freeShipping.threshold : 0
  const freeShipping = priced?.shipping?.freeShippingApplied ?? (shippingThreshold > 0 && subtotal >= shippingThreshold)
  const shippingCost = priced ? priced.shippingCost : null
  const discount = priced?.discount ?? appliedCoupon?.discount ?? 0
  const total = priced?.total ?? subtotal - discount + (shippingCost ?? 0)
  const issueFor = (index: number) => issues.find((i) => i.index === index)
  const maxQtyFor = (p: (typeof items)[number]['product']) =>
    p.trackInventory !== false && !p.allowBackorders && !p.continueSellingWhenOutOfStock ? Math.max(1, Math.min(p.stock, 20)) : 20

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCheckingCoupon(true)
    try {
      const result = await validateCoupon(couponCode.trim(), subtotal)
      setAppliedCoupon({ code: result.code, discount: result.discount })
      setCouponCode('')
      toast.success(`Coupon applied! ${formatPrice(result.discount)} off.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid coupon code')
    } finally {
      setCheckingCoupon(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    toast.info('Coupon removed')
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
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
              </div>
              <h1 className="display text-3xl mb-3">Your Cart is Empty</h1>
              <p className="text-muted-foreground mb-8">
                Looks like you haven&apos;t added any handcrafted goodies to your cart yet.
              </p>
              <Button size="lg" asChild>
                <Link href="/shop">
                  Start Shopping
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
        {/* Breadcrumb */}
        <div className="bg-background py-4 border-b">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">Shopping Cart</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <h1 className="display text-4xl sm:text-5xl mb-8">Shopping Cart ({items.length})</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Free Shipping Progress */}
              {!freeShipping && shippingThreshold > 0 && (
                <Card className="bg-blush/50 border-transparent">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Add {formatPrice(shippingThreshold - subtotal)} more for FREE shipping!
                      </span>
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((subtotal / shippingThreshold) * 100, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {freeShipping && (
                <Card className="bg-accent border-transparent">
                  <CardContent className="py-4 flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      You&apos;ve unlocked FREE shipping!
                    </span>
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </CardContent>
                </Card>
              )}

              {/* Cart Items List */}
              <Card>
                <CardContent className="divide-y">
                  <AnimatePresence initial={false}>
                  {items.map((item, index) => {
                    const issue = issueFor(index)
                    const maxQty = maxQtyFor(item.product)
                    const itemKey = `${item.product.id}-${item.selectedColor}-${item.customText || ''}-${(item.customizations ?? []).map((c) => c.valueId ?? c.textValue).join(',')}`
                    const unitPrice = getItemUnitPrice(item)
                    return (
                      <motion.div
                        key={itemKey}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.25 }}
                        className="py-6 first:pt-6"
                      >
                        <div className="flex gap-3 min-[360px]:gap-4">
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="relative h-20 w-20 min-[360px]:h-24 min-[360px]:w-24 sm:h-32 sm:w-32 rounded-2xl overflow-hidden bg-sand flex-shrink-0"
                          >
                            <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/product/${item.product.slug}`}
                              className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                            >
                              {item.product.name}
                            </Link>

                            {item.customizations && item.customizations.length > 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {item.customizations.map((c) => `${c.label}: ${c.displayValue}`).join(' · ')}
                              </p>
                            ) : (
                              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                {item.selectedColor && (
                                  <div className="flex items-center gap-1.5">
                                    <span>Color:</span>
                                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: item.selectedColor }} />
                                  </div>
                                )}
                                {item.customText && <span>Text: &quot;{item.customText}&quot;</span>}
                              </div>
                            )}

                            {issue && (
                              <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-destructive/[0.06] px-3 py-2 text-[13px] font-medium text-destructive">
                                <span className="flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {issue.message}
                                </span>
                                {issue.kind === 'options' && (
                                  <Link href={`/product/${item.product.slug}`} className="font-semibold text-primary hover:underline">
                                    Choose options
                                  </Link>
                                )}
                                {issue.kind === 'quantity' && item.quantity > maxQty && (
                                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => updateQuantity(item.product.id, item.selectedColor, maxQty, item.customText, item.customizations)}>
                                    Set to {maxQty}
                                  </button>
                                )}
                              </div>
                            )}
                            {!issue && item.quantity >= maxQty && maxQty < 20 && (
                              <p className="mt-2 text-xs text-muted-foreground">Only {maxQty} available</p>
                            )}

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                              <div className="flex items-center border rounded-full bg-card">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 tap-bounce"
                                  aria-label={`Decrease quantity of ${item.product.name}`}
                                  onClick={() =>
                                    updateQuantity(item.product.id, item.selectedColor, item.quantity - 1, item.customText, item.customizations)
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium min-[360px]:w-10">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 tap-bounce"
                                  aria-label={`Increase quantity of ${item.product.name}`}
                                  disabled={item.quantity >= maxQty}
                                  onClick={() =>
                                    updateQuantity(item.product.id, item.selectedColor, Math.min(maxQty, item.quantity + 1), item.customText, item.customizations)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="flex items-center gap-2 min-[360px]:gap-4">
                                <span className="font-semibold">{formatPrice(unitPrice * item.quantity)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive tap-bounce"
                                  aria-label={`Remove ${item.product.name}`}
                                  onClick={() => {
                                    removeItem(item.product.id, item.selectedColor, item.customText, item.customizations)
                                    toast.info(`${item.product.name} removed from cart`)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                  </AnimatePresence>
                </CardContent>
                <CardFooter className="justify-between border-t py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearCart()
                      toast.info('Cart cleared')
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/shop">Continue Shopping</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-[124px]">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Code */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Have a coupon?</label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{appliedCoupon.code}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        />
                        <Button variant="outline" onClick={handleApplyCoupon} disabled={checkingCoupon}>
                          {checkingCoupon ? '...' : 'Apply'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-emerald-700">
                        <span>Discount</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{shippingCost === null ? <span className="text-muted-foreground">{checking ? '…' : 'At checkout'}</span> : shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <p className="-mt-1 text-xs text-muted-foreground">Shipping is confirmed for your address at checkout. Prices include GST.</p>
                  {issues.length > 0 ? (
                    <>
                      <Button size="lg" className="w-full" disabled>
                        Proceed to checkout
                      </Button>
                      <p role="alert" className="flex items-start gap-1.5 text-[13px] font-medium text-destructive">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {issues.length === 1 ? 'Fix the item flagged above to continue.' : `Fix the ${issues.length} items flagged above to continue.`}
                      </p>
                    </>
                  ) : (
                    <Button size="lg" className="w-full" asChild>
                      <Link href={appliedCoupon ? `/checkout?coupon=${appliedCoupon.code}` : '/checkout'}>
                        Proceed to checkout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}

                  {/* Trust Badges */}
                  <div className="flex items-center justify-center gap-4 pt-4 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Secure Checkout</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Truck className="h-4 w-4" />
                      <span>Fast Delivery</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
