import { CategoryManager } from '@/components/admin/category-manager'

export default async function AdminCategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CategoryManager nodeId={id} />
}
