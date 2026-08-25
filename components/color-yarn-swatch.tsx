import { cn } from '@/lib/utils'

/**
 * Renders /public/yarn.png (a transparent-background yarn-ball line icon) tinted with the
 * given color via CSS mask, so a color swatch reads as "a ball of this yarn" rather than a
 * flat circle. Sits on a neutral backing (set by the parent button) for contrast against any
 * page background, including near-white/near-transparent color choices.
 */
export function ColorYarnSwatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('block h-full w-full', className)}
      style={{
        backgroundColor: color,
        WebkitMaskImage: 'url(/yarn.png)',
        maskImage: 'url(/yarn.png)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}
