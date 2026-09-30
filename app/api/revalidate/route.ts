import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

// Expires cached storefront data right away, so a change saved in the admin shows on the next
// visit instead of after the cache window:
//   { slug }        — a product page (colour options, preview)
//   { tag: 'theme' } — the storefront theme (every page's colours)
// Only these known tags are accepted; expiring a cache entry is harmless beyond one refetch.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { slug?: unknown; tag?: unknown } | null
  if (body?.tag === 'theme') {
    revalidateTag('theme', { expire: 0 })
    return NextResponse.json({ ok: true })
  }
  const slug = typeof body?.slug === 'string' ? body.slug : ''
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  revalidateTag(`product:${slug}`, { expire: 0 })
  return NextResponse.json({ ok: true })
}
