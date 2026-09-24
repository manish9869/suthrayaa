'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Star, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice, type HeroSlide, type Product } from '@/lib/data'
import { useCartStore } from '@/lib/store'
import { toast } from 'sonner'
import { EASE_OUT } from '@/components/motion/reveal'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'
import { HeroBackdrop } from './hero-backdrop'

/** Real Suthrayaa pieces, cut out so they sit on the brand stage. */
const SHOWCASE = {
  marigold: '/showcase/garland-marigold.webp',
  hibiscusGarland: '/showcase/garland-hibiscus.webp',
  ring: '/showcase/ring-flower.webp',
  toran: '/showcase/peacock-toran.webp',
  star: '/showcase/star-hanging.webp',
  hibiscusVase: '/showcase/hibiscus-vase.webp',
  sunflowerPot: '/showcase/sunflower-pot.webp',
  sunflowers: '/showcase/sunflower-stems.webp',
  hairTie: '/showcase/hair-tie-white.webp',
}

type Slide = {
  id: string
  title: string
  subtitle: string
  description: string
  image: string
  cta: string
  href: string
  /** Transparent product cut-out shown floating on the stage instead of a full photo. */
  cutout?: string
  /** Smaller cut-outs that drift around the arch. */
  satellites?: string[]
}

const fallbackSlides: Slide[] = [
  {
    id: 'f0',
    title: 'Garlands for your devghar. Stitched with devotion.',
    subtitle: 'Pooja & devghar collection',
    description: 'Marigold and hibiscus garlands, flower rings and chowki covers — handmade in crochet so they stay fresh for every puja.',
    image: STOREFRONT_IMAGES.heroGarland,
    cutout: SHOWCASE.marigold,
    satellites: [SHOWCASE.hibiscusGarland, SHOWCASE.ring],
    cta: 'Shop Devghar Collection',
    href: '/shop?category=devghar-collection-v2',
  },
  {
    id: 'f1',
    title: 'Forever flowers. Never wilting.',
    subtitle: 'Crochet flowers & bouquets',
    description: 'Hibiscus in a glass vase, sunflower stems and potted blooms — every petal hooked by hand, bright all year.',
    image: STOREFRONT_IMAGES.heroFlowers,
    cutout: SHOWCASE.hibiscusVase,
    satellites: [SHOWCASE.sunflowers, SHOWCASE.sunflowerPot],
    cta: 'Shop Flowers',
    href: '/shop?category=flowers-floral',
  },
  {
    id: 'f2',
    title: 'Doorways & walls, made festive.',
    subtitle: 'Torans & home décor',
    description: 'Peacock-feather torans, star hangings and flower rings that bring colour to every doorway and corner.',
    image: STOREFRONT_IMAGES.heroFlowers,
    cutout: SHOWCASE.star,
    satellites: [SHOWCASE.toran, SHOWCASE.ring],
    cta: 'Shop Home Décor',
    href: '/shop?category=home-and-decor',
  },
  {
    id: 'f3',
    title: 'Hair accessories, softly made.',
    subtitle: 'Hair ties · scrunchies · clips',
    description: 'Flower hair ties, scrunchies and bow clips in soft cotton yarn — gentle on hair, lovely on everyone.',
    image: STOREFRONT_IMAGES.heroHair,
    cutout: SHOWCASE.hairTie,
    satellites: [SHOWCASE.sunflowers],
    cta: 'Shop Hair Accessories',
    href: '/shop?search=hair',
  },
  {
    id: 'f4',
    title: 'Tiny keychains. Big personality.',
    subtitle: 'Handmade crochet keychains',
    description: 'Bunnies, strawberries, daisies and name keychains — stitched by hand to carry a little joy everywhere.',
    image: STOREFRONT_IMAGES.heroKeychains,
    cta: 'Shop Keychains',
    href: '/shop?search=keychain',
  },
]

/** Lavender-to-peach stage with a slowly breathing product cut-out — a soft, looping "product film". */
function ProductStage({ src, alt, reduce }: { src: string; alt: string; reduce: boolean }) {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#e3d9ff_0%,#efe8ff_45%,#ffe3d6_100%)]">
      {/* light sweep */}
      {!reduce && <div className="stage-sheen absolute inset-0" />}
      {/* pedestal */}
      <div className="absolute inset-x-[14%] bottom-[7%] h-[9%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(49_32_140/0.22),transparent)]" />
      <div className={cn('absolute inset-x-[13%] bottom-[13%] top-[11%]', !reduce && 'stage-breathe')}>
        <Image src={src} alt={alt} fill priority sizes="(max-width: 1024px) 70vw, 380px" className="object-contain drop-shadow-[0_24px_28px_rgb(49_32_140/0.3)]" />
      </div>
    </div>
  )
}

