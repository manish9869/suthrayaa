'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Download, Loader2, Printer, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportRowsToCsv, GLASS_PANEL } from '@/lib/admin-ui'
import { getInsightsSection, type SectionResult } from '@/lib/api/insights'
import { cn } from '@/lib/utils'
import { Blocks, sectionCsvRows } from './blocks'
import { useInsightsQuery } from './controls'

const pretty = (s: string) => format(new Date(`${s}T00:00:00`), 'd MMM yyyy')

export function periodText(p: SectionResult['period']) {
  const range = p.from === p.to ? pretty(p.from) : `${pretty(p.from)} – ${pretty(p.to)}`
  const vs = p.compareFrom && p.compareTo ? (p.compareFrom === p.compareTo ? pretty(p.compareFrom) : `${pretty(p.compareFrom)} – ${pretty(p.compareTo)}`) : null
  return vs ? `${range} · compared with ${vs}` : range
}

/** Loads one Insights section for the current URL filters and renders its blocks. */
export function SectionView({ section, after }: { section: string; after?: ReactNode }) {
  const { queryString } = useInsightsQuery()
  const [data, setData] = useState<SectionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const seq = useRef(0)

  const load = useCallback(() => {
    const id = ++seq.current
    setLoading(true)
    getInsightsSection(section, queryString)
      .then((d) => {
        if (id !== seq.current) return
        setData(d)
        setError(null)
        setUpdatedAt(new Date())
      })
      .catch((e) => id === seq.current && setError(e instanceof Error ? e.message : 'Could not load this report'))
      .finally(() => id === seq.current && setLoading(false))
  }, [section, queryString])

  useEffect(load, [load])
  // real-time refreshes itself while the tab is visible
  useEffect(() => {
    if (!data?.refresh) return
    const t = setInterval(() => document.visibilityState === 'visible' && load(), data.refresh * 1000)
    return () => clearInterval(t)
  }, [data?.refresh, load])

  const exportCsv = () => {
    if (!data) return
    exportRowsToCsv(`insights-${section}-${data.period.from}-to-${data.period.to}.csv`, [`${data.title} — ${periodText(data.period)}`], sectionCsvRows(data.title, data.blocks))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{data?.title ?? ' '}</h2>
          <p className="text-xs text-muted-foreground">
            {data ? (data.refresh ? `Live · updates every ${data.refresh} seconds${updatedAt ? ` · last ${format(updatedAt, 'h:mm:ss a')}` : ''}` : periodText(data.period)) : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 print:hidden">
          {loading && data && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Updating" />}
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!data}>
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </div>

      {data && data.filterNotes.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {data.filterNotes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}

      {error && !data ? (
        <div className={cn(GLASS_PANEL, 'p-6 text-center')}>
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        </div>
      ) : !data ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading report">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn(GLASS_PANEL, 'h-28 animate-pulse')} />
            ))}
          </div>
          <div className={cn(GLASS_PANEL, 'h-72 animate-pulse')} />
        </div>
      ) : (
        <div className={cn('transition-opacity', loading && 'opacity-60')}>
          <Blocks blocks={data.blocks} filename={`insights-${section}`} />
        </div>
      )}
      {after}
    </div>
  )
}
