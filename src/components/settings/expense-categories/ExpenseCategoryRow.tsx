'use client'

import { Check, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import type { ExpenseCostType } from '@prisma/client'

import type { ExpenseCategoryDTO } from '@/lib/expense-categories'
import { costTypeSelectOptions } from '@/lib/expense-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type CategoryDraft = {
  name: string
  defaultCostType: ExpenseCostType | null
}

export function ExpenseCategoryRow({
  category,
  editing,
  draft,
  pendingCostType,
  pending,
  onEdit,
  onDraftChange,
  onSave,
  onCancel,
  onDelete,
  onArchive,
  onRestore,
  onAddChild,
  onCostTypePreview,
  layout = 'table',
}: {
  category: ExpenseCategoryDTO
  editing: boolean
  draft: CategoryDraft
  pendingCostType?: ExpenseCostType | null
  pending?: boolean
  onEdit: () => void
  onDraftChange: (draft: CategoryDraft) => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
  onArchive: () => void
  onRestore: () => void
  onAddChild?: () => void
  onCostTypePreview: (value: ExpenseCostType | null) => void
  layout?: 'table' | 'card'
}) {
  const shownCostType = editing
    ? draft.defaultCostType
    : pendingCostType !== undefined
      ? pendingCostType
      : category.defaultCostType

  const costSelect = (
    <select
      className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
      value={shownCostType ?? ''}
      disabled={pending || (category.isTransport && !category.parentId)}
      onChange={(e) => {
        const value = (e.target.value || null) as ExpenseCostType | null
        if (editing) onDraftChange({ ...draft, defaultCostType: value })
        else onCostTypePreview(value)
      }}
    >
      {costTypeSelectOptions.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  const editActions = (
    <>
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onSave} aria-label="Save">
        <Check className="h-4 w-4" />
      </Button>
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onCancel} aria-label="Cancel">
        <X className="h-4 w-4" />
      </Button>
    </>
  )

  const viewActionsDesktop = (
    <>
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onEdit} aria-label="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      {category.isArchived ? (
        <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onRestore} aria-label="Restore">
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : null}
      {category.isTransport && !category.parentId && !category.isArchived && onAddChild ? (
        <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onAddChild} aria-label="Add subcategory">
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}
      <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={onDelete} aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  )

  const viewActionsMobile = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label="Actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        {category.isTransport && !category.parentId && !category.isArchived && onAddChild ? (
          <DropdownMenuItem onClick={onAddChild}>Add subcategory</DropdownMenuItem>
        ) : null}
        {category.isArchived ? (
          <DropdownMenuItem onClick={onRestore}>Restore</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onArchive}>Archive</DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-red-600" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (layout === 'card') {
    return (
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                value={draft.name}
                onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
                className="h-9"
              />
            ) : (
              <p className={`font-medium text-zinc-900 ${category.parentId ? 'pl-3' : ''}`}>
                {category.name}
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              {category.isArchived ? 'Archived' : 'Active'} · {category.expenseCount} expense
              {category.expenseCount === 1 ? '' : 's'}
            </p>
          </div>
          {editing ? <div className="flex">{editActions}</div> : viewActionsMobile}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500">Default Cost Type</p>
          {costSelect}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_4.5rem_auto] items-center gap-3 border-b border-zinc-100 py-2.5 text-sm">
      {editing ? (
        <Input
          value={draft.name}
          onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
          className={`h-9 ${category.parentId ? 'ml-6' : ''}`}
        />
      ) : (
        <span className={`truncate text-zinc-900 ${category.parentId ? 'pl-6 text-zinc-700' : 'font-medium'}`}>
          {category.name}
        </span>
      )}
      {costSelect}
      <span className={category.isArchived ? 'text-amber-700' : 'text-zinc-600'}>
        {category.isArchived ? 'Archived' : 'Active'}
      </span>
      <span className="text-zinc-600">{category.expenseCount}</span>
      <div className="flex justify-end gap-0.5">
        {editing ? editActions : viewActionsDesktop}
      </div>
    </div>
  )
}
