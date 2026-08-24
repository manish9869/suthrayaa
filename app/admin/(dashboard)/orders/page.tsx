'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAdminOrders, type AdminOrderSummary } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending_payment: 'outline',
  confirmed: 'secondary',
  in_production: 'secondary',
  shipped: 'default',
  delivered: 'default',
  cancelled: 'destructive',
  refunded: 'destructive',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [status, setStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getAdminOrders({ status: status === 'all' ? undefined : status })
      .then((res) => setOrders(res.items))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">{orders.length} orders</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_production">In Production</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                      {o.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{o.customerName ?? 'Guest'}</TableCell>
                  <TableCell>{o.itemCount}</TableCell>
                  <TableCell>{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <Badge variant={o.paymentStatus === 'paid' ? 'secondary' : 'outline'}>{o.paymentStatus}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status] ?? 'outline'}>{o.status.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
