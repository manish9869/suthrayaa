'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Facebook, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'
import { getPublicFooterLinks, getPublicSiteSettings } from '@/lib/api/settings'
import { getContentBlock, type SiteContent } from '@/lib/content'
import { ContentIcon } from '@/components/content-text'
import { NewsletterSignup, NEWSLETTER_DEFAULTS } from '@/components/newsletter-signup'
import { resolveStoreContact, telHref, type StoreContact } from '@/lib/store-contact'

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
    { label: 'Track Order', href: '/account/orders' },
  ],
  about: [
    { label: 'Our Story', href: '/about' },
    { label: 'Behind the Yarn', href: '/about#process' },
    { label: 'Testimonials', href: '/#testimonials' },
  ],
  policies: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Refund Policy', href: '/refund-policy' },
  ],
}

const FALLBACK_LOGO_URL: string = STOREFRONT_IMAGES.logo

// Promise strip, newsletter copy and payment chips — edited in Admin → Storefront Content
const FALLBACK_EXTRAS: SiteContent['footer.content'] = {
  promises: [
    { icon: 'award', title: 'Quality you can trust', text: 'Premium cotton yarn, finished by hand.' },
    { icon: 'headphones', title: 'Real human support', text: 'We reply within a day, every day.' },
    { icon: 'heart', title: 'Loved by thousands', text: '500+ happy customers across India.' },
    { icon: 'leaf', title: 'Slow & sustainable', text: 'Made to order — no waste, no mass stock.' },
  ],
  newsletterTitle: NEWSLETTER_DEFAULTS.title,
  newsletterText: NEWSLETTER_DEFAULTS.text,
  newsletterSuccess: NEWSLETTER_DEFAULTS.success,
  paymentMethods: ['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net Banking'].map((label) => ({ label })),
}

const FALLBACK_DESCRIPTION =
  'Telling stories through yarn. Each piece is handcrafted with love, care, and attention to detail.'

interface SocialLinks {
  instagram?: string
  facebook?: string
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function Footer() {
  const [extras, setExtras] = useState<SiteContent['footer.content']>(FALLBACK_EXTRAS)
  const [footerColumns, setFooterColumns] = useState<Record<string, FooterLinkItem[]>>(FALLBACK_FOOTER_LINKS)
  const [logoUrl, setLogoUrl] = useState(FALLBACK_LOGO_URL)
  const [description, setDescription] = useState(FALLBACK_DESCRIPTION)
  const [copyrightText, setCopyrightText] = useState<string | null>(null)
  const [newsletterEnabled, setNewsletterEnabled] = useState(true)
  const [social, setSocial] = useState<SocialLinks>({})
  const [contact, setContact] = useState<StoreContact>(() => resolveStoreContact())

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
    getContentBlock('footer.content').then((c) => c && setExtras(c))
  }, [])

  useEffect(() => {
    getPublicSiteSettings()
      .then((settings) => {
        const branding = settings.branding ?? {}
        const footer = settings.footer ?? {}
        const logo = asString(footer['footer.logo_url']) ?? asString(branding['branding.logo_url'])
        if (logo) setLogoUrl(logo)

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

        setContact(resolveStoreContact(settings))
      })
      .catch(() => {
        // Keep all the hardcoded fallbacks above so the footer is never broken.
      })
  }, [])

  const shopLinks = footerColumns.shop ?? []
  const supportLinks = footerColumns.support ?? []
  const aboutLinks = footerColumns.about ?? []
  const policyLinks = footerColumns.policies ?? []

  const columns: { title: string; links: FooterLinkItem[] }[] = [
    { title: 'Shop', links: shopLinks },
    { title: 'Help', links: supportLinks },
    { title: 'About', links: aboutLinks },
  ].filter((c) => c.links.length > 0)

  return (
    <footer className="relative pt-12 lg:pt-16">
      {/* Newsletter */}
      {newsletterEnabled && (
        <div className="container mx-auto px-4">
          <NewsletterSignup title={extras.newsletterTitle || undefined} text={extras.newsletterText} successMessage={extras.newsletterSuccess || undefined} />
        </div>
      )}

      {/* Promise strip */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 min-[420px]:gap-6 lg:grid-cols-4 lg:divide-x lg:divide-border">
          {extras.promises.map((p, i) => (
            <Reveal key={`${p.title}-${i}`} delay={i * 0.05} className="flex items-start gap-3.5 lg:px-6 lg:first:pl-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 text-primary">
                <ContentIcon name={p.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div className="relative overflow-hidden bg-ink text-primary-foreground">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" />
        <div className="container relative mx-auto px-4 pt-16 pb-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.3fr_2fr_1.2fr]">
            <div>
              {/* Logo art is dark line-work on transparent — inverted to light so it reads on the ink footer */}
              <Link href="/" className="-ml-2 inline-flex items-center">
                <Image src={logoUrl} alt="Suthrayaa" width={200} height={106} className="h-24 w-auto brightness-0 invert" />
              </Link>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-primary-foreground/70">{description}</p>
              <div className="mt-6 flex items-center gap-2">
                {[
                  { href: social.instagram, icon: Instagram, label: 'Instagram' },
                  { href: social.facebook, icon: Facebook, label: 'Facebook' },
                  { href: `mailto:${contact.email}`, icon: Mail, label: 'Email' },
                ]
                  .filter((s) => s.href)
                  .map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target={s.href!.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="tap-bounce flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/20 transition-colors hover:border-primary-foreground hover:bg-primary-foreground hover:text-primary"
                    >
                      <s.icon className="h-4 w-4" />
                    </a>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              {columns.map((col) => (
                <div key={col.title}>
                  <h4 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">{col.title}</h4>
                  <ul className="mt-4 space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="link-underline text-sm text-primary-foreground/85 hover:text-primary-foreground">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">Get in touch</h4>
              <ul className="mt-4 space-y-3 text-sm text-primary-foreground/85">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-70" /> {contact.address}
                </li>
                {contact.phone && (
                  <li>
                    <a href={telHref(contact.phone)} className="flex items-center gap-2.5 hover:text-primary-foreground">
                      <Phone className="h-4 w-4 shrink-0 opacity-70" /> {contact.phone}
                    </a>
                  </li>
                )}
                <li>
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 hover:text-primary-foreground">
                    <Mail className="h-4 w-4 shrink-0 opacity-70" /> {contact.email}
                  </a>
                </li>
              </ul>
              <h4 className="mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">We accept</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {extras.paymentMethods.map(({ label: m }) => (
                  <span key={m} className="rounded-md bg-primary-foreground/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary-foreground/90">
                    {m}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-primary-foreground/60">
                <ShieldCheck className="h-3.5 w-3.5" /> 100% secure checkout via Razorpay
              </p>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/60 md:flex-row">
            <p>{copyrightText ?? `© ${new Date().getFullYear()} Suthrayaa. All rights reserved. Made with love in India.`}</p>
            <div className="flex flex-wrap items-center gap-5">
              {policyLinks.map((link) => (
                <Link key={link.label} href={link.href} className="link-underline hover:text-primary-foreground">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none select-none overflow-hidden">
          <p className="display translate-y-[18%] text-center text-[18vw] leading-none text-primary-foreground/[0.06]">Suthrayaa</p>
        </div>
      </div>
    </footer>
  )
}
