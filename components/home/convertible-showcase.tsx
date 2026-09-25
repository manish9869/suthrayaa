'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EASE_OUT, Reveal } from '@/components/motion/reveal'

const STAGES = [
  { key: 'hanging', src: '/editorial/scene-staropen.webp', label: 'Mini bag hanging', note: 'Hang it on a hook, a bag strap or your doorway.' },
  { key: 'bottle', src: '/editorial/scene-bottleopen.webp', label: 'Bottle holder', note: 'Open the star and the net slips over any bottle.' },
] as const

const HOLD = 3200

/**
 * "Two pieces in one" feature for the convertible star hanging → bottle holder. The two
 * studio frames morph into each other on a loop (blur + scale cross-dissolve with a
 * yarn-thread wipe), like a short product clip — but crisp, lightweight and free.
 */
export function ConvertibleShowcase() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [stage, setStage] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!inView || paused) return
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), HOLD)
    return () => clearInterval(t)
  }, [inView, paused])

  const current = STAGES[stage]

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
        <div
          ref={ref}
          className="relative mx-auto aspect-[3/4] w-full max-w-[440px] overflow-hidden rounded-[2.5rem] bg-sand shadow-[0_40px_80px_-40px_rgb(49_32_140/0.5)]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={current.key}
              className="absolute inset-0"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
              transition={{ duration: 1.1, ease: EASE_OUT }}
            >
              <Image src={current.src} alt={current.label} fill sizes="(max-width: 1024px) 90vw, 440px" className={cn('object-cover', !reduce && 'ken-burns')} />
            </motion.div>
          </AnimatePresence>

          {/* yarn thread sweeping across on each change */}
          {!reduce && (
            <motion.svg
              key={`thread-${stage}`}
              viewBox="0 0 400 40"
              className="pointer-events-none absolute inset-x-0 top-1/2 h-10 w-full -translate-y-1/2"
              aria-hidden
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <motion.path
                d="M-10 20 C 60 0, 110 40, 180 20 S 300 0, 410 20"
                fill="none"
                stroke="var(--secondary)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: EASE_OUT }}
              />
            </motion.svg>
          )}

          {/* stage switcher */}
          <div className="absolute inset-x-4 bottom-4 flex rounded-full bg-card/80 p-1 ring-1 ring-white/70 backdrop-blur-md">
            {STAGES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStage(i)}
                aria-pressed={i === stage}
                className="relative flex-1 rounded-full px-3 py-2 text-[13px] font-medium"
              >
                {i === stage && (
                  <motion.span layoutId="convertible-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                )}
                <span className={cn('relative transition-colors', i === stage ? 'text-primary-foreground' : 'text-foreground/70')}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Reveal>
          <p className="eyebrow flex items-center gap-2">
            <span className="h-px w-8 bg-rose" /> Two pieces in one
          </p>
          <h2 className="display mt-4 text-4xl leading-[1.05] sm:text-5xl">
            A star that <em className="font-normal italic text-primary">opens into</em> a bottle holder.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-foreground/70">
            Our convertible mini bag hanging folds into a cheerful crochet star. Open it up and the net stretches around your water bottle, with the star as a sturdy base.
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={current.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="mt-6 flex items-center gap-2 text-sm font-medium text-primary"
            >
              <Repeat2 className="h-4 w-4" /> {current.note}
            </motion.p>
          </AnimatePresence>
          <Button size="lg" asChild className="group mt-8 h-[52px] px-7">
            <Link href="/shop?search=bottle">
              Shop the bottle holder
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
