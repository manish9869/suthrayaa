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
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { PageLoader } from '@/components/admin/loading-state'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { SettingsGroupForm } from '@/components/admin/settings-group-form'
import { PageHeader } from '@/components/admin/page-header'
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
      <PageHeader
        title="Site Settings"
        description="Configure Suthrayaa for the Indian market — store identity, GST, shipping, payments, and storefront content."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className={`${GLASS_PANEL} flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-6 lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-visible`}>
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors lg:w-full ${
                activeTab.id === t.id
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <activeTab.icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{activeTab.label}</h2>
              <p className="text-xs text-muted-foreground">Changes apply to the storefront as soon as they&apos;re saved.</p>
            </div>
          </div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
  const [hsn, setHsn] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createTaxCategory({ name, rate, hsnCode: hsn.trim() || undefined })
      toast.success('Tax category created')
      setOpen(false)
      setName('')
      setHsn('')
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
  const handleHsn = async (c: TaxCategory) => {
    const next = prompt(`HSN code for "${c.name}" (4, 6 or 8 digits; leave empty to clear)`, c.hsn_code ?? '')
    if (next === null) return
    try {
      await updateTaxCategory(c.id, { hsnCode: next.trim() })
      toast.success('HSN code saved')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save HSN code')
    }
  }

  return (
    <div className={`${GLASS_PANEL} overflow-hidden`}>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="font-medium">GST Rate Categories</h3>
          <p className="text-xs text-muted-foreground">Applied per-product — different products can have different GST rates. The HSN code is printed on tax invoices.</p>
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
            <TableHead>HSN</TableHead>
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
                <Can permission="settings.tax" fallback={<span className="text-muted-foreground">{c.hsn_code || '—'}</span>}>
                  <button
                    type="button"
                    onClick={() => handleHsn(c)}
                    className="rounded-md px-1.5 py-0.5 text-sm tabular-nums hover:bg-muted"
                    title="Edit HSN code"
                  >
                    {c.hsn_code || <span className="text-muted-foreground">Add HSN</span>}
                  </button>
                </Can>
              </TableCell>
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
            <div className="space-y-2">
              <Label>HSN code (optional)</Label>
              <Input value={hsn} onChange={(e) => setHsn(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="6117" inputMode="numeric" />
              <p className="text-xs text-muted-foreground">Crocheted accessories are usually 6117; toys 9503. Printed per item on tax invoices.</p>
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
type ZoneForm = {
  name: string
  fee: number
  freeThreshold: string
  cod: boolean
  minDays: number
  maxDays: number
  active: boolean
  states: string[]
}
const EMPTY_ZONE: ZoneForm = { name: '', fee: 79, freeThreshold: '', cod: true, minDays: 3, maxDays: 7, active: true, states: [] }

function ShippingZonesPanel({ zones, onChanged }: { zones: ShippingZone[]; onChanged: () => void }) {
  // null = dialog closed, 'new' = creating, otherwise the id of the zone being edited
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<ZoneForm>(EMPTY_ZONE)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ZoneForm>(k: K, v: ZoneForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm(EMPTY_ZONE)
    setEditing('new')
  }
  const openEdit = (z: ShippingZone) => {
    setForm({
      name: z.name,
      fee: Number(z.shipping_fee),
      freeThreshold: z.free_shipping_threshold == null ? '' : String(z.free_shipping_threshold),
      cod: z.cod_available,
      minDays: z.delivery_min_days,
      maxDays: z.delivery_max_days,
      active: z.is_active,
      states: z.states,
    })
    setEditing(z.id)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Give the zone a name')
    if (!(form.fee >= 0)) return toast.error('Shipping fee can’t be negative')
    if (form.minDays < 0 || form.maxDays < form.minDays) return toast.error('Delivery days: the maximum must be at least the minimum')
    const threshold = form.freeThreshold.trim() === '' ? null : Number(form.freeThreshold)
    if (threshold !== null && !(threshold >= 0)) return toast.error('Enter a valid free-shipping threshold')
    const input = {
      name: form.name.trim(),
      states: form.states,
      shippingFee: form.fee,
      freeShippingThreshold: threshold,
      codAvailable: form.cod,
      deliveryMinDays: form.minDays,
      deliveryMaxDays: form.maxDays,
      isActive: form.active,
    }
    setSaving(true)
    try {
      if (editing === 'new') await createShippingZone(input)
      else if (editing) await updateShippingZone(editing, input)
      toast.success(editing === 'new' ? 'Shipping zone created' : 'Shipping zone updated')
      setEditing(null)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
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
          <Button size="sm" variant="outline" onClick={openNew}>
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
            <TableHead>COD</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                No zones yet — every order uses the standard shipping fee.
              </TableCell>
            </TableRow>
          )}
          {zones.map((z) => (
            <TableRow key={z.id} className={z.is_active ? undefined : 'opacity-60'}>
              <TableCell className="font-medium">
                {z.name}
                {!z.is_active && <span className="ml-2 text-[11px] font-normal text-muted-foreground">(inactive)</span>}
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                {z.states.length ? z.states.join(', ') : 'Rest of India (catch-all)'}
              </TableCell>
              <TableCell>
                ₹{z.shipping_fee}
                {z.free_shipping_threshold != null && <span className="block text-[11px] text-muted-foreground">Free over ₹{z.free_shipping_threshold}</span>}
              </TableCell>
              <TableCell>
                {z.delivery_min_days}-{z.delivery_max_days} days
              </TableCell>
              <TableCell>{z.cod_available ? 'Yes' : 'No'}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Can permission="settings.shipping">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(z)} aria-label={`Edit ${z.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(z.id, z.name)} aria-label={`Delete ${z.name}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Can>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'New Shipping Zone' : 'Edit Shipping Zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zone Name</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. South India" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Shipping Fee (₹)</Label>
                <Input type="number" value={form.fee} onChange={(e) => set('fee', Number(e.target.value))} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Free shipping over (₹)</Label>
                <Input type="number" value={form.freeThreshold} onChange={(e) => set('freeThreshold', e.target.value)} min={0} placeholder="Store default" />
              </div>
              <div className="space-y-2">
                <Label>Delivery min (days)</Label>
                <Input type="number" value={form.minDays} onChange={(e) => set('minDays', Number(e.target.value))} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Delivery max (days)</Label>
                <Input type="number" value={form.maxDays} onChange={(e) => set('maxDays', Number(e.target.value))} min={0} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.cod} onCheckedChange={(v) => set('cod', v)} /> Cash on delivery available
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.active} onCheckedChange={(v) => set('active', v)} /> Active
              </label>
            </div>
            <div className="space-y-2">
              <Label>States (leave empty for a catch-all zone)</Label>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-3 scrollbar-hide">
                {INDIA_STATE_NAMES.map((st) => (
                  <label key={st} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.states.includes(st)}
                      onCheckedChange={(c) => set('states', c ? [...form.states, st] : form.states.filter((x) => x !== st))}
                    />
                    {st}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {editing === 'new' ? 'Create' : 'Save changes'}
            </Button>
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
