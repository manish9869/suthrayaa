import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { OrderSuccess } from '@/components/order-success'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = { title: 'Thank you for your order', robots: { index: false } }

interface OrderConfirmationPageProps {
  searchParams: Promise<{ order?: string; payment?: string; id?: string }>
}

export default async function OrderConfirmationPage({ searchParams }: OrderConfirmationPageProps) {
  const [{ order, payment, id }, categories] = await Promise.all([searchParams, getCategories()])
  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent">
        <OrderSuccess orderNumber={order ?? '—'} payment={payment} orderId={id} />
      </main>
      <Footer />
    </>
  )
}
