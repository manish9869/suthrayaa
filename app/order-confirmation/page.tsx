import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Package, Truck, Mail, ArrowRight } from 'lucide-react'
import { getCategories } from '@/lib/data'

interface OrderConfirmationPageProps {
  searchParams: Promise<{ order?: string; payment?: string }>
}

export default async function OrderConfirmationPage({ searchParams }: OrderConfirmationPageProps) {
  const [{ order, payment }, categories] = await Promise.all([searchParams, getCategories()])
  const orderNumber = order ?? 'Unknown'
  const isCod = payment === 'cod'

  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-mint mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-mint-foreground" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                Thank You for Your Order!
              </h1>
              <p className="text-muted-foreground">
                Your order has been placed successfully and is being prepared with love.
              </p>
            </div>

            {/* Order Details Card */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="text-lg font-semibold">{orderNumber}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Track Order
                  </Button>
                </div>

                {/* Order Timeline */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Order Confirmed</p>
                      <p className="text-sm text-muted-foreground">
                        We&apos;ve received your order and are preparing it
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Crafting Your Order</p>
                      <p className="text-sm text-muted-foreground">
                        Each piece is handmade especially for you
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Out for Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        Your package is on its way to you
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Notice */}
            <Card className="mb-8 bg-peach/20 border-peach">
              <CardContent className="p-6 flex items-start gap-4">
                <Mail className="h-6 w-6 text-secondary flex-shrink-0" />
                <div>
                  <p className="font-medium">{isCod ? 'Pay on Delivery' : 'Payment Received'}</p>
                  <p className="text-sm text-muted-foreground">
                    {isCod
                      ? 'Please keep the order total ready in cash when your package arrives.'
                      : 'Your payment was verified successfully and your order is confirmed.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* What&apos;s Next */}
            <div className="bg-lavender/20 rounded-xl p-6 mb-8">
              <h2 className="font-semibold mb-4">What Happens Next?</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  Our artisan will start crafting your personalized items within 24 hours
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  You&apos;ll receive an email with tracking details once shipped
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  Your handcrafted treasures will arrive within the estimated delivery window
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/shop">
                  Continue Shopping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
