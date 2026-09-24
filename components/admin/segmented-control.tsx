'use client'

import { cn } from '@/lib/utils'

/** A compact pill-style toggle group (e.g. 7D / 30D / 90D, or Revenue / Orders). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'sm',
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" className={cn('inline-flex items-center gap-0.5 rounded-xl border bg-muted/70 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-lg font-medium transition-all',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3.5 text-[13px]',
              active ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
