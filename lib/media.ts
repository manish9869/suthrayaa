/** Static storefront media (editorial scenes, reels, legacy photos) is served from the
 * Supabase `site-media` bucket (uploaded by the backend's `npm run upload:site-media`), not
 * from `public/`. Paths keep their old shape — `/editorial/x.webp` → `<base>/editorial/x.webp`. */
export const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ??
  'https://uvctijaxxvddtzuqivse.supabase.co/storage/v1/object/public/site-media'
).replace(/\/$/, '')

/** Root-relative paths that now live in the bucket. Kept in sync with next.config redirects. */
export const MEDIA_PREFIXES = ['/editorial/', '/reels/', '/categories/', '/products/', '/testimonials/']
export const MEDIA_ROOT_FILES = ['/logo.png', '/hero-crochet.jpg', '/artisan-hands.jpg']

/** Maps a migrated local path to its CDN URL; anything else (absolute URLs, icons,
 * placeholders) passes through untouched. Safe on API/DB values too. */
export function mediaUrl(path: string): string
export function mediaUrl(path: string | undefined | null): string | undefined
export function mediaUrl(path: string | undefined | null): string | undefined {
  if (!path) return path ?? undefined
  if (MEDIA_PREFIXES.some((p) => path.startsWith(p)) || MEDIA_ROOT_FILES.includes(path)) return MEDIA_BASE_URL + path
  return path
}
