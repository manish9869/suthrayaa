'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Minus, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  cancelReturn,
  requestReturn,
  FAULT_REASONS,
  RETURN_REASON_LABELS,
  type OrderReturns,
  type ReturnReason,
  type ReturnRequest,
} from '@/lib/api/account'
import { cn } from '@/lib/utils'

const STEPS: ReturnRequest['status'][] = ['requested', 'approved', 'received']
const TONE: Record<ReturnRequest['status'], string> = {
  requested: 'bg-gold/20 text-gold-foreground ring-gold/40',
  approved: 'bg-primary/10 text-primary ring-primary/20',
  received: 'bg-sky/10 text-sky-ink ring-sky/20',
  refunded: 'bg-mint text-mint-foreground ring-mint-foreground/20',
  exchanged: 'bg-mint text-mint-foreground ring-mint-foreground/20',
  rejected: 'bg-destructive/10 text-destructive-ink ring-destructive/20',
  cancelled: 'bg-muted text-muted-foreground ring-border',
}
/** What happens next, in the customer's words, for a request in each status. */
const NEXT: Partial<Record<ReturnRequest['status'], string>> = {
  requested: 'We’ll review your request within 1–2 business days and email you.',
  approved: 'Approved — pack the items securely and send them back. We’ll email you when they arrive.',
  received: 'We’ve received your parcel and are checking it.',
  refunded: 'Refunded to your original payment method. Banks usually take 5–7 business days.',
  exchanged: 'Your replacement is on its way.',
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })

