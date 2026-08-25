'use client'

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { SortDirection } from '@/lib/hooks/use-sortable-data'

interface SortableThProps {
  label: string
  sortKey: string
  activeKey: string | null
  direction: SortDirection
  onSort: (key: string) => void
  className?: string
  align?: 'left' | 'right'
}

/** A TableHead that's clickable to sort by this column, with an icon showing current
 * direction (or a faint neutral icon when this isn't the active sort column). */
export function SortableTh({ label, sortKey, activeKey, direction, onSort, className, align = 'left' }: SortableThProps) {
  const active = activeKey === sortKey
  return (
    <TableHead className={cn('select-none', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground transition-colors',
          align === 'right' && 'flex-row-reverse',
          active ? 'text-foreground font-semibold' : 'text-muted-foreground'
        )}
      >
        {label}
        {active ? (
          direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}
