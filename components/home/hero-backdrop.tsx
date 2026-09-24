'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'

/** Tiny line-art crochet motifs, drawn in the brand palette. */
function YarnBall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" />
      <path d="M11 18c8 2 18 10 22 20M14 32c4-9 12-17 23-19M20 9c-2 9 1 22 9 30" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M38 34c4 2 6 6 5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function Flower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="24" cy="13" rx="6" ry="9" stroke="currentColor" strokeWidth="1.8" transform={`rotate(${r} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="4" fill="currentColor" />
    </svg>
  )
}
function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path d="M24 40S8 30 8 18a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 12-16 22-16 22Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 19c3-4 7-3 9 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
    </svg>
  )
}
function Hook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path d="M12 40 34 10c1.5-2 4.5-1 4 1.5-.3 1.5-2 2-3 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

const MOTIFS = [
  { Icon: YarnBall, className: 'left-[4%] top-[18%] h-12 w-12 text-sage', dur: 14, dx: 18, dy: -22, rot: 20 },
  { Icon: Flower, className: 'left-[44%] top-[6%] h-9 w-9 text-rose', dur: 12, dx: -14, dy: 16, rot: -30 },
  { Icon: Heart, className: 'left-[36%] bottom-[10%] h-8 w-8 text-rose', dur: 11, dx: 12, dy: -14, rot: 14 },
  { Icon: Hook, className: 'right-[4%] top-[14%] h-11 w-11 text-gold', dur: 16, dx: -12, dy: 18, rot: -18 },
  { Icon: Flower, className: 'right-[8%] bottom-[16%] h-10 w-10 text-sage', dur: 15, dx: 14, dy: -12, rot: 40 },
  { Icon: YarnBall, className: 'left-[20%] bottom-[4%] hidden h-9 w-9 text-gold sm:block', dur: 13, dx: -10, dy: -18, rot: -24 },
]

/**
 * Ambient hero background: the Suthrayaa logo as a large, slowly turning watermark, a yarn
 * thread that keeps drawing itself across the section, and a few crochet motifs drifting on
 * long, calm loops. Purely decorative, pointer-events disabled, and fully static when the
 * visitor prefers reduced motion.
 */
export function HeroBackdrop() {
  const reduce = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Logo watermark */}
      <motion.div
        className="absolute -left-[12%] top-1/2 aspect-[688/363] w-[70vw] max-w-[900px] -translate-y-1/2 opacity-[0.06] lg:left-[18%] lg:w-[62vw]"
        animate={reduce ? undefined : { rotate: [-4, 4, -4], scale: [1, 1.04, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image src={STOREFRONT_IMAGES.logo} alt="" fill sizes="900px" className="object-contain" />
      </motion.div>

      {/* Drawing yarn thread */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 720" preserveAspectRatio="none" fill="none">
        <motion.path
          d="M-40 560 C 180 470, 260 640, 460 560 S 700 380, 860 470 S 1100 640, 1240 520 S 1420 330, 1500 380"
          stroke="var(--rose)"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1 0"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={reduce ? undefined : { pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
          transition={{ duration: 9, times: [0, 0.75, 1], repeat: Infinity, repeatDelay: 1.2, ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.path
          d="M-40 180 C 160 120, 300 260, 520 200 S 820 60, 1000 150 S 1300 260, 1500 160"
          stroke="var(--sage)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeDasharray="6 10"
          strokeLinecap="round"
          animate={reduce ? undefined : { strokeDashoffset: [0, -160] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      {/* Drifting motifs */}
      {MOTIFS.map(({ Icon, className, dur, dx, dy, rot }, i) => (
        <motion.div
          key={i}
          className={`absolute opacity-40 ${className}`}
          animate={reduce ? undefined : { x: [0, dx, 0], y: [0, dy, 0], rotate: [0, rot, 0] }}
          transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
        >
          <Icon className="h-full w-full" />
        </motion.div>
      ))}
    </div>
  )
}
