'use client'

import { updateProductAction } from '@/actions/products'
import { ProductForm } from '@/app/(app)/products/product-form'
import { ProductModalShell } from '@/app/(app)/products/product-modal-shell'
import type { ProductRow } from '@/app/(app)/products/products-table'

export function EditProductModal({
  product,
  currency,
  open,
  onOpenChange,
}: {
  product: ProductRow | null
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!product) return null

  return (
    <ProductModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Product"
      description="Update product details. Stock is managed separately."
      wide
    >
      <ProductForm
        key={product.id}
        currency={currency}
        hideOpeningStock
        initial={{
          name: product.name,
          category: product.category,
          sku: product.sku ?? '',
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          openingStock: product.openingStock,
          currentStock: product.currentStock,
          lowStockLevel: product.lowStockLevel,
          notes: product.notes ?? '',
          isActive: product.isActive,
          costBreakdown: product.costBreakdown,
        }}
        onSubmit={(data) => updateProductAction(product.id, data)}
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </ProductModalShell>
  )
}
