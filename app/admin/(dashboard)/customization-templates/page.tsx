'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Layers, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getCustomizationTemplates,
  createCustomizationTemplate,
  updateCustomizationTemplate,
  deleteCustomizationTemplate,
  type CustomizationTemplate,
  type CustomizationTemplateInput,
} from '@/lib/api/admin'
import { formatPrice } from '@/lib/data'
import { ProtectedRoute } from '@/components/admin/protected-route'
import { Can } from '@/components/admin/can'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/admin-bits'
import { PageLoader } from '@/components/admin/loading-state'

type TemplateType = CustomizationTemplateInput['type']

const TYPE_LABELS: Record<TemplateType, string> = {
  choice: 'Dropdown / Radio (choose one)',
  color: 'Color selector',
  checkbox: 'Checkbox (Yes/No style)',
  text: 'Text input',
  number: 'Number input',
}
const TYPES_WITH_VALUES: TemplateType[] = ['choice', 'color', 'checkbox']

interface ValueRow {
  label: string
  value: string
  priceAdjustment: number
}

const EMPTY_ROW: ValueRow = { label: '', value: '', priceAdjustment: 0 }

export default function CustomizationTemplatesPage() {
  const [templates, setTemplates] = useState<CustomizationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<TemplateType>('choice')
  const [rows, setRows] = useState<ValueRow[]>([{ ...EMPTY_ROW }])
  const [saving, setSaving] = useState(false)

  const load = () =>
    getCustomizationTemplates()
      .then(setTemplates)
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setName('')
    setType('choice')
    setRows([{ ...EMPTY_ROW }])
    setOpen(true)
  }

  const openEdit = (t: CustomizationTemplate) => {
    setEditingId(t.id)
    setName(t.name)
    setType(t.type)
    setRows(t.values.length ? t.values.map(({ label, value, priceAdjustment }) => ({ label, value, priceAdjustment })) : [{ ...EMPTY_ROW }])
    setOpen(true)
  }

  const updateRow = (i: number, patch: Partial<ValueRow>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Give the template a name')
    const withValues = TYPES_WITH_VALUES.includes(type)
    // Blank "value" defaults to the label (colors should carry a hex, e.g. #FF69B4)
    const values = withValues
      ? rows.filter((r) => r.label.trim()).map((r) => ({ label: r.label.trim(), value: (r.value || r.label).trim(), priceAdjustment: Number(r.priceAdjustment) || 0 }))
      : []
    if (withValues && values.length === 0) return toast.error('Add at least one option')

    setSaving(true)
    try {
      const input = { name: name.trim(), type, values }
      if (editingId) await updateCustomizationTemplate(editingId, input)
      else await createCustomizationTemplate(input)
      toast.success(editingId ? 'Template updated' : 'Template created')
      setOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: CustomizationTemplate) => {
    if (!confirm(`Delete the "${t.name}" template? Products that already use it keep their own copy.`)) return
    try {
      await deleteCustomizationTemplate(t.id)
      toast.success('Template deleted')
      load()
    } catch {
      toast.error('Failed to delete template')
    }
  }

  return (
    <ProtectedRoute permission="products.view">
      <div className="space-y-6">
        <PageHeader
          title="Option Templates"
          description="Reusable customization option groups (e.g. “Standard yarn colours”). Add one to any product from its Customization tab — it’s copied in, so each product can then be tweaked independently."
          actions={
            <Can permission="products.update">
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New Template
              </Button>
            </Can>
          }
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Template' : 'New Template'}</DialogTitle>
              <DialogDescription>Changes apply to products you add this template to from now on.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard yarn colours" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as TemplateType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {TYPES_WITH_VALUES.includes(type) ? (
                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="grid grid-cols-[1fr_1fr_90px_32px] gap-2 text-xs text-muted-foreground">
                    <span>Label</span>
                    <span>{type === 'color' ? 'Hex colour' : 'Value (optional)'}</span>
                    <span>+ Price (₹)</span>
                    <span />
                  </div>
                  {rows.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_90px_32px] items-center gap-2">
                      <Input value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })} placeholder={type === 'color' ? 'Hot Pink' : 'Medium'} />
                      <div className="flex items-center gap-1.5">
                        {type === 'color' && (
                          <input
                            type="color"
                            aria-label="Pick colour"
                            className="h-9 w-9 shrink-0 cursor-pointer rounded border bg-transparent"
                            value={/^#[0-9a-f]{6}$/i.test(r.value) ? r.value : '#cccccc'}
                            onChange={(e) => updateRow(i, { value: e.target.value })}
                          />
                        )}
                        <Input value={r.value} onChange={(e) => updateRow(i, { value: e.target.value })} placeholder={type === 'color' ? '#FF69B4' : 'medium'} />
                      </div>
                      <Input type="number" value={r.priceAdjustment} onChange={(e) => updateRow(i, { priceAdjustment: Number(e.target.value) })} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        aria-label="Remove option"
                        disabled={rows.length === 1}
                        onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])}>
                    <Plus className="h-4 w-4" /> Add option
                  </Button>
                </div>
              ) : (
                <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                  {type === 'text' ? 'Text' : 'Number'} inputs don’t have preset options — customers type their own value.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <PageLoader />
        ) : templates.length === 0 ? (
          <Card>
            <EmptyState
              icon={Layers}
              title="No templates yet"
              description="Save an option group you use on many products — like your yarn colour palette — and add it to any product in one click."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="gap-0 py-0">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.name}</p>
                      <Badge variant="secondary" className="mt-1.5">
                        {TYPE_LABELS[t.type]}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Can permission="products.update">
                        <Button variant="ghost" size="icon" className="text-muted-foreground" title="Edit template" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete template"
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Can>
                    </div>
                  </div>
                  {t.values.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {t.values.map((v) => (
                        <span key={v.id ?? v.label} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
                          {t.type === 'color' && <span className="h-3 w-3 rounded-full ring-1 ring-border" style={{ background: v.value }} />}
                          {v.label}
                          {v.priceAdjustment !== 0 && (
                            <span className="text-muted-foreground">
                              {v.priceAdjustment > 0 ? '+' : '−'}
                              {formatPrice(Math.abs(v.priceAdjustment))}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">Free-form {t.type} input</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
