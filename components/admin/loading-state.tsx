import { TableCell, TableRow } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export function PageLoader({ label = 'Loading...', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}>
      <Spinner className="size-6 text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function TableLoadingRow({ colSpan, label = 'Loading...' }: { colSpan: number; label?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-14">
        <PageLoader label={label} className="py-0" />
      </TableCell>
    </TableRow>
  )
}
