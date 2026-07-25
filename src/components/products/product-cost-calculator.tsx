'use client'

import { useId, useMemo, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

import { CurrencyInput } from '@/components/shared/currency-input'
import { NumberInput } from '@/components/shared/number-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, money, moneyString } from '@/lib/money'
import {
  computeCostTotals,
  emptyCostBreakdown,
  normalizeCostBreakdown,
  weightedAverageCost,
  type ProductCostBreakdown,
} from '@/lib/product-cost'
import { cn } from '@/lib/utils'

type MoneyFieldKey = Exclude<
  keyof ProductCostBreakdown,
  | 'productionQuantity'
  | 'customProductionCosts'
  | 'totalProductionCost'
  | 'inventoryCostPerUnit'
  | 'totalSellingCost'
  | 'sellingCostPerUnit'
  | 'fullCostPerUnit'
>

const PRODUCTION_FIELDS: { key: MoneyFieldKey; label: string }[] = [
  { key: 'materials', label: 'Materials' },
  { key: 'stitching', label: 'Stitching or Direct Labour' },
  { key: 'design', label: 'Design Cost' },
  { key: 'packaging', label: 'Packaging' },
  { key: 'inwardTransport', label: 'Inward Transportation' },
  { key: 'customs', label: 'Customs or Import Cost' },
  { key: 'otherProduction', label: 'Other Production Cost' },
]

const SELLING_FIELDS: { key: MoneyFieldKey; label: string }[] = [
  { key: 'marketing', label: 'Marketing and Advertising' },
  { key: 'commission', label: 'Sales Commission' },
  { key: 'outwardDelivery', label: 'Outward Delivery Cost' },
  { key: 'marketplaceFees', label: 'Marketplace or Payment Fees' },
  { key: 'otherSelling', label: 'Other Selling Costs' },
]

function newCustomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function profitClass(value: string) {
  const amount = money(value)
  if (amount.isZero()) return 'text-zinc-700'
  return amount.isNeg() ? 'text-red-600' : 'text-emerald-600'
}

export function ProductCostCalculator({
  currency,
  value,
  sellingPrice,
  onChange,
  onInventoryCostChange,
  defaultOpen = false,
  quantityLocked = false,
  quantityOverride,
  existingStockQty,
  existingUnitCost,
  className,
}: {
  currency: string
  value?: ProductCostBreakdown | null
  sellingPrice: string
  onChange: (breakdown: ProductCostBreakdown | null) => void
  onInventoryCostChange?: (inventoryCostPerUnit: string) => void
  defaultOpen?: boolean
  /** When true, quantity is controlled externally (e.g. Add Stock qty) */
  quantityLocked?: boolean
  quantityOverride?: number
  existingStockQty?: number
  existingUnitCost?: string
  className?: string
}) {
  const panelId = useId()
  const [open, setOpen] = useState(defaultOpen || Boolean(value))
  const breakdown = useMemo(() => {
    const qty =
      quantityLocked && quantityOverride && quantityOverride > 0
        ? Math.floor(quantityOverride)
        : undefined
    const base = normalizeCostBreakdown(
      value ?? emptyCostBreakdown(qty && qty > 0 ? qty : 0),
    )
    if (qty && qty > 0 && base.productionQuantity !== qty) {
      return normalizeCostBreakdown({ ...base, productionQuantity: qty })
    }
    return base
  }, [value, quantityLocked, quantityOverride])
  const totals = useMemo(
    () => computeCostTotals(breakdown, sellingPrice),
    [breakdown, sellingPrice],
  )

  const hasProductionCosts = money(totals.totalProductionCost).gt(0)

  const weightedPreview =
    existingStockQty !== undefined && existingUnitCost !== undefined && hasProductionCosts
      ? weightedAverageCost(
          existingStockQty,
          existingUnitCost,
          totals.productionQuantity,
          totals.inventoryCostPerUnit,
        )
      : null

  const applyInventoryCost = (next: ProductCostBreakdown) => {
    if (money(next.totalProductionCost).gt(0)) {
      onInventoryCostChange?.(next.inventoryCostPerUnit)
    }
  }

  const update = (patch: Partial<ProductCostBreakdown>) => {
    const qty =
      quantityLocked && quantityOverride && quantityOverride > 0
        ? Math.floor(quantityOverride)
        : undefined
    const next = normalizeCostBreakdown({
      ...breakdown,
      ...patch,
      ...(qty ? { productionQuantity: qty } : {}),
    })
    onChange(next)
    applyInventoryCost(next)
  }

  const updateMoney = (key: MoneyFieldKey, amount: string) => {
    if (amount === '') {
      update({ [key]: '' })
      return
    }
    const safe = money(amount).isNeg() ? '' : amount
    update({ [key]: safe })
  }

  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div>
          <p className="text-sm font-semibold text-zinc-900">Calculate Product Cost</p>
          <p className="text-xs text-zinc-500">
            Break down batch costs to set inventory cost per unit
          </p>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div id={panelId} className="space-y-5 border-t border-zinc-100 px-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={`${panelId}-qty`}>Production or Purchase Quantity</Label>
            <NumberInput
              id={`${panelId}-qty`}
              integer
              min={0}
              placeholder="0"
              disabled={quantityLocked}
              value={
                breakdown.productionQuantity === 0 || breakdown.productionQuantity == null
                  ? ''
                  : breakdown.productionQuantity
              }
              onChange={(value) => {
                if (value === '') {
                  update({ productionQuantity: 0 })
                  return
                }
                const qty = Math.max(0, Math.floor(Number(value) || 0))
                update({ productionQuantity: qty })
              }}
            />
            <p className="text-xs text-zinc-500">
              Example: 100 shirts. Used to calculate cost per unit.
            </p>
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Production costs (batch total)</h3>
              <p className="text-xs text-zinc-500">Included in inventory Cost Price</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRODUCTION_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs">{field.label}</Label>
                  <CurrencyInput
                    currency={currency}
                    value={breakdown[field.key]}
                    onChange={(amount) => updateMoney(field.key, amount)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {breakdown.customProductionCosts.map((line, index) => (
                <div key={line.id} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <Input
                    placeholder="Cost name (e.g. Printing)"
                    value={line.name}
                    onChange={(e) => {
                      const customProductionCosts = breakdown.customProductionCosts.map((item, i) =>
                        i === index ? { ...item, name: e.target.value } : item,
                      )
                      update({ customProductionCosts })
                    }}
                  />
                  <CurrencyInput
                    currency={currency}
                    value={line.amount}
                    onChange={(amount) => {
                      const customProductionCosts = breakdown.customProductionCosts.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              amount: amount === '' || money(amount).isNeg() ? '' : amount,
                            }
                          : item,
                      )
                      update({ customProductionCosts })
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete cost item"
                    onClick={() => {
                      update({
                        customProductionCosts: breakdown.customProductionCosts.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  update({
                    customProductionCosts: [
                      ...breakdown.customProductionCosts,
                      { id: newCustomId(), name: '', amount: '' },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add Cost Item
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Selling Cost Allocation</h3>
              <p className="text-xs text-zinc-500">
                Not included in inventory Cost Price — used for full cost and profit estimates
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SELLING_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs">{field.label}</Label>
                  <CurrencyInput
                    currency={currency}
                    value={breakdown[field.key]}
                    onChange={(amount) => updateMoney(field.key, amount)}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
              Cost summary
            </p>
            <dl className="grid gap-1.5 text-sm sm:grid-cols-2 sm:gap-x-6">
              <CompactRow label="Production quantity" value={String(totals.productionQuantity)} />
              <CompactRow
                label="Production Cost"
                value={formatCurrency(totals.totalProductionCost, currency)}
              />
              <CompactRow
                label="Inventory Cost Per Unit"
                value={formatCurrency(totals.inventoryCostPerUnit, currency)}
              />
              <CompactRow
                label="Total Selling Cost"
                value={formatCurrency(totals.totalSellingCost, currency)}
              />
              <CompactRow
                label="Selling Cost Per Unit"
                value={formatCurrency(totals.sellingCostPerUnit, currency)}
              />
              <CompactRow
                label="Full Cost Per Unit"
                value={formatCurrency(totals.fullCostPerUnit, currency)}
              />
              <CompactRow
                label="Selling Price"
                value={formatCurrency(sellingPrice || 0, currency)}
              />
              <CompactRow
                label="Gross Profit Per Unit"
                value={formatCurrency(totals.grossProfitPerUnit, currency)}
                className={profitClass(totals.grossProfitPerUnit)}
              />
              <CompactRow
                label="Estimated Profit Per Unit"
                value={formatCurrency(totals.estimatedFinalProfitPerUnit, currency)}
                className={profitClass(totals.estimatedFinalProfitPerUnit)}
              />
              <CompactRow
                label="Gross Margin"
                value={`${moneyString(totals.grossMarginPct)}%`}
                className={profitClass(totals.grossProfitPerUnit)}
              />
              <CompactRow
                label="Estimated Margin"
                value={`${moneyString(totals.estimatedFinalMarginPct)}%`}
                className={profitClass(totals.estimatedFinalProfitPerUnit)}
              />
            </dl>
            {weightedPreview ? (
              <p className="mt-3 border-t border-teal-100 pt-3 text-xs text-teal-900">
                New weighted average Cost Price:{' '}
                <span className="font-semibold">
                  {formatCurrency(weightedPreview, currency)}
                </span>
              </p>
            ) : null}
          </div>

          {hasProductionCosts ? (
            <p className="text-xs text-zinc-500">
              Inventory cost per unit ({formatCurrency(totals.inventoryCostPerUnit, currency)}) is
              applied to Cost Price automatically.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CompactRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-600">{label}</dt>
      <dd className={cn('font-semibold tabular-nums text-zinc-900', className)}>{value}</dd>
    </div>
  )
}
