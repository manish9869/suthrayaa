'use client'

import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminCustomers, type AdminCustomer } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminCustomers()
      .then((res) => setCustomers(res.items))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Customers</h1>
        <p className="text-muted-foreground text-sm">{customers.length} registered</p>
      </div>

      <div className="border rounded-xl bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No customers yet
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.firstName || c.lastName ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Unnamed'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email || c.phone || '—'}</TableCell>
                  <TableCell>{c.orderCount}</TableCell>
                  <TableCell>{formatPrice(c.totalSpent)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
