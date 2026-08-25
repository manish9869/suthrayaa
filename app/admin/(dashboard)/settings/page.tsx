'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Settings2,
  Palette,
  Store,
  Megaphone,
  PanelBottom,
  LayoutGrid,
  Building2,
  Share2,
  Search,
  Receipt,
  Truck,
  CreditCard,
  ShoppingCart,
  Bell,
  Mail,
  Wrench,
  BarChart3,
  Scale,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { SettingsGroupForm } from '@/components/admin/settings-group-form'
import { useRbac } from '@/lib/rbac/rbac-context'
import { INDIA_STATE_NAMES } from '@/lib/india'
import {
  getAdminSettings,
  getTaxCategories,
  createTaxCategory,
  updateTaxCategory,
  deleteTaxCategory,
  getShippingZones,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  type AdminSettingsResponse,
  type TaxCategory,
  type ShippingZone,
} from '@/lib/api/settings'
import { getInvoiceSettings, updateInvoiceSettings, type AdminInvoiceSettings } from '@/lib/api/admin'
import { HomepageSectionsPanel } from '@/components/admin/homepage-sections-panel'
import { NavItemsPanel } from '@/components/admin/nav-items-panel'
import { FooterLinksPanel } from '@/components/admin/footer-links-panel'

interface TabDef {
  id: string
  label: string
  icon: typeof Settings2
  group: string
  permission?: string
}

const TABS: TabDef[] = [
  { id: 'general', label: 'General', icon: Settings2, group: 'general' },
  { id: 'branding', label: 'Branding', icon: Palette, group: 'branding', permission: 'settings.branding' },
  { id: 'storefront', label: 'Storefront & Checkout', icon: Store, group: 'storefront', permission: 'settings.storefront' },
  { id: 'header', label: 'Header & Announcement', icon: Megaphone, group: 'header', permission: 'settings.storefront' },
  { id: 'footer', label: 'Footer', icon: PanelBottom, group: 'footer', permission: 'settings.storefront' },
  { id: 'homepage', label: 'Homepage', icon: LayoutGrid, group: 'homepage', permission: 'settings.storefront' },
  { id: 'contact', label: 'Contact & Business', icon: Building2, group: 'contact' },
  { id: 'social', label: 'Social Media', icon: Share2, group: 'social', permission: 'settings.storefront' },
  { id: 'seo', label: 'SEO', icon: Search, group: 'seo', permission: 'settings.storefront' },
  { id: 'tax', label: 'GST & Tax', icon: Receipt, group: 'tax', permission: 'settings.tax' },
  { id: 'shipping', label: 'Shipping', icon: Truck, group: 'shipping', permission: 'settings.shipping' },
  { id: 'payment', label: 'Payments', icon: CreditCard, group: 'payment', permission: 'settings.payment' },
  { id: 'orders', label: 'Orders & Inventory', icon: ShoppingCart, group: 'orders' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'notifications' },
  { id: 'email', label: 'Email', icon: Mail, group: 'email', permission: 'settings.email' },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench, group: 'maintenance', permission: 'settings.maintenance' },
  { id: 'analytics', label: 'Analytics & Tracking', icon: BarChart3, group: 'analytics', permission: 'settings.analytics' },
  { id: 'legal', label: 'Legal', icon: Scale, group: 'legal' },
]

