'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { updateAdminSettings } from '@/lib/api/settings'
import { uploadContentImage } from '@/lib/api/admin'
import { PopupBody, isLive, popupFromValues } from '@/components/site-popup'
import { cn } from '@/lib/utils'
import { Can } from './can'

/**
 * Admin → Settings → Pop-up Alert: write the message, choose where and how often it shows,
 * and see exactly what customers will see while editing.
 */

const KEYS = [
  'popup.enabled',
  'popup.title',
  'popup.message',
  'popup.image_url',
  'popup.button_label',
  'popup.button_link',
  'popup.coupon_code',
  'popup.style',
  'popup.pages',
  'popup.frequency',
  'popup.delay_seconds',
  'popup.start_date',
  'popup.end_date',
] as const

const STYLES = [
  { value: 'modal', label: 'Pop-up in the middle', note: 'Best for a sale or big news' },
  { value: 'corner', label: 'Small card in the corner', note: 'Gentle — doesn’t block the page' },
]
const PAGES = [
  { value: 'all', label: 'Every page', note: 'Except checkout' },
  { value: 'home', label: 'Home page only', note: '' },
  { value: 'shopping', label: 'Home, shop & products', note: '' },
  { value: 'cart_checkout', label: 'Cart & checkout', note: 'e.g. delivery notices' },
]
const FREQUENCY = [
  { value: 'once', label: 'Once per customer', note: 'Until you change the message' },
  { value: 'session', label: 'Once per visit', note: 'Recommended' },
  { value: 'always', label: 'On every page', note: 'Use sparingly' },
]

/** ISO / free-text date → the value a datetime-local input expects (local time). */
function toLocalInput(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const when = (v: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v))

