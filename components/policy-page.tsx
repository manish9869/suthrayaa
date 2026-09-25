import Link from 'next/link'
import { StaticPageShell } from '@/components/static-page-shell'
import { LegalSection } from '@/components/legal-section'
import { ContentIcon, Markdown } from '@/components/content-text'
import { getCategories } from '@/lib/data'
import { getContentBlock, type IconItem, type PolicyContent } from '@/lib/content'
import { getStoreContact } from '@/lib/store-contact'

type PolicyKey = 'policy.shipping' | 'policy.returns' | 'policy.refund' | 'policy.privacy' | 'policy.terms'

/** A policy/support page (Shipping, Returns, Refunds, Privacy, Terms) rendered entirely from
 * Admin → Storefront Content. `{{email}}` in the text becomes the store's support email. */
export async function PolicyPage({ contentKey, fallbackTitle }: { contentKey: PolicyKey; fallbackTitle: string }) {
  const [categories, content, contact] = await Promise.all([getCategories(), getContentBlock(contentKey), getStoreContact()])
  const page = content as (PolicyContent & { highlights?: IconItem[] }) | null

  return (
    <StaticPageShell
      categories={categories}
      eyebrow={page?.eyebrow || 'Support'}
      title={page?.title || fallbackTitle}
      description={page?.description ?? ''}
    >
      {page?.highlights && page.highlights.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {page.highlights.map((h, i) => (
            <div key={`${h.title}-${i}`} className="text-center p-4 rounded-xl bg-card shadow-soft">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-2">
                <ContentIcon name={h.icon} className="h-5 w-5 text-secondary" />
              </div>
              <p className="text-sm font-medium text-foreground">{h.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{h.description}</p>
            </div>
          ))}
        </div>
      )}

      {page ? (
        page.sections.map((section, i) => (
          <LegalSection key={`${section.title}-${i}`} title={section.title}>
            <Markdown text={section.body} vars={{ email: contact.email }} />
          </LegalSection>
        ))
      ) : (
        <p className="text-muted-foreground">
          This page couldn&apos;t be loaded right now. Please try again shortly, or{' '}
          <Link href="/contact" className="text-primary underline underline-offset-2">
            contact us
          </Link>{' '}
          at <a href={`mailto:${contact.email}`}>{contact.email}</a>.
        </p>
      )}
    </StaticPageShell>
  )
}
