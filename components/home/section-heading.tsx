import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/reveal'
import { StitchUnderline } from '@/components/motion/yarn-thread'
import { AccentText } from '@/components/content-text'
import type { SectionHeadingContent } from '@/lib/content'

const clean = (v?: string | null) => (v && v.trim() ? v.trim() : undefined)

/** Shared storefront section header: rose eyebrow, editorial serif title (with an optional
 * italic accent phrase), supporting copy and an optional "view all" link on the right.
 * `content` is the section's row from Admin → Site Settings → Homepage; any field set there
 * overrides the built-in copy passed as props (a title may mark its accent with *asterisks*). */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  href,
  linkLabel = 'View all',
  align = 'left',
  className,
  content,
}: {
  eyebrow?: string
  title: string
  accent?: string
  description?: string
  href?: string
  linkLabel?: string
  align?: 'left' | 'center'
  className?: string
  content?: SectionHeadingContent | null
}) {
  const cmsTitle = clean(content?.title)
  const heading = cmsTitle ?? (accent ? `${title} *${accent}*` : title)
  const eyebrowText = clean(content?.subtitle) ?? eyebrow
  const descriptionText = clean(content?.description) ?? description
  const linkHref = clean(content?.buttonUrl) ?? href
  const linkText = clean(content?.buttonText) ?? linkLabel

  return (
    <Reveal
      className={cn(
        'mb-10 flex gap-4 lg:mb-12',
        align === 'center' ? 'flex-col items-center text-center' : 'flex-col md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className={cn(align === 'center' && 'flex flex-col items-center')}>
        {eyebrowText && <p className="eyebrow mb-3">{eyebrowText}</p>}
        <h2 className="display text-[2.1rem] sm:text-5xl">
          <AccentText
            text={heading}
            renderAccent={(a, key) => (
              <em key={key} className="relative inline-block font-normal italic text-primary">
                {a}
                <StitchUnderline />
              </em>
            )}
          />
        </h2>
        {descriptionText && <p className={cn('mt-3 max-w-xl text-[15px] text-muted-foreground', align === 'center' && 'mx-auto')}>{descriptionText}</p>}
      </div>
      {linkHref && (
        <Link href={linkHref} className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
          <span className="link-underline">{linkText}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}
    </Reveal>
  )
}
