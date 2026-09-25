'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/motion/reveal'
import { AccentText } from '@/components/content-text'
import type { SiteContent } from '@/lib/content'

// Built-in copy, used only if the content API is unreachable (edit in Admin → Storefront Content)
const FALLBACK: SiteContent['home.story'] = {
  eyebrow: 'Our story',
  title: 'Every stitch *tells a story*',
  paragraphs: [
    { text: 'Suthrayaa was born from a passion for the timeless art of crochet. What started as a hobby has blossomed into a mission to bring handcrafted joy to homes across India.' },
    { text: 'The name "Suthrayaa" comes from the Sanskrit word for thread — the beautiful threads that connect us all. Every piece is made to order with premium, eco-friendly yarn, so it’s crafted specially for you.' },
  ],
  image: '/editorial/story-hands.webp',
  imageAlt: 'Hands crocheting in the Suthrayaa studio',
  secondaryImage: '/editorial/scene-hair.webp',
  badgeValue: '100%',
  badgeLabel: 'Handmade',
  stats: [
    { value: '2+', label: 'Years of craft' },
    { value: '1000+', label: 'Pieces created' },
    { value: '50+', label: 'Unique designs' },
  ],
  ctaLabel: 'Read our full story',
  ctaHref: '/about',
}

export function StorySection({ content }: { content?: SiteContent['home.story'] }) {
  const c = content ?? FALLBACK
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yBig = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 40, reduce ? 0 : -40])
  const ySmall = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 80, reduce ? 0 : -60])

  return (
    <section ref={ref} className="relative overflow-hidden py-20 lg:py-32">
      <div className="container mx-auto grid grid-cols-1 items-center gap-16 px-4 lg:grid-cols-2 lg:gap-20">
        {/* Images */}
        <div className="relative mx-auto w-full max-w-[520px]">
          <motion.div style={{ y: yBig }} className="arch relative aspect-[4/5] w-[78%] overflow-hidden bg-sand">
            {c.image && <Image src={c.image} alt={c.imageAlt} fill sizes="(max-width: 1024px) 80vw, 400px" className="object-cover" />}
          </motion.div>
          {c.secondaryImage && (
            <motion.div
              style={{ y: ySmall }}
              className="absolute bottom-[-6%] right-0 aspect-square w-[46%] overflow-hidden rounded-[1.75rem] border-[6px] border-background bg-sand shadow-xl"
            >
              <Image src={c.secondaryImage} alt="" fill sizes="240px" className="object-cover" />
            </motion.div>
          )}
          {c.badgeValue && (
            <div className="absolute -left-2 top-[12%] rounded-2xl bg-card px-4 py-3 shadow-lg ring-1 ring-border float-slow">
              <p className="display text-3xl text-primary">{c.badgeValue}</p>
              <p className="text-xs font-medium text-muted-foreground">{c.badgeLabel}</p>
            </div>
          )}
        </div>

        {/* Copy */}
        <div>
          <Reveal>
            {c.eyebrow && <p className="eyebrow">{c.eyebrow}</p>}
            <h2 className="display mt-4 text-[2.4rem] sm:text-5xl lg:text-[3.6rem]">
              <AccentText text={c.title} />
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-6 space-y-4 text-[16px] leading-relaxed text-foreground/70">
            {c.paragraphs.map((p, i) => (
              <p key={i}>{p.text}</p>
            ))}
          </Reveal>
          {c.stats.length > 0 && (
            <Reveal delay={0.14} className="mt-10 grid max-w-md grid-cols-3 gap-4 border-y py-6">
              {c.stats.map((s, i) => (
                <div key={`${s.label}-${i}`}>
                  <p className="display text-[1.9rem] text-primary min-[400px]:text-4xl">{s.value}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </Reveal>
          )}
          {c.ctaLabel && c.ctaHref && (
            <Reveal delay={0.2} className="mt-8">
              <Button size="lg" asChild className="group h-12 px-7">
                <Link href={c.ctaHref}>
                  {c.ctaLabel} <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  )
}
