import type { PaymentStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getDateRange, prismaDateFilter, type DateFilterPreset } from '@/lib/dates'
import { addMoney, money, moneyNumber, percent, subMoney } from '@/lib/money'

const paymentStatuses: PaymentStatus[] = ['PAID', 'PARTIALLY_PAID', 'PENDING']

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
      select: { id: true, date: true, category: true, description: true, amount: true },
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
  const cogs = addMoney(...sales.map((sale) => sale.totalCost))
  const grossProfit = subMoney(revenue, cogs)
  const operatingExpenses = addMoney(...expenses.map((expense) => expense.amount))
  const netProfit = subMoney(grossProfit, operatingExpenses)
  const receivables = addMoney(...outstandingSales.map((sale) => sale.balancePending))
  const stockValue = addMoney(...products.map((product) => money(product.costPrice).times(product.currentStock)))

  const paymentStatusCounts = paymentStatuses.reduce(
    (counts, status) => {
      counts[status] = sales.filter((sale) => sale.paymentStatus === status).length
      return counts
    },
    {} as Record<PaymentStatus, number>,
  )

  const expenseCategories = new Map<string, ReturnType<typeof money>>()
  for (const expense of expenses) {
    expenseCategories.set(
      expense.category,
      money(expenseCategories.get(expense.category) ?? 0).plus(expense.amount),
    )
  }

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

  return {
    range,
    summary: {
      sales: moneyNumber(revenue),
      expenses: moneyNumber(operatingExpenses),
      grossProfit: moneyNumber(grossProfit),
      netProfit: moneyNumber(netProfit),
      customerReceivables: moneyNumber(receivables),
      stockValue: moneyNumber(stockValue),
    },
    sales: {
      totalSales: moneyNumber(revenue),
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
      total: moneyNumber(operatingExpenses),
      count: expenses.length,
      average: moneyNumber(expenses.length ? operatingExpenses.div(expenses.length) : 0),
      byCategory: [...expenseCategories.entries()]
        .map(([category, total]) => ({ category, total: moneyNumber(total) }))
        .sort((a, b) => b.total - a.total),
      rows: expenses.map((expense) => ({
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: moneyNumber(expense.amount),
      })),
    },
    profit: {
      revenue: moneyNumber(revenue),
      cogs: moneyNumber(cogs),
      grossProfit: moneyNumber(grossProfit),
      operatingExpenses: moneyNumber(operatingExpenses),
      netProfit: moneyNumber(netProfit),
      grossMargin: moneyNumber(percent(grossProfit, revenue)),
      netMargin: moneyNumber(percent(netProfit, revenue)),
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
      potentialSellingValue: moneyNumber(money(product.sellingPrice).times(product.currentStock)),
      stockStatus:
        product.currentStock <= 0
          ? 'Out of Stock'
          : product.currentStock <= product.lowStockLevel
            ? 'Low Stock'
            : 'In Stock',
    })),
  }
}
