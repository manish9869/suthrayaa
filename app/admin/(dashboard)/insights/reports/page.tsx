'use client'

import { useState } from 'react'
import { Download, Link2, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { GLASS_PANEL, exportRowsToCsv } from '@/lib/admin-ui'
import { getInsightsSection, type SectionResult } from '@/lib/api/insights'
import { INSIGHTS_NAV } from '@/components/admin/insights/nav'
import { useInsightsQuery } from '@/components/admin/insights/controls'
import { Blocks, sectionCsvRows } from '@/components/admin/insights/blocks'
import { periodText } from '@/components/admin/insights/section-view'
import { cn } from '@/lib/utils'

const REPORTABLE = INSIGHTS_NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== 'reports' && i.id !== 'settings' && i.id !== 'realtime').map((i) => ({ ...i, id: i.id || 'overview' })) })).filter((g) => g.items.length)

/** Build a report from any Insights pages for the chosen dates and filters — CSV or print/PDF. */
export default function InsightsReportsPage() {
  const { queryString } = useInsightsQuery()
  const [picked, setPicked] = useState<string[]>(['overview', 'sales', 'products'])
  const [busy, setBusy] = useState<'csv' | 'preview' | null>(null)
  const [preview, setPreview] = useState<SectionResult[] | null>(null)
  const all = REPORTABLE.flatMap((g) => g.items.map((i) => i.id))

  const fetchAll = async () => {
    const out: SectionResult[] = []
    for (const id of all.filter((x) => picked.includes(x))) out.push(await getInsightsSection(id, queryString))
    return out
  }
  const downloadCsv = async () => {
    setBusy('csv')
    try {
      const sections = await fetchAll()
      const rows = sections.flatMap((s) => [[`${s.title}`], ...sectionCsvRows(s.title, s.blocks), []])
      exportRowsToCsv(`suthrayaa-report-${sections[0]?.period.from ?? ''}-to-${sections[0]?.period.to ?? ''}.csv`, [`Suthrayaa report — ${sections[0] ? periodText(sections[0].period) : ''}`], rows)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not build the report')
    } finally {
      setBusy(null)
    }
  }
  const showPreview = async () => {
    setBusy('preview')
    try {
      setPreview(await fetchAll())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not build the report')
    } finally {
      setBusy(null)
    }
  }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied — anyone with Insights access sees the same dates and filters')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <div className="space-y-4">
      <div className={cn(GLASS_PANEL, 'space-y-4 p-4 sm:p-5 print:hidden')}>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Reports & export</h2>
          <p className="text-xs text-muted-foreground">Choose pages for one report, using the dates and filters above. Every table on every page also has its own CSV button.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {REPORTABLE.map((g) => (
            <fieldset key={g.group}>
              <legend className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</legend>
              <div className="space-y-1">
                {g.items.map((i) => (
                  <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted">
                    <Checkbox checked={picked.includes(i.id)} onCheckedChange={(v) => setPicked((p) => (v ? [...p, i.id] : p.filter((x) => x !== i.id)))} />
                    <i.icon className="h-3.5 w-3.5 text-muted-foreground" /> {i.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button size="sm" variant="ghost" onClick={() => setPicked(picked.length === all.length ? [] : all)}>
            {picked.length === all.length ? 'Clear all' : 'Select all'}
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Link2 className="h-4 w-4" /> Copy link
            </Button>
            <Button size="sm" variant="outline" onClick={showPreview} disabled={!picked.length || busy !== null}>
              {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Preview for print / PDF
            </Button>
            <Button size="sm" onClick={downloadCsv} disabled={!picked.length || busy !== null}>
              {busy === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download CSV
            </Button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="space-y-8">
          <div className="flex items-center justify-between print:hidden">
            <p className="text-sm text-muted-foreground">{preview[0] ? periodText(preview[0].period) : ''}</p>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </Button>
          </div>
          <div className="hidden print:block">
            <h1 className="text-xl font-semibold">Suthrayaa report</h1>
            <p className="text-sm">{preview[0] ? periodText(preview[0].period) : ''}</p>
          </div>
          {preview.map((s) => (
            <section key={s.section} className="space-y-3 break-before-page first:break-before-auto">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <Blocks blocks={s.blocks} filename={`insights-${s.section}`} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
