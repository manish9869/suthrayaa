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

// Admin → Theme → storefront CSS variables. With the default theme active nothing is emitted,
// so the storefront renders exactly from app/globals.css. Admin pages keep their own palette
// (the .admin scope redefines every token on its wrapper, overriding these inherited values).
const THEME_VARS: Record<string, string[]> = {
  primary: ['--primary', '--violet', '--ring', '--chart-1', '--sidebar-primary', '--sidebar-ring'],
  primaryForeground: ['--primary-foreground', '--violet-foreground', '--sidebar-primary-foreground'],
  secondary: ['--secondary', '--chart-2'],
  secondaryForeground: ['--secondary-foreground'],
  accent: ['--accent', '--lavender', '--sidebar-accent'],
  accentForeground: ['--accent-foreground', '--lavender-foreground', '--forest', '--sidebar-accent-foreground'],
  background: ['--background', '--cream'],
  card: ['--card', '--popover', '--sidebar'],
  muted: ['--muted'],
  sand: ['--sand'],
  blush: ['--blush', '--peach', '--chart-5'],
  border: ['--border', '--input', '--sidebar-border'],
  foreground: ['--foreground', '--card-foreground', '--popover-foreground', '--sidebar-foreground'],
  mutedForeground: ['--muted-foreground'],
  ink: ['--ink'],
  rose: ['--rose'],
  gold: ['--gold', '--chart-4'],
  sage: ['--sage', '--chart-3'],
}

async function getThemeCss(): Promise<string> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'
    const res = await fetch(`${apiUrl}/theme`, { next: { revalidate: 60 } })
    if (!res.ok) return ''
    const theme = (await res.json()) as { isDefault: boolean; colors: Record<string, string> }
    if (theme.isDefault) return ''
    const decls: string[] = []
    for (const [token, vars] of Object.entries(THEME_VARS)) {
      const value = theme.colors?.[token]
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) continue
      for (const v of vars) decls.push(`${v}:${value}`)
    }
    // html:root out-specifies globals.css's :root regardless of stylesheet order
    return decls.length ? `html:root{${decls.join(';')}}` : ''
  } catch {
    return '' // API unreachable: fall back to the built-in theme
  }
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
    // Brand yarn-ball icons (public/favicon*, generated from logo-mark.png). A favicon set in
    // Admin → Site Settings → Branding replaces them.
    icons:
      typeof favicon === 'string' && favicon.trim()
        ? { icon: favicon, apple: favicon }
        : {
            icon: [
              { url: '/favicon.ico', sizes: 'any' },
              { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
              { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
            ],
            apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
          },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const themeCss = await getThemeCss()
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${fraunces.variable} ${jakarta.variable} ${allura.variable} bg-background`}>
      {themeCss && (
        <head>
          <style id="storefront-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
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
