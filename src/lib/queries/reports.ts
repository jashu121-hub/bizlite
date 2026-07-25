import type { ExpenseCategory, ExpenseCostType, PaymentStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getDateRange, prismaDateFilter, type DateFilterPreset } from '@/lib/dates'
import {
  expenseNeedsClassification,
  subcategoryLabel,
} from '@/lib/expense-cost'
import { expenseCategoryLabel } from '@/lib/labels'
import { addMoney, money, moneyNumber, percent, subMoney } from '@/lib/money'

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

export async function getReportsData(
  userId: string,
  preset: DateFilterPreset = 'month',
  customFrom?: string | null,
  customTo?: string | null,
) {
  const range = getDateRange(preset, customFrom, customTo)
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
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            lineTotal: true,
            lineCost: true,
            lineProfit: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      where: periodWhere,
      select: {
        id: true,
        date: true,
        category: true,
        costType: true,
        subcategory: true,
        description: true,
        amount: true,
        paymentMethod: true,
        vendor: true,
        reference: true,
        notes: true,
      },
      orderBy: { date: 'desc' },
    }),
    prisma.product.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        lowStockLevel: true,
        costPrice: true,
        sellingPrice: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.sale.findMany({
      where: { userId, balancePending: { gt: 0 }, customerId: { not: null } },
      select: {
        customerId: true,
        date: true,
        totalAmount: true,
        amountPaid: true,
        balancePending: true,
        customer: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
  ])

  const revenue = addMoney(...sales.map((sale) => sale.totalAmount))
  const inventoryCogs = addMoney(...sales.map((sale) => sale.totalCost))
  const totalExpensesMoney = addMoney(...expenses.map((expense) => expense.amount))

  const productionMoney = addMoney(
    ...expenses
      .filter((expense) => expense.costType === 'PRODUCTION')
      .map((expense) => expense.amount),
  )
  const sellingMoney = addMoney(
    ...expenses
      .filter((expense) => expense.costType === 'SELLING')
      .map((expense) => expense.amount),
  )
  const overheadMoney = addMoney(
    ...expenses
      .filter((expense) => expense.costType === 'OVERHEAD')
      .map((expense) => expense.amount),
  )
  const unclassifiedMoney = addMoney(
    ...expenses
      .filter((expense) => !expense.costType)
      .map((expense) => expense.amount),
  )

  // Profit waterfall uses expense cost classification (not inventory COGS)
  const grossProfit = subMoney(revenue, productionMoney)
  const profitAfterSelling = subMoney(grossProfit, sellingMoney)
  const netProfit = subMoney(profitAfterSelling, overheadMoney)

  const receivables = addMoney(
    ...outstandingSales.map((sale) => sale.balancePending),
  )
  const stockValue = addMoney(
    ...products.map((product) => money(product.costPrice).times(product.currentStock)),
  )

  const paymentStatusCounts = paymentStatuses.reduce(
    (counts, status) => {
      counts[status] = sales.filter((sale) => sale.paymentStatus === status).length
      return counts
    },
    {} as Record<PaymentStatus, number>,
  )

  function groupBreakdown(costType: ExpenseCostType) {
    const group = expenses.filter((expense) => expense.costType === costType)
    const groupTotal = addMoney(...group.map((expense) => expense.amount))
    const buckets = new Map<string, { key: string; label: string; amount: ReturnType<typeof money> }>()

    for (const expense of group) {
      const key =
        expense.category === 'TRANSPORT' && expense.subcategory
          ? expense.subcategory
          : expense.category
      const label =
        expense.category === 'TRANSPORT' && expense.subcategory
          ? subcategoryLabel(expense.subcategory)
          : expenseCategoryLabel(expense.category)
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

  const needsClassification = expenses.filter((expense) =>
    expenseNeedsClassification(
      expense.category as ExpenseCategory,
      expense.costType,
      expense.subcategory,
    ),
  )

  const productPerformance = new Map<
    string,
    {
      product: string
      quantitySold: number
      salesAmount: ReturnType<typeof money>
      cost: ReturnType<typeof money>
      grossProfit: ReturnType<typeof money>
    }
  >()
  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId ?? item.productName
      const row = productPerformance.get(key) ?? {
        product: item.productName,
        quantitySold: 0,
        salesAmount: money(0),
        cost: money(0),
        grossProfit: money(0),
      }
      row.quantitySold += item.quantity
      row.salesAmount = row.salesAmount.plus(item.lineTotal)
      row.cost = row.cost.plus(item.lineCost)
      row.grossProfit = row.grossProfit.plus(item.lineProfit)
      productPerformance.set(key, row)
    }
  }

  const customerReceivables = new Map<
    string,
    {
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
      customer: sale.customer.name,
      totalSales: money(0),
      totalPaid: money(0),
      outstanding: money(0),
      oldestPendingSaleDate: sale.date,
    }
    row.totalSales = row.totalSales.plus(sale.totalAmount)
    row.totalPaid = row.totalPaid.plus(sale.amountPaid)
    row.outstanding = row.outstanding.plus(sale.balancePending)
    customerReceivables.set(sale.customerId, row)
  }

  const salesRevenue = moneyNumber(revenue)
  const hasRevenue = money(revenue).gt(0)

  return {
    range,
    summary: {
      sales: salesRevenue,
      expenses: moneyNumber(totalExpensesMoney),
      productionCost: production.total,
      sellingCost: selling.total,
      overheadCost: overhead.total,
      grossProfit: moneyNumber(grossProfit),
      netProfit: moneyNumber(netProfit),
      customerReceivables: moneyNumber(receivables),
      stockValue: moneyNumber(stockValue),
    },
    sales: {
      totalSales: salesRevenue,
      count: sales.length,
      averageSale: moneyNumber(sales.length ? revenue.div(sales.length) : 0),
      byPaymentStatus: paymentStatusCounts,
      rows: sales.map((sale) => ({
        invoiceNumber: sale.invoiceNumber,
        date: sale.date,
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
      unclassifiedTotal: moneyNumber(unclassifiedMoney),
      needsClassificationCount: needsClassification.length,
      byCategory: (() => {
        const map = new Map<string, ReturnType<typeof money>>()
        for (const expense of expenses) {
          map.set(
            expense.category,
            money(map.get(expense.category) ?? 0).plus(expense.amount),
          )
        }
        return [...map.entries()]
          .map(([category, total]) => ({ category, total: moneyNumber(total) }))
          .sort((a, b) => b.total - a.total)
      })(),
      rows: expenses.map((expense) => ({
        date: expense.date,
        category: expense.category,
        costType: expense.costType,
        subcategory: expense.subcategory,
        description: expense.description,
        amount: moneyNumber(expense.amount),
        paymentMethod: expense.paymentMethod,
        vendor: expense.vendor,
        reference: expense.reference,
        notes: expense.notes,
        needsClassification: expenseNeedsClassification(
          expense.category as ExpenseCategory,
          expense.costType,
          expense.subcategory,
        ),
      })),
    },
    profit: {
      revenue: salesRevenue,
      productionCost: production.total,
      grossProfit: moneyNumber(grossProfit),
      sellingCost: selling.total,
      profitAfterSelling: moneyNumber(profitAfterSelling),
      overheadCost: overhead.total,
      netProfit: moneyNumber(netProfit),
      grossMargin: hasRevenue ? moneyNumber(percent(grossProfit, revenue)) : null,
      netMargin: hasRevenue ? moneyNumber(percent(netProfit, revenue)) : null,
      inventoryCogs: moneyNumber(inventoryCogs),
    },
    productPerformance: [...productPerformance.values()]
      .map((row) => ({
        product: row.product,
        quantitySold: row.quantitySold,
        salesAmount: moneyNumber(row.salesAmount),
        cost: moneyNumber(row.cost),
        grossProfit: moneyNumber(row.grossProfit),
        margin: moneyNumber(percent(row.grossProfit, row.salesAmount)),
      }))
      .sort((a, b) => b.salesAmount - a.salesAmount),
    customerReceivables: [...customerReceivables.values()]
      .map((row) => ({
        customer: row.customer,
        totalSales: moneyNumber(row.totalSales),
        totalPaid: moneyNumber(row.totalPaid),
        outstanding: moneyNumber(row.outstanding),
        oldestPendingSaleDate: row.oldestPendingSaleDate,
      }))
      .sort((a, b) => b.outstanding - a.outstanding),
    inventory: products.map((product) => ({
      product: product.name,
      currentStock: product.currentStock,
      costPrice: moneyNumber(product.costPrice),
      sellingPrice: moneyNumber(product.sellingPrice),
      stockCostValue: moneyNumber(money(product.costPrice).times(product.currentStock)),
      potentialSellingValue: moneyNumber(
        money(product.sellingPrice).times(product.currentStock),
      ),
      stockStatus:
        product.currentStock <= 0
          ? 'Out of Stock'
          : product.currentStock <= product.lowStockLevel
            ? 'Low Stock'
            : 'In Stock',
    })),
  }
}
