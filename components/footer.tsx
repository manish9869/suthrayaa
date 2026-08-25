'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Instagram, Facebook, Mail, Phone, MapPin, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getPublicFooterLinks, getPublicSiteSettings } from '@/lib/api/settings'

interface FooterLinkItem {
  label: string
  href: string
}

// Fallback content mirrors the pre-settings hardcoded footer exactly, so a settings-API hiccup
// (or a fresh install before an admin has configured anything) never leaves the footer blank.
// The 'legal' column from before is keyed as 'policies' here to match the seeded columnKey.
const FALLBACK_FOOTER_LINKS: Record<string, FooterLinkItem[]> = {
  shop: [
    { label: 'All Products', href: '/shop' },
    { label: 'Flowers & Floral', href: '/shop?category=flowers-floral' },
    { label: 'Home & Décor', href: '/shop?category=home-and-decor' },
    { label: 'Accessories', href: '/shop?category=accessories-v2' },
    { label: 'Devghar Collection', href: '/shop?category=devghar-collection-v2' },
    { label: 'Kids & Gifts', href: '/shop?category=kids-gifts' },
  ],
  support: [
    { label: 'Contact Us', href: '/contact' },
    { label: 'FAQs', href: '/faqs' },
    { label: 'Shipping Info', href: '/shipping' },
    { label: 'Returns & Refunds', href: '/returns' },
    { label: 'Track Order', href: '/track-order' },
  ],
  about: [
    { label: 'Our Story', href: '/about' },
    { label: 'Behind the Yarn', href: '/about#process' },
    { label: 'Testimonials', href: '/testimonials' },
    { label: 'Blog', href: '/blog' },
  ],
  policies: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refund-policy' },
  ],
}

const FALLBACK_LOGO_URL =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Suthraya%20Logo%20-%20Trans-HgT4V8esTeOZ2PwWy5B7QcPjLLrahf.png'

const FALLBACK_DESCRIPTION =
  'Telling stories through yarn. Each piece is handcrafted with love, care, and attention to detail.'
const FALLBACK_EMAIL = 'hello@suthrayaa.com'
const FALLBACK_PHONE = '+91 98765 43210'
const FALLBACK_ADDRESS = 'Mumbai, Maharashtra, India'

interface SocialLinks {
  instagram?: string
  facebook?: string
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const [footerColumns, setFooterColumns] = useState<Record<string, FooterLinkItem[]>>(FALLBACK_FOOTER_LINKS)
  const [logoUrl, setLogoUrl] = useState(FALLBACK_LOGO_URL)
  const [description, setDescription] = useState(FALLBACK_DESCRIPTION)
  const [copyrightText, setCopyrightText] = useState<string | null>(null)
  const [newsletterEnabled, setNewsletterEnabled] = useState(true)
  const [social, setSocial] = useState<SocialLinks>({})
  const [contactEmail, setContactEmail] = useState(FALLBACK_EMAIL)
  const [contactPhone, setContactPhone] = useState(FALLBACK_PHONE)
  const [contactAddress, setContactAddress] = useState(FALLBACK_ADDRESS)

  useEffect(() => {
    getPublicFooterLinks()
      .then((links) => {
        if (links.length === 0) return
        const grouped: Record<string, (FooterLinkItem & { sortOrder: number })[]> = {}
        for (const link of links) {
          const column = grouped[link.columnKey] ?? (grouped[link.columnKey] = [])
          column.push({ label: link.label, href: link.url, sortOrder: link.sortOrder })
        }
        const sorted: Record<string, FooterLinkItem[]> = {}
        for (const [key, items] of Object.entries(grouped)) {
          sorted[key] = [...items]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(({ label, href }) => ({ label, href }))
        }
        setFooterColumns(sorted)
      })
      .catch(() => {
        // Keep the hardcoded fallback columns so the footer is never empty.
      })
  }, [])

