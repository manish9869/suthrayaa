import type { Metadata } from 'next'
import { StaticPageShell } from '@/components/static-page-shell'
import { LegalSection } from '@/components/legal-section'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Privacy Policy | Suthrayaa',
  description: 'How Suthrayaa collects, uses, and protects your personal information.',
}

export default async function PrivacyPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="Legal"
      title="Privacy Policy"
      description="Last updated: January 2026. Your privacy matters to us — here's exactly what we collect and why."
    >
      <LegalSection title="1. Information We Collect">
        <p>When you browse or shop with us, we may collect:</p>
        <ul>
          <li><strong>Account & contact details</strong> — name, email, phone number, and shipping address.</li>
          <li><strong>Order information</strong> — items purchased, customization details, and payment status (not full card numbers — those are handled directly by Razorpay).</li>
          <li><strong>Usage data</strong> — pages visited and items browsed, used to improve the shopping experience.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>We use your information to:</p>
        <ul>
          <li>Process and deliver your orders, including any customizations you request.</li>
          <li>Send order updates, shipping notifications, and (only if you opt in) newsletter emails.</li>
          <li>Respond to support requests and improve our products and site.</li>
          <li>Prevent fraud and keep our store secure.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Sharing Your Information">
        <p>
          We don&apos;t sell your personal data. We only share what&apos;s necessary with trusted partners who help
          us run the business — our courier partners (to deliver your order) and Razorpay (to process online
          payments securely). Each of these partners is bound to use your data only for the service they provide us.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies & Local Storage">
        <p>
          Our site uses browser storage to remember your cart and wishlist between visits, and basic analytics
          cookies to understand how the site is used. You can clear these at any time through your browser
          settings.
        </p>
      </LegalSection>

      <LegalSection title="5. Your Rights">
        <p>
          You can ask us to access, correct, or delete the personal information we hold about you at any time by
          emailing <a href="mailto:hello@suthrayaa.com">hello@suthrayaa.com</a>. We&apos;ll respond within a
          reasonable timeframe.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Security">
        <p>
          We use industry-standard measures to protect your data, and all payments are processed over encrypted
          connections. No online system is 100% risk-free, but we take reasonable steps to keep your information
          safe.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes to This Policy">
        <p>
          We may update this policy as our practices evolve. Significant changes will be reflected by an updated
          &quot;last updated&quot; date above.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact Us">
        <p>
          For any privacy-related questions, reach us at{' '}
          <a href="mailto:hello@suthrayaa.com">hello@suthrayaa.com</a>.
        </p>
      </LegalSection>
    </StaticPageShell>
  )
}
