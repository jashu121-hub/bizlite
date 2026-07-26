'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
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
    related: string[]
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
      setStatus({
        canDelete: result.data.canDelete,
        name: result.data.name,
        related: result.data.related ?? [],
      })
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
          <AlertDialogTitle>
            {status?.canDelete ? 'Delete this product?' : 'Cannot delete permanently'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-zinc-500">
              <p>
                Product: <span className="font-medium text-zinc-800">{product.name}</span>
              </p>
              {!status ? (
                <Skeleton className="h-12 w-full" />
              ) : status.canDelete ? (
                <p>
                  This product has no linked sales, stock movements, expenses or cost calculations
                  and can be permanently deleted. This cannot be undone.
                </p>
              ) : (
                <div className="space-y-2">
                  <p>
                    This product still has linked records. Permanent deletion is blocked until those
                    records are removed (for example via Settings → Reset Business Data).
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-zinc-700">
                    {status.related.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-xs">
                    Archive keeps the product out of new sales while preserving history in reports.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {status && !status.canDelete ? (
            <Button asChild variant="outline" disabled={pending}>
              <Link
                href={`/products/${product.id}`}
                onClick={() => onOpenChange(false)}
              >
                View Related Transactions
              </Link>
            </Button>
          ) : null}
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
              {pending ? 'Deleting…' : 'Delete Permanently'}
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
