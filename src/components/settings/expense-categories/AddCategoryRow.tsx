'use client'

import { Check, X } from 'lucide-react'
import type { ExpenseCostType } from '@prisma/client'

import { costTypeSelectOptions } from '@/lib/expense-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type AddCategoryDraft = {
  name: string
  defaultCostType: ExpenseCostType | null
  parentId?: string | null
}

export function AddCategoryRow({
  draft,
  onChange,
  onSave,
  onCancel,
  pending,
  layout = 'table',
}: {
  draft: AddCategoryDraft
  onChange: (draft: AddCategoryDraft) => void
  onSave: () => void
  onCancel: () => void
  pending?: boolean
  layout?: 'table' | 'card'
}) {
  const nameInput = (
    <Input
      autoFocus
      placeholder={draft.parentId ? 'Transport subcategory name' : 'Category name'}
      value={draft.name}
      onChange={(e) => onChange({ ...draft, name: e.target.value })}
      className={layout === 'table' && draft.parentId ? 'h-9 ml-6' : 'h-9'}
    />
  )

  const costSelect = (
    <select
      className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
      value={draft.defaultCostType ?? ''}
      onChange={(e) =>
        onChange({
          ...draft,
          defaultCostType: (e.target.value || null) as ExpenseCostType | null,
        })
      }
    >
      {costTypeSelectOptions.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  const actions = (
    <div className="flex justify-end gap-1">
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onSave} aria-label="Save">
        <Check className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onCancel} aria-label="Cancel">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )

  if (layout === 'card') {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-3">
        <p className="text-sm font-medium text-zinc-800">
          {draft.parentId ? 'New transport subcategory' : 'New category'}
        </p>
        {nameInput}
        {costSelect}
        {actions}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_4.5rem_auto] items-center gap-3 border-b border-dashed border-teal-200 bg-teal-50/30 py-2.5">
      {nameInput}
      {costSelect}
      <span className="text-xs text-zinc-500">New</span>
      <span className="text-xs text-zinc-500">0</span>
      {actions}
    </div>
  )
}
