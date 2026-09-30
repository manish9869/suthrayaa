'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarDays, Check, ChevronDown, Filter, GitCompareArrows, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { getInsightsOptions, type FilterOptions } from '@/lib/api/insights'

/**
 * The Insights filter bar — date range, comparison, chart detail and filters. Everything lives
 * in the URL, so every Insights page shares it and a view can be bookmarked or sent.
 */

export const PRESETS: [string, string][] = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['last_7_days', 'Last 7 days'],
  ['last_14_days', 'Last 14 days'],
  ['last_30_days', 'Last 30 days'],
  ['last_90_days', 'Last 90 days'],
  ['this_week', 'This week'],
  ['last_week', 'Last week'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['this_quarter', 'This quarter'],
  ['last_quarter', 'Last quarter'],
  ['this_year', 'This year'],
  ['last_year', 'Last year'],
]
const COMPARE: [string, string][] = [
  ['previous', 'Previous period'],
  ['previous_year', 'Same period last year'],
  ['custom', 'Custom period…'],
  ['none', 'No comparison'],
]
/** Filter keys in the order shown, with where each applies. */
export const FILTERS: { key: string; group: string; ga: boolean; store: boolean }[] = [
  { key: 'product', group: 'Catalogue', ga: true, store: true },
  { key: 'category', group: 'Catalogue', ga: true, store: true },
  { key: 'customization', group: 'Catalogue', ga: false, store: true },
  { key: 'customerType', group: 'Customers', ga: true, store: true },
  { key: 'country', group: 'Location', ga: true, store: true },
  { key: 'region', group: 'Location', ga: true, store: true },
  { key: 'city', group: 'Location', ga: true, store: true },
  { key: 'device', group: 'Technology', ga: true, store: false },
  { key: 'os', group: 'Technology', ga: true, store: false },
  { key: 'browser', group: 'Technology', ga: true, store: false },
  { key: 'source', group: 'Marketing', ga: true, store: false },
  { key: 'medium', group: 'Marketing', ga: true, store: false },
  { key: 'campaign', group: 'Marketing', ga: true, store: false },
  { key: 'landingPage', group: 'Marketing', ga: true, store: false },
  { key: 'page', group: 'Marketing', ga: true, store: false },
  { key: 'promotion', group: 'Marketing', ga: true, store: false },
  { key: 'coupon', group: 'Orders', ga: false, store: true },
  { key: 'payment', group: 'Orders', ga: false, store: true },
  { key: 'shipping', group: 'Orders', ga: false, store: true },
]
const LABELS: Record<string, string> = {
  product: 'Product',
  category: 'Category',
  customerType: 'Customer type',
  device: 'Device',
  os: 'Operating system',
  browser: 'Browser',
  country: 'Country',
  region: 'State / region',
  city: 'City',
  source: 'Traffic source',
  medium: 'Medium',
  campaign: 'Campaign',
  landingPage: 'Landing page',
  page: 'Page',
  coupon: 'Coupon',
  promotion: 'Promotion',
  customization: 'Customization',
  payment: 'Payment method',
  shipping: 'Shipping method',
}
const FILTER_KEYS = FILTERS.map((f) => f.key)
const PERIOD_KEYS = ['preset', 'from', 'to', 'compare', 'compareFrom', 'compareTo', 'granularity']

/** The Insights query (period + filters) from the URL, and a setter that keeps it there. */
export function useInsightsQuery() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const query = useMemo(() => {
    const q = new URLSearchParams()
    for (const k of [...PERIOD_KEYS, ...FILTER_KEYS]) for (const v of params.getAll(k)) q.append(k, v)
    if (!q.get('preset') && !q.get('from')) q.set('preset', 'last_30_days')
    return q
  }, [params])
  const set = (updates: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      next.delete(k)
      if (Array.isArray(v)) v.forEach((x) => next.append(k, x))
      else if (v !== null && v !== '') next.set(k, v)
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }
  const filters = FILTER_KEYS.filter((k) => query.getAll(k).length).map((k) => ({ key: k, values: query.getAll(k) }))
  return { query, queryString: query.toString(), set, filters }
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const pretty = (s: string) => format(new Date(`${s}T00:00:00`), 'd MMM yyyy')

