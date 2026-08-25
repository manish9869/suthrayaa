import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans, Allura } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { StoreSettingsGate } from '@/components/store-settings-gate'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
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
export async function generateMetadata(): Promise<Metadata> {
  let seo: Record<string, unknown> = {}
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'
    const res = await fetch(`${apiUrl}/site-settings/public`, { next: { revalidate: 300 } })
    if (res.ok) seo = ((await res.json()) as Record<string, Record<string, unknown>>).seo ?? {}
  } catch {
    // Falls through to the hardcoded defaults below — metadata must never fail the build.
  }

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
    icons: {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${jakarta.variable} ${allura.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen">
        <StoreSettingsGate>{children}</StoreSettingsGate>
        <Toaster position="bottom-right" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
