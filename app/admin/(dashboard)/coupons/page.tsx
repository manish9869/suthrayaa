'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Search, Ticket, Pencil } from 'lucide-react'
import { getAdminCoupons, createCoupon, updateCoupon, deleteCoupon, type AdminCoupon, type CouponInput } from '@/lib/api/admin'
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

// Coupon windows are whole days in IST: starts at 00:00, expires at 23:59:59.
const toIsoStart = (d: string) => (d ? new Date(`${d}T00:00:00+05:30`).toISOString() : null)
const toIsoEnd = (d: string) => (d ? new Date(`${d}T23:59:59+05:30`).toISOString() : null)
const toDateInput = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '')
const optionalInt = (v: string) => (v.trim() === '' ? null : Math.max(1, Math.floor(Number(v))))

const EMPTY_FORM = {
  code: '',
  type: 'percent' as 'percent' | 'flat',
  value: 10,
  minSubtotal: 0,
  maxUses: '',
  maxUsesPerCustomer: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof typeof EMPTY_FORM>(key: K, v: (typeof EMPTY_FORM)[K]) => setForm((f) => ({ ...f, [key]: v }))

  const load = () => getAdminCoupons().then(setCoupons)
  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (c: AdminCoupon) => {
    setEditingId(c.id)
    setForm({
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minSubtotal: Number(c.min_subtotal),
      maxUses: c.max_uses ? String(c.max_uses) : '',
      maxUsesPerCustomer: c.max_uses_per_customer ? String(c.max_uses_per_customer) : '',
      startsAt: toDateInput(c.starts_at),
      expiresAt: toDateInput(c.expires_at),
      isActive: c.is_active,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (form.code.trim().length < 3) return toast.error('Code must be at least 3 characters')
    if (!(form.value > 0)) return toast.error('Discount value must be greater than 0')
    if (form.type === 'percent' && form.value > 100) return toast.error('A percent discount can’t exceed 100%')
    if (form.startsAt && form.expiresAt && form.expiresAt < form.startsAt) return toast.error('Expiry date must be after the start date')
    const input: CouponInput = {
      code: form.code.trim(),
      type: form.type,
      value: form.value,
      minSubtotal: form.minSubtotal || 0,
      maxUses: optionalInt(form.maxUses),
      maxUsesPerCustomer: optionalInt(form.maxUsesPerCustomer),
      startsAt: toIsoStart(form.startsAt),
      expiresAt: toIsoEnd(form.expiresAt),
      isActive: form.isActive,
    }
    setSaving(true)
    try {
      if (editingId) await updateCoupon(editingId, input)
      else await createCoupon(input)
      toast.success(editingId ? 'Coupon updated' : 'Coupon created')
      setOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : editingId ? 'Failed to update coupon' : 'Failed to create coupon')
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
        <Can permission="coupons.create">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Coupon
          </Button>
        </Can>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Coupon' : 'New Coupon'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="WELCOME10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => set('type', v as 'percent' | 'flat')}>
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
                  <Label>Value {form.type === 'percent' ? '(%)' : '(₹)'}</Label>
                  <Input type="number" min={0} value={form.value} onChange={(e) => set('value', Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum Order Value (₹)</Label>
                <Input type="number" min={0} value={form.minSubtotal} onChange={(e) => set('minSubtotal', Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total uses</Label>
                  <Input type="number" min={1} placeholder="Unlimited" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Uses per customer</Label>
                  <Input type="number" min={1} placeholder="Unlimited" value={form.maxUsesPerCustomer} onChange={(e) => set('maxUsesPerCustomer', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Starts on</Label>
                  <Input type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Expires on</Label>
                  <Input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive coupons are rejected at checkout.</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create'}
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
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No coupons match these filters
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((c) => (
                <TableRow key={c.id}>
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
                    {c.expires_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(c.expires_at) < new Date() ? 'Expired' : 'Expires'}{' '}
                        {new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Can permission="coupons.update">
                      <Button variant="ghost" size="icon" title="Edit coupon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Can>
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
