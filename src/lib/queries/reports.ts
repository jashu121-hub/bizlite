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
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.product.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        currentStock: true,
        lowStockLevel: true,
        costPrice: true,
        sellingPrice: true,
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
  const totalExpensesMoney = addMoney(...expenses.map((expense) => expense.amount))

  const productNameById = new Map(products.map((product) => [product.id, product.name]))
  const profitability = calculateSalesProfitability(
    sales.map((sale) => ({
      id: sale.id,
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
      amount: expense.amount,
      costType: expense.costType,
    })),
    { productNames: productNameById },
  )

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

    return {
      total: moneyNumber(groupTotal),
      percentOfTotal: moneyNumber(percent(groupTotal, totalExpensesMoney)),
      breakdown: buildBreakdown([...buckets.values()], groupTotal, totalExpensesMoney),
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
      expenses: moneyNumber(totalExpensesMoney),
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
      total: moneyNumber(totalExpensesMoney),
      count: expenses.length,
      average: moneyNumber(expenses.length ? totalExpensesMoney.div(expenses.length) : 0),
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
      /** Null-type + PRODUCTION-typed expenses (operating costs outside inventory COGS). */
      unclassifiedCost: profitability.unclassifiedExpenses,
      netProfit: netProfitNumber,
      grossMargin: hasRevenue ? profitability.grossMargin : null,
      netMargin: hasRevenue ? profitability.netMargin : null,
      inventoryCogs: moneyNumber(inventoryCogs),
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
