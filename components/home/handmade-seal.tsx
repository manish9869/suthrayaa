'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { YarnBall } from '@/components/yarn-color-picker'

const LOOPS = 7
const CYCLE = 3.6 // seconds for one crochet → hold → unravel cycle

/** Frosted "Handmade in India" seal: a yarn ball rolling inside a turning gradient ring, and a
 * chain stitch that crochets itself loop by loop, holds, then unravels and starts again. */
export function HandmadeSeal({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-full bg-card/75 py-2 pl-2 pr-5 shadow-[0_20px_50px_-24px_rgb(49_32_140/0.55)] ring-1 ring-white/70 backdrop-blur-md',
        className,
      )}
    >
      {/* yarn ball in a slowly turning gradient ring */}
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className={cn('absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--primary),var(--secondary),var(--sage),var(--primary))]', !reduce && 'animate-[spin_6s_linear_infinite]')}
        />
        <span aria-hidden className="absolute inset-[3px] rounded-full bg-card" />
        <motion.span
          className="relative h-8 w-8"
          animate={reduce ? undefined : { rotate: [0, -14, 10, 0], y: [0, -1.5, 0.5, 0] }}
          transition={{ duration: CYCLE, repeat: Infinity, ease: 'easeInOut' }}
        >
          <YarnBall color="#6d4aff" selected className="h-full w-full" />
        </motion.span>
      </span>

      <span className="flex flex-col leading-none">
        <span className="font-serif text-[15px] italic text-foreground">Handmade in India</span>
        {/* chain stitch being crocheted */}
        <svg viewBox="0 0 112 14" className="mt-1.5 h-3.5 w-28 overflow-visible" aria-hidden>
          {Array.from({ length: LOOPS }).map((_, i) => {
            const start = 0.05 + i * 0.07
            const end = start + 0.1
            return (
              <motion.ellipse
                key={i}
                cx={8 + i * 16}
                cy={7}
                rx={8.5}
                ry={4.6}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={1.6}
                strokeLinecap="round"
                initial={false}
                animate={
                  reduce
                    ? { pathLength: 1, opacity: 1 }
                    : { pathLength: [0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 0] }
                }
                transition={reduce ? undefined : { duration: CYCLE, times: [0, start, end, 0.86, 1], repeat: Infinity, ease: 'easeOut' }}
              />
            )
          })}
          {/* the hook's working thread trailing off the last loop */}
          <motion.path
            d="M112 7 q 6 -6 10 0"
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={1.6}
            strokeLinecap="round"
            animate={reduce ? undefined : { opacity: [0, 0, 1, 1, 0] }}
            transition={{ duration: CYCLE, times: [0, 0.55, 0.62, 0.86, 1], repeat: Infinity }}
          />
        </svg>
      </span>
    </div>
  )
}
