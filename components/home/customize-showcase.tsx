'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, Palette, Type, Scissors, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EASE_OUT, Reveal } from '@/components/motion/reveal'
import { AccentText } from '@/components/content-text'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'

const [BANNER, COLOURS, NAME] = STOREFRONT_IMAGES.customize

const STEPS: { icon: LucideIcon; label: string; note: string; image: string; alt: string }[] = [
  { icon: Palette, label: 'Pick your colours', note: 'Choose from our yarn shades for every part of the piece.', image: COLOURS, alt: 'The same crochet flower keychain in four colourways' },
  { icon: Type, label: 'Add a name', note: 'Stitch in a name or initials for a gift that’s only theirs.', image: NAME, alt: 'Crochet pouch with a personalised name charm' },
  { icon: Scissors, label: 'Made to order', note: 'We crochet it by hand, just for you, once you order.', image: BANNER, alt: 'Crochet flowers in progress beside a row of yarn balls' },
]

const HOLD = 3600

/**
 * "Make it yours" feature for product customization. Each step is also a switcher for the
 * photo; the photos advance on their own while the section is in view.
 */
export function CustomizeShowcase() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!inView || paused || reduce) return
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), HOLD)
    return () => clearInterval(t)
  }, [inView, paused, reduce])

  const current = STEPS[step]

  return (
    <section className="py-12 sm:py-16 lg:py-24">
      <div className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
        <Reveal className="lg:order-1">
          <p className="eyebrow flex items-center gap-2">
            <span className="h-px w-8 bg-rose" /> New · Customise
          </p>
          <h2 className="display mt-4 text-4xl leading-[1.05] sm:text-5xl">
            <AccentText text="Make it *yours*, stitch by stitch." />
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-foreground/70">
            Look for the Customise option on a product to choose your yarn colours, add a name, and see a preview before you order.
          </p>

          <ul className="mt-8 space-y-2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {STEPS.map((s, i) => {
              const active = i === step
              return (
                <li key={s.label}>
                  <button
                    onClick={() => setStep(i)}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-start gap-4 rounded-2xl p-3 text-left transition-colors duration-200 ease-[var(--ease-out)]',
                      active ? 'bg-accent' : 'hover:bg-muted'
                    )}
                  >
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors', active ? 'bg-primary text-primary-foreground' : 'bg-card text-primary ring-1 ring-border')}>
                      <s.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span>
                      <span className="block font-medium">{s.label}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{s.note}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <Button size="lg" asChild className="group mt-8 h-[52px] px-7">
            <Link href="/shop">
              Find a piece to customise
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>

        <div
          ref={ref}
          className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[2.5rem] bg-sand shadow-[0_40px_80px_-40px_color-mix(in_oklab,var(--shadow-tint)_50%,transparent)] lg:order-2"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={step}
              className="absolute inset-0"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
              transition={{ duration: 1, ease: EASE_OUT }}
            >
              <Image src={current.image} alt={current.alt} fill sizes="(max-width: 1024px) 90vw, 460px" className="object-cover" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
