'use client'

import * as React from 'react'
import {
  ChevronDown,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  applyCostPricingToProductAction,
  addProducedStockFromCalculationAction,
  createProductionExpensesFromCalculationAction,
  deleteCostCalculationAction,
  duplicateCostCalculationAction,
  getCostCalculationAction,
  saveCostCalculationAction,
} from '@/actions/cost-pricing'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CurrencyInput } from '@/components/shared/currency-input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  autoScenarios,
  computeCostPricing,
  computeLineDetail,
  methodLabel,
  scenarioMetrics,
} from '@/lib/cost-pricing/compute'
import {
  COST_CATEGORIES,
  COST_LINE_METHODS,
  UNIT_OPTIONS,
  createDefaultPayload,
  createEmptyCostLine,
} from '@/lib/cost-pricing/defaults'
import type {
  CostLine,
  CostLineMethod,
  CostPricingPayload,
  PricingMode,
} from '@/lib/cost-pricing/types'
import { unitLabel } from '@/lib/cost-pricing/units'
import { formatCurrency } from '@/lib/money'
import { cn } from '@/lib/utils'

type ProductRow = {
  id: string
  name: string
  category: string
  sku: string | null
  currentStock: number
  costPrice: string
  sellingPrice: string
}

type HistoryRow = {
  id: string
  name: string
  productId: string | null
  productName: string | null
  quantity: number
  unit: string
  calculationDate: string
  status: string
  totalBatchCost: string
  costPerUnit: string
  suggestedSellingPrice: string
  grossMarginPct: string
  expenseIds: string[]
  updatedAt: string
}

type ExpenseCategory = {
  id: string
  name: string
  defaultCostType: string | null
}

type CashAccount = { id: string; name: string }

function pct(value: string): string {
  return value.replace(/[^\d.]/g, '').slice(0, 6)
}

