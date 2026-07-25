'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { ExpenseCategory, ExpenseCostType } from '@prisma/client'

import { updateExpenseCostDefaultsAction } from '@/actions/expenses'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { EXPENSE_CATEGORIES, EXPENSE_COST_TYPES } from '@/lib/constants'
import {
  mergedCategoryCostDefaults,
  type ExpenseCostDefaultsMap,
} from '@/lib/expense-cost'

export function ExpenseCostDefaultsForm({
  initialDefaults,
}: {
  initialDefaults?: ExpenseCostDefaultsMap | null
}) {
  const [pending, startTransition] = useTransition()
  const merged = mergedCategoryCostDefaults(initialDefaults)
  const [defaults, setDefaults] = useState<Record<ExpenseCategory, ExpenseCostType | null>>(merged)
  const [updateHistorical, setUpdateHistorical] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Cost Classification</CardTitle>
        <CardDescription>
          Choose the default Cost Type for each expense category. New expenses use these
          defaults. Transport always requires Inward, Customer Delivery, or General Transport.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {EXPENSE_CATEGORIES.map((category) => (
            <div
              key={category.value}
              className="grid gap-2 sm:grid-cols-[1fr_220px] sm:items-center"
            >
              <Label htmlFor={`cost-default-${category.value}`}>{category.label}</Label>
              {category.value === 'TRANSPORT' ? (
                <p className="text-sm text-amber-700">Needs classification per expense</p>
              ) : (
                <select
                  id={`cost-default-${category.value}`}
                  className="h-10 w-full rounded-md border bg-transparent px-3"
                  value={defaults[category.value] ?? 'OVERHEAD'}
                  onChange={(e) =>
                    setDefaults((prev) => ({
                      ...prev,
                      [category.value]: e.target.value as ExpenseCostType,
                    }))
                  }
                >
                  {EXPENSE_COST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        <label className="flex items-start gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            className="mt-1"
            checked={updateHistorical}
            onChange={(e) => setUpdateHistorical(e.target.checked)}
          />
          <span>
            Also update existing expenses to match these defaults (does not change transport
            expenses that still need classification).
          </span>
        </label>

        <div className="flex justify-end">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateExpenseCostDefaultsAction({
                  defaults,
                  updateHistorical,
                })
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                toast.success(result.message ?? 'Defaults saved')
                setUpdateHistorical(false)
              })
            }
          >
            {pending ? 'Saving…' : 'Save classification defaults'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
