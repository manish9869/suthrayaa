import type { MetadataRoute } from 'next'

// Web app manifest — the icon and name used when a shopper adds Suthrayaa to their home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Suthrayaa — Handmade Crochet',
    short_name: 'Suthrayaa',
    description: 'Handcrafted crochet flowers, décor, accessories and gifts, made to order in India.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fcfbff',
    theme_color: '#6d4aff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
