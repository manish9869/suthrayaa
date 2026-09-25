'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpRight, BadgeCheck, CreditCard, FileText, Inbox, Mail, MessageSquareText, PackageCheck, RotateCcw, Search, ShoppingBag, Truck, Undo2, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getEmailLogs, retryEmailLog, type AdminEmailLog } from '@/lib/api/admin'
import { DateRangeFilter, type DateRangeValue } from '@/components/admin/date-range-filter'
import { TableLoadingRow } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { StatusDot, type DotTone } from '@/components/admin/status-dot'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<string, DotTone> = {
  sent: 'mint',
  failed: 'destructive',
  pending: 'gold',
}
/** Icon + tint for each email type, so the type column scans at a glance. */
function typeStyle(type: string): { icon: LucideIcon; className: string } {
  if (type.includes('invoice')) return { icon: FileText, className: 'bg-primary/10 text-primary' }
  if (type.includes('payment')) return { icon: CreditCard, className: 'bg-destructive/10 text-destructive' }
  if (type.includes('refund')) return { icon: Undo2, className: 'bg-gold/15 text-[color-mix(in_oklab,var(--gold)_65%,var(--foreground))]' }
  if (type.includes('shipped')) return { icon: Truck, className: 'bg-sky/10 text-sky' }
  if (type.includes('delivered')) return { icon: PackageCheck, className: 'bg-mint/12 text-mint' }
  if (type.includes('confirmed')) return { icon: BadgeCheck, className: 'bg-violet/12 text-violet' }
  if (type.includes('order')) return { icon: ShoppingBag, className: 'bg-primary/10 text-primary' }
  if (type.includes('admin')) return { icon: Inbox, className: 'bg-peach/20 text-[color-mix(in_oklab,var(--peach)_55%,var(--foreground))]' }
  if (type.includes('enquiry') || type.includes('contact')) return { icon: MessageSquareText, className: 'bg-mint/12 text-mint' }
  return { icon: Mail, className: 'bg-muted text-muted-foreground' }
}
const typeLabel = (type: string) => type.replace(/_/g, ' ')

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
    <ProtectedRoute permission="emails.view">
    <div className="space-y-6">
      <PageHeader title="Email Logs" description={`${filtered.length} of ${logs.length} emails`} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search recipient or subject..." className="pl-10 h-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-44">
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
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-40">
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

      <div className={`${GLASS_PANEL} overflow-x-auto`}>
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[190px]">Type</TableHead>
              <TableHead>Recipient &amp; subject</TableHead>
              <TableHead className="w-[130px]">Order</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[140px]">Sent</TableHead>
              <TableHead className="w-[90px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingRow colSpan={6} />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center">
                  <Mail className="mx-auto h-6 w-6 text-muted-foreground/60" />
                  <p className="mt-2 text-sm text-muted-foreground">No emails match these filters</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => {
                const t = typeStyle(l.type)
                const sent = new Date(l.sentAt)
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', t.className)}>
                          <t.icon className="h-4 w-4" />
                        </span>
                        <span className="text-[13px] font-medium capitalize">{typeLabel(l.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <p className="truncate text-[13px] font-medium" title={l.recipient}>{l.recipient}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground" title={l.subject ?? undefined}>
                        {l.subject ?? 'No subject'}
                      </p>
                      {l.status === 'failed' && l.errorMessage && (
                        <p className="mt-0.5 truncate text-xs text-destructive" title={l.errorMessage}>{l.errorMessage}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {l.orderId ? (
                        <Link
                          href={`/admin/orders/${l.orderId}`}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                        >
                          View order <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusDot label={l.status} tone={STATUS_TONE[l.status] ?? 'muted'} />
                    </TableCell>
                    <TableCell>
                      <p className="text-[13px]">{sent.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{sent.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === 'failed' ? (
                        <Can permission="emails.update">
                          <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => handleRetry(l.id)} disabled={retrying === l.id}>
                            <RotateCcw className={cn('h-3.5 w-3.5', retrying === l.id && 'animate-spin')} /> Retry
                          </Button>
                        </Can>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    </ProtectedRoute>
  )
}
