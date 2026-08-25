import type { Metadata } from 'next'
import { StaticPageShell } from '@/components/static-page-shell'
import { LegalSection } from '@/components/legal-section'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Returns & Refunds | Suthrayaa',
  description: 'Our return policy and how to start a return for eligible Suthrayaa orders.',
}

export default async function ReturnsPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="Support"
      title="Returns & Refunds"
      description="We want you to love your handmade piece. If something isn't right, here's how we make it right."
    >
      <LegalSection title="Our 7-Day Return Window">
        <p>
          You can request a return within <strong>7 days</strong> of delivery for eligible items. To start a
          return, email <a href="mailto:hello@suthrayaa.com">hello@suthrayaa.com</a> or use our{' '}
          <a href="/contact">Contact page</a> with your order number and a photo of the item — we&apos;ll take it
          from there.
        </p>
      </LegalSection>

      <LegalSection title="What's Eligible">
        <ul>
          <li>Ready-to-ship items in original, unused condition with tags/packaging intact.</li>
          <li>Items that arrived damaged, defective, or different from what you ordered.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What's Not Eligible">
        <p>
          Because each piece is handcrafted specifically for you, the following can&apos;t be returned unless
          they arrive damaged or defective:
        </p>
        <ul>
          <li>Personalized or customized items (name keychains, custom colors, custom text, etc.)</li>
          <li>Made-to-order and custom-order pieces</li>
          <li>Items marked &quot;Clearance&quot; or final sale</li>
        </ul>
      </LegalSection>

      <LegalSection title="How Returns Work">
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Contact us within 7 days of delivery with your order number and photos of the item.</li>
          <li>We&apos;ll confirm eligibility and share the return address.</li>
          <li>Pack the item securely in its original packaging and ship it back.</li>
          <li>Once we receive and inspect it, we&apos;ll process your refund or exchange — see our{' '}
            <a href="/refund-policy">Refund Policy</a> for timelines.</li>
        </ol>
      </LegalSection>

      <LegalSection title="Exchanges">
        <p>
          Prefer a different color or design instead of a refund? Let us know when you reach out — we&apos;re happy
          to arrange an exchange for eligible items, subject to stock availability.
        </p>
      </LegalSection>
    </StaticPageShell>
  )
}
