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
import { Plus, Pencil, Trash2, GripVertical, Layers, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getCustomizationTemplates,
  applyCustomizationTemplate,
  type CustomizationTemplate,
  createCustomizationGroup,
  updateCustomizationGroup,
  deleteCustomizationGroup,
  createCustomizationValue,
  updateCustomizationValue,
  addLibraryColors,
  deleteCustomizationValue,
  type CustomizationGroupInput,
} from '@/lib/api/admin'
import type { ProductCustomization, CustomizationValue } from '@/lib/data'
import type { AdminColor } from '@/lib/api/admin'
import { ColorYarnSwatch } from '@/components/color-yarn-swatch'

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
  // Color groups only take colours from the Colors library: several at once when adding,
  // one (to swap to) when editing.
  const [pickedColorIds, setPickedColorIds] = useState<string[]>([])
  const libraryColors = colors.filter((c) => c.is_active)
  const activeGroup = customizations.find((g) => g.id === valueDialogGroupId)
  const sameHex = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  const [saving, setSaving] = useState(false)
  const [quickAddingLabel, setQuickAddingLabel] = useState<string | null>(null)
  const [templates, setTemplates] = useState<CustomizationTemplate[] | null>(null)
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  const loadTemplates = () => {
    getCustomizationTemplates()
      .then(setTemplates)
      .catch(() => {
        setTemplates([])
        toast.error('Failed to load templates')
      })
  }

  const applyTemplate = async (t: CustomizationTemplate) => {
    if (!productId) return
    setApplyingTemplate(true)
    try {
      await applyCustomizationTemplate(t.id, productId)
      toast.success(`Added “${t.name}” — edit it below if this product needs changes`)
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add template')
    } finally {
      setApplyingTemplate(false)
    }
  }

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
    setPickedColorIds([])
    setValueDialogGroupId(groupId)
  }

  const openEditValue = (groupId: string, v: CustomizationValue) => {
    setEditingValue(v)
    setValueForm({ label: v.label, value: v.value, priceAdjustment: v.priceAdjustment, sku: v.sku ?? '', enabled: v.enabled })
    const current = libraryColors.find((c) => sameHex(c.hex, v.value))
    setPickedColorIds(current ? [current.id] : [])
    setValueDialogGroupId(groupId)
  }

  const saveColorValues = async (groupId: string) => {
    const price = Number(valueForm.priceAdjustment) || 0
    if (editingValue) {
      const picked = libraryColors.find((c) => c.id === pickedColorIds[0])
      await updateCustomizationValue(productId, groupId, editingValue.id, {
        priceAdjustment: price,
        sku: valueForm.sku || null,
        enabled: valueForm.enabled,
        ...(picked && !sameHex(picked.hex, editingValue.value) ? { colorId: picked.id } : {}),
      })
      toast.success('Colour updated')
    } else {
      await addLibraryColors(productId, groupId, pickedColorIds, price)
      toast.success(`${pickedColorIds.length} colour${pickedColorIds.length > 1 ? 's' : ''} added`)
    }
  }

  const saveValue = async () => {
    if (!valueDialogGroupId) return
    const isColor = activeGroupType === 'color'
    if (isColor ? pickedColorIds.length === 0 && !editingValue : !valueForm.label.trim()) return
    setSaving(true)
    try {
      if (isColor) {
        await saveColorValues(valueDialogGroupId)
        setValueDialogGroupId(null)
        setEditingValue(null)
        onChange()
        return
      }
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
          <div className="flex shrink-0 items-center gap-2">
            {productId && (
              <DropdownMenu onOpenChange={(o) => o && loadTemplates()}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={applyingTemplate}>
                    <Layers className="h-4 w-4 mr-1.5" /> {applyingTemplate ? 'Adding…' : 'From template'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Add a saved option group</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {templates === null ? (
                    <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
                  ) : templates.length === 0 ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/customization-templates">No templates yet — create one</Link>
                    </DropdownMenuItem>
                  ) : (
                    templates.map((t) => (
                      <DropdownMenuItem key={t.id} onSelect={() => applyTemplate(t)}>
                        <span className="truncate">{t.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{t.values.length || t.type}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin/customization-templates">Manage templates</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={openCreateGroup}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Option Group
              </Button>
            </DialogTrigger>
          </div>
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
                <Button variant="ghost" size="icon" aria-label={`Edit ${g.label}`} className="h-7 w-7" onClick={() => openEditGroup(g)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Remove ${g.label}`} className="h-7 w-7" onClick={() => removeGroup(g)}>
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
                        {g.type === 'color' && (
                          <span className="w-3.5 h-3.5 rounded-full border">
                            <ColorYarnSwatch color={v.value} />
                          </span>
                        )}
                        <span className={!v.enabled ? 'text-muted-foreground line-through' : ''}>{v.label}</span>
                        {g.type === 'color' && v.inLibrary === false && (
                          <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-700" title="Customers can't pick this colour. Edit it and choose one from your Colors library.">
                            Not in Colors library
                          </Badge>
                        )}
                        {v.priceAdjustment !== 0 && (
                          <span className="text-muted-foreground">
                            {v.priceAdjustment > 0 ? '+' : ''}
                            {v.priceAdjustment}
                          </span>
                        )}
                        {v.sku && <span className="text-xs text-muted-foreground">SKU: {v.sku}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Edit option ${v.label}`} className="h-6 w-6" onClick={() => openEditValue(g.id, v)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Remove option ${v.label}`} className="h-6 w-6" onClick={() => removeValue(g.id, v.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => openCreateValue(g.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {g.type === 'color' ? 'Add colours' : 'Add Value'}
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
            <DialogTitle>{activeGroupType === 'color' ? (editingValue ? 'Change colour' : 'Add colours from your library') : editingValue ? 'Edit Value' : 'New Value'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeGroupType === 'color' ? (
              <>
                <LibraryColorPicker
                  colors={
                    editingValue
                      ? libraryColors
                      : libraryColors.filter((c) => !activeGroup?.values.some((v) => sameHex(v.value, c.hex)))
                  }
                  multiple={!editingValue}
                  picked={pickedColorIds}
                  onChange={setPickedColorIds}
                />
                <div className="space-y-2">
                  <Label className="text-xs">Additional Price (₹){!editingValue && pickedColorIds.length > 1 ? ' — for each colour' : ''}</Label>
                  <Input
                    type="number"
                    value={valueForm.priceAdjustment}
                    onChange={(e) => setValueForm((f) => ({ ...f, priceAdjustment: Number(e.target.value) }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={valueForm.label} onChange={(e) => setValueForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Large" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Value (internal id)</Label>
                    <Input value={valueForm.value} onChange={(e) => setValueForm((f) => ({ ...f, value: e.target.value }))} placeholder="e.g. large" />
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
              </>
            )}
            {(activeGroupType !== 'color' || editingValue) && (
            <>
            <div className="space-y-2">
              <Label className="text-xs">SKU (optional, for your own bookkeeping)</Label>
              <Input value={valueForm.sku} onChange={(e) => setValueForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={valueForm.enabled} onCheckedChange={(v) => setValueForm((f) => ({ ...f, enabled: v }))} />
              Active
            </label>
            </>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={saveValue}
              disabled={saving || (activeGroupType === 'color' ? !editingValue && pickedColorIds.length === 0 : !valueForm.label.trim())}
            >
              {saving
                ? 'Saving...'
                : editingValue
                  ? 'Save Changes'
                  : activeGroupType === 'color'
                    ? `Add ${pickedColorIds.length || ''} colour${pickedColorIds.length === 1 ? '' : 's'}`
                    : 'Add Value'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Swatches from the Colors library — the only colours a Color option can offer. */
function LibraryColorPicker({
  colors,
  multiple,
  picked,
  onChange,
}: {
  colors: AdminColor[]
  multiple: boolean
  picked: string[]
  onChange: (ids: string[]) => void
}) {
  if (colors.length === 0) {
    return (
      <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        {multiple ? 'Every colour in your library is already in this option. ' : ''}
        Add colours under{' '}
        <Link href="/admin/colors" className="font-medium underline">
          Colors
        </Link>{' '}
        first — options can only use colours from your library.
      </p>
    )
  }
  const toggle = (id: string) =>
    onChange(multiple ? (picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]) : [id])
  const allPicked = picked.length === colors.length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{multiple ? 'Pick colours from your library' : 'Colour from your library'}</Label>
        {multiple && (
          <button type="button" className="text-xs font-medium text-primary" onClick={() => onChange(allPicked ? [] : colors.map((c) => c.id))}>
            {allPicked ? 'Clear' : 'Select all'}
          </button>
        )}
      </div>
      <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
        {colors.map((c) => {
          const on = picked.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${on ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
            >
              <span className="h-5 w-5 shrink-0 rounded-full border">
                <ColorYarnSwatch color={c.hex} />
              </span>
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {on && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
