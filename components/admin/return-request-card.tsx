'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, PackageCheck, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusDot, type DotTone } from '@/components/admin/status-dot'
import { Can } from '@/components/admin/can'
import { updateReturnRequest, type AdminReturnRequest, type ReturnStatus } from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { cn } from '@/lib/utils'

export const RETURN_DOT: Record<ReturnStatus, DotTone> = {
  requested: 'gold',
  approved: 'primary',
  received: 'violet',
  refunded: 'mint',
  exchanged: 'mint',
  rejected: 'destructive',
  cancelled: 'muted',
}

/**
 * One return / exchange request with the moves the server allows from its status. A received
 * return is settled by refunding the order — `onRefund` (order page) opens the refund dialog
 * prefilled, otherwise the card links to the order.
 */
export function ReturnRequestCard({
  request,
  orderHref,
  suggestedRefund,
  onRefund,
  onChanged,
  className,
}: {
  request: AdminReturnRequest
  orderHref?: string
  suggestedRefund?: number
  onRefund?: (amount?: number) => void
  onChanged: () => void
  className?: string
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [declining, setDeclining] = useState(false)
  const [note, setNote] = useState('')

  const move = async (status: 'approved' | 'rejected' | 'received' | 'exchanged', adminNote?: string) => {
    setBusy(status)
    try {
      await updateReturnRequest(request.id, status, adminNote)
      toast.success(
        status === 'approved' ? 'Return approved — the customer has been emailed' : status === 'rejected' ? 'Request declined — the customer has been emailed' : status === 'received' ? 'Marked as received' : 'Exchange completed'
      )
      setDeclining(false)
      setNote('')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the request')
    } finally {
      setBusy(null)
    }
  }

  const canRefund = request.type === 'return' && (request.status === 'approved' || request.status === 'received')

  return (
    <div className={cn('rounded-xl border p-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{request.type === 'exchange' ? 'Exchange' : 'Return'}</span>
        <StatusDot label={request.statusLabel} tone={RETURN_DOT[request.status]} />
        <span className="ml-auto text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm">
        {request.items.map((i) => (
          <li key={i.orderItemId}>
            {i.name} <span className="text-muted-foreground">× {i.quantity}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">
        <span className="font-medium">{request.reasonLabel}</span>
        {request.details && <span className="text-muted-foreground"> — “{request.details}”</span>}
      </p>
      {request.adminNote && <p className="mt-1 text-xs text-muted-foreground">Note to customer: {request.adminNote}</p>}

      {declining ? (
        <div className="mt-3 space-y-2">
          <label htmlFor={`decline-${request.id}`} className="text-xs font-medium">
            Why can’t we accept it? The customer sees this.
          </label>
          <Textarea id={`decline-${request.id}`} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The return window closed on 12 Sep" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={!note.trim() || busy !== null} onClick={() => move('rejected', note)}>
              {busy === 'rejected' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Decline request
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <Can permission="orders.update">
          <div className="mt-3 flex flex-wrap gap-2">
            {request.allowedNext.includes('approved') && (
              <Button size="sm" disabled={busy !== null} onClick={() => move('approved')}>
                {busy === 'approved' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
              </Button>
            )}
            {request.allowedNext.includes('received') && (
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => move('received')}>
                {busy === 'received' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />} Mark received
              </Button>
            )}
            {request.allowedNext.includes('exchanged') && (
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => move('exchanged')}>
                {busy === 'exchanged' && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Replacement sent
              </Button>
            )}
            {canRefund && (
              <Can permission="orders.refund">
                {onRefund ? (
                  <Button size="sm" variant="outline" onClick={() => onRefund(suggestedRefund)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Refund{suggestedRefund ? ` ${formatPrice(suggestedRefund)}` : ''}…
                  </Button>
                ) : orderHref ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={orderHref}>
                      <RotateCcw className="h-3.5 w-3.5" /> Refund on order page
                    </Link>
                  </Button>
                ) : null}
              </Can>
            )}
            {request.allowedNext.includes('rejected') && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy !== null} onClick={() => setDeclining(true)}>
                <X className="h-3.5 w-3.5" /> Decline
              </Button>
            )}
          </div>
        </Can>
      )}
    </div>
  )
}
