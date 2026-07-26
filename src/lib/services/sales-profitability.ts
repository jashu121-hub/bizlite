import {
  addMoney,
  money,
  moneyNumber,
  mulMoney,
  percent,
  subMoney,
  type MoneyInput,
} from '@/lib/money'

export type ProfitabilitySaleLine = {
  productId?: string | null
  productName: string
  quantity: number
  /** Sale-time unit cost snapshot. Preferred source for COGS. */
  unitCost?: MoneyInput
  lineTotal: MoneyInput
  /** Optional legacy field; used only when unitCost snapshot is missing/zero. */
  lineCost?: MoneyInput
}

export type ProfitabilitySale = {
  id?: string
  /** Optional status — cancelled/voided/draft sales are excluded when provided. */
  status?: string | null
  paymentStatus?: string | null
  subtotal?: MoneyInput
  discount?: MoneyInput
  totalAmount: MoneyInput
  items: ProfitabilitySaleLine[]
}

export type ProfitabilityExpense = {
  amount: MoneyInput
  costType?: 'PRODUCTION' | 'SELLING' | 'OVERHEAD' | null
}

export type ProductProfitabilityRow = {
  productId: string | null
  productName: string
  quantitySold: number
  sales: number
  costOfGoodsSold: number
  grossProfit: number
  margin: number
}

export type SalesProfitabilityResult = {
  salesRevenue: number
  productionCost: number
  grossProfit: number
  grossMargin: number
  sellingCost: number
  overheadCost: number
  /** Null-type expenses plus PRODUCTION-typed expenses (no longer used as COGS). */
  unclassifiedExpenses: number
  /** PRODUCTION-typed operating expenses only (for expense breakdowns). */
  productionExpenses: number
  profitAfterSellingCosts: number
  netProfit: number
  netMargin: number
  productProfitability: ProductProfitabilityRow[]
}

const EXCLUDED_STATUSES = new Set([
  'CANCELLED',
  'CANCELED',
  'VOID',
  'VOIDED',
  'DRAFT',
  'DELETED',
])

function isExcludedSale(sale: ProfitabilitySale) {
  const status = (sale.status ?? '').toString().trim().toUpperCase()
  const payment = (sale.paymentStatus ?? '').toString().trim().toUpperCase()
  return EXCLUDED_STATUSES.has(status) || EXCLUDED_STATUSES.has(payment)
}

function hasUnitCostSnapshot(line: ProfitabilitySaleLine) {
  return line.unitCost !== undefined && line.unitCost !== null && String(line.unitCost) !== ''
}

/**
 * Resolve COGS for one sale line from the sale-time cost snapshot.
 * Prefer unitCost × quantity. Fall back to stored lineCost only when the
 * unit snapshot is missing. Never uses current product catalog cost.
 */
export function lineCogsFromSnapshot(line: ProfitabilitySaleLine) {
  const qty = Number(line.quantity) || 0
  if (hasUnitCostSnapshot(line)) {
    return mulMoney(money(line.unitCost), qty)
  }
  // Controlled legacy fallback when unitCost was never stored
  if (line.lineCost !== undefined && line.lineCost !== null && line.lineCost !== '') {
    return money(line.lineCost)
  }
  return money(0)
}

/**
 * Single source of truth for sales profitability used by Profit & Loss,
 * Product Profitability, KPIs, and exports.
 */
