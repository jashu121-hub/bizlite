'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import { getQuickAddOptionsAction } from '@/actions/quick-add'
import { createCustomerAction } from '@/actions/customers'
import { createExpenseAction } from '@/actions/expenses'
import { createProductAction } from '@/actions/products'
import { createSaleAction } from '@/actions/sales'
import { CustomerForm } from '@/app/(app)/customers/customer-form'
import { ExpenseForm } from '@/app/(app)/expenses/expense-form'
import { ProductForm } from '@/app/(app)/products/product-form'
import { SalesForm } from '@/app/(app)/sales/sales-form'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { CustomerOption } from '@/components/shared/customer-selector'
import type { ProductOption } from '@/components/shared/product-selector'
import { useQuickAdd, type QuickAddType } from '@/components/layout/quick-add-context'
import { cn } from '@/lib/utils'

const TITLES: Record<QuickAddType, { title: string; description: string }> = {
  sale: { title: 'New Sale', description: 'Create a sale without leaving this page.' },
  expense: { title: 'Add Expense', description: 'Record a business expense.' },
  product: { title: 'New Product', description: 'Add a product to your inventory.' },
  customer: { title: 'New Customer', description: 'Add a customer to your records.' },
}

export function QuickAddModal() {
  const {
    activeType,
    closeQuickAdd,
    requestCloseQuickAdd,
    setIsDirty,
    discardOpen,
    setDiscardOpen,
    confirmDiscard,
    continueEditing,
    currency,
  } = useQuickAdd()

  const [loading, setLoading] = React.useState(false)
  const [options, setOptions] = React.useState<{
    products: ProductOption[]
    customers: CustomerOption[]
    currency: string
  } | null>(null)

  React.useEffect(() => {
    if (!activeType) {
      setOptions(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void getQuickAddOptionsAction().then((result) => {
      if (cancelled) return
      if (!result.success) {
        toast.error(result.error)
        closeQuickAdd()
        return
      }
      setOptions(result.data)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [activeType, closeQuickAdd])

  const meta = activeType ? TITLES[activeType] : null
  const open = activeType !== null

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestCloseQuickAdd()
        }}
      >
        <DialogContent
          showCloseButton={false}
          data-quick-add-modal=""
          className={cn(
            'flex flex-col gap-0 overflow-hidden border-zinc-200/80 bg-white p-0 shadow-xl',
            // Mobile near-full sheet
            'top-auto bottom-0 left-0 right-0 h-[min(92vh,100%)] max-h-[92vh] w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            // Desktop / tablet centred
            'sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:right-auto sm:h-auto sm:max-h-[90vh] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl',
            'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
            activeType === 'sale' ? 'sm:max-w-[920px]' : 'sm:max-w-[600px]',
          )}
          onPointerDownOutside={(event) => {
            event.preventDefault()
            requestCloseQuickAdd()
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault()
            requestCloseQuickAdd()
          }}
          onInteractOutside={(event) => {
            event.preventDefault()
            requestCloseQuickAdd()
          }}
        >
          <div className="relative shrink-0 border-b border-zinc-100 px-5 py-4 pr-12">
            <DialogTitle className="text-lg font-semibold text-zinc-900">
              {meta?.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-zinc-500">
              {meta?.description}
            </DialogDescription>
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
              aria-label="Close"
              onClick={requestCloseQuickAdd}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">
            {loading || !options || !activeType ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-40 ml-auto" />
              </div>
            ) : activeType === 'sale' ? (
              <SalesForm
                key="quick-sale"
                products={options.products}
                customers={options.customers}
                currency={options.currency || currency}
                onSubmit={createSaleAction}
                onSuccess={closeQuickAdd}
                onCancel={requestCloseQuickAdd}
                onDirtyChange={setIsDirty}
              />
            ) : activeType === 'expense' ? (
              <ExpenseForm
                key="quick-expense"
                currency={options.currency || currency}
                onSubmit={createExpenseAction}
                onSuccess={closeQuickAdd}
                onCancel={requestCloseQuickAdd}
                onDirtyChange={setIsDirty}
              />
            ) : activeType === 'product' ? (
              <ProductForm
                key="quick-product"
                currency={options.currency || currency}
                onSubmit={createProductAction}
                onSuccess={closeQuickAdd}
                onCancel={requestCloseQuickAdd}
                onDirtyChange={setIsDirty}
              />
            ) : (
              <CustomerForm
                key="quick-customer"
                onSubmit={createCustomerAction}
                onSuccess={closeQuickAdd}
                onCancel={requestCloseQuickAdd}
                onDirtyChange={setIsDirty}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={(next) => {
          if (!next) continueEditing()
          else setDiscardOpen(true)
        }}
        title="Discard unsaved changes?"
        description="Your form has unsaved changes. Are you sure you want to discard them?"
        cancelLabel="Continue Editing"
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={confirmDiscard}
      />
    </>
  )
}
