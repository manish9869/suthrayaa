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
import { Eye, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  getEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate,
  testSendEmailTemplate,
  type AdminEmailTemplate,
} from '@/lib/api/admin'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Email Templates</h1>
        <p className="text-muted-foreground text-sm">
          Every transactional email the store sends, editable without touching code. Use {AVAILABLE_VARIABLES.slice(0, 3).join(', ')}, etc. — they fill in automatically.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className={!t.enabled ? 'opacity-60' : undefined}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">{TYPE_LABELS[t.type] ?? t.type}</h3>
                  <Switch checked={t.enabled} onCheckedChange={() => handleToggleEnabled(t)} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handlePreview(t)}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
            <Button variant="outline" onClick={() => setTestSendOpen(true)}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Send Test
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
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
  )
}
