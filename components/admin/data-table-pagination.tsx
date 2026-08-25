'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface DataTablePaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

/** Numbered page controls with a "showing X-Y of Z" summary, for a client-paginated table. */
export function DataTablePagination({ page, pageCount, total, pageSize, onPageChange }: DataTablePaginationProps) {
  if (total === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const pageNumbers = () => {
    const nums: (number | 'ellipsis')[] = []
    const add = (n: number) => nums.push(n)
    add(1)
    if (page > 3) nums.push('ellipsis')
    for (let n = Math.max(2, page - 1); n <= Math.min(pageCount - 1, page + 1); n++) add(n)
    if (page < pageCount - 2) nums.push('ellipsis')
    if (pageCount > 1) add(pageCount)
    return nums
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-t border-white/10">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>&ndash;
        <span className="font-medium text-foreground">{end}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          {pageNumbers().map((n, i) =>
            n === 'ellipsis' ? (
              <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground">
                &hellip;
              </span>
            ) : (
              <Button
                key={n}
                variant={n === page ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => onPageChange(n)}
              >
                {n}
              </Button>
            )
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === pageCount} onClick={() => onPageChange(pageCount)}>
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
