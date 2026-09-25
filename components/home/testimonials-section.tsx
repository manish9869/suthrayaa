'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star, Quote, BadgeCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Testimonial } from '@/lib/data'
import { Reveal, EASE_OUT } from '@/components/motion/reveal'

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const [[index, direction], setState] = useState<[number, number]>([0, 1])
  const [paused, setPaused] = useState(false)
  const reduce = useReducedMotion()
  const count = testimonials.length

  useEffect(() => {
    if (paused || count < 2) return
    const t = setInterval(() => setState(([i]) => [(i + 1) % count, 1]), 7000)
    return () => clearInterval(t)
  }, [paused, count])

  if (count === 0) return null
  const go = (d: number) => setState(([i]) => [(i + d + count) % count, d])
  const t = testimonials[index]
  const avg = testimonials.reduce((s, x) => s + x.rating, 0) / count

  return (
    <section className="py-20 lg:py-28" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <Reveal className="flex flex-col justify-between">
            <div>
              <p className="eyebrow">Kind words</p>
              <h2 className="display mt-4 text-[2.4rem] sm:text-5xl">
                Loved by <em className="font-normal italic text-primary">our community</em>
              </h2>
              <p className="mt-4 max-w-sm text-[15px] text-muted-foreground">Real stories from people who’ve gifted, cuddled and kept our handmade pieces.</p>
            </div>
            <div className="mt-10 flex items-end gap-4">
              <p className="display text-7xl text-primary">{avg.toFixed(1)}</p>
              <div className="pb-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-4 w-4', i < Math.round(avg) ? 'fill-gold text-gold' : 'text-muted-foreground/30')} />
                  ))}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Average from happy customers</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="relative">
            <div className="relative min-h-[340px] overflow-hidden rounded-[2rem] bg-card p-8 ring-1 ring-border sm:p-12">
              <Quote className="absolute right-8 top-8 h-16 w-16 text-blush" />
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.figure
                  key={t.id}
                  custom={direction}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 * direction, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 * direction, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="relative"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('h-[18px] w-[18px]', i < t.rating ? 'fill-gold text-gold' : 'text-muted-foreground/25')} />
                    ))}
                  </div>
                  <blockquote className="display mt-6 text-2xl leading-snug text-foreground sm:text-[2rem]">“{t.content}”</blockquote>
                  <figcaption className="mt-8 flex items-center gap-4">
                    <Avatar className="h-12 w-12 bg-blush">
                      {t.avatar && <AvatarImage src={t.avatar} alt={t.customerName} />}
                      <AvatarFallback className="bg-blush font-medium text-rose">
                        {t.customerName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold">
                        {t.customerName} <BadgeCheck className="h-4 w-4 text-primary" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.location}
                        {t.productPurchased && ` · bought ${t.productPurchased}`}
                      </p>
                    </div>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>
            {count > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {testimonials.map((x, i) => (
                    <button
                      key={x.id}
                      onClick={() => setState([i, i > index ? 1 : -1])}
                      aria-label={`Show testimonial ${i + 1}`}
                      className={cn('h-1.5 rounded-full transition-all duration-300 ease-[var(--ease-out)]', i === index ? 'w-8 bg-primary' : 'w-1.5 bg-foreground/20 hover:bg-foreground/40')}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => go(-1)} aria-label="Previous testimonial" className="tap-bounce flex h-11 w-11 items-center justify-center rounded-full border bg-card transition-colors hover:border-primary hover:text-primary">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => go(1)} aria-label="Next testimonial" className="tap-bounce flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
