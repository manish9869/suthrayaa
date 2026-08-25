'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getEmailLogs, retryEmailLog, type AdminEmailLog } from '@/lib/api/admin'
import { DateRangeFilter, type DateRangeValue } from '@/components/admin/date-range-filter'

const STATUS_VARIANT: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  sent: 'secondary',
  failed: 'destructive',
  pending: 'outline',
}
const ALL_TIME: DateRangeValue = { days: 3650, label: 'Any time' }

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<AdminEmailLog[]>([])
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [sentRange, setSentRange] = useState<DateRangeValue>(ALL_TIME)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getEmailLogs({})
      .then((res) => setLogs(res.items))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const typeOptions = useMemo(() => Array.from(new Set(logs.map((l) => l.type))).sort(), [logs])

  const sinceCutoff = useMemo(() => {
    if (sentRange.from) return new Date(sentRange.from).getTime()
    if (sentRange.days && sentRange.days < 3650) {
      const d = new Date()
      d.setDate(d.getDate() - sentRange.days)
      return d.getTime()
    }
    return null
  }, [sentRange])
  const untilCutoff = useMemo(() => (sentRange.to ? new Date(`${sentRange.to}T23:59:59`).getTime() : null), [sentRange])

  const filtered = useMemo(() => {
    let result = [...logs]
    if (status !== 'all') result = result.filter((l) => l.status === status)
    if (type !== 'all') result = result.filter((l) => l.type === type)
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((l) => l.recipient.toLowerCase().includes(q) || (l.subject ?? '').toLowerCase().includes(q))
    if (sinceCutoff != null) result = result.filter((l) => new Date(l.sentAt).getTime() >= sinceCutoff)
    if (untilCutoff != null) result = result.filter((l) => new Date(l.sentAt).getTime() <= untilCutoff)
    return result
  }, [logs, status, type, search, sinceCutoff, untilCutoff])

  const handleRetry = async (id: string) => {
    setRetrying(id)
    try {
      await retryEmailLog(id)
      toast.success('Retry attempted')
      load()
    } catch {
      toast.error('Retry failed')
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Email Logs</h1>
        <p className="text-muted-foreground text-sm">
          {filtered.length} of {logs.length} emails
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search recipient or subject..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {typeOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <DateRangeFilter value={sentRange} onChange={setSentRange} />
      </div>

      <div className="border rounded-xl bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No emails match these filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{l.type.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-sm">{l.recipient}</TableCell>
                  <TableCell className="text-sm truncate max-w-[220px]">{l.subject}</TableCell>
                  <TableCell>
                    {l.orderId ? (
                      <Link href={`/admin/orders/${l.orderId}`} className="text-primary hover:underline text-xs">
                        View order
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[l.status] ?? 'outline'}>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(l.sentAt).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right">
                    {l.status === 'failed' && (
                      <Button variant="ghost" size="icon" onClick={() => handleRetry(l.id)} disabled={retrying === l.id} title="Retry">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
