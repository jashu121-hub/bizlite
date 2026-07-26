'use client'

import * as React from 'react'
import {
  Calculator,
  Copy,
  Eye,
  History,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  autoScenarios,
  computeCostPricing,
  scenarioMetrics,
} from '@/lib/cost-pricing/compute'
import {
  COST_CATEGORIES,
  UNIT_OPTIONS,
  createDefaultPayload,
  createEmptyCostLine,
} from '@/lib/cost-pricing/defaults'
import type { CostLine, CostPricingPayload, PricingMode } from '@/lib/cost-pricing/types'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
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
      <span className="text-zinc-500">{label}</span>
      <span className={cn('font-medium tabular-nums', emphasize && 'text-base text-teal-800')}>
        {value}
      </span>
    </div>
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

  React.useEffect(() => {
    const auto = autoScenarios(totals.costPerUnit, totals.suggestedSellingPrice)
    setPayload((prev) => {
      const next = [...prev.scenarios]
      const fill = (id: string, price: number) => {
        const idx = next.findIndex((s) => s.id === id)
        if (idx < 0) return
        if (!next[idx].sellingPrice) {
          next[idx] = { ...next[idx], sellingPrice: price ? String(price) : '' }
        }
      }
      // Only auto-fill empty recommended when price changes
      const rec = next.find((s) => s.id === 'recommended')
      if (rec && (!rec.sellingPrice || Number(rec.sellingPrice) === 0)) {
        fill('recommended', auto.recommended)
      }
      if (JSON.stringify(next) === JSON.stringify(prev.scenarios)) return prev
      return { ...prev, scenarios: next }
    })
  }, [totals.costPerUnit, totals.suggestedSellingPrice])

  const update = <K extends keyof CostPricingPayload>(key: K, value: CostPricingPayload[K]) => {
    setPayload((prev) => ({ ...prev, [key]: value }))
  }

  const updateLine = (id: string, patch: Partial<CostLine>) => {
    setPayload((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }))
  }

  const removeLine = (id: string) => {
    setPayload((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((l) => l.id !== id),
    }))
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
      name: prev.name || (product ? `${product.name} cost` : prev.name),
    }))
  }

  const resetNew = () => {
    setCalculationId(undefined)
    setPayload(createDefaultPayload())
    setShowHistory(false)
    toast.message('New calculation started')
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
      const result = await saveCostCalculationAction({
        id: calculationId,
        status,
        payload,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCalculationId(result.data.id)
      toast.success(result.message || 'Saved')
      // Refresh history row locally
      setHistory((prev) => {
        const row: HistoryRow = {
          id: result.data.id,
          name: payload.name,
          productId: payload.productId || null,
          productName: products.find((p) => p.id === payload.productId)?.name ?? null,
          quantity: payload.quantity,
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
        const others = prev.filter((h) => h.id !== result.data.id)
        return [row, ...others]
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
    setPayload({ ...createDefaultPayload(), ...result.data.payload })
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
      quantity: String(payload.quantity || ''),
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
    const hist = history.find((h) => h.id === calculationId)
    if (hist?.expenseIds?.length) {
      toast.error('Production expenses were already created for this calculation')
      return
    }
    const productionCat =
      expenseCategories.find((c) => c.defaultCostType === 'PRODUCTION')?.id ||
      expenseCategories[0]?.id ||
      ''
    setExpenseForm({
      expenseDate: payload.calculationDate,
      categoryId: productionCat,
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
  }

  const handlePrint = () => {
    window.print()
  }

  const expensePreviewTotal = expenseForm.lineIds.reduce((sum, id) => {
    const line = totals.lineTotals.find((t) => t.id === id)
    return sum + (line?.total ?? 0)
  }, 0)

  return (
    <div className="space-y-6 pb-28 lg:pb-6">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button type="button" onClick={resetNew}>
          <Plus className="h-4 w-4" />
          New Calculation
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowHistory((v) => !v)}>
          <History className="h-4 w-4" />
          Saved Calculations
        </Button>
      </div>

      {showHistory ? (
        <Card>
          <CardHeader>
            <CardTitle>Saved Calculations</CardTitle>
            <CardDescription>Historical calculation versions for this business.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500">No saved calculations yet.</p>
            ) : (
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Product</th>
                    <th className="py-2 pr-3 font-medium">Qty</th>
                    <th className="py-2 pr-3 font-medium">Batch cost</th>
                    <th className="py-2 pr-3 font-medium">Unit cost</th>
                    <th className="py-2 pr-3 font-medium">Sell price</th>
                    <th className="py-2 pr-3 font-medium">Margin</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3">{row.calculationDate}</td>
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3">{row.productName || '—'}</td>
                      <td className="py-2 pr-3">{row.quantity}</td>
                      <td className="py-2 pr-3 tabular-nums">{money(row.totalBatchCost)}</td>
                      <td className="py-2 pr-3 tabular-nums">{money(row.costPerUnit)}</td>
                      <td className="py-2 pr-3 tabular-nums">{money(row.suggestedSellingPrice)}</td>
                      <td className="py-2 pr-3 tabular-nums">{Number(row.grossMarginPct).toFixed(2)}%</td>
                      <td className="py-2 pr-3">{row.status}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => void loadCalculation(row.id)}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void loadCalculation(row.id)}>
                            Edit
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
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await loadCalculation(row.id)
                              openApply('both')
                            }}
                          >
                            Apply
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product information</CardTitle>
              <CardDescription>
                Select an existing product or calculate without linking a product.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Product</Label>
                <Select value={payload.productId || '__none__'} onValueChange={onProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No product (standalone calculation)</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calc-name">Calculation name</Label>
                <Input
                  id="calc-name"
                  value={payload.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. T-Shirt batch July"
                />
              </div>
              <div className="space-y-2">
                <Label>Product category</Label>
                <Select
                  value={payload.category || undefined}
                  onValueChange={(v) => update('category', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity produced</Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={payload.quantity || ''}
                  onChange={(e) => update('quantity', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit of measurement</Label>
                <Select value={payload.unit} onValueChange={(v) => update('unit', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calc-date">Calculation date</Label>
                <Input
                  id="calc-date"
                  type="date"
                  value={payload.calculationDate}
                  onChange={(e) => update('calculationDate', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
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
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Cost components</CardTitle>
                <CardDescription>
                  Line total = Quantity × Unit cost. Or enter a fixed total amount.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPayload((prev) => ({
                    ...prev,
                    lines: [...prev.lines, createEmptyCostLine('Other Production Cost', '')],
                  }))
                }
              >
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 overflow-x-auto">
              {payload.lines.map((line) => {
                const total = totals.lineTotals.find((t) => t.id === line.id)?.total ?? 0
                return (
                  <div
                    key={line.id}
                    className="grid min-w-[720px] grid-cols-[1.2fr_1fr_1fr_0.7fr_0.9fr_0.9fr_0.7fr_auto] items-end gap-2 rounded-lg border border-zinc-100 p-3"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Cost component</Label>
                      <Input
                        value={line.name}
                        onChange={(e) => updateLine(line.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={line.category}
                        onValueChange={(v) =>
                          updateLine(line.id, { category: v as CostLine['category'] })
                        }
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
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit cost</Label>
                      <CurrencyInput
                        currency={currency}
                        value={line.unitCost}
                        onChange={(v) => updateLine(line.id, { unitCost: v, fixedTotal: v ? '' : line.fixedTotal })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fixed / total</Label>
                      <CurrencyInput
                        currency={currency}
                        value={line.fixedTotal}
                        onChange={(v) =>
                          updateLine(line.id, {
                            fixedTotal: v,
                            unitCost: v ? '' : line.unitCost,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Include</Label>
                      <div className="flex h-10 items-center gap-2">
                        <Switch
                          checked={line.includeInUnitCost}
                          onCheckedChange={(v) => updateLine(line.id, { includeInUnitCost: v })}
                        />
                        <span className="text-xs tabular-nums text-zinc-600">{money(total)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => removeLine(line.id)}
                      aria-label="Delete line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wastage and extra cost</CardTitle>
              <CardDescription>Optional percentages applied to eligible production cost.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Wastage %</Label>
                <Input
                  value={payload.wastagePct}
                  onChange={(e) => update('wastagePct', pct(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Contingency %</Label>
                <Input
                  value={payload.contingencyPct}
                  onChange={(e) => update('contingencyPct', pct(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Additional fixed production cost</Label>
                <CurrencyInput
                  currency={currency}
                  value={payload.additionalFixedCost}
                  onChange={(v) => update('additionalFixedCost', v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overhead allocation</CardTitle>
              <CardDescription>
                Optional. Only amounts you enter here are included — business overhead is not
                auto-imported.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-3">
                <Label>Label (e.g. Rent, Electricity)</Label>
                <Input
                  value={payload.overheadLabel}
                  onChange={(e) => update('overheadLabel', e.target.value)}
                  placeholder="Rent / Electricity / Admin salary…"
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
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
                    <SelectItem value="perUnit">Amount per unit</SelectItem>
                    <SelectItem value="percent">Percentage of production cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  {payload.overheadMethod === 'percent' ? 'Percentage' : 'Amount'}
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
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          <Card className="border-teal-100 bg-teal-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-teal-700" />
                Cost summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SummaryRow label="Materials Cost" value={money(totals.materialsCost)} />
              <SummaryRow label="Direct Labour" value={money(totals.directLabourCost)} />
              <SummaryRow label="Packaging" value={money(totals.packagingCost)} />
              <SummaryRow label="Transportation" value={money(totals.transportationCost)} />
              <SummaryRow label="Other Direct Cost" value={money(totals.otherDirectCost)} />
              <SummaryRow label="Wastage Cost" value={money(totals.wastageCost)} />
              <SummaryRow label="Contingency Cost" value={money(totals.contingencyCost)} />
              <SummaryRow label="Allocated Overhead" value={money(totals.allocatedOverhead)} />
              <div className="my-2 border-t border-teal-100" />
              <SummaryRow label="Total Batch Cost" value={money(totals.totalBatchCost)} emphasize />
              <SummaryRow
                label="Quantity Produced"
                value={`${totals.quantity} ${payload.unit}`}
              />
              <SummaryRow label="Cost Per Unit" value={money(totals.costPerUnit)} emphasize />
              {!totals.validation.ok ? (
                <p className="pt-2 text-xs text-amber-700">{totals.validation.messages[0]}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selling price calculator</CardTitle>
              <CardDescription>
                Markup and margin are different. Markup uses cost × (1 + %). Margin uses cost ÷
                (1 − %).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label>Target markup %</Label>
                  <Input
                    value={payload.targetMarkupPct}
                    onChange={(e) => update('targetMarkupPct', pct(e.target.value))}
                  />
                </div>
              ) : null}
              {payload.pricingMode === 'margin' ? (
                <div className="space-y-2">
                  <Label>Target gross margin % (must be below 100)</Label>
                  <Input
                    value={payload.targetMarginPct}
                    onChange={(e) => update('targetMarginPct', pct(e.target.value))}
                  />
                </div>
              ) : null}
              {payload.pricingMode === 'manual' ? (
                <div className="space-y-2">
                  <Label>Manual selling price</Label>
                  <CurrencyInput
                    currency={currency}
                    value={payload.manualSellingPrice}
                    onChange={(v) => update('manualSellingPrice', v)}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SummaryRow label="Cost Per Unit" value={money(totals.costPerUnit)} />
              <SummaryRow
                label="Suggested Selling Price"
                value={money(totals.suggestedSellingPrice)}
                emphasize
              />
              <SummaryRow label="Profit Per Unit" value={money(totals.profitPerUnit)} />
              <SummaryRow label="Markup %" value={`${totals.markupPct.toFixed(2)}%`} />
              <SummaryRow label="Gross Margin %" value={`${totals.grossMarginPct.toFixed(2)}%`} />
              <SummaryRow label="Total Expected Sales" value={money(totals.totalExpectedSales)} />
              <SummaryRow
                label="Total Expected Gross Profit"
                value={money(totals.totalExpectedGrossProfit)}
              />
              <SummaryRow label="Break-even Quantity" value={String(totals.breakEvenQuantity)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optional selling costs</CardTitle>
              <CardDescription>
                Shown separately — not included in production cost or COGS.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer delivery / unit</Label>
                <CurrencyInput
                  currency={currency}
                  value={payload.sellingCosts.deliveryPerUnit}
                  onChange={(v) =>
                    update('sellingCosts', { ...payload.sellingCosts, deliveryPerUnit: v })
                  }
                />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Other selling cost / unit</Label>
                <CurrencyInput
                  currency={currency}
                  value={payload.sellingCosts.otherPerUnit}
                  onChange={(v) =>
                    update('sellingCosts', { ...payload.sellingCosts, otherPerUnit: v })
                  }
                />
              </div>
              <div className="sm:col-span-2 space-y-2 rounded-lg bg-zinc-50 p-3">
                <SummaryRow
                  label="Product Gross Profit"
                  value={money(totals.productGrossProfit)}
                />
                <SummaryRow
                  label="Selling costs / unit"
                  value={money(totals.sellingCostsPerUnit)}
                />
                <SummaryRow
                  label="Profit After Selling Costs"
                  value={money(totals.profitAfterSellingCosts)}
                  emphasize
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>Price comparison</CardTitle>
                <CardDescription>Low / Recommended / Premium scenarios.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={generateScenarios}>
                Generate
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-zinc-500">
                  <tr>
                    <th className="py-2 pr-2 text-left font-medium">Scenario</th>
                    <th className="py-2 pr-2 text-left font-medium">Selling Price</th>
                    <th className="py-2 pr-2 text-right font-medium">Profit / unit</th>
                    <th className="py-2 pr-2 text-right font-medium">Markup</th>
                    <th className="py-2 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.scenarios.map((scenario, index) => {
                    const m = scenarioMetrics(totals.costPerUnit, Number(scenario.sellingPrice) || 0)
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
                        <td className="py-2 pr-2 text-right tabular-nums">{money(m.profitPerUnit)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{m.markupPct.toFixed(1)}%</td>
                        <td className="py-2 text-right tabular-nums">{m.marginPct.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Save options</CardTitle>
          <CardDescription>
            Applying cost or price updates the product for future sales only. Historical sales,
            sale-line cost snapshots, COGS, and past profitability reports are never changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" disabled={saving} onClick={() => void handleSave('SAVED')}>
            Save Calculation
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void handleSave('DRAFT')}
          >
            Save as Draft
          </Button>
          <Button type="button" variant="outline" onClick={() => openApply('cost')}>
            Apply Cost to Product
          </Button>
          <Button type="button" variant="outline" onClick={() => openApply('price')}>
            Apply Selling Price to Product
          </Button>
          <Button type="button" variant="secondary" onClick={() => openApply('both')}>
            Apply Both
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print / Export
          </Button>
          <Button type="button" variant="outline" onClick={openExpense}>
            Create Production Expense
          </Button>
          <Button type="button" variant="outline" onClick={openStock}>
            Add Produced Stock
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">Accounting definitions</p>
          <p className="mt-2">
            Product Cost is the calculated cost to produce one unit. Production Expense is an
            expense or cash transaction entered during a period. COGS is the sale-time product cost
            of the units sold. These amounts may differ and must not be automatically treated as
            the same value.
          </p>
        </CardContent>
      </Card>

      {/* Mobile sticky summary */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-teal-100 bg-white/95 px-4 py-2 shadow-lg backdrop-blur print:hidden md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Cost / unit</p>
            <p className="font-semibold tabular-nums text-teal-800">{money(totals.costPerUnit)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Sell price</p>
            <p className="font-semibold tabular-nums">{money(totals.suggestedSellingPrice)}</p>
          </div>
          <Button size="sm" disabled={saving} onClick={() => void handleSave('SAVED')}>
            Save
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        title="Apply to product?"
        description={
          applyMode === 'cost'
            ? `Apply the calculated unit cost of ${money(totals.costPerUnit)} to this product? Future sales only — historical sales and COGS are unchanged.`
            : applyMode === 'price'
              ? `Apply the calculated selling price of ${money(totals.suggestedSellingPrice)} to this product? Future sales only — historical sales are unchanged.`
              : `Apply the calculated unit cost of ${money(totals.costPerUnit)} and selling price of ${money(totals.suggestedSellingPrice)} to this product? This affects future transactions only — historical sales and COGS are unchanged.`
        }
        confirmLabel="Apply"
        onConfirm={confirmApply}
      />

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add produced stock?</DialogTitle>
            <DialogDescription>
              Quantity {stockForm.quantity || 0} × {money(Number(stockForm.unitCost) || 0)} =
              inventory value{' '}
              {money((Number(stockForm.quantity) || 0) * (Number(stockForm.unitCost) || 0))}. Stock
              is updated only after you confirm.
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
              <Label>Quantity produced</Label>
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
            <div className="space-y-1">
              <Label>Storage location</Label>
              <Input
                value={stockForm.storageLocation}
                onChange={(e) => setStockForm((s) => ({ ...s, storageLocation: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={stockForm.notes}
                onChange={(e) => setStockForm((s) => ({ ...s, notes: e.target.value }))}
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
                toast.success(
                  `Stock added. Inventory value ${money(result.data.inventoryValue)}`,
                )
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
              This will create expense records totaling {money(expensePreviewTotal)}. Saving a
              calculation never creates expenses automatically. Duplicate creation is blocked.
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
                  <SelectValue placeholder="Unlinked / reporting only" />
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
            <div className="space-y-2">
              <Label>Cost components</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {payload.lines
                  .filter((l) => l.includeInUnitCost)
                  .map((line) => {
                    const amount = totals.lineTotals.find((t) => t.id === line.id)?.total ?? 0
                    const checked = expenseForm.lineIds.includes(line.id)
                    return (
                      <label
                        key={line.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
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
                          {line.name || line.category}
                          <span className="text-zinc-400">· {line.category} · PRODUCTION</span>
                        </span>
                        <span className="tabular-nums">{money(amount)}</span>
                      </label>
                    )
                  })}
              </div>
              <p className="text-xs text-zinc-500">Total amount: {money(expensePreviewTotal)}</p>
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
                    h.id === calculationId
                      ? { ...h, expenseIds: result.data.expenseIds }
                      : h,
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