export function calculateSalesProfitability(
  sales: ProfitabilitySale[],
  expenses: ProfitabilityExpense[] = [],
  options?: {
    /** Optional live product names keyed by productId (rename-safe labels). */
    productNames?: Map<string, string> | Record<string, string>
  },
): SalesProfitabilityResult {
  const nameLookup =
    options?.productNames instanceof Map
      ? options.productNames
      : new Map(Object.entries(options?.productNames ?? {}))

  const included = sales.filter((sale) => !isExcludedSale(sale))

  const salesRevenueMoney = addMoney(...included.map((sale) => sale.totalAmount))

  const productMap = new Map<
    string,
    {
      productId: string | null
      productName: string
      quantitySold: number
      sales: ReturnType<typeof money>
      costOfGoodsSold: ReturnType<typeof money>
    }
  >()

  let productionCostMoney = money(0)

  for (const sale of included) {
    const lineTotals = sale.items.map((item) => money(item.lineTotal))
    const linesSubtotal = addMoney(
      sale.subtotal !== undefined && sale.subtotal !== null && sale.subtotal !== ''
        ? sale.subtotal
        : addMoney(...lineTotals),
    )
    const discount = money(sale.discount)

    for (const item of sale.items) {
      const qty = Number(item.quantity) || 0
      // Returned quantities (negative) reduce sold qty, sales, and COGS
      const lineTotal = money(item.lineTotal)
      const allocatedDiscount =
        linesSubtotal.gt(0) && discount.gt(0)
          ? money(discount.times(lineTotal.div(linesSubtotal)))
          : money(0)
      const productSales = subMoney(lineTotal, allocatedDiscount)
      const lineCogs = lineCogsFromSnapshot(item)

      productionCostMoney = productionCostMoney.plus(lineCogs)

      const productId = item.productId ?? null
      const key = productId ?? `name:${item.productName}`
      const liveName = productId ? nameLookup.get(productId) : undefined
      const productName = liveName || item.productName
      const row = productMap.get(key) ?? {
        productId,
        productName,
        quantitySold: 0,
        sales: money(0),
        costOfGoodsSold: money(0),
      }
      row.productName = productName
      row.quantitySold += qty
      row.sales = row.sales.plus(productSales)
      row.costOfGoodsSold = row.costOfGoodsSold.plus(lineCogs)
      productMap.set(key, row)
    }
  }

  const productionExpensesMoney = addMoney(
    ...expenses
      .filter((expense) => expense.costType === 'PRODUCTION')
      .map((expense) => expense.amount),
  )
  const sellingCostMoney = addMoney(
    ...expenses
      .filter((expense) => expense.costType === 'SELLING')
      .map((expense) => expense.amount),
  )
  const overheadCostMoney = addMoney(
    ...expenses
      .filter((expense) => expense.costType === 'OVERHEAD')
      .map((expense) => expense.amount),
  )
  const nullTypeExpenses = addMoney(
    ...expenses
      .filter((expense) => !expense.costType)
      .map((expense) => expense.amount),
  )
  // PRODUCTION-typed expenses are operating costs, not inventory COGS.
  // Fold them into unclassified so Net Profit still deducts every expense.
  const unclassifiedExpensesMoney = addMoney(nullTypeExpenses, productionExpensesMoney)

  const grossProfitMoney = subMoney(salesRevenueMoney, productionCostMoney)
  const profitAfterSellingMoney = subMoney(grossProfitMoney, sellingCostMoney)
  const netProfitMoney = subMoney(
    profitAfterSellingMoney,
    addMoney(overheadCostMoney, unclassifiedExpensesMoney),
  )

  const hasRevenue = salesRevenueMoney.gt(0)
  const grossMarginMoney = hasRevenue ? percent(grossProfitMoney, salesRevenueMoney) : money(0)
  const netMarginMoney = hasRevenue ? percent(netProfitMoney, salesRevenueMoney) : money(0)

  const productProfitability = [...productMap.values()]
    .map((row) => {
      const sales = moneyNumber(row.sales)
      const costOfGoodsSold = moneyNumber(row.costOfGoodsSold)
      const grossProfit = moneyNumber(subMoney(row.sales, row.costOfGoodsSold))
      const margin = sales > 0 ? moneyNumber(percent(grossProfit, sales)) : 0
      return {
        productId: row.productId,
        productName: row.productName,
        quantitySold: row.quantitySold,
        sales,
        costOfGoodsSold,
        grossProfit,
        margin,
      }
    })
    .sort((a, b) => b.sales - a.sales)

  return {
    salesRevenue: moneyNumber(salesRevenueMoney),
    productionCost: moneyNumber(productionCostMoney),
    grossProfit: moneyNumber(grossProfitMoney),
    grossMargin: moneyNumber(grossMarginMoney),
    sellingCost: moneyNumber(sellingCostMoney),
    overheadCost: moneyNumber(overheadCostMoney),
    unclassifiedExpenses: moneyNumber(unclassifiedExpensesMoney),
    productionExpenses: moneyNumber(productionExpensesMoney),
    profitAfterSellingCosts: moneyNumber(profitAfterSellingMoney),
    netProfit: moneyNumber(netProfitMoney),
    netMargin: moneyNumber(netMarginMoney),
    productProfitability,
  }
}
