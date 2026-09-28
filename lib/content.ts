import { apiFetch } from '@/lib/api/http'

// Admin-editable storefront content (Admin → Storefront Content). The backend returns every
// block's effective value — the admin's saved edit, or the built-in default — so the storefront
// never has to know which. The shapes below mirror the backend catalog
// (suthrayaa-backend/src/modules/content/content.catalog.ts).

export interface IconItem {
  icon: string
  title: string
  description: string
}

export interface SiteContent {
  'home.trust_badges': { items: IconItem[] }
  'home.promo': {
    saleEyebrow: string
    saleTitle: string
    saleText: string
    saleBadge: string
    saleButtonLabel: string
    saleHref: string
    saleImage: string
    couponEyebrow: string
    couponCode: string
    couponTitle: string
    couponText: string
    dealEyebrow: string
    dealNote: string
    dealButtonLabel: string
    dealFallbackImage: string
  }
  'home.story': {
    eyebrow: string
    title: string
    paragraphs: { text: string }[]
    image: string
    imageAlt: string
    secondaryImage: string
    badgeValue: string
    badgeLabel: string
    stats: { value: string; label: string }[]
    ctaLabel: string
    ctaHref: string
  }
  'home.reels': { items: { title: string; tag: string; href: string; videoUrl: string; videoWebmUrl: string; poster: string }[] }
  'home.convertible': {
    eyebrow: string
    title: string
    text: string
    stages: { image: string; label: string; note: string }[]
    ctaLabel: string
    ctaHref: string
  }
  'home.instagram': { profileUrl: string; buttonLabel: string; images: { image: string; alt: string }[] }
  'home.testimonials': { ratingCaption: string }
  'page.about': {
    eyebrow: string
    title: string
    description: string
    heroImage: string
    processEyebrow: string
    processTitle: string
    processDescription: string
    steps: IconItem[]
    ctaTitle: string
    ctaLabel: string
    ctaHref: string
  }
  'page.faqs': {
    eyebrow: string
    title: string
    description: string
    groups: { title: string; items: { question: string; answer: string }[] }[]
  }
  'page.contact': { eyebrow: string; title: string; description: string; studioLabel: string }
  'policy.shipping': PolicyContent & { highlights: IconItem[] }
  'policy.returns': PolicyContent
  'policy.refund': PolicyContent
  'policy.privacy': PolicyContent
  'policy.terms': PolicyContent
  'site.chrome': { perks: { icon: string; text: string }[]; megaMenuImage: string; shopBannerImage: string; authImage: string }
  'footer.content': {
    promises: { icon: string; title: string; text: string }[]
    newsletterTitle: string
    newsletterText: string
    newsletterSuccess: string
    paymentMethods: { label: string }[]
  }
}

export interface PolicyContent {
  eyebrow: string
  title: string
  description: string
  sections: { title: string; body: string }[]
}

export type ContentKey = keyof SiteContent

/** All content blocks (one request, cached for 60s like the rest of the catalogue). */
export async function getSiteContent(): Promise<Partial<SiteContent>> {
  try {
    return await apiFetch<Partial<SiteContent>>('/content', { revalidate: 60 })
  } catch {
    // API hiccup: components fall back to their built-in copy
    return {}
  }
}

export async function getContentBlock<K extends ContentKey>(key: K): Promise<SiteContent[K] | null> {
  try {
    return await apiFetch<SiteContent[K]>(`/content/${key}`, { revalidate: 60 })
  } catch {
    return null
  }
}

/** Homepage section row (Admin → Site Settings → Homepage): heading copy + button. */
export interface SectionHeadingContent {
  title?: string | null
  subtitle?: string | null
  description?: string | null
  buttonText?: string | null
  buttonUrl?: string | null
}
