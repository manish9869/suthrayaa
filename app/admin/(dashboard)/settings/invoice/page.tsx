'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { getInvoiceSettings, updateInvoiceSettings, type AdminInvoiceSettings } from '@/lib/api/admin'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'

export default function InvoiceSettingsPage() {
  const [settings, setSettings] = useState<AdminInvoiceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getInvoiceSettings()
      .then(setSettings)
      .finally(() => setLoading(false))
  }, [])

  const set = <K extends keyof AdminInvoiceSettings>(key: K, value: AdminInvoiceSettings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s))

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const updated = await updateInvoiceSettings(settings)
      setSettings(updated)
      toast.success('Invoice settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!settings) return <p className="text-muted-foreground">Failed to load settings</p>

  return (
    <ProtectedRoute permission="settings.view">
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-serif font-bold">Invoice Settings</h1>
        <p className="text-muted-foreground text-sm">
          Controls what appears on every invoice. Changing these only affects invoices generated from now on — already-issued invoices stay exactly as they were.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={settings.businessName} onChange={(e) => set('businessName', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={settings.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea rows={2} value={settings.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={settings.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={settings.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax Number (optional)</Label>
            <Input value={settings.taxNumber} onChange={(e) => set('taxNumber', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Numbering &amp; Currency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input value={settings.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value)} />
              <p className="text-xs text-muted-foreground">Display only — invoice numbers are generated sequentially by the system (e.g. INV-2026-0001).</p>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={settings.currency} onChange={(e) => set('currency', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Show SKU on line items</span>
            <Switch checked={settings.showSku} onCheckedChange={(v) => set('showSku', v)} />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Show tax breakdown</span>
            <Switch checked={settings.showTax} onCheckedChange={(v) => set('showTax', v)} />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Show customization price adjustments</span>
            <Switch checked={settings.showCustomizationPricing} onCheckedChange={(v) => set('showCustomizationPricing', v)} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Footer &amp; Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Footer Message</Label>
            <Textarea rows={2} value={settings.footer} onChange={(e) => set('footer', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Terms (optional)</Label>
            <Textarea rows={2} value={settings.terms} onChange={(e) => set('terms', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Can permission="settings.update">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Can>
      </div>
    </div>
    </ProtectedRoute>
  )
}
