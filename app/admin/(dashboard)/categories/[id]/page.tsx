import { CategoryManager } from '@/components/admin/category-manager'
import { ProtectedRoute } from '@/components/admin/protected-route'

export default async function AdminCategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ProtectedRoute permission="categories.update">
      <CategoryManager nodeId={id} />
    </ProtectedRoute>
  )
}
