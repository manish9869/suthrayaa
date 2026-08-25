import type { Metadata } from 'next'
import { Truck, Clock, MapPin, PackageCheck } from 'lucide-react'
import { StaticPageShell } from '@/components/static-page-shell'
import { LegalSection } from '@/components/legal-section'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Shipping Info | Suthrayaa',
  description: 'Processing times, delivery estimates, and shipping costs for Suthrayaa orders.',
}

const highlights = [
  { icon: Clock, title: '3–5 Day Crafting', description: 'Most pieces are made to order, so we craft before we ship.' },
  { icon: Truck, title: 'Free Shipping', description: 'On all prepaid orders above Rs. 999, pan-India.' },
  { icon: MapPin, title: 'Pan-India Delivery', description: 'We ship to every serviceable pincode across India.' },
  { icon: PackageCheck, title: 'Tracked Shipments', description: 'A tracking link is emailed the moment your order ships.' },
]

export default async function ShippingPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="Support"
      title="Shipping Info"
      description="Every piece is handmade to order — here's what to expect from checkout to your doorstep."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {highlights.map((h) => (
          <div key={h.title} className="text-center p-4 rounded-xl bg-card shadow-soft">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-2">
              <h.icon className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-sm font-medium text-foreground">{h.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{h.description}</p>
          </div>
        ))}
      </div>

      <LegalSection title="Processing Time">
        <p>
          Since most of our pieces are handcrafted after you order, please allow <strong>3–5 business days</strong>{' '}
          for us to make your item before it ships. Personalized or customized pieces may take an additional{' '}
          <strong>1–2 days</strong>. Each product page shows an estimated delivery window — that already accounts
          for crafting time.
        </p>
      </LegalSection>

      <LegalSection title="Delivery Time">
        <ul>
          <li><strong>Standard Delivery</strong> — 5–7 business days after your order ships (Rs. 49, free above Rs. 999).</li>
          <li><strong>Express Delivery</strong> — 2–3 business days after your order ships (Rs. 99).</li>
        </ul>
        <p>Delivery estimates are for major cities — remote pincodes may take a couple of extra days.</p>
      </LegalSection>

      <LegalSection title="Order Tracking">
        <p>
          Once your order ships, we&apos;ll email and SMS you a tracking link. You can also check your order status
          any time from your account, or use our <a href="/track-order">order tracking page</a>.
        </p>
      </LegalSection>

      <LegalSection title="Shipping Charges">
        <p>
          Shipping is <strong>free on all prepaid orders above Rs. 999</strong>. Orders below that, and
          Cash-on-Delivery orders, carry a flat shipping fee shown at checkout before you pay.
        </p>
      </LegalSection>

      <LegalSection title="International Shipping">
        <p>
          We currently ship within India only. We&apos;re working on bringing Suthrayaa to more places soon — sign
          up for our newsletter to be the first to know.
        </p>
      </LegalSection>
    </StaticPageShell>
  )
}
