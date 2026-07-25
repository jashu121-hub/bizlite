'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { archiveExpenseCategoryAction } from '@/actions/expense-categories'
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

export function ArchiveCategoryDialog({
  open,
  onOpenChange,
  category,
  onArchived,
  onReassign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ExpenseCategoryDTO | null
  onArchived: (id: string) => void
  onReassign: () => void
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive category?</DialogTitle>
          <DialogDescription>
            {category
              ? `“${category.name}” will be hidden from new expense forms. Existing expenses and reports keep their history.`
              : 'Archived categories stay available on historical records.'}
          </DialogDescription>
        </DialogHeader>
        {category && category.expenseCount > 0 ? (
          <p className="text-sm text-zinc-600">
            This category has {category.expenseCount} linked expense
            {category.expenseCount === 1 ? '' : 's'}. You can archive it or reassign those expenses
            first.
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {category && category.expenseCount > 0 ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={onReassign}>
              Reassign Expenses
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={pending || !category}
            onClick={() => {
              if (!category) return
              startTransition(async () => {
                const result = await archiveExpenseCategoryAction({ id: category.id })
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                toast.success(result.message ?? 'Category archived.')
                onArchived(category.id)
                onOpenChange(false)
              })
            }}
          >
            {pending ? 'Archiving…' : 'Archive Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
