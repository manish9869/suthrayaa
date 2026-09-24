'use client'

import { useId } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE_OUT } from '@/components/motion/reveal'

/* ---------- colour helpers ---------- */

function parseHex(hex: string): [number, number, number] | null {
  let c = hex.trim().replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (!/^[0-9a-f]{6}$/i.test(c)) return null
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
}

/** Mix toward white (amt > 0) or black (amt < 0). */
function shade(hex: string, amt: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const t = amt > 0 ? 255 : 0
  const a = Math.abs(amt)
  return `rgb(${rgb.map((v) => Math.round(v + (t - v) * a)).join(' ')})`
}

/** Yarn-shop names for common crochet shades; the nearest one names any hex. */
const YARN_NAMES: [string, string][] = [
  ['#ffffff', 'Snow white'], ['#fffdf0', 'Ivory'], ['#f5f0e1', 'Cream'], ['#e8dcc4', 'Oatmeal'],
  ['#c8b8a0', 'Sand'], ['#a0785a', 'Caramel'], ['#6f4e37', 'Coffee'], ['#3e2a1e', 'Chocolate'],
  ['#000000', 'Midnight black'], ['#808080', 'Pebble grey'], ['#c0c0c0', 'Silver'],
  ['#ff0000', 'Hibiscus red'], ['#c41e3a', 'Cherry'], ['#800020', 'Maroon'], ['#ff6f61', 'Coral'],
  ['#ff7f50', 'Peach coral'], ['#ffa500', 'Marigold'], ['#ff8c00', 'Saffron'], ['#ffd700', 'Sunflower'],
  ['#ffff00', 'Lemon'], ['#fff5b0', 'Butter'], ['#ffe4e1', 'Blush'], ['#ffc0cb', 'Rose pink'],
  ['#ff69b4', 'Candy pink'], ['#ff1493', 'Fuchsia'], ['#e6e6fa', 'Lavender'], ['#b19cd9', 'Lilac'],
  ['#800080', 'Plum'], ['#6d4aff', 'Violet'], ['#000080', 'Navy'], ['#0000ff', 'Royal blue'],
  ['#1e90ff', 'Peacock blue'], ['#87ceeb', 'Sky blue'], ['#add8e6', 'Baby blue'], ['#008080', 'Teal'],
  ['#40e0d0', 'Turquoise'], ['#98ff98', 'Mint'], ['#90ee90', 'Pistachio'], ['#008000', 'Leaf green'],
  ['#006400', 'Forest green'], ['#808000', 'Olive'], ['#b2ac88', 'Sage'],
]

export function yarnName(hex: string): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  let best = YARN_NAMES[0][1]
  let bestD = Infinity
  for (const [h, name] of YARN_NAMES) {
    const [r, g, b] = parseHex(h)!
    // weighted RGB distance — close enough to human perception for naming
    const d = 2 * (r - rgb[0]) ** 2 + 4 * (g - rgb[1]) ** 2 + 3 * (b - rgb[2]) ** 2
    if (d < bestD) {
      bestD = d
      best = name
    }
  }
  return best
}

/* ---------- the yarn ball ---------- */

/** An SVG ball of yarn in `color`: shaded sphere, wound strands and a loose tail that
 * unspools when selected. */
export function YarnBall({ color, selected = false, className }: { color: string; selected?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const dark = shade(color, -0.32)
  const light = shade(color, 0.45)
  return (
    <svg viewBox="0 0 64 64" className={cn('overflow-visible', className)} aria-hidden>
      <defs>
        <radialGradient id={`g${id}`} cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor={light} />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <circle cx="30" cy="30" r="24" />
        </clipPath>
      </defs>
      {/* loose tail thread — unspools when picked */}
      <motion.path
        d="M44 48 C52 56, 60 50, 58 58 S 46 64, 40 62"
        fill="none"
        stroke={dark}
        strokeWidth="2.2"
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: selected ? 1 : 0.28 }}
        transition={{ duration: reduce ? 0 : 0.7, ease: EASE_OUT }}
      />
      <circle cx="30" cy="30" r="24" fill={`url(#g${id})`} />
      <g clipPath={`url(#c${id})`} fill="none" strokeLinecap="round">
        {/* wound strands, one direction */}
        {[-14, -7, 0, 7, 14].map((o) => (
          <ellipse key={`a${o}`} cx={30 + o * 0.3} cy={30} rx={26} ry={9 + Math.abs(o) * 0.4} transform={`rotate(${-35 + o} 30 30)`} stroke={dark} strokeOpacity="0.6" strokeWidth="1.8" />
        ))}
        {/* crossing strands, lighter */}
        {[-10, -3, 4, 11].map((o) => (
          <ellipse key={`b${o}`} cx={30} cy={30 + o * 0.3} rx={24} ry={7 + Math.abs(o) * 0.5} transform={`rotate(${50 + o} 30 30)`} stroke={light} strokeOpacity="0.7" strokeWidth="1.5" />
        ))}
        {/* soft rim shadow */}
        <circle cx="30" cy="30" r="24" stroke={dark} strokeOpacity="0.35" strokeWidth="3" />
      </g>
      {/* glossy highlight */}
      <ellipse cx="22" cy="19" rx="6" ry="3.5" transform="rotate(-30 22 19)" fill="white" opacity="0.35" />
    </svg>
  )
}

