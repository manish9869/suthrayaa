'use client'

import { useEffect, useRef } from 'react'
import { CircleDot, Flower2, Scissors, Heart, Sparkles, Star, Clover, WandSparkles } from 'lucide-react'

const DOODLES = [
  { id: 'one', Icon: CircleDot, className: 'hero-doodle-one', rotate: -12 },
  { id: 'two', Icon: Flower2, className: 'hero-doodle-two', rotate: 18 },
  { id: 'three', Icon: Scissors, className: 'hero-doodle-three', rotate: 25 },
  { id: 'four', Icon: Heart, className: 'hero-doodle-four', rotate: 0 },
  { id: 'five', Icon: Sparkles, className: 'hero-doodle-five', rotate: 0 },
  { id: 'six', Icon: Star, className: 'hero-doodle-six', rotate: -18 },
  { id: 'seven', Icon: Clover, className: 'hero-doodle-seven', rotate: 10 },
  { id: 'eight', Icon: WandSparkles, className: 'hero-doodle-eight', rotate: 22 },
  { id: 'nine', Icon: CircleDot, className: 'hero-doodle-nine', rotate: 0 },
]

// A gentle push, not a dramatic scatter — per spec, "not much but few" pixels of repel.
const REPEL_RADIUS = 130
const MAX_OFFSET = 22

export function HeroDoodles() {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const restPositions = useRef<{ x: number; y: number }[]>([])
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    // Rest positions are measured once (and on resize) rather than every frame — reading
    // getBoundingClientRect() while our own transform is applied would feed the previous
    // frame's offset back into the next frame's distance calculation.
    const measure = () => {
      const containerRect = container.getBoundingClientRect()
      restPositions.current = nodeRefs.current.map((node) => {
        if (!node) return { x: 0, y: 0 }
        const prevTransform = node.style.transform
        node.style.transform = `rotate(${DOODLES[nodeRefs.current.indexOf(node)]?.rotate ?? 0}deg)`
        const rect = node.getBoundingClientRect()
        node.style.transform = prevTransform
        return {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
        }
      })
    }
    measure()

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleLeave = () => {
      pointerRef.current = null
    }

    container.addEventListener('mousemove', handleMove)
    container.addEventListener('mouseleave', handleLeave)
    window.addEventListener('resize', measure)

    const tick = () => {
      const pointer = pointerRef.current
      nodeRefs.current.forEach((node, i) => {
        if (!node) return
        const baseRotate = DOODLES[i].rotate
        const rest = restPositions.current[i]

        if (!pointer || !rest) {
          node.style.transform = `rotate(${baseRotate}deg)`
          return
        }

        const dx = rest.x - pointer.x
        const dy = rest.y - pointer.y
        const dist = Math.hypot(dx, dy)

        if (dist < REPEL_RADIUS && dist > 0.01) {
          const strength = (1 - dist / REPEL_RADIUS) * MAX_OFFSET
          const ox = (dx / dist) * strength
          const oy = (dy / dist) * strength
          node.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${baseRotate}deg)`
        } else {
          node.style.transform = `rotate(${baseRotate}deg)`
        }
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      container.removeEventListener('mousemove', handleMove)
      container.removeEventListener('mouseleave', handleLeave)
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20 hidden overflow-hidden md:block"
      aria-hidden="true"
    >
      {DOODLES.map((d, i) => (
        <div
          key={d.id}
          ref={(el) => {
            nodeRefs.current[i] = el
          }}
          className={`hero-doodle ${d.className}`}
          style={{ transform: `rotate(${d.rotate}deg)` }}
        >
          <d.Icon />
        </div>
      ))}
      <div className="hero-thread" />
    </div>
  )
}
