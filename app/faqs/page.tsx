import type { Metadata } from 'next'
import { StaticPageShell } from '@/components/static-page-shell'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Markdown } from '@/components/content-text'
import { getCategories } from '@/lib/data'
import { getContentBlock } from '@/lib/content'
import { getStoreContact } from '@/lib/store-contact'

export const metadata: Metadata = {
  title: 'FAQs | Suthrayaa',
  description: 'Answers to common questions about ordering, customizing, shipping, and returns at Suthrayaa.',
}

// Questions are managed in Admin → Storefront Content → FAQs page
export default async function FaqsPage() {
  const [categories, faqs, contact] = await Promise.all([getCategories(), getContentBlock('page.faqs'), getStoreContact()])
  const groups = faqs?.groups.filter((g) => g.items.length > 0) ?? []

  return (
    <StaticPageShell
      categories={categories}
      eyebrow={faqs?.eyebrow || 'Support'}
      title={faqs?.title || 'Frequently Asked Questions'}
      description={faqs?.description ?? "Can't find what you're looking for? Reach out on our Contact page and we'll help personally."}
    >
      <div className="space-y-10">
        {groups.map((group, g) => (
          <div key={`${group.title}-${g}`}>
            {group.title && <h2 className="text-lg font-serif font-medium tracking-tight text-foreground mb-3">{group.title}</h2>}
            <Accordion type="single" collapsible className="w-full">
              {group.items.map((item, i) => (
                <AccordionItem key={`${item.question}-${i}`} value={`${g}-${i}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent className="space-y-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-5">
                    <Markdown text={item.answer} vars={{ email: contact.email }} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
        {groups.length === 0 && <p className="text-muted-foreground">Our FAQs are being updated — please reach out on our Contact page with any question.</p>}
      </div>
    </StaticPageShell>
  )
}
