import type { ReactNode } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import type { Category } from '@/lib/data'

interface StaticPageShellProps {
  categories: Category[]
  eyebrow?: string
  title: string
  description?: string
  /** Use the wide layout for pages with their own multi-column sections (e.g. About). */
  wide?: boolean
  children: ReactNode
}

export function StaticPageShell({ categories, eyebrow, title, description, wide, children }: StaticPageShellProps) {
  return (
    <>
      <Navbar categories={categories} />
      <main className="min-h-screen">
        <div className="bg-muted/50 py-12 lg:py-16">
          <div className="container mx-auto px-4 text-center">
            {eyebrow && (
              <span className="inline-block px-4 py-1.5 rounded-full bg-peach text-sm font-medium mb-4">
                {eyebrow}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3 text-balance">{title}</h1>
            {description && <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">{description}</p>}
          </div>
        </div>
        <div className={wide ? 'container mx-auto px-4 py-12 lg:py-16' : 'container mx-auto px-4 py-12 lg:py-16 max-w-3xl'}>
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
