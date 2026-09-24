import type { ReactNode } from 'react'
import Image from 'next/image'
import { YarnDivider } from '@/components/motion/yarn-thread'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Reveal } from '@/components/motion/reveal'
import type { Category } from '@/lib/data'

interface StaticPageShellProps {
  categories: Category[]
  eyebrow?: string
  title: string
  description?: string
  /** Optional wide editorial banner under the heading. */
  image?: string
  /** Use the wide layout for pages with their own multi-column sections (e.g. About). */
  wide?: boolean
  children: ReactNode
}

export function StaticPageShell({ categories, eyebrow, title, description, image, wide, children }: StaticPageShellProps) {
  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 -top-24 h-80 w-80 rounded-full bg-blush/60 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-sage/20 blur-3xl" />
          <div className="container relative mx-auto px-4 pb-10 pt-10 text-center lg:pb-14 lg:pt-16">
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">{eyebrow ?? title}</span>
            </nav>
            <Reveal>
              {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
              <h1 className="display mx-auto max-w-4xl text-balance text-[2.6rem] sm:text-6xl lg:text-7xl">{title}</h1>
              {description && <p className="mx-auto mt-5 max-w-2xl text-pretty text-[16px] leading-relaxed text-muted-foreground">{description}</p>}
            </Reveal>
            <YarnDivider tone="peach" className="mt-8 max-w-xl" />
          </div>
          {image && (
            <Reveal delay={0.1} className="container mx-auto px-4">
              <div className="relative aspect-[16/7] overflow-hidden rounded-[2rem] bg-sand">
                <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
              </div>
            </Reveal>
          )}
        </section>
        <div className={wide ? 'container mx-auto px-4 py-12 lg:py-16' : 'container mx-auto max-w-3xl px-4 py-12 lg:py-16'}>{children}</div>
      </main>
      <Footer />
    </>
  )
}
