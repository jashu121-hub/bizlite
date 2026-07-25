'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  archiveProductAction,
  deleteProductAction,
  getProductDeleteStatusAction,
} from '@/actions/products'
import type { ProductRow } from '@/app/(app)/products/products-table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ProductRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{
    canDelete: boolean
    name: string
  } | null>(null)

  useEffect(() => {
    if (!product || !open) {
      setStatus(null)
      return
    }
    let cancelled = false
    void getProductDeleteStatusAction(product.id).then((result) => {
      if (cancelled) return
      if (!result.success) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }
      setStatus({ canDelete: result.data.canDelete, name: result.data.name })
    })
    return () => {
      cancelled = true
    }
  }, [product, open, onOpenChange])

  if (!product) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this product?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-zinc-500">
              <p>
                Product: <span className="font-medium text-zinc-800">{product.name}</span>
              </p>
              {!status ? (
                <Skeleton className="h-12 w-full" />
              ) : status.canDelete ? (
                <p>
                  This product has no sales or stock history and can be permanently deleted. This
                  cannot be undone.
                </p>
              ) : (
                <p>
                  This product has transaction history and cannot be permanently deleted. You can
                  archive it instead. Archived products stay in historical invoices and reports, but
                  will not appear in new sale product selection.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {status?.canDelete ? (
            <Button
              variant="destructive"
              disabled={pending || !status}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteProductAction(product.id)
                  if (!result.success) {
                    toast.error(result.error)
                    return
                  }
                  toast.success(result.message ?? 'Product deleted')
                  onOpenChange(false)
                  router.refresh()
                })
              }
            >
              {pending ? 'Deleting…' : 'Delete Product'}
            </Button>
          ) : (
            <Button
              disabled={pending || !status}
              onClick={() =>
                startTransition(async () => {
                  const result = await archiveProductAction(product.id)
                  if (!result.success) {
                    toast.error(result.error)
                    return
                  }
                  toast.success(result.message ?? 'Product archived')
                  onOpenChange(false)
                  router.refresh()
                })
              }
            >
              {pending ? 'Archiving…' : 'Archive Product'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
