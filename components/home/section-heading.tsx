import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/reveal'
import { StitchUnderline } from '@/components/motion/yarn-thread'

/** Shared storefront section header: rose eyebrow, editorial serif title (with an optional
 * italic accent phrase), supporting copy and an optional "view all" link on the right. */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  href,
  linkLabel = 'View all',
  align = 'left',
  className,
}: {
  eyebrow?: string
  title: string
  accent?: string
  description?: string
  href?: string
  linkLabel?: string
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <Reveal
      className={cn(
        'mb-10 flex gap-4 lg:mb-12',
        align === 'center' ? 'flex-col items-center text-center' : 'flex-col md:flex-row md:items-end md:justify-between',
        className
      )}
    >
      <div className={cn(align === 'center' && 'flex flex-col items-center')}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="display text-[2.1rem] sm:text-5xl">
          {title}{' '}
          {accent && (
            <em className="relative inline-block font-normal italic text-primary">
              {accent}
              <StitchUnderline />
            </em>
          )}
        </h2>
        {description && <p className={cn('mt-3 max-w-xl text-[15px] text-muted-foreground', align === 'center' && 'mx-auto')}>{description}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
          <span className="link-underline">{linkLabel}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}
    </Reveal>
  )
}
