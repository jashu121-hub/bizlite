import type { ExpenseCostType, PaymentStatus } from '@prisma/client'
import { differenceInCalendarDays, startOfDay } from 'date-fns'

import {
  getDashboardDateRange,
  toDashboardDateRangeCompat,
  toLocalDateInput,
  type DashboardDateParams,
} from '@/lib/dashboard-date-range'
import { prismaDateFilter } from '@/lib/dates'
import { prisma } from '@/lib/prisma'
import { explainUnitCostFromBreakdown } from '@/lib/cogs-reconciliation'
import { expenseNeedsClassification } from '@/lib/expense-cost'
import { addMoney, money, moneyNumber, percent, subMoney } from '@/lib/money'
import { calculateSalesProfitability } from '@/lib/services/sales-profitability'

const paymentStatuses: PaymentStatus[] = ['PAID', 'PARTIALLY_PAID', 'PENDING']

type BreakdownRow = {
  key: string
  label: string
  amount: number
  percentOfGroup: number
  percentOfTotal: number
}

function buildBreakdown(
  items: { key: string; label: string; amount: ReturnType<typeof money> }[],
  groupTotal: ReturnType<typeof money>,
  grandTotal: ReturnType<typeof money>,
): BreakdownRow[] {
  return items
    .map((item) => ({
      key: item.key,
      label: item.label,
      amount: moneyNumber(item.amount),
      percentOfGroup: moneyNumber(percent(item.amount, groupTotal)),
      percentOfTotal: moneyNumber(percent(item.amount, grandTotal)),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

function productMarginStatus(grossProfit: number, salesAmount: number, margin: number) {
  if (salesAmount <= 0) return 'Healthy' as const
  if (grossProfit < 0) return 'Loss' as const
  if (grossProfit === 0 || margin === 0) return 'Zero Margin' as const
  if (margin < 15) return 'Low Margin' as const
  if (margin >= 40) return 'High Margin' as const
  return 'Healthy' as const
}

function receivableStatus(oldestPending: Date, totalPaid: number, outstanding: number) {
  const days = differenceInCalendarDays(startOfDay(new Date()), startOfDay(oldestPending))
  if (outstanding > 0 && totalPaid > 0 && days > 30) return 'Overdue' as const
  if (days > 30) return 'Overdue' as const
  if (days > 14) return 'Due Soon' as const
  if (totalPaid > 0 && outstanding > 0) return 'Partially Paid' as const
  return 'Current' as const
}

export async function getReportsData(userId: string, params: DashboardDateParams = {}) {
  const preset = (params.preset || 'month') as DashboardDateParams['preset']
  const dashboardRange = getDashboardDateRange({
    preset: preset || 'month',
    from: params.from,
    to: params.to,
    year: params.year,
    month: params.month,
  })
  const range = toDashboardDateRangeCompat(dashboardRange)
  const dateFilter = prismaDateFilter(range)
  const periodWhere = { userId, ...(dateFilter ? { date: dateFilter } : {}) }

  const [sales, expenses, products, outstandingSales] = await Promise.all([
    prisma.sale.findMany({
      where: periodWhere,
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        totalAmount: true,
        totalCost: true,
        amountPaid: true,
        balancePending: true,
        paymentStatus: true,
        customer: { select: { name: true } },
        subtotal: true,
        discount: true,
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            unitCost: true,
            lineTotal: true,
            lineCost: true,
            lineProfit: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.expense.findMany({
      where: periodWhere,
      select: {
        id: true,
        categoryId: true,
        date: true,
        category: { select: { id: true, name: true, parentId: true, isTransport: true } },
        costType: true,
        description: true,
        amount: true,
        paymentMethod: true,
        vendor: true,
        reference: true,
        notes: true,
        cashAccountId: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        currentStock: true,
        openingStock: true,
        lowStockLevel: true,
        costPrice: true,
        sellingPrice: true,
        costBreakdown: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.sale.findMany({
      where: { userId, balancePending: { gt: 0 }, customerId: { not: null } },
      select: {
        id: true,
        customerId: true,
        invoiceNumber: true,
        date: true,
        totalAmount: true,
        amountPaid: true,
        balancePending: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    }),
  ])

  const totalPaidSales = addMoney(...sales.map((sale) => sale.amountPaid))
  const allExpensesMoney = addMoney(...expenses.map((expense) => expense.amount))

  const productNameById = new Map(products.map((product) => [product.id, product.name]))
  const profitability = calculateSalesProfitability(
    sales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      paymentStatus: sale.paymentStatus,
      subtotal: sale.subtotal,
      discount: sale.discount,
      totalAmount: sale.totalAmount,
      items: sale.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
        lineCost: item.lineCost,
      })),
    })),
    expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      costType: expense.costType,
    })),
    { productNames: productNameById },
  )

  if (!profitability.reconciliation.ok) {
    console.warn('[reports] Profitability reconciliation failed', {
      messages: profitability.reconciliation.messages,
      saleIds: sales.map((sale) => sale.id),
      expenseIds: expenses.map((expense) => expense.id),
    })
  }

  const soldProductIds = [
    ...new Set(
      profitability.cogsBreakdown
        .map((line) => line.productId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const stockMovements =
    soldProductIds.length > 0
      ? await prisma.stockMovement.findMany({
          where: { userId, productId: { in: soldProductIds } },
          select: {
            id: true,
            productId: true,
            type: true,
            quantity: true,
            date: true,
            notes: true,
            saleId: true,
          },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        })
      : []

  const productById = new Map(products.map((product) => [product.id, product]))
  const movementsByProduct = new Map<string, typeof stockMovements>()
  for (const movement of stockMovements) {
    const list = movementsByProduct.get(movement.productId) ?? []
    list.push(movement)
    movementsByProduct.set(movement.productId, list)
  }

  const productionExpenseRows = expenses.filter((expense) => expense.costType === 'PRODUCTION')
  const cogsByProduct = new Map<
    string,
    { productId: string; productName: string; quantitySold: number; lineCogs: number; unitCost: number }
  >()
  for (const line of profitability.cogsBreakdown) {
    const key = line.productId ?? `name:${line.productName}`
    const current = cogsByProduct.get(key) ?? {
      productId: line.productId ?? key,
      productName: line.productName,
      quantitySold: 0,
      lineCogs: 0,
      unitCost: line.unitCost,
    }
    current.quantitySold += line.quantity
    current.lineCogs = moneyNumber(money(current.lineCogs).plus(line.lineCogs))
    current.unitCost = line.unitCost
    current.productName = line.productName
    cogsByProduct.set(key, current)
  }

  const cogsReconciliation = [...cogsByProduct.values()].map((row) => {
    const product = row.productId ? productById.get(row.productId) : undefined
    const explanation = explainUnitCostFromBreakdown(
      product?.costBreakdown,
      row.quantitySold,
      row.unitCost,
    )
    const movements = row.productId ? (movementsByProduct.get(row.productId) ?? []) : []
    const stockAdded = movements
      .filter((m) => m.quantity > 0 && m.type !== 'SALE_REVERSAL')
      .reduce((sum, m) => sum + m.quantity, 0)
    const stockSold = movements
      .filter((m) => m.type === 'SALE')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0)
    const stockAdjustments = movements
      .filter((m) => m.type.startsWith('ADJUSTMENT') || m.type === 'SALE_REVERSAL')
      .reduce((sum, m) => sum + m.quantity, 0)

    return {
      productId: product?.id ?? row.productId,
      productName: row.productName,
      quantitySold: row.quantitySold,
      saleTimeUnitCost: row.unitCost,
      catalogUnitCost: product ? moneyNumber(product.costPrice) : null,
      lineCogs: row.lineCogs,
      ...explanation,
      inventory: product
        ? {
            openingStock: product.openingStock,
            stockAdded,
            stockSold,
            stockAdjustments,
            currentStock: product.currentStock,
            movements: movements.map((m) => ({
              id: m.id,
              type: m.type,
              quantity: m.quantity,
              date: m.date.toISOString(),
              notes: m.notes,
              saleId: m.saleId,
            })),
          }
        : null,
    }
  })

  const productionExpenseAudit = productionExpenseRows.map((expense) => ({
    id: expense.id,
    date: expense.date.toISOString(),
    description: expense.description,
    category: expense.category.name,
    amount: moneyNumber(expense.amount),
    cashAccountId: expense.cashAccountId,
    linkedToProduct: false as const,
    increasesInventoryInSystem: false as const,
    hasCashLedgerLink: Boolean(expense.cashAccountId),
    note:
      'Stored as an Expense with costType PRODUCTION. Not linked to a product, does not create stock movements, and does not update product costPrice or inventory asset value. It is not the source of sale-line unitCost unless that amount also appears in Product.costBreakdown.',
  }))

  const operatingExpenseRows = expenses.filter(
    (expense) => expense.costType === 'SELLING' || expense.costType === 'OVERHEAD' || !expense.costType,
  )
  const mapExpenseTxn = (expense: (typeof expenses)[number]) => ({
    id: expense.id,
    date: expense.date.toISOString(),
    description: expense.description,
    category: expense.category.name,
    costType: expense.costType,
    amount: moneyNumber(expense.amount),
    vendor: expense.vendor,
    reference: expense.reference,
  })

  const revenue = money(profitability.salesRevenue)
  const inventoryCogs = money(profitability.productionCost)

  const receivables = addMoney(
    ...outstandingSales.map((sale) => sale.balancePending),
  )
  const activeProducts = products.filter((p) => p.isActive)
  const stockValue = addMoney(
    ...activeProducts.map((product) => money(product.costPrice).times(product.currentStock)),
  )
  const potentialSalesValue = addMoney(
    ...activeProducts.map((product) => money(product.sellingPrice).times(product.currentStock)),
  )
  const potentialGrossProfit = subMoney(potentialSalesValue, stockValue)
  const lowStockItems = activeProducts.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.lowStockLevel,
  )
  const outOfStockItems = activeProducts.filter((p) => p.currentStock <= 0)

  const paymentStatusCounts = paymentStatuses.reduce(
    (counts, status) => {
      counts[status] = sales.filter((sale) => sale.paymentStatus === status).length
      return counts
    },
    {} as Record<PaymentStatus, number>,
  )

  function groupBreakdown(costType: ExpenseCostType | 'UNCLASSIFIED') {
    const group =
      costType === 'UNCLASSIFIED'
        ? expenses.filter((expense) => !expense.costType)
        : expenses.filter((expense) => expense.costType === costType)
    const groupTotal = addMoney(...group.map((expense) => expense.amount))
    const buckets = new Map<
      string,
      { key: string; label: string; amount: ReturnType<typeof money> }
    >()

    for (const expense of group) {
      const key = expense.categoryId
      const label = expense.category.name
      const current = buckets.get(key) ?? { key, label, amount: money(0) }
      current.amount = current.amount.plus(expense.amount)
      buckets.set(key, current)
    }

    // One denominator for every expense-structure line: total entered expenses.
    const percentBase = allExpensesMoney
    return {
      total: moneyNumber(groupTotal),
      percentOfTotal: moneyNumber(percent(groupTotal, percentBase)),
      breakdown: buildBreakdown([...buckets.values()], groupTotal, percentBase),
    }
  }

  const production = groupBreakdown('PRODUCTION')
  const selling = groupBreakdown('SELLING')
  const overhead = groupBreakdown('OVERHEAD')
  const unclassified = groupBreakdown('UNCLASSIFIED')

  const needsClassification = expenses.filter((expense) => expenseNeedsClassification(expense.costType))

  const customerReceivables = new Map<
    string,
    {
      customerId: string
      customer: string
      totalSales: ReturnType<typeof money>
      totalPaid: ReturnType<typeof money>
      outstanding: ReturnType<typeof money>
      oldestPendingSaleDate: Date
    }
  >()
  for (const sale of outstandingSales) {
    if (!sale.customerId || !sale.customer) continue
    const row = customerReceivables.get(sale.customerId) ?? {
      customerId: sale.customerId,
      customer: sale.customer.name,
      totalSales: money(0),
      totalPaid: money(0),
      outstanding: money(0),
      oldestPendingSaleDate: sale.date,
    }
    row.totalSales = row.totalSales.plus(sale.totalAmount)
    row.totalPaid = row.totalPaid.plus(sale.amountPaid)
    row.outstanding = row.outstanding.plus(sale.balancePending)
    if (sale.date < row.oldestPendingSaleDate) row.oldestPendingSaleDate = sale.date
    customerReceivables.set(sale.customerId, row)
  }

  const salesRevenue = profitability.salesRevenue
  const hasRevenue = salesRevenue > 0
  const netProfitNumber = profitability.netProfit
  const grossProfitNumber = profitability.grossProfit

  const productRows = profitability.productProfitability.map((row) => ({
    product: row.productName,
    productId: row.productId,
    quantitySold: row.quantitySold,
    salesAmount: row.sales,
    cost: row.costOfGoodsSold,
    grossProfit: row.grossProfit,
    margin: row.margin,
    status: productMarginStatus(row.grossProfit, row.sales, row.margin),
  }))

  const receivableRows = [...customerReceivables.values()]
    .map((row) => {
      const totalPaid = moneyNumber(row.totalPaid)
      const outstanding = moneyNumber(row.outstanding)
      return {
        customerId: row.customerId,
        customer: row.customer,
        totalSales: moneyNumber(row.totalSales),
        totalPaid,
        outstanding,
        oldestPendingSaleDate: row.oldestPendingSaleDate.toISOString(),
        status: receivableStatus(row.oldestPendingSaleDate, totalPaid, outstanding),
      }
    })
    .sort((a, b) => b.outstanding - a.outstanding)

  const overdueAmount = moneyNumber(
    addMoney(
      ...receivableRows
        .filter((row) => row.status === 'Overdue')
        .map((row) => row.outstanding),
    ),
  )

  const zeroMarginProducts = productRows.filter((p) => p.status === 'Zero Margin')
  const lossProducts = productRows.filter((p) => p.status === 'Loss')

  const alerts = [
    needsClassification.length > 0
      ? {
          id: 'unclassified',
          tone: 'warning' as const,
          message: `${needsClassification.length} expense${needsClassification.length === 1 ? '' : 's'} require classification — ${unclassified.total.toFixed(2)}`,
          href: '/expenses?needsClassification=1',
          tab: 'expenses' as const,
        }
      : null,
    lowStockItems.length > 0
      ? {
          id: 'low-stock',
          tone: 'warning' as const,
          message: `${lowStockItems.length} low-stock product${lowStockItems.length === 1 ? '' : 's'}`,
          href: '/products?stock=low',
          tab: 'inventory' as const,
        }
      : null,
    receivableRows.length > 0
      ? {
          id: 'receivables',
          tone: 'warning' as const,
          message: `${receivableRows.length} customer${receivableRows.length === 1 ? '' : 's'} have outstanding payments`,
          href: null,
          tab: 'receivables' as const,
        }
      : null,
    ...zeroMarginProducts.slice(0, 2).map((p) => ({
      id: `zero-${p.product}`,
      tone: 'warning' as const,
      message: `${p.product} has 0% gross margin`,
      href: null,
      tab: 'products' as const,
    })),
    ...lossProducts.slice(0, 2).map((p) => ({
      id: `loss-${p.product}`,
      tone: 'danger' as const,
      message: `${p.product} is loss-making`,
      href: null,
      tab: 'products' as const,
    })),
    hasRevenue && netProfitNumber < 0
      ? {
          id: 'negative-margin',
          tone: 'danger' as const,
          message: 'Net margin is negative',
          href: null,
          tab: 'profitability' as const,
        }
      : null,
  ].filter(Boolean) as {
    id: string
    tone: 'warning' | 'danger'
    message: string
    href: string | null
    tab: 'expenses' | 'inventory' | 'receivables' | 'products' | 'profitability'
  }[]

  return {
    range: {
      preset: dashboardRange.periodType,
      label: dashboardRange.displayLabel,
      from: dashboardRange.startDate ? toLocalDateInput(dashboardRange.startDate) : null,
      to: dashboardRange.endDate ? toLocalDateInput(dashboardRange.endDate) : null,
      year: dashboardRange.year,
      month: dashboardRange.month,
    },
    summary: {
      sales: salesRevenue,
      /** Operating expenses only: Selling + Overhead + Unclassified (excludes COGS). */
      expenses: profitability.operatingExpenses,
      operatingExpenses: profitability.operatingExpenses,
      productionCost: profitability.productionCost,
      sellingCost: profitability.sellingCost,
      overheadCost: profitability.overheadCost,
      unclassifiedCost: profitability.unclassifiedExpenses,
      grossProfit: grossProfitNumber,
      netProfit: netProfitNumber,
      grossMargin: hasRevenue ? profitability.grossMargin : null,
      netMargin: hasRevenue ? profitability.netMargin : null,
      customerReceivables: moneyNumber(receivables),
      receivablesCustomers: receivableRows.length,
      stockValue: moneyNumber(stockValue),
    },
    sales: {
      totalSales: salesRevenue,
      count: sales.length,
      averageSale: moneyNumber(sales.length ? revenue.div(sales.length) : 0),
      totalPaid: moneyNumber(totalPaidSales),
      byPaymentStatus: paymentStatusCounts,
      rows: sales.map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        date: sale.date.toISOString(),
        customer: sale.customer?.name ?? 'Walk-in customer',
        totalAmount: moneyNumber(sale.totalAmount),
        amountPaid: moneyNumber(sale.amountPaid),
        balancePending: moneyNumber(sale.balancePending),
        paymentStatus: sale.paymentStatus,
      })),
    },
    expenses: {
      /** Operating expenses (Selling + Overhead + Unclassified). */
      total: profitability.operatingExpenses,
      operatingTotal: profitability.operatingExpenses,
      recordedTotal: moneyNumber(allExpensesMoney),
      count: operatingExpenseRows.length,
      recordedCount: expenses.length,
      average: moneyNumber(
        operatingExpenseRows.length
          ? money(profitability.operatingExpenses).div(operatingExpenseRows.length)
          : 0,
      ),
      production,
      selling,
      overhead,
      unclassified,
      unclassifiedTotal: unclassified.total,
      needsClassificationCount: needsClassification.length,
      rows: expenses.map((expense) => ({
        id: expense.id,
        date: expense.date.toISOString(),
        category: expense.category.name,
        categoryName: expense.category.name,
        costType: expense.costType,
        description: expense.description,
        amount: moneyNumber(expense.amount),
        paymentMethod: expense.paymentMethod,
        vendor: expense.vendor,
        reference: expense.reference,
        notes: expense.notes,
        needsClassification: expenseNeedsClassification(expense.costType),
      })),
    },
    profit: {
      revenue: salesRevenue,
      /** Inventory COGS from sale-line unit cost snapshots (not PRODUCTION expenses). */
      productionCost: profitability.productionCost,
      grossProfit: grossProfitNumber,
      sellingCost: profitability.sellingCost,
      profitAfterSelling: profitability.profitAfterSellingCosts,
      overheadCost: profitability.overheadCost,
      /** Only expenses with a missing cost classification. */
      unclassifiedCost: profitability.unclassifiedExpenses,
      operatingExpenses: profitability.operatingExpenses,
      productionExpenses: profitability.productionExpenses,
      netProfit: netProfitNumber,
      grossMargin: hasRevenue ? profitability.grossMargin : null,
      netMargin: hasRevenue ? profitability.netMargin : null,
      inventoryCogs: moneyNumber(inventoryCogs),
      reconciliation: profitability.reconciliation,
      cogsBreakdown: profitability.cogsBreakdown,
      cogsReconciliation,
      productionExpenseAudit,
      expenseTransactions: {
        selling: expenses.filter((expense) => expense.costType === 'SELLING').map(mapExpenseTxn),
        overhead: expenses.filter((expense) => expense.costType === 'OVERHEAD').map(mapExpenseTxn),
        unclassified: expenses.filter((expense) => !expense.costType).map(mapExpenseTxn),
        operating: operatingExpenseRows.map(mapExpenseTxn),
        production: expenses
          .filter((expense) => expense.costType === 'PRODUCTION')
          .map(mapExpenseTxn),
      },
    },
    productPerformance: productRows,
    customerReceivables: receivableRows,
    receivablesSummary: {
      total: moneyNumber(receivables),
      customers: receivableRows.length,
      overdueAmount,
      oldestPendingSaleDate: receivableRows[0]?.oldestPendingSaleDate ?? null,
    },
    inventory: {
      isCurrent: true,
      stockValue: moneyNumber(stockValue),
      potentialSalesValue: moneyNumber(potentialSalesValue),
      potentialGrossProfit: moneyNumber(potentialGrossProfit),
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      rows: products.map((product) => {
        const stockCostValue = moneyNumber(money(product.costPrice).times(product.currentStock))
        const potentialSellingValue = moneyNumber(
          money(product.sellingPrice).times(product.currentStock),
        )
        return {
          id: product.id,
          product: product.name,
          currentStock: product.currentStock,
          costPrice: moneyNumber(product.costPrice),
          sellingPrice: moneyNumber(product.sellingPrice),
          stockCostValue,
          potentialSellingValue,
          potentialGrossProfit: moneyNumber(
            money(potentialSellingValue).minus(stockCostValue),
          ),
          isActive: product.isActive,
          stockStatus:
            product.currentStock <= 0
              ? ('Out of Stock' as const)
              : product.currentStock <= product.lowStockLevel
                ? ('Low Stock' as const)
                : ('In Stock' as const),
        }
      }),
    },
    alerts,
  }
}
