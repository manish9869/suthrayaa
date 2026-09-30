'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

/**
 * Small crochet-themed effects that make the shop feel hand-made: a ball of yarn, the header's
 * yarn thread that unwinds as you scroll, and a ball of yarn that flies into the cart.
 * Everything is transform/opacity-driven and honours reduced motion.
 */

/** A ball of yarn (inherits the text colour). */
export function YarnBallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <g fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="1.3" strokeLinecap="round">
        <path d="M4.5 7.2c4.2 1.2 8.1 5.4 9.6 14.3" />
        <path d="M8.2 3.1c3.6 2.6 8 7.4 8.7 17" />
        <path d="M2.3 12.9c5.1-.7 12.6.3 18.9-5.2" />
        <path d="M4.9 18.7c4.6-3.1 10.3-5.2 16.8-5" />
      </g>
    </svg>
  )
}

/**
 * The header's bottom edge as a plied yarn thread that fills with the page's scroll progress,
 * a ball of yarn rolling along at its tip. Hidden at the top of the page (and on short pages).
 */
export function YarnProgress() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 })
  const x = useTransform(progress, (v) => `${(v - 1) * 100}%`)
  const rotate = useTransform(progress, (v) => v * 1080)
  const opacity = useTransform(scrollYProgress, [0, 0.015], [0, 1])
  return (
    <motion.div aria-hidden style={{ opacity }} className="pointer-events-none absolute inset-x-0 -bottom-px h-[3px] overflow-x-clip">
      <motion.div style={{ scaleX: progress }} className="yarn-thread absolute inset-0 origin-left rounded-full" />
      <motion.div style={{ x }} className="absolute inset-0">
        <motion.span style={{ rotate }} className="absolute -right-[7px] top-1/2 -mt-[7px] block h-3.5 w-3.5 text-primary drop-shadow-sm">
          <YarnBallIcon className="h-3.5 w-3.5" />
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

interface Flight {
  id: number
  from: { x: number; y: number }
  to: { x: number; y: number }
}

/**
 * When something is added to the cart, a ball of yarn arcs from where the shopper tapped into
 * the cart icon, then `onLand` runs (the icon's wobble). Only reacts to a count change that
 * follows a real tap/key press — never to a saved cart loading in.
 */
export function CartFlight({ count, targetRef, onLand }: { count: number; targetRef: RefObject<HTMLElement | null>; onLand: () => void }) {
  const reduce = useReducedMotion()
  const lastInput = useRef<{ x: number; y: number; t: number } | null>(null)
  const prev = useRef<number | null>(null)
  const [flights, setFlights] = useState<Flight[]>([])
  const land = useRef(onLand)
  land.current = onLand

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      lastInput.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const onKey = () => {
      lastInput.current = { x: Number.NaN, y: Number.NaN, t: performance.now() }
    }
    window.addEventListener('pointerdown', onPointer, { capture: true, passive: true })
    window.addEventListener('keydown', onKey, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', onPointer, { capture: true })
      window.removeEventListener('keydown', onKey, { capture: true })
    }
  }, [])

  useEffect(() => {
    const before = prev.current
    prev.current = count
    if (before === null || count <= before) return
    const input = lastInput.current
    if (!input || performance.now() - input.t > 2500) return // a saved cart loading in, not a tap
    const el = targetRef.current
    if (reduce || !el || Number.isNaN(input.x)) {
      land.current()
      return
    }
    const r = el.getBoundingClientRect()
    setFlights((f) => [...f, { id: performance.now(), from: { x: input.x, y: input.y }, to: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }])
  }, [count, reduce, targetRef])

  if (!flights.length) return null
  return createPortal(
    flights.map((f) => (
      <motion.div
        key={f.id}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] -ml-3 -mt-3 h-6 w-6 text-primary drop-shadow-md"
        initial={{ x: f.from.x, y: f.from.y, scale: 0.5, opacity: 0 }}
        animate={{
          x: [f.from.x, (f.from.x + f.to.x) / 2, f.to.x],
          y: [f.from.y, Math.min(f.from.y, f.to.y) - 90, f.to.y],
          scale: [0.5, 1.15, 0.4],
          opacity: [0, 1, 1],
          rotate: [0, 320, 560],
        }}
        transition={{ duration: 0.75, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
        onAnimationComplete={() => {
          setFlights((l) => l.filter((x) => x.id !== f.id))
          land.current()
        }}
      >
        <YarnBallIcon className="h-6 w-6" />
      </motion.div>
    )),
    document.body
  )
}