function SettingsPageContent() {
  const { hasPermission } = useRbac()
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null)
  const [taxCategories, setTaxCategories] = useState<TaxCategory[]>([])
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([])
  const [invoiceSettings, setInvoiceSettings] = useState<AdminInvoiceSettings | null>(null)
  const [active, setActive] = useState('general')

  const load = async () => {
    const [s, tc, sz] = await Promise.all([getAdminSettings(), getTaxCategories(), getShippingZones()])
    setSettings(s)
    setTaxCategories(tc)
    setShippingZones(sz)
    if (hasPermission('settings.view')) {
      getInvoiceSettings().then(setInvoiceSettings).catch(() => {})
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleTabs = useMemo(() => TABS.filter((t) => !t.permission || hasPermission(t.permission)), [hasPermission])

  if (!settings) return <PageLoader label="Loading settings..." />

  const activeTab = visibleTabs.find((t) => t.id === active) ?? visibleTabs[0]
  const groupValues = settings.values[activeTab.group] ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Site Settings</h1>
        <p className="text-muted-foreground text-sm">Configure Suthrayaa for the Indian market — store identity, GST, shipping, payments, and storefront content.</p>
      </div>

      <div className="flex gap-6">
        <nav className="w-56 shrink-0 space-y-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-sm transition-colors ${
                activeTab.id === t.id ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab.id === 'contact' ? (
            <ContactBusinessTab
              catalog={settings.catalog}
              contactValues={settings.values.contact ?? {}}
              businessValues={settings.values.business ?? {}}
              invoiceSettings={invoiceSettings}
              onSaved={load}
            />
          ) : activeTab.id === 'tax' ? (
            <>
              <TaxCategoriesPanel categories={taxCategories} onChanged={load} />
              <div className="h-4" />
              <SettingsGroupForm group="tax" catalog={settings.catalog} values={groupValues} onSaved={load} editPermission="settings.tax" />
            </>
          ) : activeTab.id === 'shipping' ? (
            <>
              <ShippingZonesPanel zones={shippingZones} onChanged={load} />
              <div className="h-4" />
              <SettingsGroupForm group="shipping" catalog={settings.catalog} values={groupValues} onSaved={load} editPermission="settings.shipping" />
            </>
          ) : activeTab.id === 'homepage' ? (
            <HomepageSectionsPanel />
          ) : activeTab.id === 'header' ? (
            <>
              <SettingsGroupForm group="header" catalog={settings.catalog} values={groupValues} onSaved={load} editPermission="settings.storefront" />
              <div className="h-4" />
              <NavItemsPanel />
            </>
          ) : activeTab.id === 'footer' ? (
            <>
              <SettingsGroupForm group="footer" catalog={settings.catalog} values={groupValues} onSaved={load} editPermission="settings.storefront" />
              <div className="h-4" />
              <FooterLinksPanel />
            </>
          ) : (
            <SettingsGroupForm
              group={activeTab.group}
              catalog={settings.catalog}
              values={groupValues}
              onSaved={load}
              editPermission={activeTab.permission}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Contact & Business: combines site_settings (contact.*/business.*) with the GST
// identity fields that live on the existing invoice_settings singleton. ----
function ContactBusinessTab({
  catalog,
  contactValues,
  businessValues,
  invoiceSettings,
  onSaved,
}: {
  catalog: AdminSettingsResponse['catalog']
  contactValues: Record<string, unknown>
  businessValues: Record<string, unknown>
  invoiceSettings: AdminInvoiceSettings | null
  onSaved: () => void
}) {
  const { hasPermission } = useRbac()
  const [gstDraft, setGstDraft] = useState<Partial<AdminInvoiceSettings>>({})
  useEffect(() => {
    if (invoiceSettings) setGstDraft(invoiceSettings)
  }, [invoiceSettings])

  const canEditGst = hasPermission('settings.tax')
  const gstDirty = invoiceSettings && Object.keys(gstDraft).some((k) => (gstDraft as any)[k] !== (invoiceSettings as any)[k])
  const [savingGst, setSavingGst] = useState(false)

  const saveGst = async () => {
    if (!invoiceSettings) return
    setSavingGst(true)
    try {
      await updateInvoiceSettings(gstDraft)
      toast.success('Business/GST details saved')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingGst(false)
    }
  }

  return (
    <div className="space-y-4">
      <SettingsGroupForm group="contact" catalog={catalog} values={contactValues} onSaved={onSaved} />
      <SettingsGroupForm group="business" catalog={catalog} values={businessValues} onSaved={onSaved} />

      {canEditGst && invoiceSettings && (
        <div className={`${GLASS_PANEL} space-y-4 p-6`}>
          <div>
            <h3 className="font-medium">GST Registration</h3>
            <p className="text-sm text-muted-foreground">GSTIN isn&apos;t required unless the business is GST-registered.</p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="gst-registered" className="font-normal">
              GST Registered
            </Label>
            <Switch
              id="gst-registered"
              checked={Boolean(gstDraft.isGstRegistered)}
              onCheckedChange={(c) => setGstDraft((p) => ({ ...p, isGstRegistered: c }))}
            />
          </div>
          {gstDraft.isGstRegistered && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  value={gstDraft.gstin ?? ''}
                  onChange={(e) => setGstDraft((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  placeholder="22AAAAA0000A1Z5"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>PAN</Label>
                <Input
                  value={gstDraft.pan ?? ''}
                  onChange={(e) => setGstDraft((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
                  placeholder="AAAAA0000A"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>GST Legal Name</Label>
                <Input value={gstDraft.gstLegalName ?? ''} onChange={(e) => setGstDraft((p) => ({ ...p, gstLegalName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>GST Registration State</Label>
                <Select value={gstDraft.gstState ?? ''} onValueChange={(v) => setGstDraft((p) => ({ ...p, gstState: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIA_STATE_NAMES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between sm:col-span-2">
                <Label htmlFor="customer-gstin-optional" className="font-normal">
                  Customer GSTIN Optional (B2B invoices)
                </Label>
                <Switch
                  id="customer-gstin-optional"
                  checked={Boolean(gstDraft.customerGstinOptional)}
                  onCheckedChange={(c) => setGstDraft((p) => ({ ...p, customerGstinOptional: c }))}
                />
              </div>
            </div>
          )}
          {gstDirty && (
            <div className="flex justify-end">
              <Button size="sm" onClick={saveGst} disabled={savingGst}>
                {savingGst ? 'Saving...' : 'Save GST Details'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Tax categories (GST rate slabs) ----
function TaxCategoriesPanel({ categories, onChanged }: { categories: TaxCategory[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [rate, setRate] = useState(18)

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createTaxCategory({ name, rate })
      toast.success('Tax category created')
      setOpen(false)
      setName('')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create')
    }
  }
  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Delete tax category "${catName}"?`)) return
    try {
      await deleteTaxCategory(id)
      toast.success('Deleted')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }
  const handleSetDefault = async (id: string) => {
    await updateTaxCategory(id, { isDefault: true })
    onChanged()
  }

  return (
    <div className={`${GLASS_PANEL} overflow-hidden`}>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="font-medium">GST Rate Categories</h3>
          <p className="text-xs text-muted-foreground">Applied per-product — different products can have different GST rates.</p>
        </div>
        <Can permission="settings.tax">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Rate
          </Button>
        </Can>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Default</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.rate}%</TableCell>
              <TableCell>
                {c.is_default ? (
                  <Badge variant="secondary">Default</Badge>
                ) : (
                  <Can permission="settings.tax">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleSetDefault(c.id)}>
                      Set as default
                    </Button>
                  </Can>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Can permission="settings.tax">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.name)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Can>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New GST Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="GST 12%" />
            </div>
            <div className="space-y-2">
              <Label>Rate (%)</Label>
              <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} min={0} max={100} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Shipping zones ----
function ShippingZonesPanel({ zones, onChanged }: { zones: ShippingZone[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [fee, setFee] = useState(79)
  const [selectedStates, setSelectedStates] = useState<string[]>([])

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createShippingZone({ name, states: selectedStates, shippingFee: fee })
      toast.success('Shipping zone created')
      setOpen(false)
      setName('')
      setSelectedStates([])
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create')
    }
  }
  const handleDelete = async (id: string, zoneName: string) => {
    if (!confirm(`Delete shipping zone "${zoneName}"?`)) return
    try {
      await deleteShippingZone(id)
      toast.success('Deleted')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <div className={`${GLASS_PANEL} overflow-hidden`}>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="font-medium">Shipping Zones</h3>
          <p className="text-xs text-muted-foreground">A zone with no states listed acts as the catch-all for everywhere else.</p>
        </div>
        <Can permission="settings.shipping">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Zone
          </Button>
        </Can>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zone</TableHead>
            <TableHead>States</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((z) => (
            <TableRow key={z.id}>
              <TableCell className="font-medium">{z.name}</TableCell>
              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                {z.states.length ? z.states.join(', ') : 'Rest of India (catch-all)'}
              </TableCell>
              <TableCell>₹{z.shipping_fee}</TableCell>
              <TableCell>
                {z.delivery_min_days}-{z.delivery_max_days} days
              </TableCell>
              <TableCell className="text-right">
                <Can permission="settings.shipping">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(z.id, z.name)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Can>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Shipping Zone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zone Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. South India" />
            </div>
            <div className="space-y-2">
              <Label>Shipping Fee (₹)</Label>
              <Input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <Label>States (leave empty for a catch-all zone)</Label>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-3 scrollbar-hide">
                {INDIA_STATE_NAMES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedStates.includes(s)}
                      onCheckedChange={(c) => setSelectedStates((prev) => (c ? [...prev, s] : prev.filter((x) => x !== s)))}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SiteSettingsPage() {
  return (
    <ProtectedRoute permission="settings.view">
      <SettingsPageContent />
    </ProtectedRoute>
  )
}
