'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

/** Strong ease-out (Emil Kowalski's go-to): fast start, soft landing — reads as responsive. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  /** Distance travelled upward, in px. Kept small — motion should suggest, not perform. */
  y?: number
  as?: 'div' | 'section' | 'li' | 'span'
}

/** Fades, lifts and un-blurs an element into view once, on scroll. With reduced motion it
 * simply fades (no movement). */
export function Reveal({ children, delay = 0, className, y = 14, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion()
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, filter: 'blur(4px)' }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: reduce ? 0.3 : 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </Comp>
  )
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

/** Parent that staggers its <StaggerItem> children into view (60ms apart). */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-64px' }}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const item: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
    : {
        hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT } },
      }
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  )
}
