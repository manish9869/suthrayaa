import type { Product } from '@/lib/data'
import type { SectionHeadingContent } from '@/lib/content'
import { SectionHeading } from './section-heading'
import { ProductShelf } from './product-shelf'

/** A titled 4-up product grid — backs the "Trending now" and "On sale" homepage sections.
 * Heading/button copy comes from the section's row in Admin → Site Settings → Homepage. */
export function ProductGridSection({
  products,
  heading,
  eyebrow,
  title,
  accent,
  href,
  linkLabel,
  tinted = false,
}: {
  products: Product[]
  heading?: SectionHeadingContent | null
  eyebrow: string
  title: string
  accent?: string
  href?: string
  linkLabel?: string
  tinted?: boolean
}) {
  if (products.length === 0) return null
  return (
    <section className={tinted ? 'bg-sand/60 py-14 sm:py-20 lg:py-28' : 'py-14 sm:py-20 lg:py-28'}>
      <div className="container mx-auto px-4">
        <SectionHeading eyebrow={eyebrow} title={title} accent={accent} href={href} linkLabel={linkLabel} content={heading} />
        <ProductShelf products={products.slice(0, 8)} listName={title} />
      </div>
    </section>
  )
}
