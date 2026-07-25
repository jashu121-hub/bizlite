'use client'

import { useMemo, useState, useTransition } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { ExpenseCostType } from '@prisma/client'

import {
  bulkUpdateExpenseCategoryDefaultsAction,
  createExpenseCategoryAction,
  listExpenseCategoriesAction,
  restoreExpenseCategoryAction,
  updateExpenseCategoryAction,
} from '@/actions/expense-categories'
import type { ExpenseCategoryDTO } from '@/lib/expense-categories'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AddCategoryRow, type AddCategoryDraft } from './AddCategoryRow'
import { ApplyCostTypeDialog, type CostTypeApplyScope } from './ApplyCostTypeDialog'
import { ArchiveCategoryDialog } from './ArchiveCategoryDialog'
import { DeleteCategoryDialog } from './DeleteCategoryDialog'
import { ExpenseCategoryRow, type CategoryDraft } from './ExpenseCategoryRow'
import { ReassignExpensesDialog } from './ReassignExpensesDialog'

type StatusFilter = 'all' | 'active' | 'archived' | 'PRODUCTION' | 'SELLING' | 'OVERHEAD' | 'UNCLASSIFIED'

function flatten(categories: ExpenseCategoryDTO[]) {
  return categories.flatMap((item) => [item, ...(item.children ?? [])])
}

function upsertCategory(list: ExpenseCategoryDTO[], category: ExpenseCategoryDTO): ExpenseCategoryDTO[] {
  if (category.parentId) {
    return list.map((item) => {
      if (item.id !== category.parentId) return item
      const children = item.children ?? []
      const exists = children.some((child) => child.id === category.id)
      return {
        ...item,
        children: exists
          ? children.map((child) => (child.id === category.id ? { ...child, ...category } : child))
          : [...children, category].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      }
    })
  }
  const exists = list.some((item) => item.id === category.id)
  if (exists) {
    return list.map((item) =>
      item.id === category.id ? { ...item, ...category, children: item.children } : item,
    )
  }
  return [...list, { ...category, children: category.children ?? [] }].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )
}

function removeCategory(list: ExpenseCategoryDTO[], id: string): ExpenseCategoryDTO[] {
  return list
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: (item.children ?? []).filter((child) => child.id !== id),
    }))
}

function patchCategory(
  list: ExpenseCategoryDTO[],
  id: string,
  patch: Partial<ExpenseCategoryDTO>,
): ExpenseCategoryDTO[] {
  return list.map((item) => {
    if (item.id === id) return { ...item, ...patch }
    return {
      ...item,
      children: item.children?.map((child) => (child.id === id ? { ...child, ...patch } : child)),
    }
  })
}

