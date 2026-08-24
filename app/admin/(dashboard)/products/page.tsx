'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { getAdminProducts, deleteProduct, type AdminProductListItem } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { toast } from 'sonner'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getAdminProducts({ limit: 100, search: search || undefined })
      .then((res) => setProducts(res.items))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? It will be hidden from the storefront but order history is kept.`)) return
    try {
      await deleteProduct(id)
      toast.success('Product deactivated')
      load()
    } catch {
      toast.error('Failed to deactivate product')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Products</h1>
          <p className="text-muted-foreground text-sm">{products.length} products</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="border rounded-xl bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customizable</TableHead>
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
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {p.images[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" />}
                      </div>
                      <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    <span className={p.stock <= 5 ? 'text-destructive font-medium' : ''}>{p.stock}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? 'secondary' : 'outline'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>{p.isCustomizable ? <Badge variant="outline">Yes</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/products/${p.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id, p.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
