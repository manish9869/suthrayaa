'use client'

import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { DateRangeFilter, DEFAULT_DATE_RANGE, type DateRangeValue } from '@/components/admin/date-range-filter'
import { getAuditLogs, type AuditLogEntry } from '@/lib/api/rbac'

const ACTION_TONE: Record<string, 'destructive' | 'secondary' | 'outline'> = {
  USER_DELETED: 'destructive',
  ROLE_DELETED: 'destructive',
  PRODUCT_DELETED: 'destructive',
  ORDER_CANCELLED: 'destructive',
  ORDER_REFUNDED: 'destructive',
  USER_DEACTIVATED: 'destructive',
}

function actionLabel(action: string) {
  return action
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ')
}

function summarize(log: AuditLogEntry): string {
  const bits: string[] = []
  if (log.metadata && typeof log.metadata === 'object') {
    for (const [k, v] of Object.entries(log.metadata)) {
      if (v == null || (Array.isArray(v) && v.length === 0)) continue
      bits.push(`${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    }
  }
  return bits.join(' · ')
}

function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('all')
  const [range, setRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE)
  const pageSize = 50

  useEffect(() => {
    setLogs(null)
    const from = range.from ?? format(subDays(new Date(), range.days ?? 30), 'yyyy-MM-dd')
    const to = range.to ?? format(new Date(), 'yyyy-MM-dd')
    getAuditLogs({ action: action === 'all' ? undefined : action, from, to, page, limit: pageSize }).then((res) => {
      setLogs(res.items)
      setTotal(res.total)
    })
  }, [action, range, page])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">A record of sensitive admin actions — who did what, and when.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {[
              'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_DELETED',
              'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'PERMISSIONS_CHANGED',
              'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
              'ORDER_UPDATED', 'ORDER_CANCELLED', 'ORDER_REFUNDED', 'SETTINGS_UPDATED',
            ].map((a) => (
              <SelectItem key={a} value={a}>
                {actionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFilter value={range} onChange={(v) => { setRange(v); setPage(1) }} />
      </div>

      <div className={`${GLASS_PANEL} overflow-hidden`}>
        {!logs ? (
          <PageLoader label="Loading audit logs..." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>When</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No audit events in this range
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-white/10">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant={ACTION_TONE[log.action] ?? 'secondary'}>{actionLabel(log.action)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.resource}
                        {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}` : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{summarize(log)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{log.ipAddress ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <DataTablePagination page={page} pageCount={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

export default function AuditLogsPage() {
  return (
    <ProtectedRoute permission="audit_logs.view">
      <AuditLogsContent />
    </ProtectedRoute>
  )
}
