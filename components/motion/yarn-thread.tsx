'use client'

import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

const DRAW = [0.65, 0, 0.35, 1] as const // ease-in-out for a hand-sewn feel

/**
 * A strand of yarn that sews itself across the page when scrolled into view: a gentle wave
 * with a crochet loop at the centre, ending in a small wound yarn ball. Used as a section
 * divider — decorative only.
 */
export function YarnDivider({ className, tone = 'primary' }: { className?: string; tone?: 'primary' | 'peach' }) {
  const reduce = useReducedMotion()
  const stroke = tone === 'peach' ? 'var(--secondary)' : 'var(--sage)'
  const path =
    'M 0 30 C 120 6, 220 54, 340 30 S 520 8, 560 30 C 590 48, 640 46, 640 22 C 640 2, 604 2, 604 24 C 604 44, 660 52, 720 30 S 900 6, 1020 30 S 1150 50, 1170 34'

  return (
    <div aria-hidden className={cn('pointer-events-none mx-auto w-full max-w-6xl px-4', className)}>
      <svg viewBox="0 0 1200 60" className="h-10 w-full overflow-visible sm:h-12" preserveAspectRatio="none">
        <motion.path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: reduce ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: reduce ? 0 : 2.2, ease: DRAW }}
        />
        {/* the yarn ball the strand unwinds from */}
        <motion.g
          initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: reduce ? 0 : 1.9, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          style={{ transformOrigin: '1182px 32px' }}
        >
          <circle cx="1182" cy="32" r="13" fill={stroke} />
          <path d="M1171 27 q11 -8 22 2 M1170 34 q12 -8 24 3 M1174 41 q9 -6 17 -1" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </motion.g>
      </svg>
    </div>
  )
}

/**
 * A running stitch sewn under a word (e.g. the italic accent in section titles). Sits
 * absolutely below its parent, which must be `relative inline-block`.
 */
export function StitchUnderline({ className, delay = 0.25 }: { className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  const mask = `stitch-underline-${useId().replace(/:/g, '')}`
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className={cn('pointer-events-none absolute -bottom-2 left-0 h-3 w-full overflow-visible', className)}
    >
      <mask id={mask}>
        <motion.path
          d="M2 7 C 50 2, 110 11, 198 5"
          fill="none"
          stroke="white"
          strokeWidth="10"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: reduce ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: reduce ? 0 : delay, duration: reduce ? 0 : 0.9, ease: DRAW }}
        />
      </mask>
      <path
        d="M2 7 C 50 2, 110 11, 198 5"
        fill="none"
        stroke="var(--secondary)"
        strokeWidth="2.4"
        strokeDasharray="7 5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        mask={`url(#${mask})`}
      />
    </svg>
  )
}
