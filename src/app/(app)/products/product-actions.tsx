'use client'

import { useState, useTransition } from 'react'
import {
  History,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { restoreProductAction } from '@/actions/products'
import { AddStockModal } from '@/app/(app)/products/add-stock-modal'
import { AdjustStockModal } from '@/app/(app)/products/adjust-stock-modal'
import { DeleteProductDialog } from '@/app/(app)/products/delete-product-dialog'
import { EditProductModal } from '@/app/(app)/products/edit-product-modal'
import type { ProductRow } from '@/app/(app)/products/products-table'
import { ProductDetailsModal } from '@/app/(app)/products/product-details-modal'
import { StockHistoryModal } from '@/app/(app)/products/stock-history-modal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ActionKey = 'add' | 'adjust' | 'edit' | 'delete' | 'history' | null

export function ProductActions({
  product,
  currency,
  compact = false,
}: {
  product: ProductRow
  currency: string
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<ActionKey>(null)
  const isService = product.productType === 'SERVICE'

  return (
    <>
      {compact ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Product actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isService ? null : (
              <>
                <DropdownMenuItem onClick={() => setActive('add')}>
                  <PackagePlus className="h-4 w-4" />
                  Purchase Stock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActive('adjust')}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Adjust Stock
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => setActive('edit')}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {isService ? null : (
              <DropdownMenuItem onClick={() => setActive('history')}>
                <History className="h-4 w-4" />
                Stock History
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {!product.isActive ? (
              <DropdownMenuItem
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await restoreProductAction(product.id)
                    if (!result.success) {
                      toast.error(result.error)
                      return
                    }
                    toast.success(result.message ?? 'Product restored')
                    router.refresh()
                  })
                }
              >
                Restore
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => setActive('delete')}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {isService ? null : (
            <Button type="button" size="sm" variant="outline" onClick={() => setActive('add')}>
              <PackagePlus className="h-3.5 w-3.5" />
              Purchase Stock
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="ghost" aria-label="More product actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isService ? null : (
                <DropdownMenuItem onClick={() => setActive('adjust')}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Adjust Stock
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setActive('edit')}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {isService ? null : (
                <DropdownMenuItem onClick={() => setActive('history')}>
                  <History className="h-4 w-4" />
                  Stock History
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!product.isActive ? (
                <DropdownMenuItem
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await restoreProductAction(product.id)
                      if (!result.success) {
                        toast.error(result.error)
                        return
                      }
                      toast.success(result.message ?? 'Product restored')
                      router.refresh()
                    })
                  }
                >
                  Restore
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setActive('delete')}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {isService ? null : (
        <>
          <AddStockModal
            product={product}
            currency={currency}
            open={active === 'add'}
            onOpenChange={(open) => setActive(open ? 'add' : null)}
          />
          <AdjustStockModal
            product={product}
            open={active === 'adjust'}
            onOpenChange={(open) => setActive(open ? 'adjust' : null)}
          />
          <StockHistoryModal
            product={product}
            open={active === 'history'}
            onOpenChange={(open) => setActive(open ? 'history' : null)}
          />
        </>
      )}
      <EditProductModal
        product={product}
        currency={currency}
        open={active === 'edit'}
        onOpenChange={(open) => setActive(open ? 'edit' : null)}
      />
      <DeleteProductDialog
        product={product}
        open={active === 'delete'}
        onOpenChange={(open) => setActive(open ? 'delete' : null)}
      />
    </>
  )
}

export function ProductNameButton({
  product,
  currency,
}: {
  product: ProductRow
  currency: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="text-left font-medium text-zinc-900 hover:underline"
        onClick={() => setOpen(true)}
      >
        {product.name}
      </button>
      <ProductDetailsModal
        product={product}
        currency={currency}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
