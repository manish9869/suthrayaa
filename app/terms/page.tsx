import type { Metadata } from 'next'
import { StaticPageShell } from '@/components/static-page-shell'
import { LegalSection } from '@/components/legal-section'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Suthrayaa',
  description: 'The terms and conditions for shopping with Suthrayaa.',
}

export default async function TermsPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="Legal"
      title="Terms & Conditions"
      description="Last updated: January 2026. Please read these terms carefully before using our website or placing an order."
    >
      <LegalSection title="1. About These Terms">
        <p>
          These terms and conditions govern your use of the Suthrayaa website and any purchase you make with us. By
          browsing our site or placing an order, you agree to these terms. If you don&apos;t agree with any part of
          them, please don&apos;t use the site.
        </p>
      </LegalSection>

      <LegalSection title="2. Handmade, Made-to-Order Products">
        <p>
          Every piece on Suthrayaa is handcrafted, and many are made to order. Because of this:
        </p>
        <ul>
          <li>Slight variations in colour, size, and pattern between the photo and the finished piece are normal and part of the handmade charm.</li>
          <li>Processing times shown on each product page are estimates, not guarantees — handmade work occasionally takes a little longer, especially during festive seasons.</li>
          <li>Personalized or customized items are made specifically for you and can&apos;t be resold, so please double-check your customization details before ordering.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Orders & Pricing">
        <p>
          All prices are listed in Indian Rupees (INR) and include applicable taxes unless stated otherwise. We
          reserve the right to correct pricing errors and to cancel and refund an order placed at an incorrect price
          before it ships. Once an order is placed, you&apos;ll receive a confirmation email or SMS with your order
          number.
        </p>
      </LegalSection>

      <LegalSection title="4. Payments">
        <p>
          We accept Cash on Delivery and online payments (UPI, cards, netbanking, and wallets) via Razorpay. Online
          payments are processed securely by Razorpay — we never store your card details on our servers.
        </p>
      </LegalSection>

      <LegalSection title="5. Intellectual Property">
        <p>
          All designs, photographs, and content on this site are the property of Suthrayaa and may not be
          reproduced, copied, or used commercially without our written permission.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitation of Liability">
        <p>
          We work hard to make sure every order is accurate and arrives safely, but we aren&apos;t liable for delays
          or issues caused by circumstances outside our control, including courier delays, natural events, or
          incorrect shipping information provided at checkout.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes to These Terms">
        <p>
          We may update these terms from time to time as our shop grows. The &quot;last updated&quot; date at the
          top of this page will always reflect the most recent version.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact Us">
        <p>
          Questions about these terms? Reach us at <a href="mailto:hello@suthrayaa.com">hello@suthrayaa.com</a> or
          through our <a href="/contact">Contact page</a>.
        </p>
      </LegalSection>
    </StaticPageShell>
  )
}
