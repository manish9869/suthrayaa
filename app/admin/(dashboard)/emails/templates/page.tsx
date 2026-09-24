'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Eye,
  Send,
  Mail,
  Braces,
  PenLine,
  ShoppingBag,
  CheckCircle2,
  Scissors,
  PackageCheck,
  Truck,
  Home,
  XCircle,
  CreditCard,
  AlertCircle,
  RotateCcw,
  Sparkles,
  MessageCircle,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageLoader } from '@/components/admin/loading-state'
import {
  getEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate,
  testSendEmailTemplate,
  type AdminEmailTemplate,
} from '@/lib/api/admin'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/admin-bits'
import { StatusDot } from '@/components/admin/status-dot'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  order_placed: 'Order Placed',
  order_confirmed: 'Order Confirmed',
  order_making: 'Order Making',
  order_ready: 'Order Ready',
  order_shipped: 'Order Shipped',
  order_delivered: 'Order Delivered',
  order_cancelled: 'Order Cancelled',
  payment_successful: 'Payment Successful',
  payment_failed: 'Payment Failed',
  refund_processed: 'Refund Processed',
  custom_order_confirmation: 'Custom Order Confirmation',
  contact_enquiry_ack: 'Contact Enquiry Acknowledgement',
  invoice_email: 'Invoice Email',
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  order_placed: ShoppingBag,
  order_confirmed: CheckCircle2,
  order_making: Scissors,
  order_ready: PackageCheck,
  order_shipped: Truck,
  order_delivered: Home,
  order_cancelled: XCircle,
  payment_successful: CreditCard,
  payment_failed: AlertCircle,
  refund_processed: RotateCcw,
  custom_order_confirmation: Sparkles,
  contact_enquiry_ack: MessageCircle,
  invoice_email: Receipt,
}

const AVAILABLE_VARIABLES = [
  '{{customer_name}}',
  '{{order_number}}',
  '{{order_date}}',
  '{{order_total}}',
  '{{tracking_number}}',
  '{{product_name}}',
  '{{invoice_number}}',
  '{{store_name}}',
]

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<AdminEmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminEmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [saving, setSaving] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<{ subject: string; bodyHtml: string } | null>(null)

  const [testSendOpen, setTestSendOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  const load = () => {
    setLoading(true)
    getEmailTemplates()
      .then(setTemplates)
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openEdit = (t: AdminEmailTemplate) => {
    setEditing(t)
    setSubject(t.subject)
    setBodyHtml(t.bodyHtml)
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await updateEmailTemplate(editing.id, { subject, bodyHtml })
      toast.success('Template updated')
      setEditing(null)
      load()
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async (t: AdminEmailTemplate) => {
    await updateEmailTemplate(t.id, { enabled: !t.enabled })
    load()
  }

  const handlePreview = async (t: AdminEmailTemplate) => {
    const content = await previewEmailTemplate(t.id)
    setPreviewContent(content)
    setPreviewOpen(true)
  }

  const handleTestSend = async () => {
    if (!editing || !testEmail.trim()) return
    setSendingTest(true)
    try {
      await testSendEmailTemplate(editing.id, testEmail)
      toast.success(`Test email sent to ${testEmail}`)
      setTestSendOpen(false)
      setTestEmail('')
    } catch {
      toast.error('Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <ProtectedRoute permission="emails.view">
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description={
          <>
            Every transactional email the store sends, editable without touching code.
            {templates.length > 0 && ` ${templates.filter((t) => t.enabled).length} of ${templates.length} enabled.`}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed bg-card/60 px-4 py-3 text-xs text-muted-foreground">
        <Braces className="h-4 w-4 shrink-0" />
        <span className="mr-1 font-medium text-foreground">Variables</span>
        {AVAILABLE_VARIABLES.map((v) => (
          <code key={v} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
            {v}
          </code>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState icon={Mail} title="No templates found" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {templates.map((t) => {
            const Icon = TYPE_ICONS[t.type] ?? Mail
            return (
              <Card key={t.id} className="gap-0 py-0 transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        t.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{TYPE_LABELS[t.type] ?? t.type.replace(/_/g, ' ')}</h3>
                      <div className="mt-1">
                        <StatusDot label={t.enabled ? 'Enabled' : 'Disabled'} tone={t.enabled ? 'mint' : 'muted'} />
                      </div>
                    </div>
                    <Can permission="emails.update">
                      <Switch checked={t.enabled} onCheckedChange={() => handleToggleEnabled(t)} aria-label="Enable template" />
                    </Can>
                  </div>
                  <div className="mt-4 flex-1 rounded-xl bg-muted/60 px-3 py-2.5">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px]">{t.subject}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Updated {new Date(t.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => handlePreview(t)}>
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                      <PenLine className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? TYPE_LABELS[editing.type] ?? editing.type : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body (HTML)</Label>
              <Textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={12} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Available variables</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">
                    {v}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs font-mono">
                  {'{{items_table}}'}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  {'{{address_block}}'}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Can permission="emails.update">
              <Button variant="outline" onClick={() => setTestSendOpen(true)}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Send Test
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Can>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewContent?.subject}</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-muted/30" dangerouslySetInnerHTML={{ __html: previewContent?.bodyHtml ?? '' }} />
        </DialogContent>
      </Dialog>

      {/* Test send dialog */}
      <Dialog open={testSendOpen} onOpenChange={setTestSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Send to</Label>
            <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <DialogFooter>
            <Button onClick={handleTestSend} disabled={sendingTest || !testEmail.trim()}>
              {sendingTest ? 'Sending...' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ProtectedRoute>
  )
}
