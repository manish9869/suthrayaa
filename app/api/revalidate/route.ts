import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

// Expires a product page's cached data right away, so a change saved in the admin (colour
// options, preview) shows on the next visit instead of after the 60-second cache window.
// Only product tags are accepted; expiring a cache entry is harmless beyond one refetch.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { slug?: unknown } | null
  const slug = typeof body?.slug === 'string' ? body.slug : ''
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  revalidateTag(`product:${slug}`, { expire: 0 })
  return NextResponse.json({ ok: true })
}
