'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  ChevronRight,
  ShoppingBag,
  Truck,
  Banknote,
  Gift,
  ShieldCheck,
  Lock,
  Check,
  Wallet,
} from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { useHydrated } from '@/lib/hooks/use-hydrated'
import { formatPrice, type Category } from '@/lib/data'
import { placeOrder, verifyPayment } from '@/lib/api/checkout'
import { loadRazorpayScript } from '@/lib/razorpay'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type CheckoutStep = 'information' | 'shipping' | 'payment'

const shippingMethods = [
  { id: 'standard', name: 'Standard Delivery', description: '5-7 business days', price: 49 },
  { id: 'express', name: 'Express Delivery', description: '2-3 business days', price: 99 },
]

const paymentMethods = [
  { id: 'cod', name: 'Cash on Delivery', description: 'Pay when you receive', icon: Banknote },
  { id: 'razorpay', name: 'Pay Online', description: 'UPI, Cards, Netbanking & Wallets via Razorpay', icon: Wallet },
] as const

export function CheckoutContent({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const couponFromCart = searchParams.get('coupon') ?? undefined

  const { items, getTotalPrice, clearCart } = useCartStore()
  const hydrated = useHydrated()
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('information')
  const [isProcessing, setIsProcessing] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    pincode: '',
    giftWrap: false,
    giftMessage: '',
  })
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod')

  const subtotal = getTotalPrice()
  const shippingThreshold = 999
  const selectedShipping = shippingMethods.find((m) => m.id === shippingMethod)
  const shippingCost = subtotal >= shippingThreshold ? 0 : selectedShipping?.price || 49
  const giftWrapCost = formData.giftWrap ? 49 : 0
  const total = subtotal + shippingCost + giftWrapCost

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string) => (checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const validateStep = (step: CheckoutStep): boolean => {
    switch (step) {
      case 'information':
        if (!formData.email || !formData.phone || !formData.firstName || !formData.lastName) {
          toast.error('Please fill in all contact information')
          return false
        }
        if (!formData.address || !formData.city || !formData.state || !formData.pincode) {
          toast.error('Please fill in your complete address')
          return false
        }
        if (!/^\d{6}$/.test(formData.pincode)) {
          toast.error('Please enter a valid 6-digit pincode')
          return false
        }
        return true
      case 'shipping':
        return !!shippingMethod
      case 'payment':
        return !!paymentMethod
      default:
        return true
    }
  }

  const handleContinue = () => {
    if (!validateStep(currentStep)) return
    if (currentStep === 'information') setCurrentStep('shipping')
    else if (currentStep === 'shipping') setCurrentStep('payment')
  }

  const handlePlaceOrder = async () => {
    if (!validateStep('payment')) return

    setIsProcessing(true)
    try {
      const orderItems = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
        customText: item.customText,
      }))

      const shippingAddress = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        addressLine1: formData.address,
        addressLine2: formData.apartment || undefined,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      }

      const result = await placeOrder({
        items: orderItems,
        shippingAddress,
        shippingMethod,
        paymentMethod,
        couponCode: couponFromCart,
        giftWrap: formData.giftWrap,
        giftMessage: formData.giftMessage || undefined,
      })

      if (paymentMethod === 'cod') {
        clearCart()
        toast.success('Order placed successfully!')
        router.push(`/order-confirmation?order=${result.order.orderNumber}&payment=cod`)
        return
      }

      // Online payment — open the Razorpay checkout widget.
      if (!result.razorpay) {
        throw new Error('Payment could not be started. Please try again.')
      }

      await loadRazorpayScript()

      const razorpayCheckout = new window.Razorpay({
        key: result.razorpay.keyId,
        amount: result.razorpay.amount,
        currency: result.razorpay.currency,
        name: 'Suthrayaa',
        description: `Order ${result.order.orderNumber}`,
        order_id: result.razorpay.orderId,
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: '#c9a15a' },
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            clearCart()
            toast.success('Payment successful!')
            router.push(`/order-confirmation?order=${result.order.orderNumber}&payment=online`)
          } catch {
            toast.error('Payment verification failed. If money was deducted, contact support with your order number.')
          } finally {
            setIsProcessing(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            toast.info('Payment cancelled — your order is saved, you can retry from your orders.')
          },
        },
      })
      razorpayCheckout.open()
      return
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong placing your order')
      setIsProcessing(false)
    }
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
              <p className="text-muted-foreground mb-8">Add some handcrafted goodies before checking out.</p>
              <Button size="lg" asChild>
                <Link href="/shop">Browse Products</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const steps = [
    { id: 'information', label: 'Information' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'payment', label: 'Payment' },
  ]
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen bg-muted/30">
        <div className="bg-background py-4 border-b">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/cart" className="hover:text-foreground transition-colors">Cart</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">Checkout</span>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Progress Steps */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        index < currentStepIndex
                          ? 'bg-secondary text-secondary-foreground'
                          : index === currentStepIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {index < currentStepIndex ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        'ml-2 text-sm font-medium hidden sm:block',
                        index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-12 sm:w-24 h-0.5 mx-2 sm:mx-4',
                        index < currentStepIndex ? 'bg-secondary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Accordion
                type="single"
                value={currentStep}
                onValueChange={(value) => setCurrentStep(value as CheckoutStep)}
                className="space-y-4"
              >
                {/* Information */}
                <AccordionItem value="information" className="border rounded-xl overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                          currentStepIndex >= 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}
                      >
                        {currentStepIndex > 0 ? <Check className="h-3 w-3" /> : '1'}
                      </div>
                      <span className="font-semibold">Contact & Shipping Information</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium mb-4">Contact Information</h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="your@email.com" value={formData.email} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={handleInputChange} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-4">Shipping Address</h3>
                        <div className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="firstName">First Name</Label>
                              <Input id="firstName" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName">Last Name</Label>
                              <Input id="lastName" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleInputChange} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" name="address" placeholder="House/Flat No., Street, Area" value={formData.address} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apartment">Apartment, Suite, etc. (optional)</Label>
                            <Input id="apartment" name="apartment" placeholder="Apartment, suite, etc." value={formData.apartment} onChange={handleInputChange} />
                          </div>
                          <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="city">City</Label>
                              <Input id="city" name="city" placeholder="City" value={formData.city} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="state">State</Label>
                              <Input id="state" name="state" placeholder="State" value={formData.state} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="pincode">Pincode</Label>
                              <Input id="pincode" name="pincode" placeholder="6-digit pincode" maxLength={6} value={formData.pincode} onChange={handleInputChange} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-peach/20 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Checkbox id="giftWrap" checked={formData.giftWrap} onCheckedChange={handleCheckboxChange('giftWrap')} />
                          <div className="flex-1">
                            <label htmlFor="giftWrap" className="font-medium cursor-pointer flex items-center gap-2">
                              <Gift className="h-4 w-4 text-secondary" />
                              Add Gift Wrapping (+{formatPrice(49)})
                            </label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Beautiful handmade gift wrapping for that extra special touch
                            </p>
                            {formData.giftWrap && (
                              <div className="mt-3">
                                <Label htmlFor="giftMessage">Gift Message (optional)</Label>
                                <Textarea id="giftMessage" name="giftMessage" placeholder="Write a personal message..." value={formData.giftMessage} onChange={handleInputChange} className="mt-2 bg-background" rows={3} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button onClick={handleContinue} className="w-full">
                        Continue to Shipping
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Shipping */}
                <AccordionItem value="shipping" className="border rounded-xl overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline" disabled={currentStepIndex < 1}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs', currentStepIndex >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {currentStepIndex > 1 ? <Check className="h-3 w-3" /> : '2'}
                      </div>
                      <span className="font-semibold">Shipping Method</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <RadioGroup value={shippingMethod} onValueChange={(v) => setShippingMethod(v as 'standard' | 'express')}>
                      <div className="space-y-3">
                        {shippingMethods.map((method) => {
                          const isFree = subtotal >= shippingThreshold && method.id === 'standard'
                          return (
                            <label
                              key={method.id}
                              className={cn(
                                'flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors',
                                shippingMethod === method.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={method.id} id={method.id} />
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {method.name}
                                    {isFree && <span className="text-xs bg-mint px-2 py-0.5 rounded-full">FREE</span>}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{method.description}</p>
                                </div>
                              </div>
                              <span className="font-medium">
                                {isFree ? <s className="text-muted-foreground">{formatPrice(method.price)}</s> : formatPrice(method.price)}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </RadioGroup>

                    <div className="flex gap-3 mt-6">
                      <Button variant="outline" onClick={() => setCurrentStep('information')}>Back</Button>
                      <Button onClick={handleContinue} className="flex-1">Continue to Payment</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Payment */}
                <AccordionItem value="payment" className="border rounded-xl overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline" disabled={currentStepIndex < 2}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs', currentStepIndex >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>3</div>
                      <span className="font-semibold">Payment</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cod' | 'razorpay')}>
                      <div className="space-y-3">
                        {paymentMethods.map((method) => (
                          <label
                            key={method.id}
                            className={cn(
                              'flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors',
                              paymentMethod === method.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                            )}
                          >
                            <RadioGroupItem value={method.id} id={method.id} />
                            <div className="flex-1">
                              <div className="font-medium">{method.name}</div>
                              <p className="text-sm text-muted-foreground">{method.description}</p>
                            </div>
                            <method.icon className="h-5 w-5 text-muted-foreground" />
                          </label>
                        ))}
                      </div>
                    </RadioGroup>

                    <div className="mt-6 p-4 bg-mint/20 rounded-xl flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-mint flex-shrink-0" />
                      <p className="text-sm">Your payment information is secured with industry-standard encryption.</p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button variant="outline" onClick={() => setCurrentStep('shipping')}>Back</Button>
                      <Button onClick={handlePlaceOrder} className="flex-1" disabled={isProcessing}>
                        {isProcessing ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            {paymentMethod === 'cod' ? `Place Order - ${formatPrice(total)}` : `Pay ${formatPrice(total)}`}
                          </>
                        )}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="sticky top-28">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Order Summary ({items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4 max-h-64 overflow-auto">
                    {items.map((item) => {
                      const itemKey = `${item.product.id}-${item.selectedColor}-${item.customText || ''}`
                      return (
                        <div key={itemKey} className="flex gap-3">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.selectedColor }} />
                              {item.customText && <span className="text-xs text-muted-foreground truncate">&quot;{item.customText}&quot;</span>}
                            </div>
                          </div>
                          <span className="font-medium text-sm">{formatPrice(item.product.price * item.quantity)}</span>
                        </div>
                      )
                    })}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Shipping
                      </span>
                      <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
                    </div>
                    {formData.giftWrap && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Gift className="h-3 w-3" /> Gift Wrapping
                        </span>
                        <span>{formatPrice(giftWrapCost)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
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