function RangePicker({ label, icon: Icon, from, to, onApply, children }: { label: string; icon: typeof CalendarDays; from?: string | null; to?: string | null; onApply: (from: string, to: string) => void; children?: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(from && to ? { from: new Date(`${from}T00:00:00`), to: new Date(`${to}T00:00:00`) } : undefined)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[14rem] truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] p-0">
        <div className="flex flex-col sm:flex-row">
          {children && <div className="border-b p-2 sm:w-48 sm:border-b-0 sm:border-r">{children(() => setOpen(false))}</div>}
          <div className="p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Custom dates</p>
            <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} defaultMonth={range?.from} disabled={{ after: new Date() }} />
            <div className="mt-2 flex justify-end border-t pt-2">
              <Button
                size="sm"
                disabled={!range?.from || !range?.to}
                onClick={() => {
                  onApply(ymd(range!.from!), ymd(range!.to!))
                  setOpen(false)
                }}
              >
                Apply dates
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FilterPicker({ options, active, onAdd }: { options: FilterOptions | null; active: { key: string; values: string[] }[]; onAdd: (key: string, value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [typed, setTyped] = useState('')
  const list = key ? options?.options[key] ?? [] : []
  const chosen = new Set(active.find((a) => a.key === key)?.values ?? [])
  const shown = list.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())).slice(0, 80)
  const def = FILTERS.find((f) => f.key === key)
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setKey(null)
          setQ('')
          setTyped('')
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" /> Filters
          {active.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{active.reduce((a, f) => a + f.values.length, 0)}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-1rem))] p-0">
        {!key ? (
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {[...new Set(FILTERS.map((f) => f.group))].map((g) => (
              <div key={g} className="mb-1">
                <p className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
                {FILTERS.filter((f) => f.group === g).map((f) => (
                  <button key={f.key} type="button" onClick={() => setKey(f.key)} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                    {LABELS[f.key]}
                    <span className="text-[10px] text-muted-foreground">{f.ga && f.store ? 'shop + visitors' : f.ga ? 'visitors' : 'shop'}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2">
            <button type="button" onClick={() => setKey(null)} className="mb-2 text-xs text-muted-foreground hover:text-foreground">
              ← All filters
            </button>
            <p className="px-1 text-sm font-semibold">{LABELS[key]}</p>
            <p className="px-1 pb-2 text-[11px] text-muted-foreground">
              {def?.ga && def?.store ? 'Filters both shop and visitor numbers.' : def?.ga ? 'Filters Google Analytics visitor numbers.' : 'Filters your shop’s order numbers.'}
            </p>
            {list.length > 8 && <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="mb-2 h-8 text-xs" autoFocus />}
            <div className="max-h-64 overflow-y-auto">
              {shown.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => !chosen.has(o.value) && onAdd(key, o.value)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">{o.label}</span>
                  {chosen.has(o.value) && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
              {list.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No suggestions{def?.ga ? ' yet (they come from Google Analytics)' : ''} — type a value below.</p>}
            </div>
            <form
              className="mt-2 flex gap-1.5 border-t pt-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (typed.trim()) onAdd(key, typed.trim())
                setTyped('')
              }}
            >
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type a ${LABELS[key].toLowerCase()}…`} className="h-8 text-xs" aria-label={`Type a ${LABELS[key]}`} />
              <Button type="submit" size="sm" variant="secondary" className="h-8" disabled={!typed.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function InsightsControls({ showCompare = true }: { showCompare?: boolean }) {
  const { query, set, filters } = useInsightsQuery()
  const [options, setOptions] = useState<FilterOptions | null>(null)
  useEffect(() => {
    getInsightsOptions()
      .then(setOptions)
      .catch(() => setOptions(null))
  }, [])

  const preset = query.get('preset')
  const from = query.get('from')
  const to = query.get('to')
  const compare = query.get('compare') ?? 'previous'
  const granularity = query.get('granularity') ?? 'auto'
  const periodLabel = preset && preset !== 'custom' ? PRESETS.find((p) => p[0] === preset)?.[1] ?? 'Last 30 days' : from && to ? `${pretty(from)} – ${pretty(to)}` : 'Last 30 days'
  const compareLabel = compare === 'custom' && query.get('compareFrom') ? `vs ${pretty(query.get('compareFrom')!)} – ${pretty(query.get('compareTo')!)}` : `vs ${COMPARE.find((c) => c[0] === compare)?.[1].replace('…', '') ?? 'Previous period'}`
  const labelOf = (key: string, value: string) => options?.options[key]?.find((o) => o.value === value)?.label ?? value

  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <RangePicker label={periodLabel} icon={CalendarDays} from={from} to={to} onApply={(f, t) => set({ preset: 'custom', from: f, to: t })}>
          {(close) => (
            <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-1">
              {PRESETS.map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    set({ preset: v, from: null, to: null })
                    close()
                  }}
                  className={cn('rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted', preset === v && 'bg-primary/10 font-medium text-primary')}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </RangePicker>

        {showCompare && (
          <RangePicker label={compareLabel} icon={GitCompareArrows} from={query.get('compareFrom')} to={query.get('compareTo')} onApply={(f, t) => set({ compare: 'custom', compareFrom: f, compareTo: t })}>
            {(close) => (
              <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-1">
                {COMPARE.filter((c) => c[0] !== 'custom').map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      set({ compare: v === 'previous' ? null : v, compareFrom: null, compareTo: null })
                      close()
                    }}
                    className={cn('rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted', compare === v && 'bg-primary/10 font-medium text-primary')}
                  >
                    {l}
                  </button>
                ))}
                <p className="col-span-2 px-2 pt-2 text-[11px] text-muted-foreground sm:col-span-1">Or pick custom dates →</p>
              </div>
            )}
          </RangePicker>
        )}

        <div className="flex rounded-lg border bg-card p-0.5 text-xs" role="radiogroup" aria-label="Chart detail">
          {[
            ['auto', 'Auto'],
            ['day', 'Day'],
            ['week', 'Week'],
            ['month', 'Month'],
          ].map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={granularity === v}
              onClick={() => set({ granularity: v === 'auto' ? null : v })}
              className={cn('rounded-md px-2.5 py-1.5 transition-colors', granularity === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {l}
            </button>
          ))}
        </div>

        <FilterPicker options={options} active={filters} onAdd={(k, v) => set({ [k]: [...query.getAll(k), v] })} />

        {(filters.length > 0 || query.get('compare') || query.get('granularity') || (query.get('preset') && query.get('preset') !== 'last_30_days')) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => set(Object.fromEntries([...PERIOD_KEYS, ...FILTER_KEYS].map((k) => [k, null])))}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.flatMap((f) =>
            f.values.map((v) => (
              <span key={`${f.key}-${v}`} className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pl-2.5 pr-1 text-xs">
                <span className="text-muted-foreground">{LABELS[f.key]}:</span> <span className="max-w-[12rem] truncate font-medium">{labelOf(f.key, v)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${LABELS[f.key]} ${labelOf(f.key, v)}`}
                  onClick={() => set({ [f.key]: f.values.filter((x) => x !== v) })}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      )}
    </div>
  )
}
