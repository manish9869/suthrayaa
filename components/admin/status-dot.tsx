import { cn } from '@/lib/utils'

export type DotTone = 'mint' | 'gold' | 'destructive' | 'primary' | 'violet' | 'muted'

export const DOT_CLASSES: Record<DotTone, string> = {
  mint: 'bg-mint',
  gold: 'bg-gold',
  destructive: 'bg-destructive',
  primary: 'bg-primary',
  violet: 'bg-violet',
  muted: 'bg-muted-foreground',
}

/** Soft pastel pill backgrounds + readable text per tone, used by StatusDot. */
export const PILL_CLASSES: Record<DotTone, string> = {
  mint: 'bg-mint/12 text-mint ring-mint/20',
  gold: 'bg-gold/15 text-[color-mix(in_oklab,var(--gold)_70%,var(--foreground))] ring-gold/25',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
  primary: 'bg-primary/10 text-primary ring-primary/20',
  violet: 'bg-violet/12 text-violet ring-violet/20',
  muted: 'bg-muted text-muted-foreground ring-border',
}

/** A status label rendered as a small pastel pill with a leading dot. */
export function StatusDot({ label, tone, className }: { label: string; tone: DotTone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        PILL_CLASSES[tone],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', DOT_CLASSES[tone])} />
      {label}
    </span>
  )
}
