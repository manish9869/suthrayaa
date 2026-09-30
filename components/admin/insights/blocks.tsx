'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Area } from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronDown, Download, Info, Lightbulb, Minus, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { exportRowsToCsv, GLASS_PANEL } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'
import type { Block, Format, Kpi, Row, SeriesMetric, Source } from '@/lib/api/insights'

// ---------------------------------------------------------------- formatting

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const int = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const dec = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export function fmt(v: number | string | null | undefined, f: Format = 'number'): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v
  switch (f) {
    case 'money':
      return inr.format(v)
    case 'percent':
      return `${dec.format(Math.round(v * 10) / 10)}%`
    case 'decimal':
      return dec.format(v)
    case 'duration': {
      const s = Math.round(v)
      return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
    }
    case 'ms':
      return v >= 1000 ? `${dec.format(Math.round(v / 100) / 10)} s` : `${int.format(v)} ms`
    case 'text':
      return String(v)
    default:
      return int.format(v)
  }
}

/** Short axis labels: ₹1.2L, 12K. */
function compact(v: number, f: Format) {
  const abs = Math.abs(v)
  const pre = f === 'money' ? '₹' : ''
  if (f === 'percent') return `${Math.round(v)}%`
  if (abs >= 1e7) return `${pre}${+(v / 1e7).toFixed(1)}Cr`
  if (abs >= 1e5) return `${pre}${+(v / 1e5).toFixed(1)}L`
  if (abs >= 1e3) return `${pre}${+(v / 1e3).toFixed(1)}K`
  return `${pre}${int.format(v)}`
}

const SOURCE: Record<Source, { label: string; dot: string }> = {
  store: { label: 'Your shop', dot: 'bg-primary' },
  ga4: { label: 'Google Analytics', dot: 'bg-amber-500' },
  mixed: { label: 'Shop + Google Analytics', dot: 'bg-gradient-to-r from-primary to-amber-500' },
}

export function SourceTag({ source, className }: { source: Source; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10.5px] text-muted-foreground', className)} title={`Data from ${SOURCE[source].label}`}>
      <span className={cn('h-1.5 w-1.5 rounded-full', SOURCE[source].dot)} /> {SOURCE[source].label}
    </span>
  )
}

function Panel({ title, description, source, actions, children, className }: { title?: string; description?: string; source?: Source; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn(GLASS_PANEL, 'break-inside-avoid p-4 sm:p-5', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-3">
            {source && <SourceTag source={source} />}
            {actions}
          </div>
        </div>
      )}
      {children}
    </section>
  )
}

// ---------------------------------------------------------------- KPIs

function Change({ k }: { k: Kpi }) {
  if (k.change === null || k.previous === null) return <span className="text-[11px] text-muted-foreground">no comparison</span>
  const flat = Math.abs(k.change) < 0.5
  const good = flat ? null : (k.change > 0) === (k.goodWhenUp !== false)
  const Icon = flat ? Minus : k.change > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-[11px]">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums',
          good === null ? 'bg-muted text-muted-foreground' : good ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/12 text-rose-700 dark:text-rose-400'
        )}
      >
        <Icon className="h-3 w-3" />
        {Math.abs(k.change) >= 1000 ? '999+' : `${Math.abs(Math.round(k.change * 10) / 10)}`}%
      </span>
      <span className="text-muted-foreground">vs {fmt(k.previous, k.format)}</span>
    </span>
  )
}

