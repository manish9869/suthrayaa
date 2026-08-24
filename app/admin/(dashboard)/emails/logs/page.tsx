'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { getEmailLogs, retryEmailLog, type AdminEmailLog } from '@/lib/api/admin'

const STATUS_VARIANT: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  sent: 'secondary',
  failed: 'destructive',
  pending: 'outline',
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<AdminEmailLog[]>([])
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getEmailLogs({ status: status === 'all' ? undefined : status })
      .then((res) => setLogs(res.items))
      .finally(() => setLoading(false))
  }
  useEffect(load, [status])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Email Logs</h1>
          <p className="text-muted-foreground text-sm">{logs.length} emails</p>
        </div>
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
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No emails logged yet
                </TableCell>
              </TableRow>
            ) : (
              logs.map((l) => (
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
