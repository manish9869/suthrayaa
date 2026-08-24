import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans, Allura } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
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

export const metadata: Metadata = {
  title: 'Suthrayaa | Handcrafted Crochet with Love',
  description: 'Discover unique handmade crochet creations - personalized keychains, amigurumi toys, home decor, and custom gifts. Each piece tells a story through yarn.',
  keywords: ['crochet', 'handmade', 'amigurumi', 'keychains', 'personalized gifts', 'home decor', 'yarn crafts'],
  authors: [{ name: 'Suthrayaa' }],
  openGraph: {
    title: 'Suthrayaa | Telling Stories Through Yarn',
    description: 'Handcrafted crochet creations made with love',
    type: 'website',
    locale: 'en_IN',
    siteName: 'Suthrayaa',
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${jakarta.variable} ${allura.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen">
        {children}
        <Toaster position="bottom-right" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