  useEffect(() => {
    getPublicSiteSettings()
      .then((settings) => {
        const branding = settings.branding ?? {}
        const logo = asString(branding['branding.logo_url'])
        if (logo) setLogoUrl(logo)

        const footer = settings.footer ?? {}
        const desc = asString(footer['footer.description'])
        if (desc) setDescription(desc)
        const copyright = asString(footer['footer.copyright_text'])
        if (copyright) setCopyrightText(copyright)
        if (typeof footer['footer.newsletter_enabled'] === 'boolean') {
          setNewsletterEnabled(footer['footer.newsletter_enabled'] as boolean)
        }

        const socialGroup = settings.social ?? {}
        setSocial({
          instagram: socialGroup['social.instagram_enabled'] ? asString(socialGroup['social.instagram_url']) : undefined,
          facebook: socialGroup['social.facebook_enabled'] ? asString(socialGroup['social.facebook_url']) : undefined,
        })

        const contact = settings.contact ?? {}
        const general = settings.general ?? {}
        const business = settings.business ?? {}

        const resolvedEmail = asString(contact['contact.business_email']) ?? asString(general['store.email'])
        if (resolvedEmail) setContactEmail(resolvedEmail)

        const resolvedPhone = asString(contact['contact.phone']) ?? asString(general['store.support_phone'])
        if (resolvedPhone) setContactPhone(resolvedPhone)

        // `business.*` (GST-adjacent) is intentionally private in most configurations — only
        // switch away from the hardcoded address if it's actually present in the public payload.
        const addressLine1 = asString(business['business.address_line1'])
        const city = asString(business['business.city'])
        const state = asString(business['business.state'])
        const resolvedAddress = [addressLine1, city, state].filter(Boolean).join(', ')
        if (resolvedAddress) setContactAddress(resolvedAddress)
      })
      .catch(() => {
        // Keep all the hardcoded fallbacks above so the footer is never broken.
      })
  }, [])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    setSubscribed(true)
    toast.success("You're on the list! Welcome to the yarn family.")
    setEmail('')
  }

  const shopLinks = footerColumns.shop ?? []
  const supportLinks = footerColumns.support ?? []
  const aboutLinks = footerColumns.about ?? []
  const policyLinks = footerColumns.policies ?? []

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Newsletter Section */}
      {newsletterEnabled && (
        <div className="bg-muted py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-2xl font-serif font-semibold text-foreground mb-2">
                Join Our Yarn Family
              </h3>
              <p className="text-muted-foreground mb-6">
                Subscribe for exclusive offers, new arrivals, and behind-the-scenes peeks at our creative process.
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-background"
                />
                <Button type="submit" className="bg-primary hover:bg-primary/90 tap-bounce">
                  {subscribed ? (
                    <span className="flex items-center gap-1.5 animate-pop-in">
                      <Check className="h-4 w-4" /> Subscribed
                    </span>
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <Image
                src={logoUrl}
                alt="Suthrayaa"
                width={140}
                height={70}
                className="h-16 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-primary-foreground/80 text-sm mb-4 max-w-xs">
              {description}
            </p>
            <div className="flex items-center gap-4">
              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-foreground/80 hover:text-secondary transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {social.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-foreground/80 hover:text-secondary transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              <a
                href={`mailto:${contactEmail}`}
                className="text-primary-foreground/80 hover:text-secondary transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop Links */}
          {shopLinks.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4 text-secondary">Shop</h4>
              <ul className="space-y-2">
                {shopLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/80 hover:text-secondary hover:translate-x-0.5 inline-block transition-all"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Support Links */}
          {supportLinks.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4 text-secondary">Support</h4>
              <ul className="space-y-2">
                {supportLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/80 hover:text-secondary hover:translate-x-0.5 inline-block transition-all"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About Links */}
          {aboutLinks.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4 text-secondary">About</h4>
              <ul className="space-y-2">
                {aboutLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/80 hover:text-secondary hover:translate-x-0.5 inline-block transition-all"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-secondary">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-primary-foreground/80">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{contactAddress}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{contactPhone}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>{contactEmail}</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-primary-foreground/20" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/60">
            {copyrightText ?? `© ${new Date().getFullYear()} Suthrayaa. All rights reserved. Made with love in India.`}
          </p>
          <div className="flex items-center gap-4">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-primary-foreground/60 hover:text-secondary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
