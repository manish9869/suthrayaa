import type { Category } from '@/lib/data'

export interface CategoryNode extends Category {
  children: CategoryNode[]
}

/** Turns the flat ~44-row category list into a nested tree (top-level roots first). */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodeById = new Map<string, CategoryNode>()
  for (const c of categories) nodeById.set(c.id, { ...c, children: [] })

  const roots: CategoryNode[] = []
  for (const c of categories) {
    const node = nodeById.get(c.id)!
    if (c.parentId && nodeById.has(c.parentId)) {
      nodeById.get(c.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

/** This node's own slug plus every descendant's slug — used to match products against a selected branch, not just an exact leaf. */
export function collectSlugs(node: CategoryNode): string[] {
  return [node.slug, ...node.children.flatMap(collectSlugs)]
}

/** Products only ever attach to leaf categories, so a parent's own productCount is 0 — sum descendants to get the real branch total. */
export function totalProductCount(node: CategoryNode): number {
  return node.productCount + node.children.reduce((sum, child) => sum + totalProductCount(child), 0)
}
