import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans, Allura, Fraunces } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { StoreSettingsGate } from '@/components/store-settings-gate'
import { AccountSync } from '@/components/account-sync'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
  variable: '--font-fraunces',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

const allura = Allura({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-allura',
  display: 'swap',
})

const FALLBACK_TITLE = 'Suthrayaa | Crochet Yarn, Kits & Craft Supplies in India'
const FALLBACK_DESCRIPTION =
  'Discover unique handmade crochet creations - personalized keychains, amigurumi toys, home decor, and custom gifts. Each piece tells a story through yarn.'

// generateMetadata (not a static `metadata` export) so the title/description/OG image can
// come from the seo.* site settings — falls back to the original hardcoded copy if the
// backend is unreachable at build/request time, so this never breaks the build.
/** Public site settings (identical fetch in metadata + layout is deduped by Next). Never throws. */
async function getPublicSettings(): Promise<Record<string, Record<string, unknown>>> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'
    const res = await fetch(`${apiUrl}/site-settings/public`, { next: { revalidate: 300 } })
    if (res.ok) return (await res.json()) as Record<string, Record<string, unknown>>
  } catch {
    // Falls through to the built-in defaults — settings must never fail the build.
  }
  return {}
}

// Admin → Site Settings → Branding colours → storefront CSS variables. Only colours that differ
// from the built-in theme (app/globals.css :root) are emitted, so an untouched store renders
// exactly as designed. Admin pages keep their own palette (the .admin scope overrides :root).
const BRAND_COLOR_VARS: Record<string, { theme: string; vars: string[] }> = {
  'branding.color_primary': { theme: '#6d4aff', vars: ['--primary', '--ring', '--violet', '--chart-1', '--sidebar-primary', '--sidebar-ring'] },
  'branding.color_secondary': { theme: '#ff9e7a', vars: ['--secondary', '--chart-2'] },
  'branding.color_accent': { theme: '#f5b544', vars: ['--gold', '--chart-4'] },
  'branding.color_background': { theme: '#fcfbff', vars: ['--background', '--cream'] },
  'branding.color_text': { theme: '#1f1a33', vars: ['--foreground', '--card-foreground', '--popover-foreground'] },
  'branding.color_success': { theme: '#1e7a48', vars: ['--mint-foreground'] },
  'branding.color_error': { theme: '#e5484d', vars: ['--destructive'] },
}

function brandColorCss(branding: Record<string, unknown> = {}): string {
  const decls: string[] = []
  for (const [key, { theme, vars }] of Object.entries(BRAND_COLOR_VARS)) {
    const value = branding[key]
    if (typeof value !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(value) || value.toLowerCase() === theme) continue
    for (const v of vars) decls.push(`${v}:${value}`)
  }
  // html:root out-specifies globals.css's :root regardless of stylesheet order
  return decls.length ? `html:root{${decls.join(';')}}` : ''
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  const seo = settings.seo ?? {}
  const favicon = settings.branding?.['branding.favicon_url']

  const title = (seo['seo.site_title'] as string) || FALLBACK_TITLE
  const description = (seo['seo.meta_description'] as string) || FALLBACK_DESCRIPTION
  const ogImage = seo['seo.default_og_image'] as string | undefined

  return {
    title,
    description,
    keywords: ['crochet', 'handmade', 'amigurumi', 'keychains', 'personalized gifts', 'home decor', 'yarn crafts'],
    authors: [{ name: 'Suthrayaa' }],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_IN',
      siteName: 'Suthrayaa',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    robots: (seo['seo.robots'] as string) || undefined,
    icons: typeof favicon === 'string' && favicon.trim()
      ? { icon: favicon, apple: favicon }
      : {
      icon: [
        {
          url: '/icon-light-32x32.png',
          media: '(prefers-color-scheme: light)',
        },
        {
          url: '/icon-dark-32x32.png',
          media: '(prefers-color-scheme: dark)',
        },
        {
          url: '/icon.svg',
          type: 'image/svg+xml',
        },
      ],
      apple: '/apple-icon.png',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const brandCss = brandColorCss((await getPublicSettings()).branding)
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${fraunces.variable} ${jakarta.variable} ${allura.variable} bg-background`}>
      {brandCss && (
        <head>
          <style id="brand-colors" dangerouslySetInnerHTML={{ __html: brandCss }} />
        </head>
      )}
      <body className="font-sans antialiased min-h-screen">
        <StoreSettingsGate>{children}</StoreSettingsGate>
        <AccountSync />
        <Toaster position="bottom-right" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
