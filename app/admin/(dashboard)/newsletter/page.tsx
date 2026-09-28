'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Mail, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  getNewsletterSubscribers,
  updateNewsletterSubscriber,
  deleteNewsletterSubscriber,
  exportNewsletterCsv,
  type NewsletterSubscriber,
} from '@/lib/api/admin'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { PageLoader } from '@/components/admin/loading-state'
import { EmptyState } from '@/components/admin/admin-bits'
import { StatusDot } from '@/components/admin/status-dot'
import { SegmentedControl } from '@/components/admin/segmented-control'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { usePaginated } from '@/lib/hooks/use-paginated'
import { GLASS_PANEL } from '@/lib/admin-ui'

type Filter = 'subscribed' | 'unsubscribed' | 'all'

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[] | null>(null)
  const [filter, setFilter] = useState<Filter>('subscribed')
  const [search, setSearch] = useState('')

  const load = () =>
    getNewsletterSubscribers()
      .then(setSubscribers)
      .catch(() => {
        setSubscribers([])
        toast.error('Failed to load subscribers')
      })

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (subscribers ?? []).filter((s) => (filter === 'all' || s.status === filter) && (!q || s.email.includes(q)))
  }, [subscribers, filter, search])
  const { pageItems, page, setPage, pageCount, total } = usePaginated(filtered, 20)
  const activeCount = subscribers?.filter((s) => s.status === 'subscribed').length ?? 0

  const toggle = async (s: NewsletterSubscriber) => {
    const next = s.status === 'subscribed' ? 'unsubscribed' : 'subscribed'
    try {
      const updated = await updateNewsletterSubscriber(s.id, next)
      setSubscribers((prev) => prev?.map((x) => (x.id === s.id ? updated : x)) ?? prev)
      toast.success(next === 'subscribed' ? 'Resubscribed' : 'Unsubscribed')
    } catch {
      toast.error('Failed to update subscriber')
    }
  }

  const remove = async (s: NewsletterSubscriber) => {
    if (!confirm(`Permanently delete ${s.email}? (Use Unsubscribe to keep a record.)`)) return
    try {
      await deleteNewsletterSubscriber(s.id)
      setSubscribers((prev) => prev?.filter((x) => x.id !== s.id) ?? prev)
      toast.success('Subscriber deleted')
    } catch {
      toast.error('Failed to delete subscriber')
    }
  }

  const exportCsv = async () => {
    try {
      await exportNewsletterCsv()
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <ProtectedRoute permission="customers.view">
      <div className="space-y-6">
        <PageHeader
          title="Newsletter"
          description={subscribers ? `${activeCount} active subscriber${activeCount === 1 ? '' : 's'} from the footer and homepage signup forms` : 'Newsletter signups'}
          actions={
            <Button variant="outline" onClick={exportCsv} disabled={!activeCount}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:max-w-sm sm:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search email…" className="h-10 rounded-xl pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <SegmentedControl
            size="md"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'subscribed', label: 'Subscribed' },
              { value: 'unsubscribed', label: 'Unsubscribed' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>

        {!subscribers ? (
          <PageLoader />
        ) : subscribers.length === 0 ? (
          <Card>
            <EmptyState icon={Mail} title="No subscribers yet" description="Signups from the footer and homepage newsletter forms will appear here." />
          </Card>
        ) : (
          <div className={`${GLASS_PANEL} overflow-hidden`}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Email</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No subscribers match these filters
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.email}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{s.source ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <StatusDot label={s.status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'} tone={s.status === 'subscribed' ? 'mint' : 'muted'} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Can permission="customers.update">
                          <Button variant="ghost" size="sm" onClick={() => toggle(s)}>
                            {s.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}
                          </Button>
                        </Can>
                        <Can permission="customers.delete">
                          <Button variant="ghost" size="icon" aria-label="Delete subscriber" onClick={() => remove(s)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <DataTablePagination page={page} pageCount={pageCount} total={total} pageSize={20} onPageChange={setPage} />
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