export function ReturnStatusBadge({ status, label }: { status: ReturnRequest['status']; label: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', TONE[status])}>{label}</span>
}

/** The "Returns & exchanges" panel on an order: past requests, their progress, and the way to start one. */
export function OrderReturnsPanel({ orderId, returns, onChange }: { orderId: string; returns: OrderReturns; onChange: () => void }) {
  const [open, setOpen] = useState(false)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)
  // Withdrawn requests aren't worth showing; the order's activity log still records them
  const requests = returns.requests.filter((r) => r.status !== 'cancelled')

  const withdraw = async (id: string) => {
    setWithdrawing(id)
    try {
      await cancelReturn(id)
      toast.success('Your return request has been withdrawn')
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not withdraw the request')
    } finally {
      setWithdrawing(null)
    }
  }

  if (!returns.canRequest && requests.length === 0) return null

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-[0_1px_2px_color-mix(in_oklab,var(--shadow-tint)_4%,transparent)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Returns &amp; exchanges</h3>
        {returns.canRequest && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Request a return
          </Button>
        )}
      </div>

      {returns.canRequest && returns.deadline && requests.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Not quite right? You can request a return or exchange until <span className="font-medium text-foreground">{fmtDate(returns.deadline)}</span>.{' '}
          <Link href="/returns" className="text-primary underline underline-offset-2">
            Returns policy
          </Link>
        </p>
      )}

      <ul className="space-y-4">
        {requests.map((r) => {
          const stepIndex = STEPS.indexOf(r.status)
          return (
            <li key={r.id} className="rounded-2xl bg-muted/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{r.type === 'exchange' ? 'Exchange' : 'Return'}</p>
                <ReturnStatusBadge status={r.status} label={r.statusLabel} />
                <span className="text-xs text-muted-foreground">Requested {fmtDate(r.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {r.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')} · {r.reasonLabel}
              </p>
              {stepIndex >= 0 && (
                <ol className="mt-3 flex gap-1.5" aria-label="Return progress">
                  {STEPS.map((s, i) => (
                    <li key={s} className="flex-1">
                      <span className={cn('block h-1.5 rounded-full', i <= stepIndex ? 'bg-primary' : 'bg-border')} />
                      <span className={cn('mt-1 block text-[11px] capitalize', i <= stepIndex ? 'font-medium text-foreground' : 'text-muted-foreground')}>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
              {NEXT[r.status] && <p className="mt-3 text-sm">{NEXT[r.status]}</p>}
              {r.adminNote && (
                <p className="mt-2 rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-border">
                  <span className="font-medium">Note from us:</span> {r.adminNote}
                </p>
              )}
              {(r.status === 'requested' || r.status === 'approved') && (
                <Button variant="ghost" size="sm" className="mt-2 -ml-2 rounded-full text-muted-foreground" disabled={withdrawing === r.id} onClick={() => withdraw(r.id)}>
                  {withdrawing === r.id && <Loader2 className="h-4 w-4 animate-spin" />} Withdraw request
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {returns.canRequest && (
        <RequestReturnDialog
          open={open}
          onOpenChange={setOpen}
          orderId={orderId}
          returns={returns}
          onDone={() => {
            setOpen(false)
            onChange()
          }}
        />
      )}
    </section>
  )
}

function RequestReturnDialog({
  open,
  onOpenChange,
  orderId,
  returns,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  returns: OrderReturns
  onDone: () => void
}) {
  const returnable = returns.items.filter((i) => i.available > 0)
  const [type, setType] = useState<'return' | 'exchange'>('return')
  const [qty, setQty] = useState<Record<string, number>>(() => (returnable.length === 1 ? { [returnable[0].orderItemId]: 1 } : {}))
  const [reason, setReason] = useState<ReturnReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chosen = useMemo(() => returnable.filter((i) => (qty[i.orderItemId] ?? 0) > 0), [returnable, qty])
  const needsFault = chosen.some((i) => i.faultOnly)
  const reasonOk = reason !== null && (!needsFault || FAULT_REASONS.includes(reason))
  // Adding a made-for-you piece rules out "changed my mind" and friends — clear such a choice
  useEffect(() => {
    if (needsFault && reason && !FAULT_REASONS.includes(reason)) setReason(null)
  }, [needsFault, reason])
  const detailsOk = reason !== 'other' || details.trim().length > 0
  const canSubmit = chosen.length > 0 && reasonOk && detailsOk && !submitting

  const setItemQty = (id: string, next: number, max: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max, next)) }))

  const submit = async () => {
    if (!canSubmit || !reason) return
    setSubmitting(true)
    setError(null)
    try {
      await requestReturn(orderId, {
        type,
        reason,
        details: details.trim() || undefined,
        items: chosen.map((i) => ({ orderItemId: i.orderItemId, quantity: qty[i.orderItemId] })),
      })
      toast.success(type === 'exchange' ? 'Exchange requested — we’ll email you the next steps' : 'Return requested — we’ll email you the next steps')
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a return or exchange</DialogTitle>
          <DialogDescription>
            {returns.deadline ? `Available until ${fmtDate(returns.deadline)}. ` : ''}We’ll review it and email you what to do next.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">What would you like?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['return', 'A refund', 'Money back to your original payment method'],
                  ['exchange', 'An exchange', 'A replacement, subject to availability'],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn('cursor-pointer rounded-2xl border px-3.5 py-3 text-sm transition-colors', type === value ? 'border-primary bg-primary/5' : 'hover:border-primary/40')}
                >
                  <input type="radio" name="return-type" className="sr-only" checked={type === value} onChange={() => setType(value)} />
                  <span className="block font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Which items?</legend>
            <ul className="space-y-2">
              {returnable.map((i) => {
                const n = qty[i.orderItemId] ?? 0
                return (
                  <li key={i.orderItemId} className={cn('flex items-center gap-3 rounded-2xl border p-2.5 pr-3', n > 0 && 'border-primary bg-primary/5')}>
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sand">
                      {i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.faultOnly ? 'Made for you — only if damaged, defective or wrong' : `${i.available} returnable`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label={`Fewer ${i.name}`} disabled={n === 0} onClick={() => setItemQty(i.orderItemId, n - 1, i.available)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                        {n}
                      </span>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label={`More ${i.name}`} disabled={n >= i.available} onClick={() => setItemQty(i.orderItemId, n + 1, i.available)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">What went wrong?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(RETURN_REASON_LABELS) as ReturnReason[]).map((r) => {
                const blocked = needsFault && !FAULT_REASONS.includes(r)
                return (
                  <label
                    key={r}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                      blocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/40',
                      reason === r && !blocked && 'border-primary bg-primary/5'
                    )}
                  >
                    <input type="radio" name="return-reason" className="accent-[var(--primary)]" disabled={blocked} checked={reason === r} onChange={() => setReason(r)} />
                    {RETURN_REASON_LABELS[r]}
                  </label>
                )
              })}
            </div>
            {needsFault && (
              <p className="mt-2 text-xs text-muted-foreground">Personalised and made-to-order pieces can only come back if they arrived damaged, defective or wrong.</p>
            )}
          </fieldset>

          <div>
            <label htmlFor="return-details" className="mb-2 block text-sm font-medium">
              Anything we should know? {reason !== 'other' && <span className="font-normal text-muted-foreground">(optional)</span>}
            </label>
            <Textarea
              id="return-details"
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={reason === 'damaged' || reason === 'defective' ? 'What happened? You can reply to our email with a photo.' : 'A few words help us sort it out faster'}
              className="rounded-xl"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-destructive/[0.06] px-4 py-3 text-sm text-destructive-ink ring-1 ring-inset ring-destructive/20">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" className="rounded-full" disabled={submitting} onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button className="rounded-full" disabled={!canSubmit} onClick={submit}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
