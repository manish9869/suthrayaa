'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { STOREFRONT_IMAGES } from '@/lib/storefront-images'

const SESSION_KEY = 'suthrayaa-intro-seen'
const EASE = [0.23, 1, 0.32, 1] as const

/**
 * A short brand intro, shown once per browser session on the homepage: the logo settles in
 * while a yarn thread stitches a circle around it, then the curtain lifts. ~1.4s, skippable
 * with a click, and never shown to visitors who prefer reduced motion.
 */
export function LogoIntro() {
  const reduce = useReducedMotion()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (reduce) return
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      return
    }
    setShow(true)
  }, [reduce])

  // Hide on its own timer so a re-run of the effect above can never leave the intro stuck
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => setShow(false), 1500)
    return () => clearTimeout(t)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-background"
          onClick={() => setShow(false)}
          exit={{ y: '-100%', transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } }}
          aria-hidden
        >
          <div className="relative h-64 w-64">
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
              <motion.circle
                cx="100"
                cy="100"
                r="92"
                fill="none"
                stroke="var(--rose)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: EASE }}
              />
              <motion.circle
                cx="100"
                cy="100"
                r="84"
                fill="none"
                stroke="var(--forest)"
                strokeOpacity="0.5"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: 0.1, ease: EASE }}
              />
            </svg>
            <motion.div
              className="absolute left-1/2 top-1/2 aspect-[688/363] w-[150%] -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <Image src={STOREFRONT_IMAGES.logo} alt="" fill priority sizes="400px" className="object-contain" />
            </motion.div>
          </div>
          <motion.p
            className="absolute bottom-[18%] text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
          >
            Telling stories through yarn
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