export function ExpenseCategoryManager({
  initialCategories,
  currency = 'AED',
}: {
  initialCategories: ExpenseCategoryDTO[]
  currency?: string
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CategoryDraft>({ name: '', defaultCostType: null })
  const [pendingDefaults, setPendingDefaults] = useState<Record<string, ExpenseCostType | null>>({})
  const [adding, setAdding] = useState<AddCategoryDraft | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('active')
  const [showArchived, setShowArchived] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategoryDTO | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ExpenseCategoryDTO | null>(null)
  const [reassignTarget, setReassignTarget] = useState<ExpenseCategoryDTO | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyMode, setApplyMode] = useState<'row' | 'bulk'>('row')
  const [pending, startTransition] = useTransition()

  const allRows = useMemo(() => flatten(categories), [categories])
  const pendingCount = Object.keys(pendingDefaults).length

  const visibleRoots = useMemo(() => {
    const q = search.trim().toLowerCase()
    return categories.filter((root) => {
      const childMatch = (root.children ?? []).some((child) => matchesFilter(child, filter, q))
      const rootMatch = matchesFilter(root, filter, q)
      if (filter === 'archived') return root.isArchived || (root.children ?? []).some((c) => c.isArchived)
      if (filter === 'active') {
        if (root.isArchived) return false
        return rootMatch || childMatch || !q
      }
      return rootMatch || childMatch
    })
  }, [categories, filter, search])

  const archivedRows = useMemo(
    () => allRows.filter((item) => item.isArchived),
    [allRows],
  )

  const refresh = async () => {
    const result = await listExpenseCategoriesAction()
    if (result.success) setCategories(result.data)
  }

  const startEdit = (category: ExpenseCategoryDTO) => {
    setAdding(null)
    setEditingId(category.id)
    setDraft({
      name: category.name,
      defaultCostType:
        pendingDefaults[category.id] !== undefined
          ? pendingDefaults[category.id]
          : category.defaultCostType,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft({ name: '', defaultCostType: null })
  }

  const saveRow = (
    category: ExpenseCategoryDTO,
    options?: { applyScope?: CostTypeApplyScope; skipPrompt?: boolean },
  ) => {
    const name = draft.name.trim()
    if (!name) {
      toast.error('Category name is required.')
      return
    }
    const duplicate = allRows.some(
      (item) => item.id !== category.id && item.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (duplicate) {
      toast.error('A category with this name already exists.')
      return
    }

    const costChanged = category.defaultCostType !== draft.defaultCostType
    if (costChanged && !options?.skipPrompt) {
      setApplyMode('row')
      setApplyOpen(true)
      return
    }

    const scope = options?.applyScope ?? 'new'
    startTransition(async () => {
      const result = await updateExpenseCategoryAction({
        id: category.id,
        name,
        defaultCostType: draft.defaultCostType,
        applyCostTypeToExisting: scope === 'existing',
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCategories((list) =>
        patchCategory(list, category.id, {
          name,
          defaultCostType: draft.defaultCostType,
        }),
      )
      setPendingDefaults((prev) => {
        const next = { ...prev }
        delete next[category.id]
        return next
      })
      cancelEdit()
      setApplyOpen(false)
      toast.success('Category updated successfully.')
    })
  }

  const saveAdd = () => {
    if (!adding) return
    const name = adding.name.trim()
    if (!name) {
      toast.error('Category name is required.')
      return
    }
    if (allRows.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error('A category with this name already exists.')
      return
    }
    startTransition(async () => {
      const result = await createExpenseCategoryAction({
        name,
        defaultCostType: adding.defaultCostType,
        parentId: adding.parentId ?? undefined,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const created: ExpenseCategoryDTO = {
        id: result.data.id,
        name: result.data.name,
        defaultCostType: result.data.defaultCostType,
        isArchived: result.data.isArchived,
        isTransport: result.data.isTransport,
        parentId: result.data.parentId,
        systemKey: result.data.systemKey,
        sortOrder: result.data.sortOrder,
        expenseCount: 0,
        expenseAmount: 0,
        children: [],
      }
      setCategories((list) => upsertCategory(list, created))
      setAdding(null)
      toast.success('Category created successfully.')
    })
  }

  const saveBulk = (scope: CostTypeApplyScope) => {
    const updates = Object.entries(pendingDefaults).map(([id, defaultCostType]) => ({
      id,
      defaultCostType,
    }))
    if (!updates.length) return
    startTransition(async () => {
      const result = await bulkUpdateExpenseCategoryDefaultsAction({
        updates,
        applyToExisting: scope === 'existing',
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCategories((list) => {
        let next = list
        for (const update of updates) {
          next = patchCategory(next, update.id, { defaultCostType: update.defaultCostType })
        }
        return next
      })
      setPendingDefaults({})
      setApplyOpen(false)
      toast.success('Classification defaults updated.')
    })
  }

  const requestBulkSave = () => {
    if (!pendingCount) return
    setApplyMode('bulk')
    setApplyOpen(true)
  }

  const findCategory = (id: string) => allRows.find((item) => item.id === id) ?? null

  return (
    <Card>
      <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Expense Cost Classification</CardTitle>
          <CardDescription>
            Manage expense categories and their default Cost Types. Transport stays split into
            Inward, Customer Delivery, and General Business Transport.
          </CardDescription>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          disabled={pending || !!adding}
          onClick={() => {
            cancelEdit()
            setAdding({ name: '', defaultCostType: 'OVERHEAD', parentId: null })
          }}
        >
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Input
            className="sm:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category"
          />
          <select
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="PRODUCTION">Production Cost</option>
            <option value="SELLING">Selling Cost</option>
            <option value="OVERHEAD">Overhead Cost</option>
            <option value="UNCLASSIFIED">Requires Classification</option>
          </select>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_4.5rem_auto] gap-3 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>Category</span>
            <span>Default Cost Type</span>
            <span>Status</span>
            <span>Expenses</span>
            <span className="text-right">Actions</span>
          </div>
          {adding && !adding.parentId ? (
            <AddCategoryRow
              draft={adding}
              onChange={setAdding}
              onSave={saveAdd}
              onCancel={() => setAdding(null)}
              pending={pending}
              layout="table"
            />
          ) : null}
          {visibleRoots.map((root) => {
            const children = (root.children ?? []).filter((child) => {
              if (filter === 'archived') return child.isArchived
              if (filter === 'active' || filter === 'all') {
                if (filter === 'active' && child.isArchived) return false
                const q = search.trim().toLowerCase()
                return !q || child.name.toLowerCase().includes(q) || root.name.toLowerCase().includes(q)
              }
              return matchesFilter(child, filter, search.trim().toLowerCase())
            })
            const showRoot =
              filter === 'archived'
                ? root.isArchived || children.length > 0
                : !root.isArchived &&
                  (matchesFilter(root, filter, search.trim().toLowerCase()) ||
                    children.length > 0 ||
                    !search.trim())

            if (!showRoot && filter !== 'archived') return null
            if (filter === 'archived' && !root.isArchived && children.length === 0) return null

            return (
              <div key={root.id}>
                {(filter !== 'archived' || root.isArchived) && (filter === 'archived' ? root.isArchived : !root.isArchived || filter === 'all') ? (
                  <ExpenseCategoryRow
                    category={root}
                    editing={editingId === root.id}
                    draft={draft}
                    pendingCostType={pendingDefaults[root.id]}
                    pending={pending}
                    onEdit={() => startEdit(root)}
                    onDraftChange={setDraft}
                    onSave={() => saveRow(root)}
                    onCancel={cancelEdit}
                    onDelete={() => setDeleteTarget(root)}
                    onArchive={() => setArchiveTarget(root)}
                    onRestore={() =>
                      startTransition(async () => {
                        const result = await restoreExpenseCategoryAction({ id: root.id })
                        if (!result.success) {
                          toast.error(result.error)
                          return
                        }
                        setCategories((list) => patchCategory(list, root.id, { isArchived: false }))
                        toast.success('Category restored.')
                      })
                    }
                    onAddChild={() => {
                      cancelEdit()
                      setAdding({
                        name: '',
                        defaultCostType: 'OVERHEAD',
                        parentId: root.id,
                      })
                    }}
                    onCostTypePreview={(value) => {
                      setPendingDefaults((prev) => {
                        if (value === root.defaultCostType) {
                          const next = { ...prev }
                          delete next[root.id]
                          return next
                        }
                        return { ...prev, [root.id]: value }
                      })
                    }}
                    layout="table"
                  />
                ) : null}
                {children.map((child) => (
                  <ExpenseCategoryRow
                    key={child.id}
                    category={child}
                    editing={editingId === child.id}
                    draft={draft}
                    pendingCostType={pendingDefaults[child.id]}
                    pending={pending}
                    onEdit={() => startEdit(child)}
                    onDraftChange={setDraft}
                    onSave={() => saveRow(child)}
                    onCancel={cancelEdit}
                    onDelete={() => setDeleteTarget(child)}
                    onArchive={() => setArchiveTarget(child)}
                    onRestore={() =>
                      startTransition(async () => {
                        const result = await restoreExpenseCategoryAction({ id: child.id })
                        if (!result.success) {
                          toast.error(result.error)
                          return
                        }
                        setCategories((list) => patchCategory(list, child.id, { isArchived: false }))
                        toast.success('Category restored.')
                      })
                    }
                    onCostTypePreview={(value) => {
                      setPendingDefaults((prev) => {
                        if (value === child.defaultCostType) {
                          const next = { ...prev }
                          delete next[child.id]
                          return next
                        }
                        return { ...prev, [child.id]: value }
                      })
                    }}
                    layout="table"
                  />
                ))}
                {adding?.parentId === root.id ? (
                  <AddCategoryRow
                    draft={adding}
                    onChange={setAdding}
                    onSave={saveAdd}
                    onCancel={() => setAdding(null)}
                    pending={pending}
                    layout="table"
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 sm:hidden">
          {adding && !adding.parentId ? (
            <AddCategoryRow
              draft={adding}
              onChange={setAdding}
              onSave={saveAdd}
              onCancel={() => setAdding(null)}
              pending={pending}
              layout="card"
            />
          ) : null}
          {visibleRoots.map((root) => {
            const children = (root.children ?? []).filter((child) => {
              if (filter === 'archived') return child.isArchived
              if (filter === 'active' && child.isArchived) return false
              const q = search.trim().toLowerCase()
              if (filter === 'PRODUCTION' || filter === 'SELLING' || filter === 'OVERHEAD' || filter === 'UNCLASSIFIED') {
                return matchesFilter(child, filter, q)
              }
              return !q || child.name.toLowerCase().includes(q) || root.name.toLowerCase().includes(q)
            })
            if (root.isArchived && filter === 'active') return null
            return (
              <div key={root.id} className="space-y-2">
                {!root.isArchived || filter === 'archived' || filter === 'all' ? (
                  <ExpenseCategoryRow
                    category={root}
                    editing={editingId === root.id}
                    draft={draft}
                    pendingCostType={pendingDefaults[root.id]}
                    pending={pending}
                    onEdit={() => startEdit(root)}
                    onDraftChange={setDraft}
                    onSave={() => saveRow(root)}
                    onCancel={cancelEdit}
                    onDelete={() => setDeleteTarget(root)}
                    onArchive={() => setArchiveTarget(root)}
                    onRestore={() =>
                      startTransition(async () => {
                        const result = await restoreExpenseCategoryAction({ id: root.id })
                        if (!result.success) {
                          toast.error(result.error)
                          return
                        }
                        setCategories((list) => patchCategory(list, root.id, { isArchived: false }))
                        toast.success('Category restored.')
                      })
                    }
                    onAddChild={() => {
                      cancelEdit()
                      setAdding({ name: '', defaultCostType: 'OVERHEAD', parentId: root.id })
                    }}
                    onCostTypePreview={(value) => {
                      setPendingDefaults((prev) => {
                        if (value === root.defaultCostType) {
                          const next = { ...prev }
                          delete next[root.id]
                          return next
                        }
                        return { ...prev, [root.id]: value }
                      })
                    }}
                    layout="card"
                  />
                ) : null}
                {children.map((child) => (
                  <ExpenseCategoryRow
                    key={child.id}
                    category={child}
                    editing={editingId === child.id}
                    draft={draft}
                    pendingCostType={pendingDefaults[child.id]}
                    pending={pending}
                    onEdit={() => startEdit(child)}
                    onDraftChange={setDraft}
                    onSave={() => saveRow(child)}
                    onCancel={cancelEdit}
                    onDelete={() => setDeleteTarget(child)}
                    onArchive={() => setArchiveTarget(child)}
                    onRestore={() =>
                      startTransition(async () => {
                        const result = await restoreExpenseCategoryAction({ id: child.id })
                        if (!result.success) {
                          toast.error(result.error)
                          return
                        }
                        setCategories((list) => patchCategory(list, child.id, { isArchived: false }))
                        toast.success('Category restored.')
                      })
                    }
                    onCostTypePreview={(value) => {
                      setPendingDefaults((prev) => {
                        if (value === child.defaultCostType) {
                          const next = { ...prev }
                          delete next[child.id]
                          return next
                        }
                        return { ...prev, [child.id]: value }
                      })
                    }}
                    layout="card"
                  />
                ))}
                {adding?.parentId === root.id ? (
                  <AddCategoryRow
                    draft={adding}
                    onChange={setAdding}
                    onSave={saveAdd}
                    onCancel={() => setAdding(null)}
                    pending={pending}
                    layout="card"
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        {filter !== 'archived' ? (
          <div className="rounded-xl border border-zinc-200">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-800"
              onClick={() => setShowArchived((value) => !value)}
            >
              <span>Archived Categories ({archivedRows.length})</span>
              <ChevronDown className={`h-4 w-4 transition ${showArchived ? 'rotate-180' : ''}`} />
            </button>
            {showArchived ? (
              <div className="space-y-2 border-t border-zinc-100 p-3">
                {archivedRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">No archived categories.</p>
                ) : (
                  archivedRows.map((category) => (
                    <div
                      key={category.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-zinc-800">{category.name}</p>
                        <p className="text-xs text-zinc-500">
                          {category.expenseCount} linked · can{' '}
                          {category.expenseCount === 0 ? 'delete permanently' : 'restore only'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await restoreExpenseCategoryAction({ id: category.id })
                              if (!result.success) {
                                toast.error(result.error)
                                return
                              }
                              setCategories((list) =>
                                patchCategory(list, category.id, { isArchived: false }),
                              )
                              toast.success('Category restored.')
                            })
                          }
                        >
                          Restore
                        </Button>
                        {category.expenseCount === 0 ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={pending}
                            onClick={() => setDeleteTarget(category)}
                          >
                            Delete permanently
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            {pendingCount
              ? `${pendingCount} unsaved cost type change${pendingCount === 1 ? '' : 's'}.`
              : 'Cost type edits stay local until you save.'}
          </p>
          <Button disabled={pending || pendingCount === 0} onClick={requestBulkSave}>
            {pending
              ? 'Saving…'
              : pendingCount
                ? `Save ${pendingCount} Change${pendingCount === 1 ? '' : 's'}`
                : 'Save classification defaults'}
          </Button>
        </div>
      </CardContent>

      <DeleteCategoryDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        category={deleteTarget}
        onDeleted={(id) => {
          setCategories((list) => removeCategory(list, id))
          setDeleteTarget(null)
        }}
        onArchive={() => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) setArchiveTarget(target)
        }}
        onReassign={() => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) setReassignTarget(target)
        }}
      />

      <ArchiveCategoryDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
        category={archiveTarget}
        onArchived={(id) => {
          setCategories((list) => patchCategory(list, id, { isArchived: true }))
          setArchiveTarget(null)
        }}
        onReassign={() => {
          const target = archiveTarget
          setArchiveTarget(null)
          if (target) setReassignTarget(target)
        }}
      />

      <ReassignExpensesDialog
        open={!!reassignTarget}
        onOpenChange={(open) => {
          if (!open) setReassignTarget(null)
        }}
        category={reassignTarget}
        categories={categories}
        currency={currency}
        onDone={() => {
          void refresh()
          setReassignTarget(null)
        }}
      />

      <ApplyCostTypeDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        pending={pending}
        count={applyMode === 'bulk' ? pendingCount : 1}
        onConfirm={(scope) => {
          if (applyMode === 'bulk') {
            saveBulk(scope)
            return
          }
          const category = editingId ? findCategory(editingId) : null
          if (category) saveRow(category, { applyScope: scope, skipPrompt: true })
        }}
      />
    </Card>
  )
}

function matchesFilter(category: ExpenseCategoryDTO, filter: StatusFilter, q: string) {
  if (q && !category.name.toLowerCase().includes(q)) return false
  if (filter === 'all') return true
  if (filter === 'active') return !category.isArchived
  if (filter === 'archived') return category.isArchived
  if (filter === 'UNCLASSIFIED') return category.defaultCostType == null
  return category.defaultCostType === filter
}
