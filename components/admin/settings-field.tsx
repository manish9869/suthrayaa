'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SettingDef } from '@/lib/api/settings'

interface SettingFieldProps {
  def: SettingDef
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
}

/** Renders the right input for a setting purely from its catalog type — this is what lets
 * ~15 of the 20 settings sections work with zero bespoke form code (see SettingsGroupForm). */
export function SettingField({ def, value, onChange, disabled }: SettingFieldProps) {
  const id = `setting-${def.key}`

  if (def.type === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-4 py-1">
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {def.label}
        </Label>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{def.label}</Label>
      {def.type === 'select' ? (
        <Select value={String(value ?? '')} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : def.type === 'text' ? (
        <Textarea id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={3} />
      ) : def.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value || '#000000')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1 disabled:cursor-not-allowed"
          />
          <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="font-mono text-xs" />
        </div>
      ) : (
        <Input
          id={id}
          type={def.type === 'number' ? 'number' : def.type === 'email' ? 'email' : def.type === 'url' ? 'text' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(def.type === 'number' ? Number(e.target.value) : e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  )
}
