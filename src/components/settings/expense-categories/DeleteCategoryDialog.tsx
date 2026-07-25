'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { deleteExpenseCategoryAction } from '@/actions/expense-categories'
import type { ExpenseCategoryDTO } from '@/lib/expense-categories'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onDeleted,
  onArchive,
  onReassign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ExpenseCategoryDTO | null
  onDeleted: (id: string) => void
  onArchive: () => void
  onReassign: () => void
}) {
  const [pending, startTransition] = useTransition()
  const used = (category?.expenseCount ?? 0) > 0
  const childUsed = (category?.children ?? []).some((child) => child.expenseCount > 0)
  const blocked = used || childUsed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {blocked ? 'Category in use' : 'Delete this expense category?'}
          </DialogTitle>
          <DialogDescription>
            {category ? (
              blocked ? (
                <>
                  <span className="font-medium text-zinc-800">{category.name}</span>
                  {' — '}
                  This category has existing expense transactions and cannot be permanently deleted.
                </>
              ) : (
                <>
                  Permanently delete <span className="font-medium text-zinc-800">{category.name}</span>?
                  This cannot be undone.
                </>
              )
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-wrap">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {blocked ? (
            <>
              <Button type="button" variant="secondary" disabled={pending} onClick={onArchive}>
                Archive Category
              </Button>
              <Button type="button" disabled={pending} onClick={onReassign}>
                Reassign Expenses
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !category}
              onClick={() => {
                if (!category) return
                startTransition(async () => {
                  const result = await deleteExpenseCategoryAction({ id: category.id })
                  if (!result.success) {
                    if (result.error === 'USED') {
                      toast.error(
                        'This category has existing expense transactions and cannot be permanently deleted.',
                      )
                      return
                    }
                    toast.error(result.error)
                    return
                  }
                  toast.success(result.message ?? 'Category deleted.')
                  onDeleted(category.id)
                  onOpenChange(false)
                })
              }}
            >
              {pending ? 'Deleting…' : 'Delete Category'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
