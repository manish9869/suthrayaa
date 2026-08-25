'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { GLASS_PANEL } from '@/lib/admin-ui'
import { SettingField } from './settings-field'
import { Can } from './can'
import { updateAdminSettings, type SettingDef } from '@/lib/api/settings'

interface SettingsGroupFormProps {
  group: string
  catalog: SettingDef[]
  values: Record<string, unknown>
  onSaved: () => void
  /** Extra permission required to edit this group, beyond settings.update (undefined = none). */
  editPermission?: string
  /** Rendered above the fields — e.g. a related management table (tax categories, shipping zones). */
  children?: React.ReactNode
}

/** Renders every field in a settings group generically from the catalog + tracks unsaved
 * changes — this single component is what makes most of the 20 settings sections work
 * without bespoke form code per section. */
export function SettingsGroupForm({ group, catalog, values, onSaved, editPermission, children }: SettingsGroupFormProps) {
  const fields = catalog.filter((s) => s.group === group)
  const [draft, setDraft] = useState<Record<string, unknown>>(values)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(values)
  }, [values])

  const dirty = fields.some((f) => draft[f.key] !== values[f.key])

  const handleSave = async () => {
    const patch: Record<string, unknown> = {}
    for (const f of fields) if (draft[f.key] !== values[f.key]) patch[f.key] = draft[f.key]
    if (!Object.keys(patch).length) return
    setSaving(true)
    try {
      await updateAdminSettings(patch)
      toast.success('Settings saved')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => setDraft(values)

  return (
    <div className="space-y-4">
      {children}
      {fields.length > 0 && (
        <div className={`${GLASS_PANEL} space-y-4 p-6`}>
          {fields.map((f) => (
            <SettingField key={f.key} def={f} value={draft[f.key]} onChange={(v) => setDraft((prev) => ({ ...prev, [f.key]: v }))} />
          ))}
        </div>
      )}
      {dirty && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard} disabled={saving}>
              Discard
            </Button>
            <Can permission={editPermission ?? 'settings.update'}>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Can>
          </div>
        </div>
      )}
    </div>
  )
}
