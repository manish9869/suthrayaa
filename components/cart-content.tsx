'use client'

import Image from 'next/image'
import Link from 'next/link'
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
} from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { formatPrice, type Category } from '@/lib/data'
import { validateCoupon } from '@/lib/api/checkout'
import { toast } from 'sonner'
import { useState } from 'react'

export function CartContent({ categories }: { categories: Category[] }) {
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore()
  const hydrated = useHydrated()
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)

  const subtotal = getTotalPrice()
  const shippingThreshold = 999
  const freeShipping = subtotal >= shippingThreshold
  const shippingCost = freeShipping ? 0 : 49
  const discount = appliedCoupon?.discount ?? 0
  const total = subtotal - discount + shippingCost

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
        <main className="min-h-screen bg-muted/30" />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar categories={categories} />
        <main className="min-h-screen bg-muted/30">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <div className="w-32 h-32 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-serif font-bold mb-3">Your Cart is Empty</h1>
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
      <main className="min-h-screen bg-muted/30">
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
          <h1 className="text-3xl font-serif font-bold mb-8">Shopping Cart ({items.length})</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Free Shipping Progress */}
              {!freeShipping && (
                <Card className="bg-peach/20 border-peach">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        Add {formatPrice(shippingThreshold - subtotal)} more for FREE shipping!
                      </span>
                      <Truck className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((subtotal / shippingThreshold) * 100, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {freeShipping && (
                <Card className="bg-mint/20 border-mint">
                  <CardContent className="py-4 flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      You&apos;ve unlocked FREE shipping!
                    </span>
                    <ShieldCheck className="h-5 w-5 text-mint" />
                  </CardContent>
                </Card>
              )}

              {/* Cart Items List */}
              <Card>
                <CardContent className="divide-y">
                  {items.map((item) => {
                    const itemKey = `${item.product.id}-${item.selectedColor}-${item.customText || ''}`
                    return (
                      <div key={itemKey} className="py-6 first:pt-6">
                        <div className="flex gap-4">
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0"
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

                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <span>Color:</span>
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: item.selectedColor }} />
                              </div>
                              {item.customText && <span>Text: &quot;{item.customText}&quot;</span>}
                            </div>

                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center border rounded-lg">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    updateQuantity(item.product.id, item.selectedColor, item.quantity - 1, item.customText)
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    updateQuantity(item.product.id, item.selectedColor, item.quantity + 1, item.customText)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    removeItem(item.product.id, item.selectedColor, item.customText)
                                    toast.info(`${item.product.name} removed from cart`)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
              <Card className="sticky top-28">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Code */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Have a coupon?</label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-mint/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-mint" />
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
                    <p className="text-xs text-muted-foreground mt-2">Try &quot;WELCOME10&quot; for 10% off</p>
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-mint">
                        <span>Discount</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{freeShipping ? 'FREE' : formatPrice(shippingCost)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button size="lg" className="w-full" asChild>
                    <Link href={appliedCoupon ? `/checkout?coupon=${appliedCoupon.code}` : '/checkout'}>
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

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
