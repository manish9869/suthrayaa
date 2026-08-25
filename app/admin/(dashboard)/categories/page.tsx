import { CategoryManager } from '@/components/admin/category-manager'
import { ProtectedRoute } from '@/components/admin/protected-route'

export default function AdminCategoriesPage() {
  return (
    <ProtectedRoute permission="categories.view">
      <CategoryManager nodeId={null} />
    </ProtectedRoute>
  )
}
