'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  createCustomizationGroup,
  updateCustomizationGroup,
  deleteCustomizationGroup,
  createCustomizationValue,
  updateCustomizationValue,
  deleteCustomizationValue,
  type CustomizationGroupInput,
} from '@/lib/api/admin'
import type { ProductCustomization, CustomizationValue } from '@/lib/data'
import type { AdminColor } from '@/lib/api/admin'

const TYPE_LABELS: Record<CustomizationGroupInput['type'], string> = {
  choice: 'Dropdown / Radio (choose one)',
  color: 'Color selector',
  checkbox: 'Checkbox (Yes/No style)',
  text: 'Text input',
  number: 'Number input',
}
const TYPES_WITH_VALUES: CustomizationGroupInput['type'][] = ['choice', 'color', 'checkbox']
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']

interface Props {
  productId?: string
  customizations: ProductCustomization[]
  colors: AdminColor[]
  onChange: () => void
}

export function CustomizationEditor({ productId, customizations, colors, onChange }: Props) {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ProductCustomization | null>(null)
  const [valueDialogGroupId, setValueDialogGroupId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<CustomizationValue | null>(null)
  const activeGroupType = customizations.find((g) => g.id === valueDialogGroupId)?.type

  const [groupForm, setGroupForm] = useState({
    name: '',
    label: '',
    type: 'choice' as CustomizationGroupInput['type'],
    required: false,
    enabled: true,
    placeholder: '',
    maxLength: 50,
  })
  const [valueForm, setValueForm] = useState({ label: '', value: '', priceAdjustment: 0, sku: '', enabled: true })
  const [saving, setSaving] = useState(false)
  const [quickAddingLabel, setQuickAddingLabel] = useState<string | null>(null)

  if (!productId) {
    return <p className="text-sm text-muted-foreground">Save the product first, then configure customization options.</p>
  }

  const resetGroupForm = () => {
    setEditingGroup(null)
    setGroupForm({ name: '', label: '', type: 'choice', required: false, enabled: true, placeholder: '', maxLength: 50 })
  }

  const openCreateGroup = () => {
    resetGroupForm()
    setGroupDialogOpen(true)
  }

  const openEditGroup = (g: ProductCustomization) => {
    setEditingGroup(g)
    setGroupForm({
      name: g.name,
      label: g.label,
      type: g.type,
      required: g.required,
      enabled: g.enabled,
      placeholder: g.placeholder ?? '',
      maxLength: g.maxLength ?? 50,
    })
    setGroupDialogOpen(true)
  }

  const saveGroup = async () => {
    if (!groupForm.label.trim()) return
    setSaving(true)
    try {
      const payload: CustomizationGroupInput = {
        name: groupForm.name || groupForm.label.toLowerCase().replace(/\s+/g, '_'),
        label: groupForm.label,
        type: groupForm.type,
        required: groupForm.required,
        enabled: groupForm.enabled,
        sortOrder: editingGroup?.sortOrder ?? customizations.length,
        placeholder: groupForm.type === 'text' ? groupForm.placeholder : undefined,
        maxLength: groupForm.type === 'text' ? groupForm.maxLength : undefined,
      }
      if (editingGroup) {
        await updateCustomizationGroup(productId, editingGroup.id, payload)
        toast.success('Option group updated')
      } else {
        await createCustomizationGroup(productId, payload)
        toast.success('Option group added')
      }
      setGroupDialogOpen(false)
      resetGroupForm()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save option group')
    } finally {
      setSaving(false)
    }
  }

  const removeGroup = async (g: ProductCustomization) => {
    if (!confirm(`Delete "${g.label}"? Past orders keep their own snapshot regardless.`)) return
    await deleteCustomizationGroup(productId, g.id)
    toast.success('Option group deleted')
    onChange()
  }

  const openCreateValue = (groupId: string) => {
    setEditingValue(null)
    setValueForm({ label: '', value: '', priceAdjustment: 0, sku: '', enabled: true })
    setValueDialogGroupId(groupId)
  }

  const openEditValue = (groupId: string, v: CustomizationValue) => {
    setEditingValue(v)
    setValueForm({ label: v.label, value: v.value, priceAdjustment: v.priceAdjustment, sku: v.sku ?? '', enabled: v.enabled })
    setValueDialogGroupId(groupId)
  }

  const saveValue = async () => {
    if (!valueDialogGroupId || !valueForm.label.trim()) return
    setSaving(true)
    try {
      const payload = {
        label: valueForm.label,
        value: valueForm.value || valueForm.label.toLowerCase().replace(/\s+/g, '-'),
        priceAdjustment: Number(valueForm.priceAdjustment) || 0,
        sku: valueForm.sku || null,
        enabled: valueForm.enabled,
      }
      if (editingValue) {
        await updateCustomizationValue(productId, valueDialogGroupId, editingValue.id, payload)
        toast.success('Option value updated')
      } else {
        await createCustomizationValue(productId, valueDialogGroupId, payload)
        toast.success('Option value added')
      }
      setValueDialogGroupId(null)
      setEditingValue(null)
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save option value')
    } finally {
      setSaving(false)
    }
  }

  const quickAddValue = async (groupId: string, label: string) => {
    setQuickAddingLabel(label)
    try {
      await createCustomizationValue(productId, groupId, {
        label,
        value: label.toLowerCase().replace(/\s+/g, '-'),
        priceAdjustment: 0,
        sku: null,
        enabled: true,
      })
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to add "${label}"`)
    } finally {
      setQuickAddingLabel(null)
    }
  }

  const removeValue = async (groupId: string, valueId: string) => {
    if (!confirm('Delete this option value?')) return
    await deleteCustomizationValue(productId, groupId, valueId)
    toast.success('Option value deleted')
    onChange()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Customization Options</p>
          <p className="text-xs text-muted-foreground">
            Optional per-product options customers see and pay extra for. Nothing shows on the storefront unless you add it here.
          </p>
        </div>
        <Dialog
          open={groupDialogOpen}
          onOpenChange={(v) => {
            setGroupDialogOpen(v)
            if (!v) resetGroupForm()
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={openCreateGroup}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Option Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Edit Option Group' : 'New Option Group'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Label (shown to customers)</Label>
                <Input
                  value={groupForm.label}
                  onChange={(e) => setGroupForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Choose Flower Color"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={groupForm.type} onValueChange={(v) => setGroupForm((f) => ({ ...f, type: v as CustomizationGroupInput['type'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as CustomizationGroupInput['type'][]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {groupForm.type === 'text' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Placeholder</Label>
                    <Input value={groupForm.placeholder} onChange={(e) => setGroupForm((f) => ({ ...f, placeholder: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Max Characters</Label>
                    <Input
                      type="number"
                      value={groupForm.maxLength}
                      onChange={(e) => setGroupForm((f) => ({ ...f, maxLength: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={groupForm.required} onCheckedChange={(v) => setGroupForm((f) => ({ ...f, required: v }))} />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={groupForm.enabled} onCheckedChange={(v) => setGroupForm((f) => ({ ...f, enabled: v }))} />
                  Active (visible to customers)
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveGroup} disabled={saving || !groupForm.label.trim()}>
                {saving ? 'Saving...' : editingGroup ? 'Save Changes' : 'Add Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {customizations.length === 0 && (
        <p className="text-sm text-muted-foreground border rounded-lg p-4 text-center">No customization options yet.</p>
      )}

      <div className="space-y-3">
        {customizations.map((g) => (
          <div key={g.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{g.label}</span>
                <Badge variant="outline" className="text-xs">
                  {TYPE_LABELS[g.type]}
                </Badge>
                {g.required && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
                {!g.enabled && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditGroup(g)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeGroup(g)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {TYPES_WITH_VALUES.includes(g.type) && (
              <>
                <Separator />
                <div className="space-y-2">
                  {g.values.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-muted">
                      <div className="flex items-center gap-2">
                        {g.type === 'color' && <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: v.value }} />}
                        <span className={!v.enabled ? 'text-muted-foreground line-through' : ''}>{v.label}</span>
                        {v.priceAdjustment !== 0 && (
                          <span className="text-muted-foreground">
                            {v.priceAdjustment > 0 ? '+' : ''}
                            {v.priceAdjustment}
                          </span>
                        )}
                        {v.sku && <span className="text-xs text-muted-foreground">SKU: {v.sku}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditValue(g.id, v)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeValue(g.id, v.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => openCreateValue(g.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Value
                  </Button>

                  {g.type === 'choice' && (() => {
                    const existingLabels = new Set(g.values.map((v) => v.label.toLowerCase()))
                    const remaining = SIZE_PRESETS.filter((p) => !existingLabels.has(p.toLowerCase()))
                    if (remaining.length === 0) return null
                    return (
                      <div className="pt-1">
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Looks like a size option — quick add common sizes:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {remaining.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={quickAddingLabel !== null}
                              onClick={() => quickAddValue(g.id, preset)}
                              className="tap-bounce rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                            >
                              {quickAddingLabel === preset ? 'Adding…' : `+ ${preset}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(valueDialogGroupId)}
        onOpenChange={(v) => {
          if (!v) {
            setValueDialogGroupId(null)
            setEditingValue(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingValue ? 'Edit Value' : 'New Value'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeGroupType === 'color' && (
              <div className="space-y-2">
                <Label className="text-xs">Pick a Color</Label>
                {colors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No colors yet — add some under Media → Colors first, or enter a hex value manually below.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => {
                      const selected = valueForm.value.toLowerCase() === c.hex.toLowerCase()
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setValueForm((f) => ({ ...f, label: f.label || c.name, value: c.hex }))}
                          title={c.name}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${
                            selected ? 'border-primary scale-110' : 'border-border hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={valueForm.label} onChange={(e) => setValueForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Hot Pink" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{activeGroupType === 'color' ? 'Hex Value' : 'Value (internal id)'}</Label>
                <div className="flex items-center gap-2">
                  {activeGroupType === 'color' && (
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(valueForm.value) ? valueForm.value : '#000000'}
                      onChange={(e) => setValueForm((f) => ({ ...f, value: e.target.value }))}
                      className="w-9 h-9 rounded border cursor-pointer flex-shrink-0"
                    />
                  )}
                  <Input value={valueForm.value} onChange={(e) => setValueForm((f) => ({ ...f, value: e.target.value }))} placeholder="e.g. #FF69B4" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Additional Price (₹)</Label>
                <Input
                  type="number"
                  value={valueForm.priceAdjustment}
                  onChange={(e) => setValueForm((f) => ({ ...f, priceAdjustment: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">SKU (optional, for your own bookkeeping)</Label>
              <Input value={valueForm.sku} onChange={(e) => setValueForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={valueForm.enabled} onCheckedChange={(v) => setValueForm((f) => ({ ...f, enabled: v }))} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button onClick={saveValue} disabled={saving || !valueForm.label.trim()}>
              {saving ? 'Saving...' : editingValue ? 'Save Changes' : 'Add Value'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
