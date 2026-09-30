import { apiFetch } from './http'
import { getAccessToken } from '@/lib/auth/session'
import { MAX_IMAGE_UPLOAD_BYTES } from './admin'
import type { PreviewLayer } from '@/lib/data'

// Admin client for the live color preview ("Customize & Preview") — kept separate from the
// core admin client so the feature stays self-contained.

export type PreviewMode = 'none' | 'photo' | 'svg'

export interface AdminPreviewConfig {
  /** The global Settings → Storefront switch. Config is kept either way. */
  enabledGlobally: boolean
  mode: PreviewMode
  svgTemplate?: string
  baseUrl?: string
  width?: number
  height?: number
  layers: AdminPreviewLayer[]
  groups?: AdminPreviewGroup[]
}

/** A stored region as the admin sees it (fixed/background regions have no colour option). */
export interface AdminPreviewLayer extends Omit<PreviewLayer, 'customizationId'> {
  customizationId?: string
  /** Allowed library colour ids; undefined = inherit (group → product → library). */
  colorIds?: string[]
  locked?: boolean
  hidden?: boolean
}

export interface AdminPreviewGroup {
  id: string
  name: string
  sharedColor: boolean
  colorIds?: string[]
  sortOrder: number
}

/** The whole region configuration of a photo preview, saved in one request. */
export interface RegionConfigInput {
  baseUrl: string
  width: number
  height: number
  /** Mask of the non-product area (white = background). */
  backgroundMaskUrl?: string | null
  groups: { id: string; name: string; sharedColor: boolean; colorIds?: string[] | null }[]
  regions: {
    id: string
    name: string
    maskUrl: string
    groupId?: string | null
    changeable: boolean
    colorIds?: string[] | null
    allowOverlap?: boolean
    locked?: boolean
    hidden?: boolean
  }[]
  removeOtherColourOptions?: boolean
}

export interface PreviewConfigInput {
  mode: PreviewMode
  svgTemplate?: string | null
  baseUrl?: string | null
  width?: number | null
  height?: number | null
  layers: { customizationId: string; zone?: string | null; maskUrl?: string | null }[]
}

const auth = async () => ({ token: await getAccessToken(), revalidate: false as const })

export const getPreviewConfig = async (productId: string) =>
  apiFetch<AdminPreviewConfig>(`/admin/products/${productId}/preview`, await auth())

export const saveRegionConfig = async (productId: string, input: RegionConfigInput) =>
  apiFetch<AdminPreviewConfig>(`/admin/products/${productId}/preview/regions`, {
    ...(await auth()),
    method: 'PUT',
    body: JSON.stringify(input),
  })

export const savePreviewConfig = async (productId: string, input: PreviewConfigInput) =>
  apiFetch<AdminPreviewConfig>(`/admin/products/${productId}/preview`, {
    ...(await auth()),
    method: 'PUT',
    body: JSON.stringify(input),
  })

/** Uploads the base photo or one part mask; the server normalizes both to the same width. */
export async function uploadPreviewImage(
  productId: string,
  file: File,
  kind: 'base' | 'mask',
  base?: { width?: number; height?: number }
): Promise<{ url: string; width: number; height: number }> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error('Image is too large — please use one under 4 MB')
  const form = new FormData()
  form.append('kind', kind)
  if (base?.width && base?.height) {
    form.append('baseWidth', String(base.width))
    form.append('baseHeight', String(base.height))
  }
  form.append('image', file)
  const token = await getAccessToken()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/products/${productId}/preview/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(res.status === 413 ? 'Image is too large — please use one under 4 MB' : body?.error?.message ?? 'Upload failed')
  }
  return res.json()
}

/** Asks the storefront to drop its cached copy of a product page (fire-and-forget). */
export function refreshStorefrontProduct(slug?: string) {
  if (!slug) return
  fetch('/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) }).catch(() => {})
}
