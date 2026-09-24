'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/motion/reveal'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'

const STATS = [
  { value: '2+', label: 'Years of craft' },
  { value: '1000+', label: 'Pieces created' },
  { value: '50+', label: 'Unique designs' },
]

export function StorySection() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yBig = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 40, reduce ? 0 : -40])
  const ySmall = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 80, reduce ? 0 : -60])

  return (
    <section ref={ref} className="relative overflow-hidden py-20 lg:py-32">
      <div className="container mx-auto grid items-center gap-16 px-4 lg:grid-cols-2 lg:gap-20">
        {/* Images */}
        <div className="relative mx-auto w-full max-w-[520px]">
          <motion.div style={{ y: yBig }} className="arch relative aspect-[4/5] w-[78%] overflow-hidden bg-sand">
            <Image src={STOREFRONT_IMAGES.story} alt="Hands crocheting in the Suthrayaa studio" fill sizes="(max-width: 1024px) 80vw, 400px" className="object-cover" />
          </motion.div>
          <motion.div
            style={{ y: ySmall }}
            className="absolute bottom-[-6%] right-0 aspect-square w-[46%] overflow-hidden rounded-[1.75rem] border-[6px] border-background bg-sand shadow-xl"
          >
            <Image src={STOREFRONT_IMAGES.storySecondary} alt="" fill sizes="240px" className="object-cover" />
          </motion.div>
          <div className="absolute -left-2 top-[12%] rounded-2xl bg-card px-4 py-3 shadow-lg ring-1 ring-border float-slow">
            <p className="display text-3xl text-primary">100%</p>
            <p className="text-xs font-medium text-muted-foreground">Handmade</p>
          </div>
        </div>

        {/* Copy */}
        <div>
          <Reveal>
            <p className="eyebrow">Our story</p>
            <h2 className="display mt-4 text-[2.4rem] sm:text-5xl lg:text-[3.6rem]">
              Every stitch <em className="font-normal italic text-primary">tells a story</em>
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-6 space-y-4 text-[16px] leading-relaxed text-foreground/70">
            <p>
              Suthrayaa was born from a passion for the timeless art of crochet. What started as a hobby has blossomed into a mission to bring
              handcrafted joy to homes across India.
            </p>
            <p>
              The name &quot;Suthrayaa&quot; comes from the Sanskrit word for thread — the beautiful threads that connect us all. Every piece is made to
              order with premium, eco-friendly yarn, so it&apos;s crafted specially for you.
            </p>
          </Reveal>
          <Reveal delay={0.14} className="mt-10 grid max-w-md grid-cols-3 gap-4 border-y py-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="display text-4xl text-primary">{s.value}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </Reveal>
          <Reveal delay={0.2} className="mt-8">
            <Button size="lg" asChild className="group h-12 px-7">
              <Link href="/about">
                Read our full story <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
