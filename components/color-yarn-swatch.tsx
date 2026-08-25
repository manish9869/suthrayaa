import { cn } from '@/lib/utils'

/** Perceived brightness (YIQ), 0-255 — used to pick a black or white icon overlay so it
 * stays legible against any color, not just a hardcoded list of "known light" hexes. */
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length !== 6) return false
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return false
  return (r * 299 + g * 587 + b * 114) / 1000 > 175
}

/**
 * A solid circle in the given color (always bold and unambiguous, unlike a pure line-art
 * mask which nearly disappears for near-white/near-cream colors) with /public/yarn.png — a
 * transparent yarn-ball icon — overlaid in black or white depending on the color's lightness,
 * so the swatch reads as "a ball of this yarn" rather than a flat dot.
 */
export function ColorYarnSwatch({ color, className }: { color: string; className?: string }) {
  const overlay = isLightColor(color) ? 'rgba(20,16,12,0.55)' : 'rgba(255,255,255,0.92)'
  return (
    <span className={cn('relative block h-full w-full overflow-hidden rounded-full', className)} style={{ backgroundColor: color }}>
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundColor: overlay,
          WebkitMaskImage: 'url(/yarn.png)',
          maskImage: 'url(/yarn.png)',
          WebkitMaskSize: '80%',
          maskSize: '80%',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    </span>
  )
}
