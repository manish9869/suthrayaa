import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'

export type StatTone = 'primary' | 'mint' | 'gold' | 'violet' | 'destructive' | 'accent'

const TONE_CLASSES: Record<StatTone, { bar: string; chipBg: string; chipFg: string }> = {
  primary: { bar: 'bg-primary', chipBg: 'bg-primary/15', chipFg: 'text-primary' },
  mint: { bar: 'bg-mint', chipBg: 'bg-mint/15', chipFg: 'text-mint' },
  gold: { bar: 'bg-gold', chipBg: 'bg-gold/15', chipFg: 'text-gold' },
  violet: { bar: 'bg-violet', chipBg: 'bg-violet/15', chipFg: 'text-violet' },
  destructive: { bar: 'bg-destructive', chipBg: 'bg-destructive/15', chipFg: 'text-destructive' },
  accent: { bar: 'bg-accent', chipBg: 'bg-accent/15', chipFg: 'text-accent' },
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  tone = 'primary',
  change,
  className,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  tone?: StatTone
  change?: number | null
  className?: string
}) {
  const t = TONE_CLASSES[tone]
  return (
    <Card className={cn('relative overflow-hidden py-0', className)}>
      <span className={cn('absolute inset-y-0 left-0 w-1', t.bar)} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between mb-2">
          <span className={cn('flex items-center justify-center h-8 w-8 rounded-lg', t.chipBg)}>
            <Icon className={cn('h-4 w-4', t.chipFg)} />
          </span>
          {change != null && (
            <span className={cn('text-xs flex items-center gap-0.5 font-medium', change >= 0 ? 'text-mint' : 'text-destructive')}>
              {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(0)}%
            </span>
          )}
        </div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export function SectionLabel({ tone = 'primary', children }: { tone?: StatTone; children: React.ReactNode }) {
  const t = TONE_CLASSES[tone]
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={cn('h-3.5 w-1 rounded-full', t.bar)} />
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{children}</h2>
    </div>
  )
}
