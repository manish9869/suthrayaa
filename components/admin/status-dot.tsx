import { cn } from '@/lib/utils'

export type DotTone = 'mint' | 'gold' | 'destructive' | 'primary' | 'violet' | 'muted'

const DOT_CLASSES: Record<DotTone, string> = {
  mint: 'bg-mint',
  gold: 'bg-gold',
  destructive: 'bg-destructive',
  primary: 'bg-primary',
  violet: 'bg-violet',
  muted: 'bg-muted-foreground',
}

export function StatusDot({ label, tone, className }: { label: string; tone: DotTone; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium capitalize', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', DOT_CLASSES[tone])} />
      {label}
    </span>
  )
}
