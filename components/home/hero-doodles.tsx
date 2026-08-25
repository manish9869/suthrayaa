'use client'

import { useEffect, useRef } from 'react'
import {
  CircleDot,
  Flower2,
  Scissors,
  Heart,
  Sparkles,
  Star,
  Clover,
  WandSparkles,
  Ribbon,
  Gift,
  PawPrint,
  Cat,
  Rainbow,
  Feather,
  Sun,
  Moon,
  Snowflake,
  Palette,
  Flower,
  Gem,
} from 'lucide-react'

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

// A second, larger layer of purely-ambient doodles (no mouse interaction, just a slow
// autonomous drift) — colorful and varied so the hero background feels alive without
// competing with the repel-interactive set above. Kept inside a left/right "frame" (roughly
// the outer 0-16% and 84-100% of the width) rather than scattered across the middle, since
// the hero's text is centered and full-height — anything placed in the middle band would
// drift straight through it. Color is set explicitly per icon so the mix reads as genuinely
// colorful rather than one tinted hue repeated. --dx/--dy set each icon's drift distance
// (see the `doodle-drift` keyframe in globals.css) — varied per icon for an organic,
// zero-gravity feel rather than everything bobbing in lockstep.
const AMBIENT_DOODLES = [
  { id: 'ribbon', Icon: Ribbon, top: '8%', left: '5%', color: '#c1502e', size: 26, duration: 22, delay: -2, rotate: -10, dx: 170, dy: 120 },
  { id: 'paw', Icon: PawPrint, top: '24%', left: '10%', color: '#7c9473', size: 22, duration: 26, delay: -9, rotate: 16, dx: 130, dy: 190 },
  { id: 'snowflake', Icon: Snowflake, top: '41%', left: '4%', color: '#e8b4a0', size: 20, duration: 20, delay: -14, rotate: 0, dx: 160, dy: 110 },
  { id: 'cat', Icon: Cat, top: '58%', left: '9%', color: '#d8a13b', size: 26, duration: 28, delay: -4, rotate: -6, dx: 115, dy: 165 },
  { id: 'flower', Icon: Flower, top: '75%', left: '4%', color: '#c1502e', size: 22, duration: 24, delay: -18, rotate: -8, dx: 165, dy: 130 },
  { id: 'moon', Icon: Moon, top: '90%', left: '11%', color: '#7c9473', size: 20, duration: 22, delay: -7, rotate: -15, dx: 135, dy: 95 },
  { id: 'gift', Icon: Gift, top: '10%', left: '92%', color: '#d8a13b', size: 24, duration: 26, delay: -6, rotate: 8, dx: 150, dy: 120 },
  { id: 'rainbow', Icon: Rainbow, top: '27%', left: '87%', color: '#a9c9a0', size: 30, duration: 20, delay: -11, rotate: 0, dx: 120, dy: 175 },
  { id: 'feather', Icon: Feather, top: '43%', left: '94%', color: '#c1502e', size: 24, duration: 28, delay: -3, rotate: 22, dx: 170, dy: 115 },
  { id: 'sun', Icon: Sun, top: '60%', left: '89%', color: '#e8b4a0', size: 22, duration: 24, delay: -16, rotate: 0, dx: 130, dy: 150 },
  { id: 'gem', Icon: Gem, top: '77%', left: '95%', color: '#d8a13b', size: 20, duration: 18, delay: -1, rotate: 18, dx: 155, dy: 105 },
  { id: 'palette', Icon: Palette, top: '92%', left: '88%', color: '#a9c9a0', size: 24, duration: 26, delay: -8, rotate: 12, dx: 115, dy: 180 },
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
      // z-[2] deliberately sits BELOW the active slide content (z-10 in hero-section.tsx) —
      // this is a decorative background layer, so it must never paint on top of the heading
      // or buttons. It was previously z-20 (above the content), which is what caused the
      // doodles to visibly overlap the centered hero text.
      className="pointer-events-none absolute inset-0 z-[2] hidden overflow-hidden md:block"
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

      {AMBIENT_DOODLES.map((d) => (
        <div
          key={d.id}
          className="hero-doodle-ambient"
          style={{
            top: d.top,
            left: d.left,
            color: d.color,
            width: d.size,
            height: d.size,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
            ['--doodle-rotate' as string]: `${d.rotate}deg`,
            ['--dx' as string]: `${d.dx}px`,
            ['--dy' as string]: `${d.dy}px`,
          }}
        >
          <d.Icon style={{ width: '100%', height: '100%' }} strokeWidth={1.4} />
        </div>
      ))}
    </div>
  )
}
