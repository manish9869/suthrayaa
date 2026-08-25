'use client'

import { useMemo } from 'react'
import { CheckCircle2, Circle, Minus } from 'lucide-react'
import {
  Package,
  Images,
  FolderTree,
  Palette,
  Boxes,
  ShoppingCart,
  Tags,
  Users,
  MessageSquareQuote,
  Image as ImageIcon,
  Star,
  Mail,
  UserCog,
  ShieldCheck,
  Settings,
  ScrollText,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PermissionDef } from '@/lib/api/rbac'

interface PermissionGroupEditorProps {
  catalog: PermissionDef[]
  selected: string[]
  onChange: (next: string[]) => void
  readOnly?: boolean
}

// Every resource.action in the catalog collapses into one of 4 plain-language buckets —
// a non-technical admin thinks "can this person view/edit/delete/administer this thing?",
// not "does this role have coupons.assign_permissions". Clicking a bucket toggles every
// underlying permission slug in it together; the backend still enforces each slug
// individually, this is purely a friendlier control surface over the same data.
const ACTION_BUCKET: Record<string, 'view' | 'edit' | 'delete' | 'admin'> = {
  view: 'view',
  create: 'edit',
  update: 'edit',
  publish: 'edit',
  adjust: 'edit',
  delete: 'delete',
  cancel: 'admin',
  refund: 'admin',
  export: 'admin',
  manage: 'admin',
  assign_role: 'admin',
  assign_permissions: 'admin',
}
const BUCKETS = ['view', 'edit', 'delete', 'admin'] as const
const BUCKET_LABEL: Record<(typeof BUCKETS)[number], string> = { view: 'View', edit: 'Edit', delete: 'Delete', admin: 'Admin' }

const RESOURCE_ICON: Record<string, LucideIcon> = {
  products: Package,
  product_images: Images,
  categories: FolderTree,
  colors: Palette,
  inventory: Boxes,
  orders: ShoppingCart,
  coupons: Tags,
  customers: Users,
  content: MessageSquareQuote,
  banners: ImageIcon,
  reviews: Star,
  emails: Mail,
  users: UserCog,
  roles: ShieldCheck,
  settings: Settings,
  audit_logs: ScrollText,
  analytics: BarChart3,
}

function resourceLabel(resource: string) {
  return resource.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** A flat permission matrix — one row per resource, one column per plain-language bucket
 * (View/Edit/Delete/Admin) — instead of a checkbox form. Grouped by module with a plain
 * section label (not collapsible; nothing to click to see everything). */
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

  const cellPerms = (perms: PermissionDef[], bucket: (typeof BUCKETS)[number]) =>
    perms.filter((p) => (ACTION_BUCKET[p.action] ?? 'edit') === bucket)

  const toggleCell = (perms: PermissionDef[]) => {
    if (readOnly || !perms.length) return
    const allOn = perms.every((p) => selectedSet.has(p.slug))
    const slugs = new Set(perms.map((p) => p.slug))
    const without = selected.filter((s) => !slugs.has(s))
    onChange(allOn ? without : [...without, ...perms.map((p) => p.slug)])
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[1fr_repeat(4,72px)] items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Resource</span>
        {BUCKETS.map((b) => (
          <span key={b} className="text-center">
            {BUCKET_LABEL[b]}
          </span>
        ))}
      </div>

      {groups.map(([groupName, byResource]) => (
        <div key={groupName}>
          <div className="border-b bg-muted/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {groupName}
          </div>
          {Array.from(byResource.entries()).map(([resource, perms]) => {
            const Icon = RESOURCE_ICON[resource] ?? Package
            return (
              <div
                key={resource}
                className="grid grid-cols-[1fr_repeat(4,72px)] items-center gap-2 border-b px-4 py-2.5 last:border-b-0 hover:bg-muted/10"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{resourceLabel(resource)}</span>
                </div>

                {BUCKETS.map((bucket) => {
                  const bucketPerms = cellPerms(perms, bucket)
                  if (!bucketPerms.length) {
                    return (
                      <div key={bucket} className="flex justify-center">
                        <Minus className="h-4 w-4 text-muted-foreground/25" />
                      </div>
                    )
                  }
                  const granted = bucketPerms.every((p) => selectedSet.has(p.slug))
                  const isAdmin = bucket === 'admin'
                  return (
                    <div key={bucket} className="flex justify-center">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleCell(bucketPerms)}
                        title={bucketPerms.map((p) => p.name).join(', ')}
                        className={cn(
                          'rounded-full transition-colors',
                          !readOnly && 'cursor-pointer hover:scale-110',
                          readOnly && 'cursor-default'
                        )}
                      >
                        {granted ? (
                          <CheckCircle2 className={cn('h-5 w-5', isAdmin ? 'text-gold' : 'text-mint')} />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/25" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
