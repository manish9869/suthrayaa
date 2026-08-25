'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Search } from 'lucide-react'
import { getAdminCoupons, createCoupon, deleteCoupon, type AdminCoupon } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { SortableTh } from '@/components/admin/sortable-th'
import { DataTablePagination } from '@/components/admin/data-table-pagination'
import { useSortableData } from '@/lib/hooks/use-sortable-data'
import { usePaginated } from '@/lib/hooks/use-paginated'

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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Coupons</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {coupons.length} coupons
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Coupon
            </Button>
          </DialogTrigger>
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
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search coupon code..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
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
            <TableRow className="border-white/10 hover:bg-transparent">
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
              <TableRow className="border-white/10">
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No coupons match these filters
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((c) => (
                <TableRow key={c.id} className="border-white/10">
                  <TableCell className="font-medium">{c.code}</TableCell>
                  <TableCell>{c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}</TableCell>
                  <TableCell>{formatPrice(c.min_subtotal)}</TableCell>
                  <TableCell>
                    {c.uses_count}
                    {c.max_uses ? ` / ${c.max_uses}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'secondary' : 'outline'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.code)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageCount={pageCount} total={total} pageSize={10} onPageChange={setPage} />
      </div>
    </div>
  )
}
