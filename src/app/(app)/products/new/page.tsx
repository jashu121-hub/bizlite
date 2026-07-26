import { createProductAction } from '@/actions/products'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { ProductForm } from '../product-form'

export default async function NewProductPage() {
  const { profile } = await requireProfile()
  return (
    <div className="space-y-6">
      <PageHeader
        title="New product"
        description="Choose a product type — resale, manufactured, or service — then enter pricing and stock details."
      />
      <ProductForm currency={profile.currency} onSubmit={createProductAction} />
    </div>
  )
}