export function PopupSettingsPanel({ values, onSaved }: { values: Record<string, unknown>; onSaved: () => void }) {
  const saved = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, values[k] ?? ''])) as Record<string, unknown>, [values])
  const [draft, setDraft] = useState<Record<string, unknown>>(saved)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => setDraft(saved), [saved])

  const set = (key: (typeof KEYS)[number], value: unknown) => setDraft((d) => ({ ...d, [key]: value }))
  const dirty = KEYS.some((k) => String(draft[k] ?? '') !== String(saved[k] ?? ''))
  const popup = popupFromValues(draft)
  const enabled = Boolean(draft['popup.enabled'])
  const empty = !popup.title && !popup.message

  const status = !enabled
    ? { label: 'Off', tone: 'bg-muted text-muted-foreground' }
    : empty
      ? { label: 'Add a title or message', tone: 'bg-amber-500/15 text-amber-700' }
      : !isLive(popup) && popup.startDate && new Date(popup.startDate) > new Date()
        ? { label: `Scheduled · starts ${when(popup.startDate)}`, tone: 'bg-sky-500/15 text-sky-700' }
        : !isLive(popup)
          ? { label: 'Ended', tone: 'bg-muted text-muted-foreground' }
          : { label: 'Live on the shop', tone: 'bg-emerald-500/15 text-emerald-700' }

  const save = async () => {
    const patch: Record<string, unknown> = {}
    for (const k of KEYS) if (String(draft[k] ?? '') !== String(saved[k] ?? '')) patch[k] = k === 'popup.delay_seconds' ? Number(draft[k]) || 0 : draft[k]
    if (!Object.keys(patch).length) return
    if (String(draft['popup.button_label'] ?? '').trim() && !String(draft['popup.button_link'] ?? '').trim()) {
      toast.error('Add a link for the button, or clear the button text.')
      return
    }
    setSaving(true)
    try {
      await updateAdminSettings(patch)
      toast.success(enabled && !empty ? 'Pop-up saved — it’s on the shop now (within a minute)' : 'Pop-up saved')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the pop-up')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const { url } = await uploadContentImage(file)
      set('popup.image_url', url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const choice = (key: (typeof KEYS)[number], options: { value: string; label: string; note: string }[], cols = 'sm:grid-cols-2') => (
    <div className={cn('grid grid-cols-1 gap-2', cols)} role="radiogroup">
      {options.map((o) => {
        const on = String(draft[key] || options[0].value) === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => set(key, o.value)}
            className={cn('rounded-xl border p-3 text-left transition-colors', on ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground/40')}
          >
            <span className="block text-sm font-medium">{o.label}</span>
            {o.note && <span className="mt-0.5 block text-xs text-muted-foreground">{o.note}</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <div className={`${GLASS_PANEL} space-y-6 p-6`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="popup-enabled" className="cursor-pointer text-base font-semibold">
                Show a pop-up on the shop
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">A sale, a holiday notice, a coupon — anything customers should see.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline', status.tone)}>{status.label}</span>
              <Switch id="popup-enabled" checked={enabled} onCheckedChange={(v) => set('popup.enabled', v)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="popup-title">Title</Label>
              <Input id="popup-title" value={String(draft['popup.title'] ?? '')} onChange={(e) => set('popup.title', e.target.value)} placeholder="Diwali sale — 20% off everything" maxLength={120} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="popup-message">Message</Label>
              <Textarea
                id="popup-message"
                rows={3}
                value={String(draft['popup.message'] ?? '')}
                onChange={(e) => set('popup.message', e.target.value)}
                placeholder="Handmade gifts for the festival — order by 25 Oct for delivery before Diwali."
                maxLength={400}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Picture (optional)</Label>
              <div className="flex flex-wrap items-center gap-3">
                {popup.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={popup.imageUrl} alt="" className="h-16 w-24 rounded-lg object-cover ring-1 ring-border" />
                ) : (
                  <span className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed text-[11px] text-muted-foreground">No picture</span>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {popup.imageUrl ? 'Change' : 'Upload'}
                </Button>
                {popup.imageUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set('popup.image_url', '')}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="popup-button">Button text (optional)</Label>
              <Input id="popup-button" value={String(draft['popup.button_label'] ?? '')} onChange={(e) => set('popup.button_label', e.target.value)} placeholder="Shop the sale" maxLength={40} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-link">Button link</Label>
              <Input id="popup-link" value={String(draft['popup.button_link'] ?? '')} onChange={(e) => set('popup.button_link', e.target.value)} placeholder="/shop or https://…" spellCheck={false} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="popup-coupon">Coupon code (optional)</Label>
              <Input
                id="popup-coupon"
                value={String(draft['popup.coupon_code'] ?? '')}
                onChange={(e) => set('popup.coupon_code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                placeholder="DIWALI20"
                className="font-mono uppercase"
                spellCheck={false}
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">Customers can copy it with one tap. Create the code in Coupons first.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            {choice('popup.style', STYLES)}
          </div>
          <div className="space-y-2">
            <Label>Show on</Label>
            {choice('popup.pages', PAGES)}
          </div>
          <div className="space-y-2">
            <Label>How often</Label>
            {choice('popup.frequency', FREQUENCY, 'sm:grid-cols-3')}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="popup-delay">Wait before showing</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="popup-delay"
                  type="number"
                  min={0}
                  max={60}
                  value={String(draft['popup.delay_seconds'] ?? 3)}
                  onChange={(e) => set('popup.delay_seconds', e.target.value)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-start">Start (optional)</Label>
              <Input id="popup-start" type="datetime-local" value={toLocalInput(draft['popup.start_date'])} onChange={(e) => set('popup.start_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="popup-end">End (optional)</Label>
              <Input id="popup-end" type="datetime-local" value={toLocalInput(draft['popup.end_date'])} onChange={(e) => set('popup.end_date', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className={`${GLASS_PANEL} p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Preview</p>
              <a href="/?popup-preview=1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Open the shop <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(160deg,#f3effd,#fbf6ee)] p-4">
              {popup.style === 'modal' && <div className="absolute inset-0 bg-black/35" />}
              {empty ? (
                <p className="relative text-sm text-muted-foreground">Add a title or message to see the pop-up.</p>
              ) : (
                <div
                  className={cn(
                    'relative overflow-hidden bg-card shadow-2xl',
                    popup.style === 'modal' ? 'w-full max-w-[340px] rounded-[1.6rem]' : 'absolute bottom-3 left-3 w-[260px] rounded-[1.4rem] ring-1 ring-border'
                  )}
                >
                  <PopupBody popup={popup} compact={popup.style === 'corner'} />
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {!enabled ? 'Switch it on and save to show it on the shop.' : 'Saved changes reach the shop within a minute. Closing it counts as “seen”.'}
            </p>
          </div>
        </div>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-foreground px-4 py-3 text-background shadow-xl">
          <p className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-gold" /> You have unsaved changes.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-background hover:bg-background/10 hover:text-background" onClick={() => setDraft(saved)} disabled={saving}>
              Discard
            </Button>
            <Can permission="settings.storefront">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Pop-up'}
              </Button>
            </Can>
          </div>
        </div>
      )}
    </div>
  )
}
