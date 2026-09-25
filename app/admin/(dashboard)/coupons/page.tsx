'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Search, Ticket } from 'lucide-react'
import { getAdminCoupons, createCoupon, deleteCoupon, type AdminCoupon } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { SortableTh } from '@/components/admin/sortable-th'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { useSortableData } from '@/lib/hooks/use-sortable-data'
import { usePaginated } from '@/lib/hooks/use-paginated'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { StatusDot } from '@/components/admin/status-dot'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'flat'>('percent')
  const [value, setValue] = useState(10)
  const [minSubtotal, setMinSubtotal] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = () => getAdminCoupons().then(setCoupons)
  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    if (!code.trim()) return
    setSaving(true)
    try {
      await createCoupon({ code, type, value, minSubtotal })
      toast.success('Coupon created')
      setCode('')
      setOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Deactivate coupon "${code}"?`)) return
    await deleteCoupon(id)
    toast.success('Coupon deactivated')
    load()
  }

  const filtered = useMemo(() => {
    let result = [...coupons]
    const q = search.trim().toLowerCase()
    if (q) result = result.filter((c) => c.code.toLowerCase().includes(q))
    if (statusFilter !== 'all') result = result.filter((c) => (statusFilter === 'active' ? c.is_active : !c.is_active))
    return result
  }, [coupons, search, statusFilter])

  const { sorted, sortKey, direction, toggleSort } = useSortableData<AdminCoupon>(filtered, {
    code: (c) => c.code,
    discount: (c) => c.value,
    minOrder: (c) => c.min_subtotal,
    uses: (c) => c.uses_count,
    status: (c) => (c.is_active ? 1 : 0),
  })
  const { pageItems, page, setPage, pageCount, total } = usePaginated(sorted, 10)

  return (
    <ProtectedRoute permission="coupons.view">
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description={`${filtered.length} of ${coupons.length} coupons · ${coupons.filter((c) => c.is_active).length} active`}
        actions={
          <>
        <Dialog open={open} onOpenChange={setOpen}>
          <Can permission="coupons.create">
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add Coupon
              </Button>
            </DialogTrigger>
          </Can>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as 'percent' | 'flat')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent Off</SelectItem>
                      <SelectItem value="flat">Flat Amount Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value {type === 'percent' ? '(%)' : '(₹)'}</Label>
                  <Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum Order Value (₹)</Label>
                <Input type="number" value={minSubtotal} onChange={(e) => setMinSubtotal(Number(e.target.value))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Saving...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search coupon code..." className="pl-10 h-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 rounded-xl w-[calc(50%-0.25rem)] sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={`${GLASS_PANEL} overflow-hidden`}>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <SortableTh label="Code" sortKey="code" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Discount" sortKey="discount" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Min Order" sortKey="minOrder" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Uses" sortKey="uses" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <SortableTh label="Status" sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No coupons match these filters
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell>
                    <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1 font-mono text-[13px] font-semibold tracking-wide text-primary">
                      <Ticket className="h-3.5 w-3.5" /> {c.code}
                    </span>
                  </TableCell>
                  <TableCell>{c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}</TableCell>
                  <TableCell>{formatPrice(c.min_subtotal)}</TableCell>
                  <TableCell>
                    <div className="min-w-[110px]">
                      <span className="text-sm tabular-nums">
                        {c.uses_count}
                        {c.max_uses ? <span className="text-muted-foreground"> / {c.max_uses}</span> : <span className="text-muted-foreground"> · unlimited</span>}
                      </span>
                      {c.max_uses ? (
                        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (c.uses_count / c.max_uses) * 100)}%` }} />
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusDot label={c.is_active ? 'Active' : 'Inactive'} tone={c.is_active ? 'mint' : 'muted'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Can permission="coupons.delete">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.code)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </Can>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageCount={pageCount} total={total} pageSize={10} onPageChange={setPage} />
      </div>
    </div>
    </ProtectedRoute>
  )
}
