'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Instagram, Facebook, Mail, Phone, MapPin, Check, ArrowRight, ShieldCheck, Award, Headphones, Heart, Leaf } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Reveal } from '@/components/motion/reveal'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'
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

const FALLBACK_LOGO_URL: string = STOREFRONT_IMAGES.logo

const PROMISES = [
  { icon: Award, title: 'Quality you can trust', text: 'Premium cotton yarn, finished by hand.' },
  { icon: Headphones, title: 'Real human support', text: 'We reply within a day, every day.' },
  { icon: Heart, title: 'Loved by thousands', text: '500+ happy customers across India.' },
  { icon: Leaf, title: 'Slow & sustainable', text: 'Made to order — no waste, no mass stock.' },
]

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
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-blush px-6 py-10 sm:px-10 lg:px-14">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-rose/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sage/25 blur-2xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div className="flex items-start gap-5">
                <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:flex">
                  <Mail className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="display text-3xl sm:text-4xl">Join the Suthrayaa circle</h3>
                  <p className="mt-2 max-w-md text-[15px] text-foreground/70">
                    New drops, maker stories and member-only offers — straight from our studio to your inbox. Get 10% off your first order.
                  </p>
                </div>
              </div>
              <form onSubmit={handleSubscribe} className="flex w-full flex-col gap-2 rounded-full sm:flex-row sm:bg-card sm:p-1.5 sm:shadow-sm">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 flex-1 border-0 px-5 shadow-none focus-visible:ring-0 sm:bg-transparent"
                  aria-label="Email address"
                />
                <Button type="submit" size="lg" className="h-12 px-7">
                  <AnimatePresence mode="wait" initial={false}>
                    {subscribed ? (
                      <motion.span key="ok" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Subscribed
                      </motion.span>
                    ) : (
                      <motion.span key="go" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-1.5">
                        Subscribe <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      )}

      {/* Promise strip */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:divide-x lg:divide-border">
          {PROMISES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05} className="flex items-start gap-3.5 lg:px-6 lg:first:pl-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/20 text-primary">
                <p.icon className="h-5 w-5" />
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
          <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr_1.2fr]">
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
                  { href: `mailto:${contactEmail}`, icon: Mail, label: 'Email' },
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
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-70" /> {contactAddress}
                </li>
                <li>
                  <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 hover:text-primary-foreground">
                    <Phone className="h-4 w-4 shrink-0 opacity-70" /> {contactPhone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-2.5 hover:text-primary-foreground">
                    <Mail className="h-4 w-4 shrink-0 opacity-70" /> {contactEmail}
                  </a>
                </li>
              </ul>
              <h4 className="mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">We accept</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net Banking'].map((m) => (
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
