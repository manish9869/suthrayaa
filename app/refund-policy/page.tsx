import type { Metadata } from 'next'
import { StaticPageShell } from '@/components/static-page-shell'
import { LegalSection } from '@/components/legal-section'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Refund Policy | Suthrayaa',
  description: 'How and when refunds are issued for Suthrayaa orders.',
}

export default async function RefundPolicyPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="Support"
      title="Refund Policy"
      description="Once a return is approved, here's exactly how and when you'll get your money back."
    >
      <LegalSection title="Refund Timeline">
        <p>
          Once we receive and inspect your returned item, we&apos;ll notify you by email whether the refund is
          approved. Approved refunds are processed within <strong>5–7 business days</strong>.
        </p>
      </LegalSection>

      <LegalSection title="Refund Method">
        <ul>
          <li><strong>Online payments (Razorpay)</strong> — refunded to the original payment method. Banks typically take an additional 3–5 business days to reflect it.</li>
          <li><strong>Cash on Delivery orders</strong> — refunded via bank transfer or UPI; we&apos;ll ask for your preferred details when the return is approved.</li>
          <li><strong>Store credit</strong> — available on request, issued instantly and valid on any future order.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Cancellations Before Shipping">
        <p>
          Since most pieces are made to order, you can cancel for a full refund within{' '}
          <strong>24 hours</strong> of placing your order, before crafting begins. After that, your piece is
          already being handmade, so cancellation may not be possible — contact us as soon as possible and
          we&apos;ll always try to help.
        </p>
      </LegalSection>

      <LegalSection title="Damaged or Incorrect Items">
        <p>
          If your order arrives damaged, defective, or different from what you ordered, you&apos;re entitled to a
          full refund or free replacement — no questions asked. Just reach out within 7 days of delivery with
          photos of the item and packaging.
        </p>
      </LegalSection>

      <LegalSection title="Non-Refundable Items">
        <p>
          Personalized/customized pieces and items marked &quot;Clearance&quot; are final sale and not eligible for
          refund, unless they arrive damaged or defective. See our full{' '}
          <a href="/returns">Returns & Refunds</a> page for eligibility details.
        </p>
      </LegalSection>

      <LegalSection title="Questions About a Refund?">
        <p>
          Email us at <a href="mailto:hello@suthrayaa.com">hello@suthrayaa.com</a> with your order number and
          we&apos;ll help right away.
        </p>
      </LegalSection>
    </StaticPageShell>
  )
}
