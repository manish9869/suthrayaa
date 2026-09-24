'use client'

import * as React from 'react'
import { useId } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'

export type StatTone = 'primary' | 'mint' | 'gold' | 'violet' | 'destructive' | 'accent'

/** Per-tone classes plus the raw CSS color (for SVG sparklines). `accent` maps to teal —
 * the theme's `--accent` token is a neutral hover surface, not a hue. */
const TONE: Record<StatTone, { bar: string; chipBg: string; chipFg: string; color: string }> = {
  primary: { bar: 'bg-primary', chipBg: 'bg-primary/10', chipFg: 'text-primary', color: 'var(--primary)' },
  mint: { bar: 'bg-mint', chipBg: 'bg-mint/10', chipFg: 'text-mint', color: 'var(--mint)' },
  gold: { bar: 'bg-gold', chipBg: 'bg-gold/15', chipFg: 'text-gold', color: 'var(--gold)' },
  violet: { bar: 'bg-violet', chipBg: 'bg-violet/10', chipFg: 'text-violet', color: 'var(--violet)' },
  destructive: { bar: 'bg-destructive', chipBg: 'bg-destructive/10', chipFg: 'text-destructive', color: 'var(--destructive)' },
  accent: { bar: 'bg-teal', chipBg: 'bg-teal/10', chipFg: 'text-teal', color: 'var(--teal)' },
}

export function toneColor(tone: StatTone) {
  return TONE[tone].color
}

/** Small smoothed line + soft fill, drawn from an array of values. Pure SVG (no chart lib) so
 * a row of KPI cards stays cheap to render. */
export function Sparkline({ data, color, className }: { data: number[]; color: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  // Long daily series read as noise at sparkline size — average into ~12 buckets first
  if (data.length > 16) {
    const size = Math.ceil(data.length / 12)
    const buckets: number[] = []
    for (let i = 0; i < data.length; i += size) {
      const chunk = data.slice(i, i + size)
      buckets.push(chunk.reduce((s, v) => s + v, 0) / chunk.length)
    }
    data = buckets
  }
  if (data.length < 2) return null
  const w = 120
  const h = 40
  const pad = 3
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - pad - ((v - min) / span) * (h - pad * 2)] as const)
  // Catmull-Rom → cubic Bézier for a smooth curve through every point
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#spark-${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="var(--card)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function ChangeBadge({ change, suffix, className }: { change: number; suffix?: string; className?: string }) {
  const up = change >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        up ? 'bg-mint/10 text-mint' : 'bg-destructive/10 text-destructive',
        className
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%{suffix && <span className="ml-0.5 font-medium text-muted-foreground">{suffix}</span>}
    </span>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  tone = 'primary',
  change,
  changeLabel,
  trend,
  className,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  tone?: StatTone
  change?: number | null
  /** Shown after the change %, e.g. "vs prev." */
  changeLabel?: string
  /** Optional series drawn as a sparkline in the card's corner. */
  trend?: number[]
  className?: string
}) {
  const t = TONE[tone]
  return (
    <Card className={cn('group relative overflow-hidden py-0 transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.chipBg)}>
            <Icon className={cn('h-[18px] w-[18px]', t.chipFg)} />
          </span>
          {trend && trend.length > 1 ? (
            <Sparkline data={trend} color={t.color} className="h-10 w-24 sm:w-28" />
          ) : change != null ? (
            <ChangeBadge change={change} />
          ) : null}
        </div>
        <p className="mt-4 text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-2xl font-semibold leading-tight tracking-tight tabular-nums">{value}</p>
          {trend && trend.length > 1 && change != null && <ChangeBadge change={change} suffix={changeLabel} />}
        </div>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export function SectionLabel({ tone = 'primary', children }: { tone?: StatTone; children: React.ReactNode }) {
  const t = TONE[tone]
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={cn('h-3.5 w-1 rounded-full', t.bar)} />
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{children}</h2>
    </div>
  )
}
