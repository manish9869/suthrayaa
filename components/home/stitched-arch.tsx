'use client'

import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * A running stitch sewn around the inside edge of the hero arch. A peach "needle" leads the
 * thread from the bottom-centre, up and over the arch and back down, taking exactly
 * `duration` seconds — so it doubles as the slide timer. `complete` renders it fully sewn
 * (paused slideshow / reduced motion).
 *
 * Geometry matches `.arch` on a 4:5 box: a semicircular top (radius = half the width) and
 * 1.75rem-ish bottom corners, inset 7 units so the stitches sit just inside the edge.
 */
const W = 400
const H = 500
const I = 9 // inset
const R = W / 2 - I
const C = 22 // bottom corner radius
const ARCH = [
  `M ${W / 2} ${H - I}`,
  `H ${I + C}`,
  `Q ${I} ${H - I} ${I} ${H - I - C}`,
  `V ${W / 2}`,
  `A ${R} ${R} 0 0 1 ${W - I} ${W / 2}`,
  `V ${H - I - C}`,
  `Q ${W - I} ${H - I} ${W - I - C} ${H - I}`,
  `H ${W / 2}`,
].join(' ')

export function StitchedArch({ duration, complete = false, className }: { duration: number; complete?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '')
  const mask = `stitch-mask-${id}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('overflow-visible', className)} aria-hidden>
      <defs>
        {/* the mask is a solid stroke that "sews" along the path; the dashes show only where it has passed */}
        <mask id={mask} maskUnits="userSpaceOnUse" x="-20" y="-20" width={W + 40} height={H + 40}>
          <motion.path
            d={ARCH}
            fill="none"
            stroke="white"
            strokeWidth="14"
            initial={{ pathLength: complete ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: complete ? 0 : duration, ease: 'linear' }}
          />
        </mask>
      </defs>

      {/* faint guide line the stitches follow */}
      <path d={ARCH} fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1" />

      {/* the running stitch: cream dashes with a soft shadow so they read on any photo */}
      <g mask={`url(#${mask})`}>
        <path d={ARCH} fill="none" stroke="rgb(28 22 66 / 0.25)" strokeWidth="3.4" strokeDasharray="11 7" strokeLinecap="round" transform="translate(0 1)" />
        <path d={ARCH} fill="none" stroke="#fffaf3" strokeWidth="2.6" strokeDasharray="11 7" strokeLinecap="round" />
      </g>

      {/* the needle leading the thread */}
      {!complete && (
        <g>
          <circle r="9" fill="var(--secondary)" opacity="0.28">
            <animateMotion dur={`${duration}s`} path={ARCH} fill="freeze" calcMode="linear" />
          </circle>
          <circle r="4.2" fill="var(--secondary)" stroke="white" strokeWidth="1.6">
            <animateMotion dur={`${duration}s`} path={ARCH} fill="freeze" calcMode="linear" />
          </circle>
        </g>
      )}
    </svg>
  )
}
