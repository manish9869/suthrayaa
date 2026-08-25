import { apiFetch } from './http'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

async function token(): Promise<string | undefined> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, token: await token(), revalidate: false })
}

// ---- Catalog + values ----
export type SettingType = 'string' | 'text' | 'number' | 'boolean' | 'select' | 'color' | 'url' | 'email'
export interface SettingDef {
  key: string
  group: string
  label: string
  type: SettingType
  default: string | number | boolean | null
  isPublic: boolean
  isSensitive: boolean
  options?: string[]
}
export interface AdminSettingsResponse {
  catalog: SettingDef[]
  values: Record<string, Record<string, unknown>>
}
export const getAdminSettings = () => adminFetch<AdminSettingsResponse>('/admin/settings')
export const updateAdminSettings = (patch: Record<string, unknown>) =>
  adminFetch<AdminSettingsResponse>('/admin/settings', { method: 'PATCH', body: JSON.stringify(patch) })
export const resetSettingsGroup = (group: string) =>
  adminFetch<AdminSettingsResponse>('/admin/settings/reset', { method: 'POST', body: JSON.stringify({ group }) })

// ---- Tax categories ----
export interface TaxCategory {
  id: string
  name: string
  rate: number
  is_default: boolean
  is_active: boolean
}
export const getTaxCategories = () => adminFetch<TaxCategory[]>('/admin/settings/tax-categories')
export const createTaxCategory = (input: { name: string; rate: number; isDefault?: boolean; isActive?: boolean }) =>
  adminFetch<TaxCategory>('/admin/settings/tax-categories', { method: 'POST', body: JSON.stringify(input) })
export const updateTaxCategory = (id: string, input: Partial<{ name: string; rate: number; isDefault: boolean; isActive: boolean }>) =>
  adminFetch<TaxCategory>(`/admin/settings/tax-categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteTaxCategory = (id: string) => adminFetch<void>(`/admin/settings/tax-categories/${id}`, { method: 'DELETE' })

// ---- Shipping zones ----
export interface ShippingZone {
  id: string
  name: string
  states: string[]
  pincodes: string[]
  shipping_fee: number
  free_shipping_threshold: number | null
  cod_available: boolean
  delivery_min_days: number
  delivery_max_days: number
  is_active: boolean
  sort_order: number
}
export interface ShippingZoneInput {
  name: string
  states: string[]
  pincodes?: string[]
  shippingFee: number
  freeShippingThreshold?: number | null
  codAvailable?: boolean
  deliveryMinDays?: number
  deliveryMaxDays?: number
  isActive?: boolean
  sortOrder?: number
}
export const getShippingZones = () => adminFetch<ShippingZone[]>('/admin/settings/shipping-zones')
export const createShippingZone = (input: ShippingZoneInput) =>
  adminFetch<ShippingZone>('/admin/settings/shipping-zones', { method: 'POST', body: JSON.stringify(input) })
export const updateShippingZone = (id: string, input: Partial<ShippingZoneInput>) =>
  adminFetch<ShippingZone>(`/admin/settings/shipping-zones/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteShippingZone = (id: string) => adminFetch<void>(`/admin/settings/shipping-zones/${id}`, { method: 'DELETE' })

// ---- Nav items ----
export interface NavItem {
  id: string
  label: string
  url: string
  parent_id: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  open_in_new_tab: boolean
}
export interface NavItemInput {
  label: string
  url: string
  parentId?: string | null
  icon?: string | null
  sortOrder?: number
  isActive?: boolean
  openInNewTab?: boolean
}
export const getAdminNavItems = () => adminFetch<NavItem[]>('/admin/settings/nav-items')
export const createNavItem = (input: NavItemInput) => adminFetch<NavItem>('/admin/settings/nav-items', { method: 'POST', body: JSON.stringify(input) })
export const updateNavItem = (id: string, input: Partial<NavItemInput>) =>
  adminFetch<NavItem>(`/admin/settings/nav-items/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteNavItem = (id: string) => adminFetch<void>(`/admin/settings/nav-items/${id}`, { method: 'DELETE' })

// ---- Footer links ----
export interface FooterLink {
  id: string
  column_key: string
  label: string
  url: string
  sort_order: number
  is_active: boolean
}
export interface FooterLinkInput {
  columnKey: string
  label: string
  url: string
  sortOrder?: number
  isActive?: boolean
}
export const getAdminFooterLinks = () => adminFetch<FooterLink[]>('/admin/settings/footer-links')
export const createFooterLink = (input: FooterLinkInput) =>
  adminFetch<FooterLink>('/admin/settings/footer-links', { method: 'POST', body: JSON.stringify(input) })
export const updateFooterLink = (id: string, input: Partial<FooterLinkInput>) =>
  adminFetch<FooterLink>(`/admin/settings/footer-links/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteFooterLink = (id: string) => adminFetch<void>(`/admin/settings/footer-links/${id}`, { method: 'DELETE' })

// ---- Homepage sections ----
export interface HomepageSection {
  id: string
  section_key: string
  enabled: boolean
  title: string | null
  subtitle: string | null
  description: string | null
  image_url: string | null
  button_text: string | null
  button_url: string | null
  sort_order: number
}
export const getAdminHomepageSections = () => adminFetch<HomepageSection[]>('/admin/settings/homepage-sections')
export const updateHomepageSection = (
  id: string,
  input: Partial<{ enabled: boolean; title: string; subtitle: string; description: string; imageUrl: string; buttonText: string; buttonUrl: string; sortOrder: number }>
) => adminFetch<HomepageSection>(`/admin/settings/homepage-sections/${id}`, { method: 'PATCH', body: JSON.stringify(input) })

// ---- Public (storefront, unauthenticated) ----
export const getPublicSiteSettings = () => apiFetch<Record<string, Record<string, unknown>>>('/site-settings/public', { revalidate: 60 })
export const getPublicNavItems = () =>
  apiFetch<{ id: string; label: string; url: string; parentId: string | null; icon: string | null; sortOrder: number; openInNewTab: boolean }[]>(
    '/nav-items',
    { revalidate: 60 }
  )
export const getPublicFooterLinks = () =>
  apiFetch<{ id: string; columnKey: string; label: string; url: string; sortOrder: number }[]>('/footer-links', { revalidate: 60 })
export const getPublicHomepageSections = () =>
  apiFetch<
    {
      sectionKey: string
      enabled: boolean
      title: string | null
      subtitle: string | null
      description: string | null
      imageUrl: string | null
      buttonText: string | null
      buttonUrl: string | null
      sortOrder: number
    }[]
  >('/homepage-sections', { revalidate: 60 })
