'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { reassignExpensesAction } from '@/actions/expense-categories'
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
import { Label } from '@/components/ui/label'

export function ReassignExpensesDialog({
  open,
  onOpenChange,
  category,
  categories,
  currency,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ExpenseCategoryDTO | null
  categories: ExpenseCategoryDTO[]
  currency: string
  onDone: (fromId: string, toId: string) => void
}) {
  const [toId, setToId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [pending, startTransition] = useTransition()

  const targets = useMemo(
    () =>
      categories
        .flatMap((item) => [item, ...(item.children ?? [])])
        .filter(
          (item) =>
            !item.isArchived &&
            !item.isTransport &&
            item.id !== category?.id &&
            item.parentId !== category?.id,
        ),
    [categories, category],
  )

  const amountLabel = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'AED',
    maximumFractionDigits: 2,
  }).format(category?.expenseAmount ?? 0)

  const reset = () => {
    setToId('')
    setConfirmed(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign expenses</DialogTitle>
          <DialogDescription>
            Move linked expenses to another category. Historical amounts stay the same.
          </DialogDescription>
        </DialogHeader>
        {category ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p>
                <span className="text-zinc-500">Current category:</span>{' '}
                <span className="font-medium text-zinc-900">{category.name}</span>
              </p>
              <p>
                <span className="text-zinc-500">Linked expenses:</span>{' '}
                <span className="font-medium text-zinc-900">{category.expenseCount}</span>
              </p>
              <p>
                <span className="text-zinc-500">Total amount:</span>{' '}
                <span className="font-medium text-zinc-900">{amountLabel}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reassign-to">New category</Label>
              <select
                id="reassign-to"
                className="h-10 w-full rounded-md border bg-transparent px-3"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                <option value="">Select category…</option>
                {targets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.parentId ? `↳ ${item.name}` : item.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>Apply to all linked expenses. I understand this updates historical records.</span>
            </label>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !category || !toId || !confirmed}
            onClick={() => {
              if (!category || !toId) return
              startTransition(async () => {
                const result = await reassignExpensesAction({
                  fromCategoryId: category.id,
                  toCategoryId: toId,
                })
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                toast.success(result.message ?? 'Expenses reassigned successfully.')
                onDone(category.id, toId)
                reset()
                onOpenChange(false)
              })
            }}
          >
            {pending ? 'Reassigning…' : 'Reassign expenses'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
