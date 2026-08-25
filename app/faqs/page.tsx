import type { Metadata } from 'next'
import { StaticPageShell } from '@/components/static-page-shell'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { getCategories } from '@/lib/data'

export const metadata: Metadata = {
  title: 'FAQs | Suthrayaa',
  description: 'Answers to common questions about ordering, customizing, shipping, and returns at Suthrayaa.',
}

const faqGroups: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: 'Ordering & Customization',
    items: [
      {
        q: 'How long does it take to make my order?',
        a: 'Since each piece is handmade to order, it typically takes 3–5 business days to craft your item. Customized items may take an additional 1–2 days.',
      },
      {
        q: 'Can I customize color and size together?',
        a: 'Yes — many products let you choose both a color and a size (or other options) independently. Available choices are shown right on the product page; if a product only offers certain combinations, that’ll be clear before you add it to your cart.',
      },
      {
        q: 'What if I want to change my customization after ordering?',
        a: 'Contact us within 24 hours of placing your order to make changes. After that, we may have already started crafting your piece.',
      },
      {
        q: 'Is gift wrapping available?',
        a: 'Yes! We offer beautiful handmade gift wrapping at checkout, along with the option to add a personalized note.',
      },
    ],
  },
  {
    group: 'Shipping & Delivery',
    items: [
      {
        q: 'How much does shipping cost?',
        a: 'Shipping is free on all prepaid orders above Rs. 999. Below that, a flat shipping fee (Rs. 49 standard, Rs. 99 express) applies and is shown at checkout.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Not yet — we currently ship within India only. Sign up for our newsletter to hear when that changes.',
      },
      {
        q: 'How can I track my order?',
        a: 'You’ll get a tracking link by email and SMS as soon as your order ships. You can also check status any time from your account or our order tracking page.',
      },
    ],
  },
  {
    group: 'Returns & Payments',
    items: [
      {
        q: 'What is your return policy?',
        a: 'Ready-to-ship items can be returned within 7 days of delivery if unused and in original packaging. Personalized and made-to-order pieces are final sale unless damaged or defective. See our Returns & Refunds page for full details.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept Cash on Delivery, and online payments via UPI, cards, netbanking, and wallets through Razorpay.',
      },
      {
        q: 'Is it safe to pay online?',
        a: 'Yes — all online payments are processed securely by Razorpay over an encrypted connection. We never store your card details.',
      },
    ],
  },
]

export default async function FaqsPage() {
  const categories = await getCategories()

  return (
    <StaticPageShell
      categories={categories}
      eyebrow="Support"
      title="Frequently Asked Questions"
      description="Can't find what you're looking for? Reach out on our Contact page and we'll help personally."
    >
      <div className="space-y-10">
        {faqGroups.map((group) => (
          <div key={group.group}>
            <h2 className="text-lg font-serif font-bold text-foreground mb-3">{group.group}</h2>
            <Accordion type="single" collapsible className="w-full">
              {group.items.map((item, i) => (
                <AccordionItem key={item.q} value={`${group.group}-${i}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </StaticPageShell>
  )
}
