import type { AdminCategory } from '@/lib/api/admin'

export interface AdminCategoryTreeItem extends AdminCategory {
  depth: number
}

/** Depth-first flatten (siblings ordered by sortOrder), for indented <select> options. */
export function flattenCategoryTree(categories: AdminCategory[], excludeId?: string): AdminCategoryTreeItem[] {
  const byParent = new Map<string | null, AdminCategory[]>()
  for (const c of categories) {
    const key = c.parentId
    byParent.set(key, [...(byParent.get(key) ?? []), c])
  }
  const out: AdminCategoryTreeItem[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const c of (byParent.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (c.id !== excludeId) out.push({ ...c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

/** A category's own slug plus every descendant's slug — for "select a parent, match its whole branch" filtering. */
export function collectDescendantSlugs(categories: AdminCategory[], rootId: string): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const root = byId.get(rootId)
  if (!root) return []
  const slugs = [root.slug]
  const children = categories.filter((c) => c.parentId === rootId)
  for (const child of children) slugs.push(...collectDescendantSlugs(categories, child.id))
  return slugs
}
