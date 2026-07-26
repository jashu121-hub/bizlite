'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  exportBusinessBackupAction,
  resetBusinessDataAction,
} from '@/actions/reset-business-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ResetMode = 'transactions' | 'full'

export function ResetBusinessDataCard() {
  const router = useRouter()
  const [mode, setMode] = React.useState<ResetMode>('transactions')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [confirmation, setConfirmation] = React.useState('')
  const [resetting, setResetting] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  const [resetInvoiceNumbering, setResetInvoiceNumbering] = React.useState(true)
  const [resetExpenseNumbering, setResetExpenseNumbering] = React.useState(true)
  const [resetProductSkuNumbering, setResetProductSkuNumbering] = React.useState(false)
  const [keepDefaultSystemCategories, setKeepDefaultSystemCategories] = React.useState(true)

  const canConfirm = confirmation.trim() === 'RESET'

  const openConfirm = () => {
    setConfirmation('')
    setDialogOpen(true)
  }

  const handleExportBackup = async () => {
    setExporting(true)
    try {
      const result = await exportBusinessBackupAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `bizlite-2026-backup-${stamp}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded')
    } finally {
      setExporting(false)
    }
  }

  const handleReset = async () => {
    if (!canConfirm || resetting) return
    setResetting(true)
    try {
      const result = await resetBusinessDataAction({
        mode,
        confirmation: confirmation.trim(),
        resetInvoiceNumbering,
        resetExpenseNumbering,
        resetProductSkuNumbering,
        keepDefaultSystemCategories,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        result.message ||
          'Business data reset successfully. BizLite 2026 is ready for fresh data.',
      )
      setDialogOpen(false)
      setConfirmation('')
      router.refresh()
      router.push('/dashboard')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <Card className="border-red-200/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-800">
            <Trash2 className="h-4 w-4" />
            Data Management
          </CardTitle>
          <CardDescription>
            Permanently remove demo or testing data and start clean. Archiving products is not
            enough — historical sales and COGS still affect reports until transactions are deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-800">Reset option</p>
            <label
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border p-3 transition',
                mode === 'transactions'
                  ? 'border-teal-600 bg-teal-50/50'
                  : 'border-zinc-200 hover:border-zinc-300',
              )}
            >
              <input
                type="radio"
                name="reset-mode"
                className="mt-1"
                checked={mode === 'transactions'}
                onChange={() => setMode('transactions')}
              />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Reset Transactions Only</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Deletes sales, expenses, payments, stock movements, cash ledger entries and saved
                  cost calculations. Keeps products, customers, categories, cash account names and
                  settings. Product stock and cash/bank balances become zero.
                </p>
              </div>
            </label>
            <label
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border p-3 transition',
                mode === 'full'
                  ? 'border-red-500 bg-red-50/50'
                  : 'border-zinc-200 hover:border-zinc-300',
              )}
            >
              <input
                type="radio"
                name="reset-mode"
                className="mt-1"
                checked={mode === 'full'}
                onChange={() => setMode('full')}
              />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Full Business Data Reset</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Deletes all of the above plus products, customers, cash accounts, archived items
                  and user-created categories. Keeps only your login, business profile and app
                  configuration.
                </p>
              </div>
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Optional
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={resetInvoiceNumbering}
                onChange={(e) => setResetInvoiceNumbering(e.target.checked)}
              />
              <span>
                Reset invoice numbering
                <span className="block text-xs text-zinc-500">
                  Next invoice starts at INV-{new Date().getFullYear()}-00001
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={resetExpenseNumbering}
                onChange={(e) => setResetExpenseNumbering(e.target.checked)}
              />
              <span>
                Reset expense numbering
                <span className="block text-xs text-zinc-500">
                  Clears expense history used for any sequential references
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={resetProductSkuNumbering}
                onChange={(e) => setResetProductSkuNumbering(e.target.checked)}
              />
              <span>
                Reset product SKU numbering
                <span className="block text-xs text-zinc-500">
                  Clears SKUs on kept products (transactions-only) or with products (full reset)
                </span>
              </span>
            </label>
            {mode === 'full' ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={keepDefaultSystemCategories}
                  onChange={(e) => setKeepDefaultSystemCategories(e.target.checked)}
                />
                <span>
                  Keep default system categories
                  <span className="block text-xs text-zinc-500">
                    Materials, Transport, Salary, etc. User-created categories are always removed
                    on full reset.
                  </span>
                </span>
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={exporting} onClick={() => void handleExportBackup()}>
              <Download className="h-4 w-4" />
              {exporting ? 'Preparing…' : 'Export Backup'}
            </Button>
            <Button type="button" variant="destructive" onClick={openConfirm}>
              <AlertTriangle className="h-4 w-4" />
              Reset Business Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-800">Confirm permanent reset</DialogTitle>
            <DialogDescription>
              This action will permanently delete the selected business data. It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-900">
              {mode === 'full'
                ? 'Full reset: all transactions, products, customers, cash accounts and related records will be deleted.'
                : 'Transactions only: sales, expenses, payments, stock and cash ledger will be deleted. Products and customers are kept with zero stock/balances.'}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">
                Type <span className="font-mono font-semibold">RESET</span> to continue
              </Label>
              <Input
                id="reset-confirm"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={exporting || resetting}
              onClick={() => void handleExportBackup()}
            >
              <Download className="h-4 w-4" />
              Export Backup Before Reset
            </Button>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={resetting}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={!canConfirm || resetting}
                onClick={() => void handleReset()}
              >
                {resetting ? 'Resetting…' : 'Permanently Reset Data'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
