import {
  addMoney,
  divMoney,
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
  invoiceNumber?: string | null
  date?: string | Date | null
  /** Optional status — cancelled/voided/draft sales are excluded when provided. */
  status?: string | null
  paymentStatus?: string | null
  subtotal?: MoneyInput
  discount?: MoneyInput
  totalAmount: MoneyInput
  items: ProfitabilitySaleLine[]
}

export type CogsBreakdownLine = {
  saleId: string | null
  invoiceNumber: string | null
  date: string | null
  productId: string | null
  productName: string
  quantity: number
  unitCost: number
  lineCogs: number
  source: 'unitCostSnapshot' | 'lineCostFallback' | 'zero'
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
  /** Only expenses with a missing/null cost classification. */
  unclassifiedExpenses: number
  /** PRODUCTION-typed expense transactions (not COGS; not part of P&L operating lines). */
  productionExpenses: number
  /** Selling + Overhead + Unclassified (excludes COGS and PRODUCTION expenses). */
  operatingExpenses: number
  profitAfterSellingCosts: number
  netProfit: number
  netMargin: number
  productProfitability: ProductProfitabilityRow[]
  /** Line-level inventory COGS detail: quantity × sale-time unit cost. */
  cogsBreakdown: CogsBreakdownLine[]
  reconciliation: {
    ok: boolean
    expectedGrossProfit: number
    expectedNetProfit: number
    messages: string[]
  }
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
  const cogsBreakdown: CogsBreakdownLine[] = []

  for (const sale of included) {
    const lineTotals = sale.items.map((item) => money(item.lineTotal))
    const linesSubtotal = addMoney(
      sale.subtotal !== undefined && sale.subtotal !== null && sale.subtotal !== ''
        ? sale.subtotal
        : addMoney(...lineTotals),
    )
    const discount = money(sale.discount)
    const saleDate =
      sale.date instanceof Date
        ? sale.date.toISOString()
        : sale.date
          ? String(sale.date)
          : null

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
      const source: CogsBreakdownLine['source'] = hasUnitCostSnapshot(item)
        ? 'unitCostSnapshot'
        : item.lineCost !== undefined && item.lineCost !== null && item.lineCost !== ''
          ? 'lineCostFallback'
          : 'zero'
      const unitCost = hasUnitCostSnapshot(item)
        ? moneyNumber(item.unitCost)
        : qty !== 0
          ? moneyNumber(divMoney(lineCogs, qty))
          : 0

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

      cogsBreakdown.push({
        saleId: sale.id ?? null,
        invoiceNumber: sale.invoiceNumber ?? null,
        date: saleDate,
        productId,
        productName,
        quantity: qty,
        unitCost,
        lineCogs: moneyNumber(lineCogs),
        source,
      })
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
  // Unclassified = only expenses with no classification. Never a residual/
  // balancing figure, and never PRODUCTION expenses (those are tracked
  // separately; inventory COGS already covers sold-product cost).
  const unclassifiedExpensesMoney = addMoney(
    ...expenses
      .filter((expense) => !expense.costType)
      .map((expense) => expense.amount),
  )

  const operatingExpensesMoney = addMoney(
    sellingCostMoney,
    overheadCostMoney,
    unclassifiedExpensesMoney,
  )

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

  const salesRevenue = moneyNumber(salesRevenueMoney)
  const productionCost = moneyNumber(productionCostMoney)
  const grossProfit = moneyNumber(grossProfitMoney)
  const sellingCost = moneyNumber(sellingCostMoney)
  const overheadCost = moneyNumber(overheadCostMoney)
  const unclassifiedExpenses = moneyNumber(unclassifiedExpensesMoney)
  const netProfit = moneyNumber(netProfitMoney)

  const expectedGrossProfit = moneyNumber(subMoney(salesRevenue, productionCost))
  const expectedNetProfit = moneyNumber(
    subMoney(expectedGrossProfit, addMoney(sellingCost, overheadCost, unclassifiedExpenses)),
  )
  const messages: string[] = []
  if (grossProfit !== expectedGrossProfit) {
    messages.push(
      `Gross Profit ${grossProfit} does not equal Sales Revenue ${salesRevenue} − COGS ${productionCost} (= ${expectedGrossProfit})`,
    )
  }
  if (netProfit !== expectedNetProfit) {
    messages.push(
      `Net Profit ${netProfit} does not equal Gross Profit ${grossProfit} − Selling ${sellingCost} − Overhead ${overheadCost} − Unclassified ${unclassifiedExpenses} (= ${expectedNetProfit})`,
    )
  }

  return {
    salesRevenue,
    productionCost,
    grossProfit,
    grossMargin: moneyNumber(grossMarginMoney),
    sellingCost,
    overheadCost,
    unclassifiedExpenses,
    productionExpenses: moneyNumber(productionExpensesMoney),
    operatingExpenses: moneyNumber(operatingExpensesMoney),
    profitAfterSellingCosts: moneyNumber(profitAfterSellingMoney),
    netProfit,
    netMargin: moneyNumber(netMarginMoney),
    productProfitability,
    cogsBreakdown,
    reconciliation: {
      ok: messages.length === 0,
      expectedGrossProfit,
      expectedNetProfit,
      messages,
    },
  }
}
