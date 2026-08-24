'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ArrowRight, Flower2, Sparkles, Scissors, CircleDot, Heart, Star, WandSparkles, Clover, Yarn } from 'lucide-react'
import { cn } from '@/lib/utils'

const slides = [
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

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [])

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(nextSlide, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, nextSlide])

  return (
    <section
      className="relative h-[calc(100vh-7rem)] min-h-[600px] overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => { setIsAutoPlaying(true); setPointer({ x: 0, y: 0 }) }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setPointer({
          x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
        })
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-20 hidden overflow-hidden md:block" aria-hidden="true">
        <div className="hero-doodle hero-doodle-one" style={{ transform: `translate(${pointer.x * 18}px, ${pointer.y * 12}px) rotate(-12deg)` }}><CircleDot /></div>
        <div className="hero-doodle hero-doodle-two" style={{ transform: `translate(${pointer.x * -24}px, ${pointer.y * -14}px) rotate(18deg)` }}><Flower2 /></div>
        <div className="hero-doodle hero-doodle-three" style={{ transform: `translate(${pointer.x * 12}px, ${pointer.y * -20}px) rotate(25deg)` }}><Scissors /></div>
        <div className="hero-doodle hero-doodle-four" style={{ transform: `translate(${pointer.x * -15}px, ${pointer.y * 18}px)` }}><Heart /></div>
        <div className="hero-doodle hero-doodle-five" style={{ transform: `translate(${pointer.x * 28}px, ${pointer.y * 8}px)` }}><Sparkles /></div>
        <div className="hero-doodle hero-doodle-six" style={{ transform: `translate(${pointer.x * -30}px, ${pointer.y * 10}px) rotate(-18deg)` }}><Star /></div>
        <div className="hero-doodle hero-doodle-seven" style={{ transform: `translate(${pointer.x * 20}px, ${pointer.y * -12}px) rotate(10deg)` }}><Clover /></div>
        <div className="hero-doodle hero-doodle-eight" style={{ transform: `translate(${pointer.x * -12}px, ${pointer.y * -18}px) rotate(22deg)` }}><WandSparkles /></div>
        <div className="hero-doodle hero-doodle-nine" style={{ transform: `translate(${pointer.x * 34}px, ${pointer.y * 20}px)` }}><CircleDot /></div>
        <div className="hero-thread" />
      </div>
      <div className="hero-floating-motifs pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <span className="motif motif-a">✦</span><span className="motif motif-b">○</span><span className="motif motif-c">✧</span>
        <span className="motif motif-d">+</span><span className="motif motif-e">✦</span><span className="motif motif-f">○</span>
        <span className="motif motif-g">✿</span><span className="motif motif-h">✧</span><span className="motif motif-i">•</span>
        <span className="motif motif-j">✦</span><span className="motif motif-k">○</span><span className="motif motif-l">+</span>
      </div>
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          )}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-background/75 md:bg-background/55" />
          </div>

          {/* Content */}
          <div className="relative h-full container mx-auto px-4 flex items-center">
            <div className="max-w-xl">
              <div
                className={cn(
                  'inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4',
                  slide.accent,
                  'text-foreground'
                )}
              >
                {slide.subtitle}
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-semibold tracking-tight text-foreground mb-2 text-balance">
                {slide.title}
              </h1>
              <p className="font-script text-5xl md:text-7xl text-peach-foreground leading-none mb-5">
                Crochet Magic
              </p>
              <p className="text-lg text-muted-foreground mb-8 text-pretty">
                {slide.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild className="group">
                  <Link href={slide.href}>
                    {slide.cta}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/about">Our Story</Link>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <div className="hero-widget rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-soft backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Made slowly</p>
                  <p className="font-serif text-lg font-semibold">One stitch at a time</p>
                </div>
                <div className="hero-widget rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-soft backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Loved by</p>
                  <p className="font-serif text-lg font-semibold">500+ happy makers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <div className="absolute bottom-8 right-8 z-20 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              index === currentSlide
                ? 'w-8 bg-secondary'
                : 'w-2 bg-foreground/30 hover:bg-foreground/50'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