function SummaryRow({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={cn('text-zinc-500', emphasize && 'font-medium text-zinc-700')}>{label}</span>
      <span
        className={cn(
          'tabular-nums text-zinc-800',
          emphasize ? 'text-base font-semibold text-teal-800' : 'font-medium',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function CollapseSection({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string
  description?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          {description ? <p className="mt-0.5 text-xs text-zinc-500">{description}</p> : null}
        </div>
        <ChevronDown
          className={cn('mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition', open && 'rotate-180')}
        />
      </button>
      {open ? <CardContent className="border-t border-zinc-100 pt-4">{children}</CardContent> : null}
    </Card>
  )
}

export function CostPricingWorkspace({
  currency,
  products,
  initialHistory,
  expenseCategories,
  cashAccounts,
}: {
  currency: string
  products: ProductRow[]
  initialHistory: HistoryRow[]
  expenseCategories: ExpenseCategory[]
  cashAccounts: CashAccount[]
}) {
  const money = React.useCallback(
    (value: number | string) => formatCurrency(value, currency),
    [currency],
  )

  const [payload, setPayload] = React.useState<CostPricingPayload>(() => createDefaultPayload())
  const [calculationId, setCalculationId] = React.useState<string | undefined>()
  const [history, setHistory] = React.useState(initialHistory)
  const [showHistory, setShowHistory] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const saveLock = React.useRef(false)

  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const [sellingCostsOpen, setSellingCostsOpen] = React.useState(false)
  const [compareOpen, setCompareOpen] = React.useState(false)

  const [editLine, setEditLine] = React.useState<CostLine | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  const [applyOpen, setApplyOpen] = React.useState(false)
  const [applyMode, setApplyMode] = React.useState<'cost' | 'price' | 'both'>('both')
  const [stockOpen, setStockOpen] = React.useState(false)
  const [expenseOpen, setExpenseOpen] = React.useState(false)
  const [stockForm, setStockForm] = React.useState({
    productId: '',
    quantity: '',
    unitCost: '',
    productionDate: new Date().toISOString().slice(0, 10),
    batchReference: '',
    storageLocation: '',
    notes: '',
  })
  const [expenseForm, setExpenseForm] = React.useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    categoryId: '',
    cashAccountId: '',
    paymentMethod: 'CASH' as 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER',
    lineIds: [] as string[],
  })

  const totals = React.useMemo(() => computeCostPricing(payload), [payload])
  const saleableQty = totals.quantity

  const update = <K extends keyof CostPricingPayload>(key: K, value: CostPricingPayload[K]) => {
    setPayload((prev) => ({ ...prev, [key]: value }))
  }

  const onProductChange = (productId: string) => {
    if (productId === '__none__') {
      update('productId', '')
      return
    }
    const product = products.find((p) => p.id === productId)
    setPayload((prev) => ({
      ...prev,
      productId,
      category: product?.category || prev.category,
      unit: prev.unit || 'pcs',
      name: prev.name || (product ? `${product.name} cost` : prev.name),
    }))
  }

  const resetNew = () => {
    setCalculationId(undefined)
    setPayload(createDefaultPayload())
    setShowHistory(false)
    setEditOpen(false)
    toast.message('New calculation started')
  }

  const openAddLine = () => {
    setEditLine(createEmptyCostLine('Materials', '', 'fixedBatch'))
    setEditOpen(true)
  }

  const openEditLine = (line: CostLine) => {
    setEditLine({ ...line })
    setEditOpen(true)
  }

  const saveEditLine = () => {
    if (!editLine) return
    if (!editLine.name.trim()) {
      toast.error('Enter a cost item name')
      return
    }
    setPayload((prev) => {
      const exists = prev.lines.some((l) => l.id === editLine.id)
      return {
        ...prev,
        lines: exists
          ? prev.lines.map((l) => (l.id === editLine.id ? editLine : l))
          : [...prev.lines, editLine],
      }
    })
    setEditOpen(false)
    setEditLine(null)
  }

  const removeLine = (id: string) => {
    setPayload((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((l) => l.id !== id),
    }))
  }

  const handleSave = async (status: 'DRAFT' | 'SAVED') => {
    if (saveLock.current || saving) return
    if (!payload.name.trim()) {
      toast.error('Enter a calculation name')
      return
    }
    if (!totals.validation.ok) {
      toast.error(totals.validation.messages[0] || 'Fix validation errors first')
      return
    }
    saveLock.current = true
    setSaving(true)
    try {
      const result = await saveCostCalculationAction({ id: calculationId, status, payload })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCalculationId(result.data.id)
      toast.success(result.message || 'Saved')
      setHistory((prev) => {
        const row: HistoryRow = {
          id: result.data.id,
          name: payload.name,
          productId: payload.productId || null,
          productName: products.find((p) => p.id === payload.productId)?.name ?? null,
          quantity: saleableQty,
          unit: payload.unit,
          calculationDate: payload.calculationDate,
          status,
          totalBatchCost: String(totals.totalBatchCost),
          costPerUnit: String(totals.costPerUnit),
          suggestedSellingPrice: String(totals.suggestedSellingPrice),
          grossMarginPct: String(totals.grossMarginPct),
          expenseIds: prev.find((h) => h.id === result.data.id)?.expenseIds ?? [],
          updatedAt: new Date().toISOString(),
        }
        return [row, ...prev.filter((h) => h.id !== result.data.id)]
      })
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  const loadCalculation = async (id: string) => {
    const result = await getCostCalculationAction(id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setCalculationId(result.data.id)
    setPayload(createDefaultPayload(result.data.payload))
    setShowHistory(false)
    toast.success('Calculation loaded')
  }

  const openApply = (mode: 'cost' | 'price' | 'both') => {
    if (!payload.productId) {
      toast.error('Select a product before applying')
      return
    }
    if (!totals.validation.ok) {
      toast.error(totals.validation.messages[0] || 'Fix validation errors first')
      return
    }
    setApplyMode(mode)
    setApplyOpen(true)
  }

  const confirmApply = async () => {
    if (!payload.productId) return
    const result = await applyCostPricingToProductAction({
      calculationId,
      productId: payload.productId,
      applyCost: applyMode === 'cost' || applyMode === 'both',
      applyPrice: applyMode === 'price' || applyMode === 'both',
      payload,
    })
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(result.message || 'Applied')
  }

  const openStock = () => {
    setStockForm({
      productId: payload.productId || '',
      quantity: String(saleableQty || ''),
      unitCost: String(totals.costPerUnit || ''),
      productionDate: payload.calculationDate,
      batchReference: payload.name,
      storageLocation: '',
      notes: '',
    })
    setStockOpen(true)
  }

  const openExpense = () => {
    if (!calculationId) {
      toast.error('Save the calculation before creating expenses')
      return
    }
    if (history.find((h) => h.id === calculationId)?.expenseIds?.length) {
      toast.error('Production expenses were already created for this calculation')
      return
    }
    setExpenseForm({
      expenseDate: payload.calculationDate,
      categoryId:
        expenseCategories.find((c) => c.defaultCostType === 'PRODUCTION')?.id ||
        expenseCategories[0]?.id ||
        '',
      cashAccountId: '',
      paymentMethod: 'CASH',
      lineIds: payload.lines.filter((l) => l.includeInUnitCost).map((l) => l.id),
    })
    setExpenseOpen(true)
  }

  const generateScenarios = () => {
    const auto = autoScenarios(totals.costPerUnit, totals.suggestedSellingPrice)
    update('scenarios', [
      { id: 'low', label: 'Low Price', sellingPrice: String(auto.low) },
      { id: 'recommended', label: 'Recommended', sellingPrice: String(auto.recommended) },
      { id: 'premium', label: 'Premium Price', sellingPrice: String(auto.premium) },
    ])
    setCompareOpen(true)
  }

  const expensePreviewTotal = expenseForm.lineIds.reduce((sum, id) => {
    const line = totals.lineTotals.find((t) => t.id === id)
    return sum + (line?.total ?? 0)
  }, 0)

  const editDetail = editLine ? computeLineDetail(editLine, saleableQty) : null

  return (
    <div className="space-y-4 pb-32 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Product Cost & Pricing Calculator
          </h1>
          <p className="text-sm text-zinc-500">
            Work out batch cost, cost per finished unit, and a sensible selling price.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={resetNew}>
            <Plus className="h-4 w-4" />
            New Calculation
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-4 w-4" />
            Saved Calculations
          </Button>
        </div>
      </div>

      {showHistory ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved Calculations</CardTitle>
            <CardDescription>Open, duplicate, apply or delete previous versions.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500">No saved calculations yet.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b text-zinc-500">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Date</th>
                    <th className="py-2 pr-2 font-medium">Name</th>
                    <th className="py-2 pr-2 font-medium">Product</th>
                    <th className="py-2 pr-2 font-medium">Qty</th>
                    <th className="py-2 pr-2 font-medium">Unit cost</th>
                    <th className="py-2 pr-2 font-medium">Sell</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-2">{row.calculationDate}</td>
                      <td className="py-2 pr-2">{row.name}</td>
                      <td className="py-2 pr-2">{row.productName || '—'}</td>
                      <td className="py-2 pr-2">{row.quantity}</td>
                      <td className="py-2 pr-2 tabular-nums">{money(row.costPerUnit)}</td>
                      <td className="py-2 pr-2 tabular-nums">{money(row.suggestedSellingPrice)}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => void loadCalculation(row.id)}>
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const r = await duplicateCostCalculationAction(row.id)
                              if (!r.success) toast.error(r.error)
                              else {
                                toast.success('Duplicated')
                                void loadCalculation(r.data.id)
                              }
                            }}
                          >
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={async () => {
                              const r = await deleteCostCalculationAction(row.id)
                              if (!r.success) toast.error(r.error)
                              else {
                                setHistory((prev) => prev.filter((h) => h.id !== row.id))
                                if (calculationId === row.id) resetNew()
                                toast.success('Deleted')
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,65fr)_minmax(280px,35fr)]">
        {/* Left column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Product & batch</CardTitle>
              <CardDescription>
                Finished quantity means good, saleable units only (after any finished wastage in
                Advanced).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Product</Label>
                <Select value={payload.productId || '__none__'} onValueChange={onProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No product (standalone)</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {payload.productId ? (
                  <p className="text-xs text-zinc-500">
                    Category: {payload.category || '—'} · loaded from product
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="calc-name">Calculation name</Label>
                <Input
                  id="calc-name"
                  value={payload.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. T-Shirt batch July"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="calc-date">Calculation date</Label>
                <Input
                  id="calc-date"
                  type="date"
                  value={payload.calculationDate}
                  onChange={(e) => update('calculationDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qty">Finished saleable quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={payload.quantity || ''}
                  onChange={(e) =>
                    update('quantity', Math.max(0, Math.floor(Number(e.target.value) || 0)))
                  }
                />
                {Number(payload.finishedWastageQty) > 0 ? (
                  <p className="text-xs text-amber-700">
                    After finished wastage: {saleableQty} saleable of {payload.quantity} produced
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Good, saleable finished units from this batch.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={payload.unit} onValueChange={(v) => update('unit', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={payload.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div>
                <CardTitle className="text-base">Production costs</CardTitle>
                <CardDescription>Compact table — edit a row to set the calculation method.</CardDescription>
              </div>
              <Button type="button" size="sm" onClick={openAddLine}>
                <Plus className="h-4 w-4" /> Add Cost
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="border-y bg-zinc-50/80 text-left text-xs text-zinc-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Cost Item</th>
                      <th className="px-2 py-2.5 font-medium">Category</th>
                      <th className="px-2 py-2.5 font-medium">Method</th>
                      <th className="px-2 py-2.5 text-right font-medium">Batch Cost</th>
                      <th className="px-2 py-2.5 text-right font-medium">Per Unit</th>
                      <th className="px-4 py-2.5 text-right font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.lines.map((line) => {
                      const batch = totals.lineTotals.find((t) => t.id === line.id)?.total ?? 0
                      const perUnit = saleableQty > 0 ? batch / saleableQty : 0
                      return (
                        <tr key={line.id} className="border-b border-zinc-100">
                          <td className="px-4 py-2.5 font-medium text-zinc-900">{line.name}</td>
                          <td className="px-2 py-2.5 text-zinc-600">{line.category}</td>
                          <td className="px-2 py-2.5 text-zinc-500">{methodLabel(line.method)}</td>
                          <td className="px-2 py-2.5 text-right tabular-nums">{money(batch)}</td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-zinc-600">
                            {money(perUnit)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditLine(line)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600"
                              onClick={() => removeLine(line.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile compact cards */}
              <div className="space-y-2 p-3 md:hidden">
                {payload.lines.map((line) => {
                  const batch = totals.lineTotals.find((t) => t.id === line.id)?.total ?? 0
                  const perUnit = saleableQty > 0 ? batch / saleableQty : 0
                  return (
                    <div key={line.id} className="rounded-lg border border-zinc-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-900">{line.name}</p>
                          <p className="text-xs text-zinc-500">
                            {line.category} · {methodLabel(line.method)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEditLine(line)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600"
                            onClick={() => removeLine(line.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-zinc-500">Batch</span>
                        <span className="tabular-nums font-medium">{money(batch)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Per unit</span>
                        <span className="tabular-nums">{money(perUnit)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <CollapseSection
            title="Advanced Production Costs"
            description="Wastage, contingency, additional cost and overhead — optional."
            open={advancedOpen}
            onToggle={() => setAdvancedOpen((v) => !v)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Material wastage %</Label>
                <Input
                  value={payload.wastagePct}
                  onChange={(e) => update('wastagePct', pct(e.target.value))}
                  placeholder="0"
                />
                <p className="text-[11px] text-zinc-500">Increases material cost only.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Finished-product wastage (units)</Label>
                <Input
                  type="number"
                  min={0}
                  value={payload.finishedWastageQty}
                  onChange={(e) => update('finishedWastageQty', e.target.value)}
                  placeholder="0"
                />
                <p className="text-[11px] text-zinc-500">
                  Deducted from finished quantity so damaged units are absorbed by saleable ones.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Contingency %</Label>
                <Input
                  value={payload.contingencyPct}
                  onChange={(e) => update('contingencyPct', pct(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Additional fixed production cost</Label>
                <CurrencyInput
                  currency={currency}
                  value={payload.additionalFixedCost}
                  onChange={(v) => update('additionalFixedCost', v)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Overhead label (optional)</Label>
                <Input
                  value={payload.overheadLabel}
                  onChange={(e) => update('overheadLabel', e.target.value)}
                  placeholder="Rent, electricity, admin…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Overhead method</Label>
                <Select
                  value={payload.overheadMethod}
                  onValueChange={(v) =>
                    update('overheadMethod', v as CostPricingPayload['overheadMethod'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                    <SelectItem value="perUnit">Amount per finished unit</SelectItem>
                    <SelectItem value="percent">% of direct production cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  {payload.overheadMethod === 'percent' ? 'Overhead %' : 'Overhead amount'}
                </Label>
                {payload.overheadMethod === 'percent' ? (
                  <Input
                    value={payload.overheadValue}
                    onChange={(e) => update('overheadValue', pct(e.target.value))}
                  />
                ) : (
                  <CurrencyInput
                    currency={currency}
                    value={payload.overheadValue}
                    onChange={(v) => update('overheadValue', v)}
                  />
                )}
              </div>
              <p className="text-xs text-zinc-500 sm:col-span-2">
                Overhead is optional. Only amounts you enter here are included — BizLite does not
                import all business overhead automatically.
              </p>
            </div>
          </CollapseSection>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Selling price</CardTitle>
              <CardDescription>
                Markup uses cost × (1 + %). Margin uses cost ÷ (1 − %). They are not the same.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Pricing method</Label>
                <Select
                  value={payload.pricingMode}
                  onValueChange={(v) => update('pricingMode', v as PricingMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markup">Target Markup %</SelectItem>
                    <SelectItem value="margin">Target Gross Margin %</SelectItem>
                    <SelectItem value="manual">Manual Selling Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payload.pricingMode === 'markup' ? (
                <div className="space-y-1.5">
                  <Label>Markup %</Label>
                  <Input
                    value={payload.targetMarkupPct}
                    onChange={(e) => update('targetMarkupPct', pct(e.target.value))}
                  />
                </div>
              ) : null}
              {payload.pricingMode === 'margin' ? (
                <div className="space-y-1.5">
                  <Label>Gross margin % (below 100)</Label>
                  <Input
                    value={payload.targetMarginPct}
                    onChange={(e) => update('targetMarginPct', pct(e.target.value))}
                  />
                </div>
              ) : null}
              {payload.pricingMode === 'manual' ? (
                <div className="space-y-1.5">
                  <Label>Selling price</Label>
                  <CurrencyInput
                    currency={currency}
                    value={payload.manualSellingPrice}
                    onChange={(v) => update('manualSellingPrice', v)}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <CollapseSection
            title="Add Selling Costs"
            description="Optional. Not included in production cost or COGS."
            open={sellingCostsOpen}
            onToggle={() => setSellingCostsOpen((v) => !v)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer delivery / unit</Label>
                <CurrencyInput
                  currency={currency}
                  value={payload.sellingCosts.deliveryPerUnit}
                  onChange={(v) =>
                    update('sellingCosts', { ...payload.sellingCosts, deliveryPerUnit: v })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sales commission %</Label>
                <Input
                  value={payload.sellingCosts.commissionPct}
                  onChange={(e) =>
                    update('sellingCosts', {
                      ...payload.sellingCosts,
                      commissionPct: pct(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Marketplace fee %</Label>
                <Input
                  value={payload.sellingCosts.marketplaceFeePct}
                  onChange={(e) =>
                    update('sellingCosts', {
                      ...payload.sellingCosts,
                      marketplaceFeePct: pct(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Card payment fee %</Label>
                <Input
                  value={payload.sellingCosts.cardFeePct}
                  onChange={(e) =>
                    update('sellingCosts', {
                      ...payload.sellingCosts,
                      cardFeePct: pct(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Other selling cost / unit</Label>
                <CurrencyInput
                  currency={currency}
                  value={payload.sellingCosts.otherPerUnit}
                  onChange={(v) =>
                    update('sellingCosts', { ...payload.sellingCosts, otherPerUnit: v })
                  }
                />
              </div>
            </div>
          </CollapseSection>

          {!compareOpen ? (
            <Button type="button" variant="outline" className="w-full" onClick={generateScenarios}>
              Compare Prices
            </Button>
          ) : (
            <CollapseSection
              title="Price scenarios"
              description="Low / Recommended / Premium"
              open={compareOpen}
              onToggle={() => setCompareOpen((v) => !v)}
            >
              <div className="mb-3 flex justify-end">
                <Button type="button" size="sm" variant="outline" onClick={generateScenarios}>
                  Regenerate
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs text-zinc-500">
                    <tr>
                      <th className="py-2 pr-2 text-left font-medium">Scenario</th>
                      <th className="py-2 pr-2 text-left font-medium">Price</th>
                      <th className="py-2 pr-2 text-right font-medium">Profit</th>
                      <th className="py-2 pr-2 text-right font-medium">Markup</th>
                      <th className="py-2 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.scenarios.map((scenario, index) => {
                      const m = scenarioMetrics(
                        totals.costPerUnit,
                        Number(scenario.sellingPrice) || 0,
                      )
                      return (
                        <tr key={scenario.id} className="border-b border-zinc-100">
                          <td className="py-2 pr-2">{scenario.label}</td>
                          <td className="py-2 pr-2">
                            <CurrencyInput
                              currency={currency}
                              value={scenario.sellingPrice}
                              onChange={(v) => {
                                const next = [...payload.scenarios]
                                next[index] = { ...scenario, sellingPrice: v }
                                update('scenarios', next)
                              }}
                            />
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {money(m.profitPerUnit)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {m.markupPct.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right tabular-nums">{m.marginPct.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CollapseSection>
          )}

          {/* Primary actions */}
          <Card className="print:hidden">
            <CardContent className="flex flex-wrap gap-2 pt-6">
              <Button type="button" disabled={saving} onClick={() => void handleSave('SAVED')}>
                Save Calculation
              </Button>
              <Button type="button" variant="secondary" onClick={() => openApply('both')}>
                Apply Cost & Price to Product
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">
                    <MoreHorizontal className="h-4 w-4" />
                    More Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem disabled={saving} onClick={() => void handleSave('DRAFT')}>
                    Save as Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openApply('cost')}>
                    Apply Cost Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openApply('price')}>
                    Apply Selling Price Only
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={openExpense}>Create Production Expense</DropdownMenuItem>
                  <DropdownMenuItem onClick={openStock}>Add Produced Stock</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Print / Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
            <p className="px-6 pb-4 text-xs text-zinc-500">
              Applying updates the product for future sales only. Historical sales, COGS and past
              profitability are never changed.
            </p>
          </Card>

          <p className="text-xs text-zinc-500">
            Product Cost is the cost to make one unit. Production Expense is a cash/expense entry.
            COGS is the sale-time cost of units sold. These can differ and are not the same value.
          </p>
        </div>

        {/* Sticky summary */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-3">
            <Card className="border-teal-100 bg-gradient-to-b from-teal-50/60 to-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Production
                  </p>
                  <SummaryRow label="Materials" value={money(totals.materialsCost)} />
                  <SummaryRow label="Direct Labour" value={money(totals.directLabourCost)} />
                  <SummaryRow label="Packaging" value={money(totals.packagingCost)} />
                  <SummaryRow label="Transportation" value={money(totals.transportationCost)} />
                  <SummaryRow label="Other Production Costs" value={money(totals.otherDirectCost)} />
                  <SummaryRow
                    label="Wastage"
                    value={money(totals.wastageCost + totals.contingencyCost)}
                  />
                  <SummaryRow label="Overhead" value={money(totals.allocatedOverhead)} />
                  <div className="border-t border-teal-100 pt-2">
                    <SummaryRow
                      label="Total Batch Cost"
                      value={money(totals.totalBatchCost)}
                      emphasize
                    />
                    <SummaryRow
                      label="Finished Saleable Qty"
                      value={`${saleableQty} ${unitLabel(payload.unit)}`}
                    />
                    <SummaryRow
                      label="Cost Per Finished Unit"
                      value={money(totals.costPerUnit)}
                      emphasize
                    />
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-teal-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Pricing
                  </p>
                  <SummaryRow
                    label="Suggested Selling Price"
                    value={money(totals.suggestedSellingPrice)}
                    emphasize
                  />
                  <SummaryRow
                    label="Gross Profit Per Unit"
                    value={money(totals.productGrossProfit)}
                  />
                  <SummaryRow
                    label="Selling Costs Per Unit"
                    value={money(totals.sellingCostsPerUnit)}
                  />
                  <SummaryRow
                    label="Net Profit Per Unit"
                    value={money(totals.profitAfterSellingCosts)}
                    emphasize
                  />
                  <SummaryRow label="Markup %" value={`${totals.markupPct.toFixed(2)}%`} />
                  <SummaryRow label="Gross Margin %" value={`${totals.grossMarginPct.toFixed(2)}%`} />
                  <SummaryRow
                    label="Expected Batch Revenue"
                    value={money(totals.totalExpectedSales)}
                  />
                  <SummaryRow
                    label="Expected Batch Net Profit"
                    value={money(totals.totalExpectedNetProfit)}
                  />
                </div>
                {!totals.validation.ok ? (
                  <p className="text-xs text-amber-700">{totals.validation.messages[0]}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {/* Mobile sticky bar — above bottom nav */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-teal-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur print:hidden lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 text-xs">
          <div>
            <p className="text-zinc-400">Cost / unit</p>
            <p className="font-semibold tabular-nums text-teal-800">{money(totals.costPerUnit)}</p>
          </div>
          <div>
            <p className="text-zinc-400">Sell</p>
            <p className="font-semibold tabular-nums">{money(totals.suggestedSellingPrice)}</p>
          </div>
          <div>
            <p className="text-zinc-400">Net profit</p>
            <p className="font-semibold tabular-nums">{money(totals.profitAfterSellingCosts)}</p>
          </div>
          <Button size="sm" disabled={saving} onClick={() => void handleSave('SAVED')}>
            Save
          </Button>
        </div>
      </div>

      {/* Edit cost line dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editLine && payload.lines.some((l) => l.id === editLine.id) ? 'Edit cost' : 'Add cost'}</DialogTitle>
            <DialogDescription>
              Choose a method. Only cost consumed by this batch is included.
            </DialogDescription>
          </DialogHeader>
          {editLine ? (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Cost item</Label>
                <Input
                  value={editLine.name}
                  onChange={(e) => setEditLine({ ...editLine, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={editLine.category}
                  onValueChange={(v) => setEditLine({ ...editLine, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    {!COST_CATEGORIES.includes(editLine.category as (typeof COST_CATEGORIES)[number]) &&
                    editLine.category ? (
                      <SelectItem value={editLine.category}>{editLine.category}</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-1"
                  placeholder="Or type a custom category"
                  value={
                    COST_CATEGORIES.includes(editLine.category as (typeof COST_CATEGORIES)[number])
                      ? ''
                      : editLine.category
                  }
                  onChange={(e) => {
                    if (e.target.value) setEditLine({ ...editLine, category: e.target.value })
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Calculation method</Label>
                <Select
                  value={editLine.method}
                  onValueChange={(v) =>
                    setEditLine({ ...editLine, method: v as CostLineMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_LINE_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editLine.method === 'fixedBatch' ? (
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <CurrencyInput
                    currency={currency}
                    value={editLine.fixedTotal}
                    onChange={(v) => setEditLine({ ...editLine, fixedTotal: v })}
                  />
                </div>
              ) : null}

              {editLine.method === 'qtyUnit' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Quantity used</Label>
                    <Input
                      value={editLine.quantity}
                      onChange={(e) => setEditLine({ ...editLine, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rate per unit</Label>
                    <CurrencyInput
                      currency={currency}
                      value={editLine.unitCost}
                      onChange={(v) => setEditLine({ ...editLine, unitCost: v })}
                    />
                  </div>
                </div>
              ) : null}

              {editLine.method === 'labourHours' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Labour hours</Label>
                    <Input
                      value={editLine.quantity}
                      onChange={(e) => setEditLine({ ...editLine, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Hourly rate</Label>
                    <CurrencyInput
                      currency={currency}
                      value={editLine.unitCost}
                      onChange={(v) => setEditLine({ ...editLine, unitCost: v })}
                    />
                  </div>
                </div>
              ) : null}

              {editLine.method === 'perFinishedUnit' ? (
                <div className="space-y-1.5">
                  <Label>Cost per finished unit</Label>
                  <CurrencyInput
                    currency={currency}
                    value={editLine.unitCost}
                    onChange={(v) => setEditLine({ ...editLine, unitCost: v })}
                  />
                  <p className="text-xs text-zinc-500">
                    Batch cost = {money(Number(editLine.unitCost) || 0)} × {saleableQty} saleable ={' '}
                    {money((Number(editLine.unitCost) || 0) * saleableQty)}
                  </p>
                </div>
              ) : null}

              {editLine.method === 'bulkUsage' ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Purchased quantity</Label>
                      <Input
                        value={editLine.bulkPurchaseQty}
                        onChange={(e) =>
                          setEditLine({ ...editLine, bulkPurchaseQty: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Purchase unit</Label>
                      <Select
                        value={editLine.bulkPurchaseUnit}
                        onValueChange={(v) =>
                          setEditLine({
                            ...editLine,
                            bulkPurchaseUnit: v,
                            usageUnit: editLine.usageUnit || v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Total purchase amount</Label>
                      <CurrencyInput
                        currency={currency}
                        value={editLine.bulkPurchaseAmount}
                        onChange={(v) => setEditLine({ ...editLine, bulkPurchaseAmount: v })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Quantity used</Label>
                      <Input
                        value={editLine.quantityUsed}
                        onChange={(e) =>
                          setEditLine({ ...editLine, quantityUsed: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Usage unit</Label>
                      <Select
                        value={editLine.usageUnit || editLine.bulkPurchaseUnit}
                        onValueChange={(v) => setEditLine({ ...editLine, usageUnit: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {editDetail ? (
                    <div className="grid grid-cols-2 gap-2 rounded-md bg-zinc-50 p-3 text-xs">
                      <div>
                        <p className="text-zinc-400">Cost per unit</p>
                        <p className="font-medium">{money(editDetail.bulkUnitCost ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400">Consumed cost</p>
                        <p className="font-medium">{money(editDetail.total)}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400">Unused quantity</p>
                        <p className="font-medium">
                          {editDetail.remainingQty ?? 0}{' '}
                          {unitLabel(editLine.usageUnit || editLine.bulkPurchaseUnit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-400">Unused value</p>
                        <p className="font-medium">{money(editDetail.remainingValue ?? 0)}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-md bg-teal-50/50 px-3 py-2 text-sm">
                <span className="text-zinc-500">Batch cost: </span>
                <span className="font-semibold tabular-nums text-teal-800">
                  {money(editDetail?.total ?? 0)}
                </span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEditLine}>
              Save cost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        title="Apply to product?"
        description={
          applyMode === 'cost'
            ? `Apply unit cost ${money(totals.costPerUnit)} for future sales only?`
            : applyMode === 'price'
              ? `Apply selling price ${money(totals.suggestedSellingPrice)} for future sales only?`
              : `Apply unit cost ${money(totals.costPerUnit)} and selling price ${money(totals.suggestedSellingPrice)} to this product? Future sales only — historical sales and COGS unchanged.`
        }
        confirmLabel="Apply"
        onConfirm={confirmApply}
      />

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add produced stock?</DialogTitle>
            <DialogDescription>
              Inventory increases only after you confirm. Value:{' '}
              {money((Number(stockForm.quantity) || 0) * (Number(stockForm.unitCost) || 0))}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Product</Label>
              <Select
                value={stockForm.productId || undefined}
                onValueChange={(v) => setStockForm((s) => ({ ...s, productId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input
                value={stockForm.quantity}
                onChange={(e) => setStockForm((s) => ({ ...s, quantity: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Unit cost</Label>
              <CurrencyInput
                currency={currency}
                value={stockForm.unitCost}
                onChange={(v) => setStockForm((s) => ({ ...s, unitCost: v }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Production date</Label>
              <Input
                type="date"
                value={stockForm.productionDate}
                onChange={(e) => setStockForm((s) => ({ ...s, productionDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Batch / reference</Label>
              <Input
                value={stockForm.batchReference}
                onChange={(e) => setStockForm((s) => ({ ...s, batchReference: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStockOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const result = await addProducedStockFromCalculationAction({
                  productId: stockForm.productId,
                  quantity: Number(stockForm.quantity),
                  unitCost: Number(stockForm.unitCost),
                  productionDate: stockForm.productionDate,
                  batchReference: stockForm.batchReference,
                  storageLocation: stockForm.storageLocation,
                  notes: stockForm.notes,
                  calculationId,
                  payload,
                })
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                toast.success(`Stock added. Value ${money(result.data.inventoryValue)}`)
                setStockOpen(false)
              }}
            >
              Add stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create production expenses?</DialogTitle>
            <DialogDescription>
              Create this expense only if these production costs have not already been recorded in
              Expenses. Otherwise costs may be duplicated. Total: {money(expensePreviewTotal)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <div className="space-y-1">
              <Label>Expense date</Label>
              <Input
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm((s) => ({ ...s, expenseDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Expense category</Label>
              <Select
                value={expenseForm.categoryId || undefined}
                onValueChange={(v) => setExpenseForm((s) => ({ ...s, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Payment account (optional)</Label>
              <Select
                value={expenseForm.cashAccountId || '__none__'}
                onValueChange={(v) =>
                  setExpenseForm((s) => ({
                    ...s,
                    cashAccountId: v === '__none__' ? '' : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unlinked / Reporting only</SelectItem>
                  {cashAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border p-2">
              {payload.lines
                .filter((l) => l.includeInUnitCost)
                .map((line) => {
                  const amount = totals.lineTotals.find((t) => t.id === line.id)?.total ?? 0
                  const checked = expenseForm.lineIds.includes(line.id)
                  return (
                    <label key={line.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setExpenseForm((s) => ({
                              ...s,
                              lineIds: e.target.checked
                                ? [...s.lineIds, line.id]
                                : s.lineIds.filter((id) => id !== line.id),
                            }))
                          }}
                        />
                        {line.name}
                      </span>
                      <span className="tabular-nums">{money(amount)}</span>
                    </label>
                  )
                })}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!calculationId) return
                const result = await createProductionExpensesFromCalculationAction({
                  calculationId,
                  expenseDate: expenseForm.expenseDate,
                  categoryId: expenseForm.categoryId,
                  cashAccountId: expenseForm.cashAccountId || undefined,
                  paymentMethod: expenseForm.paymentMethod,
                  lineIds: expenseForm.lineIds,
                })
                if (!result.success) {
                  toast.error(result.error)
                  return
                }
                setHistory((prev) =>
                  prev.map((h) =>
                    h.id === calculationId ? { ...h, expenseIds: result.data.expenseIds } : h,
                  ),
                )
                toast.success(result.message || 'Expenses created')
                setExpenseOpen(false)
              }}
            >
              Create expenses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
