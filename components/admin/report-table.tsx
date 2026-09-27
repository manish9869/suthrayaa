'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortableTh } from '@/components/admin/sortable-th'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { useSortableData } from '@/lib/hooks/use-sortable-data'
import { usePaginated } from '@/lib/hooks/use-paginated'
import { cn } from '@/lib/utils'

export interface ReportColumn<T> {
  key: string
  label: string
  align?: 'left' | 'right'
  /** Cell content; defaults to the sort value. */
  render?: (row: T) => React.ReactNode
  /** Makes the column sortable. */
  sortValue?: (row: T) => string | number | null | undefined
  className?: string
}

/**
 * A report table: sortable columns, client-side pagination, optional search and an optional
 * totals row. Report data arrives already aggregated and bounded by the date range, so paging
 * in the browser is fine here.
 */
export function ReportTable<T>({
  rows,
  columns,
  rowKey,
  initialSort,
  pageSize = 10,
  searchText,
  searchPlaceholder = 'Search…',
  empty = 'Nothing in this period',
  totals,
}: {
  rows: T[]
  columns: ReportColumn<T>[]
  rowKey: (row: T, index: number) => string
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  pageSize?: number
  /** When given, a search box filters rows on this text. */
  searchText?: (row: T) => string
  searchPlaceholder?: string
  empty?: string
  totals?: Partial<Record<string, React.ReactNode>>
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows
  }, [rows, query, searchText])

  const accessors = useMemo(
    () => Object.fromEntries(columns.filter((c) => c.sortValue).map((c) => [c.key, c.sortValue!])) as Record<string, (row: T) => string | number | null | undefined>,
    [columns]
  )
  const { sorted, sortKey, direction, toggleSort } = useSortableData<T>(filtered, accessors, initialSort)
  const { pageItems, page, setPage, pageCount, total } = usePaginated(sorted, pageSize)

  return (
    <div>
      {searchText && (
        <div className="relative mb-3 max-w-xs print:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className="pl-9" aria-label={searchPlaceholder} />
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) =>
                c.sortValue ? (
                  <SortableTh
                    key={c.key}
                    label={c.label}
                    sortKey={c.key}
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    align={c.align}
                    className={cn(c.align === 'right' && 'text-right', c.className)}
                  />
                ) : (
                  <TableHead key={c.key} className={cn(c.align === 'right' && 'text-right', c.className)}>
                    {c.label}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                  {query ? 'No rows match this search' : empty}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((row, i) => (
                <TableRow key={rowKey(row, i)}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn('tabular-nums', c.align === 'right' && 'text-right', c.className)}>
                      {c.render ? c.render(row) : (c.sortValue?.(row) ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {totals && pageItems.length > 0 && (
            <TableFooter>
              <TableRow>
                {columns.map((c, i) => (
                  <TableCell key={c.key} className={cn('font-semibold tabular-nums', c.align === 'right' && 'text-right', c.className)}>
                    {totals[c.key] ?? (i === 0 ? 'Total' : '')}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      <div className="print:hidden">
        <DataTablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  )
}
