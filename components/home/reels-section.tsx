'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE_OUT } from '@/components/motion/reveal'
import { SectionHeading } from './section-heading'

/** Short vertical product reels rendered from the studio scenes (public/reels). */
const REELS = [
  { id: 'devghar', title: 'Devghar garlands', tag: 'Pooja', href: '/shop?category=devghar-collection-v2' },
  { id: 'torans', title: 'Door torans', tag: 'Home décor', href: '/shop?search=toran' },
  { id: 'bottle', title: 'Star → bottle holder', tag: '2-in-1', href: '/shop?search=bottle' },
  { id: 'flowers', title: 'Forever flowers', tag: 'Flowers', href: '/shop?category=flowers-floral' },
  { id: 'hair', title: 'Gajra & hairbands', tag: 'Hair', href: '/shop?search=hair' },
  { id: 'gifts', title: 'Keychains & totes', tag: 'Gifts', href: '/shop?search=keychain' },
  { id: 'home', title: 'Coasters & mats', tag: 'Table', href: '/shop?search=coaster' },
]

function ReelCard({ reel, index }: { reel: (typeof REELS)[number]; index: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)

  // Play only while on screen (and never auto-play for reduced-motion users)
  useEffect(() => {
    const video = ref.current
    if (!video || reduce) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.55 },
    )
    io.observe(video)
    return () => io.disconnect()
  }, [reduce, userPaused])

  const toggle = () => {
    const video = ref.current
    if (!video) return
    if (video.paused) {
      setUserPaused(false)
      video.play().catch(() => {})
    } else {
      setUserPaused(true)
      video.pause()
    }
  }

  return (
    <motion.li
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.07, ease: EASE_OUT }}
      className="w-[64vw] max-w-[250px] shrink-0 snap-start sm:w-[230px]"
    >
      <div className="group relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-sand shadow-[0_24px_50px_-30px_rgb(49_32_140/0.55)] ring-1 ring-border">
        <video
          ref={ref}
          poster={`/reels/${reel.id}.webp`}
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out)] [@media(hover:hover)]:group-hover:scale-[1.03]"
          aria-label={`${reel.title} reel`}
        >
          {/* WebM (VP9) first for Chromium builds without H.264; MP4 for Safari/iOS */}
          <source src={`/reels/${reel.id}.webm`} type="video/webm" />
          <source src={`/reels/${reel.id}.mp4`} type="video/mp4" />
        </video>
        {/* legibility wash */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/75 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-card/85 px-2.5 py-1 text-[11px] font-medium text-primary backdrop-blur">{reel.tag}</span>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${reel.title}` : `Play ${reel.title}`}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/85 text-foreground backdrop-blur transition-transform active:scale-95"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
        </button>
        <Link href={reel.href} className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
          <span className="font-serif text-lg leading-tight">{reel.title}</span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-colors group-hover:bg-white group-hover:text-primary">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
        {/* thin progress thread along the bottom while playing */}
        {playing && !reduce && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left animate-[reel-progress_8.8s_linear_infinite] bg-secondary" />
        )}
      </div>
    </motion.li>
  )
}

export function ReelsSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="Suthrayaa reels"
          title="See them"
          accent="up close"
          description="Short clips of our pieces — tap one to shop the collection."
          href="/shop"
          linkLabel="Shop all"
        />
      </div>
      <ul className="container mx-auto flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {REELS.map((reel, i) => (
          <ReelCard key={reel.id} reel={reel} index={i} />
        ))}
      </ul>
    </section>
  )
}
