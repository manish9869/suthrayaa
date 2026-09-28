'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/hooks/use-auth'
import { submitReview } from '@/lib/api/account'
import { ApiError } from '@/lib/api/http'
import { cn } from '@/lib/utils'

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

interface ReviewFormProps {
  productId: string
  productName: string
  variant?: 'default' | 'outline'
  className?: string
}

/** "Write a review" button + dialog. Signed-out visitors are sent to login and brought back.
 * Submitted reviews are held for admin moderation (Admin → Reviews) before they appear. */
export function ReviewForm({ productId, productName, variant = 'outline', className }: ReviewFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const start = () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`${pathname}#reviews`)}`)
      return
    }
    setOpen(true)
  }

  const reset = () => {
    setRating(0)
    setHover(0)
    setTitle('')
    setContent('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) return toast.error('Please choose a star rating')
    if (!content.trim()) return toast.error('Please tell us a little about the piece')
    setSubmitting(true)
    try {
      await submitReview({ productId, rating, title: title.trim() || undefined, content: content.trim() })
      toast.success('Thank you! Your review will appear once it’s approved.')
      setOpen(false)
      reset()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not submit your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const shown = hover || rating

  return (
    <>
      <Button variant={variant} className={className} onClick={start}>
        Write a review
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review {productName}</DialogTitle>
            <DialogDescription>Share how the piece looks and feels in real life — it helps other shoppers.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Your rating</Label>
              <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    aria-pressed={rating === n}
                    className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                  >
                    <Star className={cn('h-7 w-7', n <= shown ? 'fill-gold text-gold' : 'text-muted-foreground/30')} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">{RATING_LABELS[shown]}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-title">Title (optional)</Label>
              <Input id="review-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Even prettier in person" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-content">Your review</Label>
              <Textarea
                id="review-content"
                value={content}
                maxLength={2000}
                rows={5}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What did you love? How was the size, colour and finish?"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit review'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