export function KpiGrid({ items, title }: { items: Kpi[]; title?: string }) {
  return (
    <div>
      {title && <h3 className="mb-2 text-sm font-semibold">{title}</h3>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {items.map((k) => (
          <div key={k.key} className={cn(GLASS_PANEL, 'flex min-w-0 flex-col gap-1.5 p-3.5 sm:p-4')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-snug text-muted-foreground">{k.label}</p>
              {k.hint && (
                <span title={k.hint} className="shrink-0 cursor-help text-muted-foreground/60 hover:text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <span className="sr-only">{k.hint}</span>
                </span>
              )}
            </div>
            <p className="truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{fmt(k.value, k.format)}</p>
            <Change k={k} />
            <span className={cn('mt-auto h-0.5 w-6 rounded-full', SOURCE[k.source].dot)} title={SOURCE[k.source].label} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- time series

const COLORS = ['var(--primary)', '#f59e0b', '#10b981', '#ec4899']

function ChartTip({ active, payload, metrics }: { active?: boolean; payload?: any[]; metrics: SeriesMetric[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{p.label}</p>
      {metrics.map((m, i) => (
        <p key={m.key} className="mt-1 flex items-center gap-1.5 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
          {m.label}: <strong>{fmt(p[m.key], m.format)}</strong>
          {p[`prev_${m.key}`] !== undefined && (
            <span className="text-muted-foreground">
              {' '}
              · {p.previousLabel}: {fmt(p[`prev_${m.key}`], m.format)}
            </span>
          )}
        </p>
      ))}
    </div>
  )
}

export function SeriesChart({ block }: { block: Extract<Block, { type: 'series' }> }) {
  const [picked, setPicked] = useState<string[]>(() => (block.id === 'revenueVsOrders' ? block.metrics.slice(0, 2) : block.metrics.slice(0, 1)).map((m) => m.key))
  const hasPrev = block.points.some((p) => p.previous)
  const [compare, setCompare] = useState(true)
  const metrics = block.metrics.filter((m) => picked.includes(m.key))
  const data = useMemo(
    () =>
      block.points.map((p) => ({
        label: p.label,
        previousLabel: p.previousLabel,
        ...p.values,
        ...(p.previous ? Object.fromEntries(Object.entries(p.previous).map(([k, v]) => [`prev_${k}`, v])) : {}),
      })),
    [block.points]
  )
  const dual = metrics.length === 2 && metrics[0].format !== metrics[1].format
  const toggle = (key: string) =>
    setPicked((cur) => (cur.includes(key) ? (cur.length > 1 ? cur.filter((k) => k !== key) : cur) : [...cur, key].slice(-2)))
  const empty = block.points.every((p) => Object.values(p.values).every((v) => v === null || v === 0))
  const bar = block.chart === 'bar' && metrics.length === 1

  return (
    <Panel
      title={block.title}
      description={block.description}
      actions={
        hasPrev ? (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch checked={compare} onCheckedChange={setCompare} className="scale-75" /> Compare
          </label>
        ) : undefined
      }
    >
      {block.metrics.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Metrics to show">
          {block.metrics.map((m) => {
            const on = picked.includes(m.key)
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(m.key)}
                className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors', on ? 'border-foreground/20 bg-foreground/5 font-medium' : 'text-muted-foreground hover:text-foreground')}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: on ? COLORS[picked.indexOf(m.key)] : 'var(--border)' }} />
                {m.label}
                <span className={cn('h-1 w-1 rounded-full', SOURCE[m.source].dot)} />
              </button>
            )
          })}
        </div>
      )}
      {empty ? (
        <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 6, right: dual ? 4 : 8, bottom: 0, left: 0 }}>
              <defs>
                {metrics.map((m, i) => (
                  <linearGradient key={m.key} id={`fill-${block.id}-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[i]} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} tickMargin={8} />
              <YAxis yAxisId="a" tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={(v) => compact(Number(v), metrics[0]?.format ?? 'number')} />
              {dual && <YAxis yAxisId="b" orientation="right" tickLine={false} axisLine={false} fontSize={11} width={44} tickFormatter={(v) => compact(Number(v), metrics[1].format)} />}
              <Tooltip content={(props: any) => <ChartTip {...props} metrics={metrics} />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
              {metrics.map((m, i) => {
                const axis = dual && i === 1 ? 'b' : 'a'
                return [
                  compare && hasPrev ? <Line key={`p-${m.key}`} yAxisId={axis} type="monotone" dataKey={`prev_${m.key}`} stroke={COLORS[i]} strokeOpacity={0.45} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} /> : null,
                  bar ? (
                    <Bar key={m.key} yAxisId={axis} dataKey={m.key} fill={COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  ) : metrics.length === 1 ? (
                    <Area key={m.key} yAxisId={axis} type="monotone" dataKey={m.key} stroke={COLORS[i]} strokeWidth={2} fill={`url(#fill-${block.id}-${m.key})`} dot={false} activeDot={{ r: 4 }} />
                  ) : (
                    <Line key={m.key} yAxisId={axis} type="monotone" dataKey={m.key} stroke={COLORS[i]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  ),
                ]
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasPrev && compare && <p className="mt-2 text-[11px] text-muted-foreground">Dashed line: the comparison period.</p>}
    </Panel>
  )
}

// ---------------------------------------------------------------- tables

export function DataTable({ block, filename }: { block: Extract<Block, { type: 'table' }>; filename: string }) {
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null)
  const [q, setQ] = useState('')
  const [all, setAll] = useState(false)
  const first = block.columns[0]?.key
  const rows = useMemo(() => {
    let r = block.rows
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      r = r.filter((row) => block.columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(needle)))
    }
    if (sort) {
      r = [...r].sort((a, b) => {
        const x = a[sort.key]
        const y = b[sort.key]
        if (x === y) return 0
        if (x === null || x === undefined) return 1
        if (y === null || y === undefined) return -1
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
        return sort.desc ? -c : c
      })
    }
    return r
  }, [block.rows, block.columns, q, sort])
  const shown = all ? rows : rows.slice(0, 10)
  const exportCsv = () =>
    exportRowsToCsv(
      `${filename}-${block.id}.csv`,
      block.columns.map((c) => c.label),
      rows.map((r) => block.columns.map((c) => r[c.key] ?? ''))
    )

  return (
    <Panel
      title={block.title}
      description={block.description}
      source={block.source}
      actions={
        block.rows.length > 0 ? (
          <button type="button" onClick={exportCsv} className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground print:hidden" title="Download as CSV">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        ) : undefined
      }
    >
      {block.rows.length > 12 && (
        <div className="relative mb-3 max-w-xs print:hidden">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this table…" className="h-8 pl-8 text-xs" aria-label={`Search ${block.title}`} />
        </div>
      )}
      {block.rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{block.empty ?? 'No data for this period.'}</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                {block.columns.map((c) => {
                  const right = c.align === 'right'
                  const active = sort?.key === c.key
                  return (
                    <th key={c.key} className={cn('whitespace-nowrap py-2 pr-3 font-medium last:pr-0', right && 'text-right')} aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : 'none'}>
                      <button
                        type="button"
                        onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, desc: !s.desc } : { key: c.key, desc: c.key !== first }))}
                        className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
                      >
                        {c.label}
                        <ChevronDown className={cn('h-3 w-3 transition-transform', active ? 'opacity-100' : 'opacity-0', active && !sort!.desc && 'rotate-180')} />
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  {block.columns.map((c, j) => (
                    <td key={c.key} className={cn('py-2 pr-3 last:pr-0', c.align === 'right' && 'text-right tabular-nums', j === 0 && 'max-w-[260px] truncate font-medium')} title={j === 0 ? String(r[c.key] ?? '') : undefined}>
                      <Cell row={r} col={c.key} format={c.format} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 10 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 text-xs font-medium text-primary hover:underline print:hidden">
          {all ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </Panel>
  )
}

function Cell({ row, col, format }: { row: Row; col: string; format?: Format }) {
  const v = row[col]
  if (col === 'status' && typeof v === 'string') {
    return (
      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', v === 'Alert' ? 'bg-rose-500/12 text-rose-700' : v === 'OK' ? 'bg-emerald-500/12 text-emerald-700' : 'bg-muted text-muted-foreground')}>{v}</span>
    )
  }
  if (col === 'change' && typeof v === 'number') {
    return <span className={cn(v > 0 ? 'text-emerald-700' : v < 0 ? 'text-rose-700' : 'text-muted-foreground')}>{`${v > 0 ? '+' : ''}${fmt(v, 'percent')}`}</span>
  }
  return <>{fmt(v, format)}</>
}

// ---------------------------------------------------------------- funnel, breakdown, heatmap

export function Funnel({ block }: { block: Extract<Block, { type: 'funnel' }> }) {
  const top = block.steps[0]?.value || 0
  return (
    <Panel title={block.title} description={block.description} source={block.source}>
      {!top ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <ol className="space-y-2.5">
          {block.steps.map((s, i) => {
            const prevStep = i > 0 ? block.steps[i - 1].value : null
            const stepRate = prevStep ? (s.value / prevStep) * 100 : null
            return (
              <li key={s.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium">
                    {i + 1}. {s.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    <strong className="text-foreground">{fmt(s.value)}</strong> · {fmt((s.value / top) * 100, 'percent')} of visits
                    {s.previous !== undefined && s.previous !== null && <> · before {fmt(s.previous)}</>}
                  </span>
                </div>
                <div className="h-7 overflow-hidden rounded-md bg-muted">
                  <div className="flex h-full items-center rounded-md bg-primary/80 px-2 text-[11px] font-semibold text-primary-foreground transition-[width] duration-700" style={{ width: `${Math.max(2, (s.value / top) * 100)}%` }} />
                </div>
                {stepRate !== null && (
                  <p className={cn('mt-1 flex items-center gap-1 text-[11px]', stepRate < 40 ? 'text-rose-700' : 'text-muted-foreground')}>
                    <TrendingDown className="h-3 w-3" /> {fmt(stepRate, 'percent')} continued from the step before ({fmt(100 - stepRate, 'percent')} left here)
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

export function Breakdown({ block }: { block: Extract<Block, { type: 'breakdown' }> }) {
  return (
    <Panel title={block.title} description={block.description} source={block.source}>
      {block.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <ul className="space-y-2.5">
          {block.items.map((it, i) => (
            <li key={`${it.label}-${i}`}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-medium" title={it.label}>
                  {it.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <strong className="text-foreground">{fmt(it.value, block.format)}</strong> · {fmt(it.share, 'percent')}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/75" style={{ width: `${Math.max(1, it.share)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function Heatmap({ block }: { block: Extract<Block, { type: 'heatmap' }> }) {
  const max = Math.max(1, ...block.values.flat())
  const total = block.values.flat().reduce((a, b) => a + b, 0)
  return (
    <Panel title={block.title} description={block.description} source={block.source}>
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          <div className="grid min-w-[640px] gap-[3px]" style={{ gridTemplateColumns: `2.5rem repeat(${block.colLabels.length}, minmax(0, 1fr))` }}>
            <span />
            {block.colLabels.map((c, i) => (
              <span key={c} className="text-center text-[9.5px] text-muted-foreground">
                {i % 3 === 0 ? c : ''}
              </span>
            ))}
            {block.rowLabels.map((r, ri) => [
              <span key={r} className="flex items-center text-[11px] text-muted-foreground">
                {r}
              </span>,
              ...block.values[ri].map((v, ci) => (
                <span
                  key={`${ri}-${ci}`}
                  className="aspect-square rounded-[3px] bg-primary"
                  style={{ opacity: v ? 0.12 + (v / max) * 0.88 : 0.05 }}
                  title={`${r} ${block.colLabels[ci]}: ${fmt(v, block.format)}`}
                />
              )),
            ])}
          </div>
        </div>
      )}
    </Panel>
  )
}

export function InsightList({ block }: { block: Extract<Block, { type: 'insights' }> }) {
  return (
    <Panel title={block.title}>
      <ul className="space-y-2">
        {block.items.map((it, i) => {
          const Icon = it.tone === 'good' ? TrendingUp : it.tone === 'bad' ? AlertTriangle : Lightbulb
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  it.tone === 'good' ? 'bg-emerald-500/12 text-emerald-700' : it.tone === 'bad' ? 'bg-rose-500/12 text-rose-700' : 'bg-primary/10 text-primary'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-pretty">{it.text}</span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export function Notice({ block }: { block: Extract<Block, { type: 'notice' }> }) {
  return (
    <div
      role={block.tone === 'info' ? 'note' : 'alert'}
      className={cn(
        'flex items-start gap-2 rounded-xl border p-3 text-sm',
        block.tone === 'info' ? 'border-primary/20 bg-primary/5' : block.tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200' : 'border-rose-500/30 bg-rose-500/10'
      )}
    >
      {block.tone === 'info' ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{block.text}</span>
    </div>
  )
}

/** Lays blocks out: KPI grids and charts full width, breakdowns two by two. */
export function Blocks({ blocks, filename }: { blocks: Block[]; filename: string }) {
  const out: ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.type === 'breakdown') {
      const group = [b]
      while (blocks[i + 1]?.type === 'breakdown') group.push(blocks[++i] as typeof b)
      out.push(
        <div key={b.id} className="grid gap-4 md:grid-cols-2">
          {group.map((g) => (
            <Breakdown key={g.id} block={g} />
          ))}
        </div>
      )
      continue
    }
    if (b.type === 'kpis') out.push(<KpiGrid key={b.id} items={b.items} title={b.title} />)
    else if (b.type === 'series') out.push(<SeriesChart key={b.id} block={b} />)
    else if (b.type === 'table') out.push(<DataTable key={b.id} block={b} filename={filename} />)
    else if (b.type === 'funnel') out.push(<Funnel key={b.id} block={b} />)
    else if (b.type === 'heatmap') out.push(<Heatmap key={b.id} block={b} />)
    else if (b.type === 'insights') out.push(<InsightList key={b.id} block={b} />)
    else if (b.type === 'notice') out.push(<Notice key={b.id} block={b} />)
  }
  return <div className="space-y-4">{out}</div>
}

/** Flattens a section's KPIs and tables into CSV rows (for page and report exports). */
export function sectionCsvRows(title: string, blocks: Block[]): (string | number | null)[][] {
  const rows: (string | number | null)[][] = []
  for (const b of blocks) {
    if (b.type === 'kpis') {
      rows.push([title, 'Key numbers'], ['Measure', 'Value', 'Previous', 'Change %', 'Source'])
      for (const k of b.items) rows.push([k.label, k.value, k.previous, k.change, SOURCE[k.source].label])
      rows.push([])
    } else if (b.type === 'table' && b.rows.length) {
      rows.push([title, b.title], b.columns.map((c) => c.label))
      for (const r of b.rows) rows.push(b.columns.map((c) => r[c.key] ?? null))
      rows.push([])
    } else if (b.type === 'breakdown' && b.items.length) {
      rows.push([title, b.title], ['Item', 'Value', 'Share %'])
      for (const it of b.items) rows.push([it.label, it.value, it.share])
      rows.push([])
    } else if (b.type === 'funnel') {
      rows.push([title, b.title], ['Step', 'Sessions', 'Previous'])
      for (const s of b.steps) rows.push([s.label, s.value, s.previous ?? null])
      rows.push([])
    } else if (b.type === 'series') {
      rows.push([title, b.title], ['Period', ...b.metrics.map((m) => m.label), ...(b.points.some((p) => p.previous) ? b.metrics.map((m) => `${m.label} (previous)`) : [])])
      for (const p of b.points) rows.push([p.label, ...b.metrics.map((m) => p.values[m.key]), ...(p.previous ? b.metrics.map((m) => p.previous![m.key] ?? null) : [])])
      rows.push([])
    }
  }
  return rows
}
