import { getPublicSiteSettings } from '@/lib/api/settings'

// Customer-facing contact details, driven by Admin → Settings (contact.* first, then the
// store.* equivalents). Only the email has a fallback — an unset phone/WhatsApp is hidden
// rather than replaced with a placeholder number customers might actually dial.
export const FALLBACK_STORE_EMAIL = 'suthrayaa@gmail.com'
export const FALLBACK_STORE_ADDRESS = 'Mumbai, Maharashtra, India'

export interface StoreContact {
  email: string
  phone: string | null
  whatsapp: string | null
  hours: string | null
  address: string
}

type PublicSettings = Record<string, Record<string, unknown>>

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function resolveStoreContact(settings: PublicSettings = {}): StoreContact {
  const contact = settings.contact ?? {}
  const general = settings.general ?? {}
  const business = settings.business ?? {}

  // business.* is private by default — only used when an admin has made it public.
  const address = [str(business['business.address_line1']), str(business['business.city']), str(business['business.state'])]
    .filter(Boolean)
    .join(', ')

  return {
    email: str(contact['contact.support_email']) ?? str(contact['contact.business_email']) ?? str(general['store.support_email']) ?? str(general['store.email']) ?? FALLBACK_STORE_EMAIL,
    phone: str(contact['contact.phone']) ?? str(general['store.support_phone']) ?? null,
    whatsapp: str(contact['contact.whatsapp']) ?? str(general['store.whatsapp_number']) ?? null,
    hours: str(contact['contact.support_hours']) ?? null,
    address: address || FALLBACK_STORE_ADDRESS,
  }
}

/** Server-side fetch of the store's contact details; never throws (falls back to defaults). */
export async function getStoreContact(): Promise<StoreContact> {
  try {
    return resolveStoreContact(await getPublicSiteSettings())
  } catch {
    return resolveStoreContact()
  }
}

/** `tel:` href for a human-formatted number ("+91 98765 43210" → "tel:+919876543210"). */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
