'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Check, Download, FileText, Loader2, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'
import {
  fetchInvoicePreviewBlob,
  getInvoiceSettings,
  updateInvoiceSettings,
  type AdminInvoiceSettings,
} from '@/lib/api/admin'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { cn } from '@/lib/utils'
import { PdfCanvasPreview } from '@/components/admin/pdf-canvas-preview'

type Settings = AdminInvoiceSettings
type Accent = NonNullable<Settings['accent']>
type HeaderStyle = NonNullable<Settings['headerStyle']>

const DEFAULTS = {
  tagline: 'Handcrafted crochet, made to order',
  headerStyle: 'dark' as HeaderStyle,
  accent: 'peach' as Accent,
  showHsn: true,
  showGstSummary: true,
  showAmountInWords: true,
  showPayment: true,
  showSignature: true,
  signatoryName: '',
}

/** Mirrors the renderer's accent palettes (label colour + soft table-head tint). */
const ACCENTS: { value: Accent; label: string; color: string; soft: string }[] = [
  { value: 'peach', label: 'Peach', color: '#F28A63', soft: '#EFEAFF' },
  { value: 'violet', label: 'Violet', color: '#6D4AFF', soft: '#EFEAFF' },
  { value: 'rose', label: 'Rose', color: '#D9546F', soft: '#FCE9EE' },
  { value: 'teal', label: 'Teal', color: '#0E8C80', soft: '#E1F4F1' },
]

/** Fields sent to the preview endpoint (GST identity always comes from the saved settings). */
const PREVIEW_KEYS = [
  'businessName', 'address', 'email', 'phone', 'taxNumber', 'footer', 'terms',
  'showSku', 'showTax', 'showCustomizationPricing',
  'tagline', 'headerStyle', 'accent', 'showHsn', 'showGstSummary', 'showAmountInWords', 'showPayment', 'showSignature', 'signatoryName',
] as const

const GST_KEYS = ['isGstRegistered', 'gstin', 'gstLegalName', 'gstState', 'gstStateCode', 'pan', 'customerGstinOptional'] as const

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className={cn(GLASS_PANEL, 'p-5 sm:p-6')}>
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  children,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={cn('py-3.5 first:pt-0 last:pb-0', disabled && 'opacity-55')}>
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{title}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{description}</span>
        </span>
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5 shrink-0" />
      </label>
      {children}
    </div>
  )
}

