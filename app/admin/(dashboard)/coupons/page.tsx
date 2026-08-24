'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import { getAdminCoupons, createCoupon, deleteCoupon, type AdminCoupon } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold">Coupons</h1>
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

      <div className="border rounded-xl bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.id}>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
