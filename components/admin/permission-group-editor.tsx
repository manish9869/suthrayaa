'use client'

import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { PermissionDef } from '@/lib/api/rbac'

interface PermissionGroupEditorProps {
  catalog: PermissionDef[]
  selected: string[]
  onChange: (next: string[]) => void
  readOnly?: boolean
}

const ACTION_LABEL: Record<string, string> = {
  view: 'View',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  publish: 'Publish',
  cancel: 'Cancel',
  refund: 'Refund',
  export: 'Export',
  adjust: 'Adjust',
  manage: 'Manage',
  assign_role: 'Assign Roles',
  assign_permissions: 'Assign Permissions',
}

/** Permission checkboxes grouped by resource group (Catalog, Sales, Content, ...), each
 * group further broken down by resource (Products, Categories, ...) with a Select
 * All/Clear All per resource — matches the spec's "Create Role" mockup. */
export function PermissionGroupEditor({ catalog, selected, onChange, readOnly = false }: PermissionGroupEditorProps) {
  const groups = useMemo(() => {
    const byGroup = new Map<string, Map<string, PermissionDef[]>>()
    for (const p of catalog) {
      if (!byGroup.has(p.group)) byGroup.set(p.group, new Map())
      const byResource = byGroup.get(p.group)!
      if (!byResource.has(p.resource)) byResource.set(p.resource, [])
      byResource.get(p.resource)!.push(p)
    }
    return Array.from(byGroup.entries())
  }, [catalog])

  const selectedSet = new Set(selected)
  const toggle = (slug: string, checked: boolean) => {
    if (readOnly) return
    onChange(checked ? [...selected, slug] : selected.filter((s) => s !== slug))
  }
  const setResource = (perms: PermissionDef[], on: boolean) => {
    if (readOnly) return
    const slugs = new Set(perms.map((p) => p.slug))
    const withoutThese = selected.filter((s) => !slugs.has(s))
    onChange(on ? [...withoutThese, ...perms.map((p) => p.slug)] : withoutThese)
  }

  return (
    <div className="space-y-6">
      {groups.map(([groupName, byResource]) => (
        <div key={groupName}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{groupName}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from(byResource.entries()).map(([resource, perms]) => {
              const allOn = perms.every((p) => selectedSet.has(p.slug))
              const label = resource.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              return (
                <div key={resource} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setResource(perms, !allOn)}
                      >
                        {allOn ? 'Clear All' : 'Select All'}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <label key={p.slug} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          checked={selectedSet.has(p.slug)}
                          disabled={readOnly}
                          onCheckedChange={(c) => toggle(p.slug, Boolean(c))}
                        />
                        {ACTION_LABEL[p.action] ?? p.action}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