/** Splits "First part. Second part." (or a comma) so the second half can be set in italics. */
function splitTitle(title: string): [string, string | null] {
  const m = title.match(/^(.+?[.,!—–])\s+(.+)$/)
  return m ? [m[1], m[2]] : [title, null]
}

interface HeroSectionProps {
  slides?: HeroSlide[]
  featuredProducts?: Product[]
}

export function HeroSection({ slides: cmsSlides, featuredProducts = [] }: HeroSectionProps) {
  const reduce = useReducedMotion()
  const slides: Slide[] =
    cmsSlides && cmsSlides.length > 0
      ? cmsSlides.map((s, i) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle ?? 'New season collection',
          description: s.description ?? '',
          image: s.image ?? fallbackSlides[i % fallbackSlides.length].image,
          cta: s.ctaLabel ?? 'Shop Collection',
          href: s.ctaHref ?? '/shop',
        }))
      : fallbackSlides

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const next = useCallback(() => setCurrent((p) => (p + 1) % slides.length), [slides.length])

  useEffect(() => {
    if (paused || slides.length < 2) return
    const t = setInterval(next, 6500)
    return () => clearInterval(t)
  }, [paused, next, slides.length])

  // Floating product card cycles through the featured picks
  const picks = featuredProducts.slice(0, 4)
  const [pick, setPick] = useState(0)
  useEffect(() => {
    if (picks.length < 2 || paused) return
    const t = setInterval(() => setPick((p) => (p + 1) % picks.length), 4200)
    return () => clearInterval(t)
  }, [picks.length, paused])
  const { addItem, openCart } = useCartStore()
  const [added, setAdded] = useState(false)
  const addPick = (product: Product) => {
    addItem(product, product.colors[0])
    openCart()
    toast.success(`${product.name} added to cart`)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  // Gentle parallax on the photo as the hero scrolls away
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60])

  const slide = slides[current]
  const [line1, line2] = splitTitle(slide.title)
  const activePick = picks[pick]
  const textAnim = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
      }

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Soft decorative washes */}
      <div className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-blush/50 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-sage/20 blur-3xl" />
      <HeroBackdrop />

      <div className="container relative mx-auto grid items-center gap-10 px-4 pb-16 pt-6 lg:min-h-[640px] lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-20 lg:pt-6">
        {/* Copy */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div key={slide.id} transition={{ duration: 0.55, ease: EASE_OUT }} {...textAnim}>
              <p className="eyebrow flex items-center gap-2">
                <span className="h-px w-8 bg-rose" /> {slide.subtitle}
              </p>
              <h1 className="display mt-5 text-[2.9rem] leading-[1.02] sm:text-6xl xl:text-[5.2rem]">
                {line1}
                {line2 && (
                  <>
                    <br />
                    <em className="font-normal italic text-primary">{line2}</em>
                  </>
                )}
              </h1>
              {slide.description && <p className="mt-6 max-w-md text-[17px] leading-relaxed text-foreground/70">{slide.description}</p>}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild className="group h-[52px] px-7 text-[15px]">
                  <Link href={slide.href}>
                    {slide.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="h-[52px] px-5 text-[15px]">
                  <Link href="/about">Our story</Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Slide dots + social proof */}
          <div className="mt-12 flex flex-wrap items-center gap-6">
            {slides.length > 1 && (
              <div className="flex items-center gap-2">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrent(i)}
                    aria-label={`Show slide ${i + 1}`}
                    aria-current={i === current}
                    className="relative h-1.5 w-8 overflow-hidden rounded-full bg-foreground/15"
                  >
                    {i === current && (
                      <motion.span
                        key={`${s.id}-${paused}`}
                        className="absolute inset-y-0 left-0 rounded-full bg-primary"
                        initial={{ width: paused || reduce ? '100%' : '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: paused || reduce ? 0 : 6.5, ease: 'linear' }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {['/testimonials/avatar-1.jpg', '/testimonials/avatar-2.jpg', '/testimonials/avatar-3.jpg'].map((src) => (
                  <span key={src} className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-background">
                    <Image src={src} alt="" fill sizes="36px" className="object-cover" />
                  </span>
                ))}
              </div>
              <div className="text-[13px] leading-tight">
                <span className="flex items-center gap-1 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-gold text-gold" /> 4.9 / 5
                </span>
                <span className="text-muted-foreground">Loved by 500+ customers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual */}
        <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[520px]">
          <div className="absolute inset-x-[6%] bottom-[4%] top-[10%] rounded-full bg-blush" />
          <motion.div style={{ y: imageY }} className="relative">
            <div className="arch relative mx-auto aspect-[4/5] w-[78%] overflow-hidden bg-sand shadow-[0_40px_80px_-40px_rgb(49_32_140/0.55)]">
              <AnimatePresence initial={false}>
                <motion.div
                  key={slide.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: reduce ? 1 : 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: EASE_OUT }}
                >
                  {slide.cutout ? (
                    <ProductStage src={slide.cutout} alt={slide.title} reduce={!!reduce} />
                  ) : (
                    <Image src={slide.image} alt={slide.title} fill priority sizes="(max-width: 1024px) 80vw, 420px" className="object-cover" />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Satellite pieces drifting around the arch */}
          <AnimatePresence>
            {slide.satellites?.map((src, i) => (
              <motion.div
                key={`${slide.id}-${src}`}
                aria-hidden
                className={cn(
                  'pointer-events-none absolute z-[1] h-[27%] w-[24%] drop-shadow-[0_18px_22px_rgb(49_32_140/0.28)]',
                  i === 0 ? 'right-[-1%] top-[1%] sm:right-[-3%]' : 'bottom-[14%] left-[-2%] sm:left-[-5%]',
                )}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 16, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
                transition={{ duration: 0.7, delay: 0.35 + i * 0.12, ease: EASE_OUT }}
              >
                <div className={cn('relative h-full w-full', !reduce && 'float-slow')} style={{ animationDelay: `${-i * 3}s`, animationDuration: `${8 + i * 2}s` }}>
                  <Image src={src} alt="" fill sizes="160px" className="object-contain" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Rotating badge */}
          <div className="absolute left-0 top-[8%] hidden h-28 w-28 sm:block">
            <svg viewBox="0 0 100 100" className={cn('h-full w-full', !reduce && 'animate-[spin_22s_linear_infinite]')} aria-hidden>
              <defs>
                <path id="hero-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
              </defs>
              <circle cx="50" cy="50" r="49" fill="var(--card)" />
              <text fontSize="10.5" letterSpacing="3" fill="var(--forest)" fontWeight="600">
                <textPath href="#hero-circle">HANDMADE · WITH · LOVE · IN INDIA ·</textPath>
              </text>
            </svg>
            <span className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose text-lg text-white">✿</span>
          </div>

          {/* Floating product card */}
          {activePick && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.6, ease: EASE_OUT }}
              className="absolute bottom-[-2%] right-[-4%] z-[2] hidden w-[180px] rounded-3xl bg-card/95 p-2.5 shadow-[0_24px_60px_-28px_rgb(49_32_140/0.55)] ring-1 ring-border backdrop-blur sm:block xl:right-[-8%]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activePick.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                >
                  <Link href={`/product/${activePick.slug}`} className="group block">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-sand">
                      <Image src={activePick.images[0] ?? '/placeholder.svg'} alt={activePick.name} fill sizes="180px" className="zoom-img object-cover" />
                    </div>
                    <p className="mt-2.5 line-clamp-1 text-sm font-medium">{activePick.name}</p>
                    <p className="text-sm font-semibold text-primary">{formatPrice(activePick.price)}</p>
                  </Link>
                </motion.div>
              </AnimatePresence>
              <div className="mt-2.5 flex items-center gap-2">
                <Button size="sm" className="h-9 flex-1" onClick={() => addPick(activePick)} disabled={added}>
                  {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {added ? 'Added' : 'Add to cart'}
                </Button>
              </div>
              {picks.length > 1 && (
                <div className="mt-2.5 flex justify-center gap-1.5">
                  {picks.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setPick(i)}
                      aria-label={`Show ${p.name}`}
                      className={cn('h-1.5 rounded-full transition-all duration-300', i === pick ? 'w-4 bg-primary' : 'w-1.5 bg-foreground/20')}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
