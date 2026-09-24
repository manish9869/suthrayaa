import Image from 'next/image'
import Link from 'next/link'
import { SectionHeading } from './section-heading'

/** Real pieces from the Suthrayaa studio, cut out and gliding past on an endless reel. */
const PIECES = [
  { src: '/showcase/garland-marigold.webp', name: 'Marigold & hibiscus garland', tag: 'Devghar', href: '/shop?category=devghar-collection-v2' },
  { src: '/showcase/hibiscus-vase.webp', name: 'Hibiscus in a vase', tag: 'Flowers', href: '/shop?category=flowers-floral' },
  { src: '/showcase/peacock-toran.webp', name: 'Peacock feather toran', tag: 'Home décor', href: '/shop?category=home-and-decor' },
  { src: '/showcase/sunflower-pot.webp', name: 'Potted sunflower', tag: 'Flowers', href: '/shop?category=flowers-floral' },
  { src: '/showcase/ring-flower.webp', name: 'Flower ring', tag: 'Devghar', href: '/shop?category=devghar-collection-v2' },
  { src: '/showcase/hair-tie-white.webp', name: 'Flower hair tie', tag: 'Hair accessories', href: '/shop?search=hair' },
  { src: '/showcase/star-hanging.webp', name: 'Star hanging', tag: 'Home décor', href: '/shop?category=home-and-decor' },
  { src: '/showcase/garland-hibiscus.webp', name: 'Red hibiscus garland', tag: 'Devghar', href: '/shop?category=devghar-collection-v2' },
  { src: '/showcase/sunflower-stems.webp', name: 'Sunflower stems', tag: 'Flowers', href: '/shop?category=flowers-floral' },
]

export function ShowcaseReel() {
  return (
    <section className="relative overflow-hidden pb-16 pt-4 lg:pb-24 lg:pt-6">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="Straight off our hooks"
          title="Made by hand,"
          accent="piece by piece"
          description="Every garland, toran and bloom here is crocheted in our studio — stitch by stitch, by women artisans."
          href="/shop"
          linkLabel="Shop the studio"
        />
      </div>

      <div className="relative [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <ul className="marquee gap-5 py-4" style={{ animationDuration: '55s' }}>
          {[...PIECES, ...PIECES].map((p, i) => (
            <li key={i} aria-hidden={i >= PIECES.length} className="w-[210px] shrink-0 sm:w-[240px]">
              <Link href={p.href} tabIndex={i >= PIECES.length ? -1 : undefined} className="lift group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[radial-gradient(120%_80%_at_50%_0%,var(--accent)_0%,var(--sand)_50%,var(--blush)_100%)] ring-1 ring-border">
                  <div className="float-slow absolute inset-[12%]" style={{ animationDelay: `${-(i % 5) * 1.7}s`, animationDuration: `${8 + (i % 3)}s` }}>
                    <Image
                      src={p.src}
                      alt={p.name}
                      fill
                      sizes="240px"
                      className="object-contain drop-shadow-[0_16px_18px_rgb(49_32_140/0.25)] transition-transform duration-500 ease-[var(--ease-out)] [@media(hover:hover)]:group-hover:scale-105"
                    />
                  </div>
                  <span className="absolute left-3 top-3 rounded-full bg-card/85 px-2.5 py-1 text-[11px] font-medium text-primary backdrop-blur">{p.tag}</span>
                </div>
                <p className="mt-3 px-1 text-sm font-medium">{p.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
