'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice, type HeroSlide, type Product } from '@/lib/data'
import { HeroDoodles } from './hero-doodles'

const fallbackSlides = [
  {
    id: 1,
    title: 'Handcrafted with Love',
    subtitle: 'Telling Stories Through Yarn',
    description: 'Discover unique crochet creations made with passion and care. Each piece is a work of art.',
    image: '/hero-crochet.jpg',
    cta: 'Shop Collection',
    href: '/shop',
    accent: 'bg-peach',
  },
  {
    id: 2,
    title: 'Personalized Keychains',
    subtitle: 'Make It Yours',
    description: 'Custom name keychains in beautiful colors. The perfect gift that speaks from the heart.',
    image: '/products/personalized-keychain.jpg',
    cta: 'Customize Now',
    href: '/shop?category=keychains',
    accent: 'bg-lavender',
  },
  {
    id: 3,
    title: 'Adorable Amigurumi',
    subtitle: 'Cuddly Friends Await',
    description: 'Handmade stuffed toys that bring joy to children and collectors alike.',
    image: '/products/amigurumi-bunny.jpg',
    cta: 'Meet the Friends',
    href: '/shop?category=amigurumi',
    accent: 'bg-mint',
  },
]

interface HeroSectionProps {
  slides?: HeroSlide[]
  featuredProducts?: Product[]
}

export function HeroSection({ slides: cmsSlides, featuredProducts = [] }: HeroSectionProps) {
  const slides = cmsSlides && cmsSlides.length > 0
    ? cmsSlides.map((s, i) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle ?? '',
        description: s.description ?? '',
        image: s.image ?? fallbackSlides[i % fallbackSlides.length].image,
        cta: s.ctaLabel ?? 'Shop Collection',
        href: s.ctaHref ?? '/shop',
        accent: s.accentToken ?? fallbackSlides[i % fallbackSlides.length].accent,
      }))
    : fallbackSlides

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, nextSlide])

  const showcaseProducts = featuredProducts.slice(0, 4)

  return (
    <section
      className="relative h-[70vh] min-h-[460px] max-h-[640px] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/*
        Layering is split into explicit stacking bands under <section>, each its own
        z-indexed sibling — NOT nested per-slide — because a per-slide wrapper with its own
        z-index creates its own stacking context, and everything inside it (image AND text)
        paints together as one atomic unit relative to siblings. Nesting the doodles inside
        that same z-10 slide wrapper (as a plain sibling div) put them entirely behind the
        opaque photo, invisible. Splitting into bg (z-0) / doodles (z-[2]) / content (z-10)
        top-level layers is what actually lets the doodles paint on top of the photo and
        underneath the text.
      */}

      {/* Background images */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn('absolute inset-0 z-0 transition-opacity duration-700', index === currentSlide ? 'opacity-100' : 'opacity-0')}
        >
          <Image src={slide.image} alt={slide.title} fill className="object-cover" priority={index === 0} />
        </div>
      ))}
      {/* A light overall dim, plus a black radial vignette concentrated behind the centered
          text — keeps the photo visible at the edges (where the doodles float) while
          guaranteeing contrast right where the text sits, regardless of what's in the photo.
          Text below switches to light/cream tones to read against this dark spotlight. */}
      <div className="absolute inset-0 z-[1] bg-black/15" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_58%_68%_at_50%_50%,_rgba(0,0,0,0.62)_0%,_rgba(0,0,0,0.25)_55%,_transparent_80%)]" />

      <HeroDoodles />
      <div className="hero-floating-motifs pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden="true">
        <span className="motif motif-a">✦</span><span className="motif motif-b">○</span><span className="motif motif-c">✧</span>
        <span className="motif motif-d">+</span><span className="motif motif-e">✦</span><span className="motif motif-f">○</span>
        <span className="motif motif-g">✿</span><span className="motif motif-h">✧</span><span className="motif motif-i">•</span>
        <span className="motif motif-j">✦</span><span className="motif motif-k">○</span><span className="motif motif-l">+</span>
      </div>

      {/* Content */}
      {slides.map((slide, index) => (
        <div key={slide.id} className={cn('absolute inset-0 z-10 transition-opacity duration-700', index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
          {/* Centered for a punchier, more focused banner */}
          <div className="relative h-full container mx-auto px-4 flex items-center justify-center">
            <motion.div
              className="max-w-2xl flex flex-col items-center text-center"
              animate={index === currentSlide ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              <div
                className={cn(
                  'inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4',
                  slide.accent,
                  'text-foreground'
                )}
              >
                {slide.subtitle}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white mb-2 text-balance">
                {slide.title}
              </h1>
              <p className="font-script text-4xl md:text-6xl text-secondary leading-none mb-4">
                Crochet Magic
              </p>
              <p className="text-lg font-medium text-white/90 mb-6 text-pretty max-w-lg">
                {slide.description}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button size="lg" asChild className="group">
                    <Link href={slide.href}>
                      {slide.cta}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/about">Our Story</Link>
                  </Button>
                </motion.div>
              </div>

              {/* Interactive "check our collection" widget — live bestseller/featured picks */}
              {showcaseProducts.length > 0 ? (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60 mb-3">This week&apos;s favorites</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {showcaseProducts.map((product, i) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        className="hero-widget group flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 py-2 pl-2 pr-4 shadow-soft backdrop-blur-sm transition-colors hover:border-secondary hover:-translate-y-0.5"
                        style={{ animationDelay: `${i * 110}ms` }}
                      >
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                          <Image
                            src={product.images[0] ?? '/placeholder.svg'}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div className="text-left">
                          <p className="line-clamp-1 max-w-[9rem] text-sm font-medium leading-tight">{product.name}</p>
                          <p className="text-xs font-semibold text-secondary">{formatPrice(product.price)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <div className="hero-widget rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-soft backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Made slowly</p>
                    <p className="font-serif text-lg font-semibold">One stitch at a time</p>
                  </div>
                  <div className="hero-widget rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-soft backdrop-blur-sm" style={{ animationDelay: '120ms' }}>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Loved by</p>
                    <p className="font-serif text-lg font-semibold">500+ happy makers</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <div className="absolute bottom-8 right-8 z-20 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm tap-bounce"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm tap-bounce"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <AnimatePresence initial={false}>
          {slides.map((_, index) => (
            <motion.button
              key={index}
              layout
              onClick={() => setCurrentSlide(index)}
              animate={{ width: index === currentSlide ? 32 : 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn(
                'h-2 rounded-full',
                index === currentSlide ? 'bg-secondary' : 'bg-foreground/30 hover:bg-foreground/50'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
