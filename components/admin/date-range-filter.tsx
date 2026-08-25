'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

export interface DateRangeValue {
  days?: number
  from?: string
  to?: string
  label: string
}

export const DEFAULT_DATE_RANGE: DateRangeValue = { days: 30, label: 'Last 30 days' }

const PRESETS: { label: string; days: number }[] = [
  { label: 'Today', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
  { label: 'All time', days: 3650 },
]

export function DateRangeFilter({ value, onChange }: { value: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(
    value.from && value.to ? { from: new Date(value.from), to: new Date(value.to) } : undefined
  )

  const applyCustomRange = () => {
    if (!range?.from || !range?.to) return
    const from = format(range.from, 'yyyy-MM-dd')
    const to = format(range.to, 'yyyy-MM-dd')
    onChange({ from, to, label: `${format(range.from, 'd MMM yyyy')} – ${format(range.to, 'd MMM yyyy')}` })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-full justify-start text-left font-normal">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {value.label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="flex sm:flex-col gap-1 p-3 sm:border-r flex-wrap sm:min-w-[160px]">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant={value.label === p.label ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => {
                  onChange({ days: p.days, label: p.label })
                  setRange(undefined)
                  setOpen(false)
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} defaultMonth={range?.from} />
            <div className="flex justify-end pt-2 border-t mt-2">
              <Button size="sm" onClick={applyCustomRange} disabled={!range?.from || !range?.to}>
                Apply Custom Range
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