export default function InvoiceSettingsPage() {
  const [saved, setSaved] = useState<Settings | null>(null)
  const [draft, setDraft] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getInvoiceSettings()
      .then((s) => {
        const withDefaults = { ...DEFAULTS, ...s }
        setSaved(withDefaults)
        setDraft(withDefaults)
      })
      .finally(() => setLoading(false))
  }, [])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((s) => (s ? { ...s, [key]: value } : s))

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  // ---- live preview: re-render the sample PDF (debounced) whenever a preview field changes ----
  const previewDraft = useMemo(() => {
    if (!draft) return null
    const out: Record<string, unknown> = {}
    for (const k of PREVIEW_KEYS) out[k] = draft[k]
    return out as Partial<Settings>
  }, [draft])
  const previewKey = JSON.stringify(previewDraft)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [previewNonce, setPreviewNonce] = useState(0)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!previewDraft) return
    const ctrl = new AbortController()
    setPreviewState('loading')
    const t = setTimeout(() => {
      fetchInvoicePreviewBlob(previewDraft, ctrl.signal)
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          if (urlRef.current) URL.revokeObjectURL(urlRef.current)
          urlRef.current = url
          setPreviewUrl(url)
          setPreviewState('idle')
        })
        .catch((err) => {
          if (!ctrl.signal.aborted) {
            console.error(err)
            setPreviewState('error')
          }
        })
    }, 550)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, previewNonce])
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  const onPreviewError = useCallback(() => setPreviewState('error'), [])

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    try {
      // GST identity is edited under Site Settings → GST & Tax, never from here
      const body: Partial<Settings> = { ...draft }
      for (const k of GST_KEYS) delete body[k]
      const updated = { ...DEFAULTS, ...(await updateInvoiceSettings(body)) }
      setSaved(updated)
      setDraft(updated)
      toast.success('Invoice settings saved — new invoices will use this design')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!draft) return <p className="text-muted-foreground">Failed to load settings</p>

  const gstKnown = draft.isGstRegistered !== undefined
  const taxInvoice = Boolean(draft.isGstRegistered && draft.gstin)

  return (
    <ProtectedRoute permission="settings.view">
      <div className="space-y-6 pb-24">
        <PageHeader
          title="Invoice Settings"
          description="Design and content of every invoice PDF. The preview updates as you change options; changes apply to invoices generated after you save — issued invoices never change."
        />

        {gstKnown && (
          <div
            className={cn(
              'flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between',
              taxInvoice ? 'border-mint/25 bg-mint/[0.06]' : 'border-gold/30 bg-gold/[0.08]'
            )}
          >
            <div className="flex items-start gap-3">
              {taxInvoice ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold" />}
              <div className="text-sm">
                {taxInvoice ? (
                  <>
                    <p className="font-medium">GST tax invoices are on</p>
                    <p className="text-[13px] text-muted-foreground">
                      GSTIN {draft.gstin}
                      {draft.gstState ? ` · ${draft.gstState}${draft.gstStateCode ? ` (${draft.gstStateCode})` : ''}` : ''} — invoices show HSN, CGST/SGST or IGST, place of supply and a signatory.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Not set up as GST registered</p>
                    <p className="text-[13px] text-muted-foreground">Invoices print as a plain INVOICE without GST. Add your GSTIN and enable GST to issue tax invoices.</p>
                  </>
                )}
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg">
              <Link href="/admin/settings">GST &amp; tax settings</Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
          {/* ---------- settings ---------- */}
          <div className="min-w-0 space-y-6">
            <Section title="Look & feel" description="Header style, accent colour and the line under your name.">
              <div className="space-y-6">
                <div>
                  <Label className="mb-2.5 block">Header</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        { value: 'dark', label: 'Ink', note: 'Deep indigo band, white logo' },
                        { value: 'light', label: 'Lilac', note: 'Light band, colour logo' },
                      ] as const
                    ).map((o) => {
                      const active = draft.headerStyle === o.value
                      const accent = ACCENTS.find((a) => a.value === draft.accent) ?? ACCENTS[0]
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => set('headerStyle', o.value)}
                          aria-pressed={active}
                          className={cn(
                            'group relative overflow-hidden rounded-xl border bg-card p-2.5 text-left transition-all',
                            active ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/40'
                          )}
                        >
                          {/* mini invoice */}
                          <div className="overflow-hidden rounded-lg border bg-white">
                            <div className={cn('relative h-10 px-2.5 pt-2', o.value === 'dark' ? 'bg-[#1C1642]' : 'bg-[#F7F5FC]')}>
                              <div className={cn('h-1.5 w-12 rounded-full', o.value === 'dark' ? 'bg-white/85' : 'bg-[#1C1642]/80')} />
                              <div className={cn('mt-1 h-1 w-16 rounded-full', o.value === 'dark' ? 'bg-white/35' : 'bg-[#1C1642]/25')} />
                              <div className="absolute inset-x-2.5 bottom-1.5 border-t border-dashed" style={{ borderColor: accent.color }} />
                            </div>
                            <div className="space-y-1 p-2.5">
                              <div className="h-2 rounded" style={{ background: accent.soft }} />
                              <div className="h-1 w-3/4 rounded-full bg-muted" />
                              <div className="h-1 w-1/2 rounded-full bg-muted" />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between px-0.5">
                            <div>
                              <p className="text-[13px] font-medium">{o.label}</p>
                              <p className="text-[11.5px] text-muted-foreground">{o.note}</p>
                            </div>
                            {active && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label className="mb-2.5 block">Accent colour</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((a) => {
                      const active = draft.accent === a.value
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => set('accent', a.value)}
                          aria-pressed={active}
                          className={cn(
                            'flex items-center gap-2 rounded-full border bg-card py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium transition-all',
                            active ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/40'
                          )}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: a.color }}>
                            {active && <Check className="h-3.5 w-3.5 text-white" />}
                          </span>
                          {a.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Used for section labels, the stitched divider and the items table header.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" maxLength={80} value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} placeholder="Handcrafted crochet, made to order" />
                </div>
              </div>
            </Section>

            <Section title="What to show" description="Turn sections of the invoice on or off.">
              <div className="divide-y">
                <ToggleRow title="SKU on line items" description="Product codes under each item name." checked={draft.showSku} onChange={(v) => set('showSku', v)} />
                <ToggleRow
                  title="Customisation prices"
                  description="Show the price of add-ons like name tags next to each option."
                  checked={draft.showCustomizationPricing}
                  onChange={(v) => set('showCustomizationPricing', v)}
                />
                <ToggleRow
                  title="Tax breakdown"
                  description="CGST / SGST / IGST under the total on non-GST invoices. Tax invoices always show it."
                  checked={draft.showTax}
                  onChange={(v) => set('showTax', v)}
                />
                <ToggleRow
                  title="HSN codes"
                  description="HSN column in the items table (tax invoices). Set codes per GST rate in GST & tax settings."
                  checked={draft.showHsn ?? true}
                  onChange={(v) => set('showHsn', v)}
                  disabled={gstKnown && !taxInvoice}
                />
                <ToggleRow
                  title="GST summary table"
                  description="HSN-wise taxable value and tax beside the totals (tax invoices)."
                  checked={draft.showGstSummary ?? true}
                  onChange={(v) => set('showGstSummary', v)}
                  disabled={gstKnown && !taxInvoice}
                />
                <ToggleRow title="Amount in words" description="“Two Thousand Seventy-Two Rupees Only”." checked={draft.showAmountInWords ?? true} onChange={(v) => set('showAmountInWords', v)} />
                <ToggleRow title="Payment details" description="Payment method and status." checked={draft.showPayment ?? true} onChange={(v) => set('showPayment', v)} />
                <ToggleRow
                  title="Authorised signatory"
                  description="Signature block with your legal name (tax invoices)."
                  checked={draft.showSignature ?? true}
                  onChange={(v) => set('showSignature', v)}
                  disabled={gstKnown && !taxInvoice}
                >
                  {(draft.showSignature ?? true) && (!gstKnown || taxInvoice) && (
                    <div className="mt-3 space-y-1.5">
                      <Label htmlFor="signatory" className="text-xs text-muted-foreground">Signatory name (optional)</Label>
                      <Input id="signatory" maxLength={80} value={draft.signatoryName ?? ''} onChange={(e) => set('signatoryName', e.target.value)} placeholder="e.g. Manish Chavan" />
                    </div>
                  )}
                </ToggleRow>
              </div>
            </Section>

            <Section title="Business details" description="Printed in the invoice header.">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Business name</Label>
                    <Input value={draft.businessName} onChange={(e) => set('businessName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax number (non-GST, optional)</Label>
                    <Input value={draft.taxNumber} onChange={(e) => set('taxNumber', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea rows={2} value={draft.address} onChange={(e) => set('address', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={draft.email} onChange={(e) => set('email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Logo URL (light header fallback)</Label>
                  <Input value={draft.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://…" />
                  <p className="text-xs text-muted-foreground">The ink header always uses the white Suthrayaa logo; the lilac header uses the colour logo mark.</p>
                </div>
              </div>
            </Section>

            <Section title="Footer & terms">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Thank-you line</Label>
                  <Input value={draft.footer} onChange={(e) => set('footer', e.target.value)} placeholder="Thank you for supporting handmade." />
                </div>
                <div className="space-y-2">
                  <Label>Terms (optional)</Label>
                  <Textarea rows={3} value={draft.terms} onChange={(e) => set('terms', e.target.value)} placeholder="Returns, exchanges, care…" />
                </div>
              </div>
            </Section>

            <Section title="Numbering & currency">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Invoice prefix</Label>
                  <Input value={draft.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} />
                  <p className="text-xs text-muted-foreground">Numbers run in sequence per year, e.g. {draft.invoicePrefix || 'INV'}-2026-0001.</p>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={draft.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
                </div>
              </div>
            </Section>
          </div>

          {/* ---------- live preview ---------- */}
          <div className="min-w-0">
            <div className={cn(GLASS_PANEL, 'overflow-hidden xl:sticky xl:top-6')}>
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Live preview</p>
                    <p className="text-xs text-muted-foreground">
                      {previewState === 'loading' ? 'Updating…' : previewState === 'error' ? 'Couldn’t render the preview' : 'Sample order · your current settings'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewNonce((n) => n + 1)} title="Refresh preview" aria-label="Refresh preview">
                    <RefreshCw className={cn('h-4 w-4', previewState === 'loading' && 'animate-spin')} />
                  </Button>
                  <Button
                    asChild={Boolean(previewUrl)}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 px-3"
                    disabled={!previewUrl}
                    title="Download the sample invoice PDF"
                  >
                    {previewUrl ? (
                      <a href={previewUrl} download="invoice-preview.pdf">
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download PDF</span>
                      </a>
                    ) : (
                      <span>
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download PDF</span>
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              <div className="relative bg-muted/50 p-3">
                <div className="relative mx-auto w-full max-w-[460px] xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
                  {!previewUrl && (
                    <div className="flex aspect-[1/1.414] items-center justify-center rounded-md bg-white text-sm text-muted-foreground ring-1 ring-border">
                      {previewState === 'error' ? 'Preview unavailable' : <Loader2 className="h-5 w-5 animate-spin" />}
                    </div>
                  )}
                  <PdfCanvasPreview url={previewUrl} onError={onPreviewError} />
                  {previewState === 'loading' && previewUrl && (
                    <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-card/90 p-1.5 shadow-sm ring-1 ring-border">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- save bar ---------- */}
        <Can permission="settings.update">
          <div
            className={cn(
              'fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 transition-all duration-300',
              dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
            )}
          >
            <div className="flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 shadow-[0_12px_40px_-12px_rgb(49_32_140/0.35)]">
              <p className="text-sm font-medium">Unsaved changes</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} disabled={saving}>
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
        </Can>
      </div>
    </ProtectedRoute>
  )
}
