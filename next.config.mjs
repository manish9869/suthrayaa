// Static media lives in the Supabase `site-media` bucket (see lib/media.ts). Old root-relative
// paths — e.g. stored in content/DB rows — are redirected there so they keep working.
const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ??
  'https://uvctijaxxvddtzuqivse.supabase.co/storage/v1/object/public/site-media'
).replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    const dirs = ['editorial', 'reels', 'categories', 'products', 'testimonials']
    const files = ['logo.png', 'hero-crochet.jpg', 'artisan-hands.jpg']
    return [
      ...dirs.map((d) => ({
        source: `/${d}/:file((?:.*)\\.(?:webp|jpe?g|png|mp4|webm))`,
        destination: `${MEDIA_BASE_URL}/${d}/:file`,
        permanent: true,
      })),
      ...files.map((f) => ({ source: `/${f}`, destination: `${MEDIA_BASE_URL}/${f}`, permanent: true })),
    ]
  },
}

export default nextConfig
