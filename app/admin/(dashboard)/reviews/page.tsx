'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, EyeOff, Star, Trash2, MessageSquareText, ExternalLink, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getAdminReviews, moderateReview, deleteReview, type AdminReview } from '@/lib/api/admin'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { InitialsAvatar, EmptyState } from '@/components/admin/admin-bits'
import { StatusDot } from '@/components/admin/status-dot'
import { PageLoader } from '@/components/admin/loading-state'
import { SegmentedControl } from '@/components/admin/segmented-control'

type Filter = 'pending' | 'published' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'published', label: 'Published' },
  { value: 'all', label: 'All' },
]

const EMPTY_COPY: Record<Filter, { title: string; description: string }> = {
  pending: { title: 'Nothing to moderate', description: 'New customer reviews land here for approval before they appear on product pages.' },
  published: { title: 'No published reviews yet', description: 'Approve a pending review to show it on its product page.' },
  all: { title: 'No reviews yet', description: 'Customers can review a product from its page once they’re signed in.' },
}

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getAdminReviews(filter)
      .then(setReviews)
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const setPublished = async (review: AdminReview, isPublished: boolean) => {
    setBusyId(review.id)
    try {
      const updated = await moderateReview(review.id, isPublished)
      toast.success(isPublished ? 'Review published' : 'Review hidden')
      // Drop it from a filtered view it no longer belongs to; update it in place under "All"
      setReviews((prev) => (filter === 'all' ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev.filter((r) => r.id !== review.id)))
    } catch {
      toast.error('Failed to update review')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (review: AdminReview) => {
    if (!confirm(`Delete ${review.customerName}’s review? This can’t be undone.`)) return
    setBusyId(review.id)
    try {
      await deleteReview(review.id)
      toast.success('Review deleted')
      setReviews((prev) => prev.filter((r) => r.id !== review.id))
    } catch {
      toast.error('Failed to delete review')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ProtectedRoute permission="reviews.view">
      <div className="space-y-6">
        <PageHeader
          title="Product Reviews"
          description="Approve customer reviews before they appear on product pages. Published reviews update the product’s rating."
          actions={<SegmentedControl options={FILTERS} value={filter} onChange={setFilter} size="md" />}
        />

        {loading ? (
          <PageLoader />
        ) : reviews.length === 0 ? (
          <Card>
            <EmptyState icon={MessageSquareText} title={EMPTY_COPY[filter].title} description={EMPTY_COPY[filter].description} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {reviews.map((r) => (
              <Card key={r.id} className="gap-0 py-0">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-gold text-gold' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                    <StatusDot label={r.isPublished ? 'Published' : 'Pending'} tone={r.isPublished ? 'mint' : 'muted'} />
                  </div>

                  {r.productName && (
                    <Link
                      href={r.productSlug ? `/product/${r.productSlug}` : '#'}
                      target="_blank"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {r.productName} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                  <p className="mt-1 flex-1 whitespace-pre-line text-[14.5px] leading-relaxed text-foreground/85">{r.content}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
                    <InitialsAvatar name={r.customerName} tone="brand" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {r.customerName}
                        {r.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified purchase" />}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {r.verified ? ' · Verified purchase' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Can permission="reviews.update">
                        {r.isPublished ? (
                          <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => setPublished(r, false)}>
                            <EyeOff className="h-4 w-4" /> Hide
                          </Button>
                        ) : (
                          <Button size="sm" disabled={busyId === r.id} onClick={() => setPublished(r, true)}>
                            <Check className="h-4 w-4" /> Publish
                          </Button>
                        )}
                      </Can>
                      <Can permission="reviews.delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete review"
                          disabled={busyId === r.id}
                          onClick={() => handleDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Can>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
