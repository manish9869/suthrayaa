import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { StoreSettingsGate } from '@/components/store-settings-gate'
import { AccountSync } from '@/components/account-sync'
import { SiteAnalytics } from '@/components/site-analytics'
import { Suspense } from 'react'
import './globals.css'

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

const FALLBACK_TITLE = 'Suthrayaa | Handmade Crochet Gifts, Décor & Personalised Keepsakes'
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
    // Soft coloured shadows (--shadow-tint): a deep blend of the theme's primary and ink
    const { primary, ink } = theme.colors ?? {}
    if (/^#[0-9a-f]{6}$/i.test(primary ?? '') && /^#[0-9a-f]{6}$/i.test(ink ?? '')) {
      const mix = (a: string, b: string, t: number) =>
        '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('')
      decls.push(`--shadow-tint:${mix(primary, ink, 0.55)}`)
    }
    // html:root out-specifies globals.css's :root regardless of stylesheet order
    return decls.length ? `html:root{${decls.join(';')}}` : ''
  } catch {
    return '' // API unreachable: fall back to the built-in theme
  }
}

// The browser chrome (mobile address bar, task switcher) takes the page's own canvas colour,
// so the storefront reads as one surface instead of sitting under a grey bar.
export const viewport: Viewport = {
  themeColor: '#fcfbff',
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
  const [themeCss, settings] = await Promise.all([getThemeCss(), getPublicSettings()])
  const analytics = settings.analytics ?? {}
  const legal = settings.legal ?? {}
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${fraunces.variable} ${jakarta.variable} bg-background`}>
      {themeCss && (
        <head>
          <style id="storefront-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        </head>
      )}
      <body className="font-sans antialiased min-h-svh">
        <StoreSettingsGate>{children}</StoreSettingsGate>
        <AccountSync />
        <Suspense fallback={null}>
          <SiteAnalytics
            gaId={str(analytics['analytics.ga_measurement_id'])}
            gtmId={str(analytics['analytics.gtm_id'])}
            pixelId={str(analytics['analytics.meta_pixel_id'])}
            consentRequired={legal['legal.cookie_consent_enabled'] === true}
            consentMessage={str(legal['legal.cookie_message'])}
          />
        </Suspense>
        <Toaster position="bottom-right" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