/* ---------- picker ---------- */

export interface YarnOption {
  value: string
  /** hex colour of the yarn */
  color: string
  /** display name; defaults to the nearest yarn-shop name */
  label?: string
  disabled?: boolean
}

export function YarnColorPicker({
  options,
  value,
  onChange,
  title = 'Yarn colour',
  note,
  size = 'md',
}: {
  options: YarnOption[]
  value?: string
  onChange: (value: string) => void
  title?: string
  note?: React.ReactNode
  size?: 'sm' | 'md'
}) {
  const reduce = useReducedMotion()
  const groupId = useId().replace(/:/g, '')
  const active = options.find((o) => o.value === value)
  const activeName = active ? (active.label ?? yarnName(active.color)) : undefined
  const ball = size === 'sm' ? 'h-11 w-11' : 'h-14 w-14'

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2 text-sm">
        <span className="font-medium">{title}:</span>
        <span className="relative inline-flex h-5 min-w-[6rem] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={activeName ?? 'none'}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="font-serif italic text-primary"
            >
              {activeName ?? 'Pick a shade'}
            </motion.span>
          </AnimatePresence>
        </span>
        {note}
      </div>

      {/* the "yarn basket": balls sit on a soft shelf with a thread running through */}
      <div className="relative rounded-[22px] bg-[linear-gradient(180deg,var(--accent),var(--blush))] px-3 pb-3 pt-4">
        <svg className="pointer-events-none absolute inset-x-3 bottom-[18px] h-3 w-[calc(100%-1.5rem)]" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
          <path d="M0 6 Q 25 0 50 6 T 100 6 T 150 6 T 200 6 T 250 6 T 300 6" fill="none" stroke={active?.color ?? 'var(--border)'} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 5" />
        </svg>
        <div role="radiogroup" aria-label={title} className="relative flex flex-wrap gap-x-3 gap-y-2">
          {options.map((o) => {
            const selected = o.value === value
            const name = o.label ?? yarnName(o.color)
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={name}
                title={name}
                disabled={o.disabled}
                onClick={() => !o.disabled && onChange(o.value)}
                className={cn(
                  'group relative flex flex-col items-center rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  o.disabled && 'cursor-not-allowed opacity-30 grayscale',
                )}
              >
                <span className={cn('relative block', ball)}>
                  {/* stitched ring: one per picker, glides between balls via shared layout */}
                  {selected && (
                    <motion.span
                      layoutId={`yarn-ring-${groupId}`}
                      aria-hidden
                      className="absolute -inset-[7px]"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                    >
                      <svg viewBox="0 0 100 100" className={cn('h-full w-full', !reduce && 'animate-[spin_14s_linear_infinite]')}>
                        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeOpacity="0.14" strokeWidth="7" />
                        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeDasharray="7 5.5" strokeLinecap="round" />
                      </svg>
                    </motion.span>
                  )}
                  <motion.span
                    key={selected ? 'on' : 'off'}
                    className="relative block h-full w-full"
                    initial={false}
                    animate={selected && !reduce ? { scale: [1, 0.88, 1.06, 1] } : { scale: 1 }}
                    whileHover={reduce || o.disabled || selected ? undefined : { y: -3 }}
                    whileTap={reduce || o.disabled ? undefined : { scale: 0.94 }}
                    transition={selected ? { duration: 0.5, times: [0, 0.25, 0.65, 1], ease: EASE_OUT } : { duration: 0.2, ease: EASE_OUT }}
                  >
                    <YarnBall color={o.color} selected={selected} className="h-full w-full" />
                  </motion.span>
                </span>
                {/* contact shadow — shrinks as the ball lifts */}
                <motion.span
                  aria-hidden
                  className="mt-0.5 block h-1.5 w-8 rounded-[50%] bg-[rgb(49_32_140/0.22)] blur-[2px]"
                  initial={false}
                  animate={{ opacity: selected ? 0.9 : 0.6 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
