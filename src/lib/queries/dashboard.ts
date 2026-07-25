import { startOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getDateRange, prismaDateFilter, type DateFilterPreset } from '@/lib/dates'
import { addMoney, money, moneyNumber, subMoney } from '@/lib/money'

export async function getDashboardData(
  userId: string,
  preset: DateFilterPreset = 'month',
  customFrom?: string | null,
  customTo?: string | null,
) {
  const range = getDateRange(preset, customFrom, customTo)
  const dateFilter = prismaDateFilter(range)
  const todayStart = startOfDay(new Date())
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())

  const [
    todaySales,
    monthSales,
    monthExpenses,
    periodSales,
    periodExpenses,
    products,
    recentSales,
    recentExpenses,
    pendingSales,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { userId, date: { gte: todayStart } },
      select: { totalAmount: true, totalCost: true },
    }),
    prisma.sale.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      select: { totalAmount: true, totalCost: true },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true },
    }),
    prisma.sale.findMany({
      where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
      select: {
        id: true,
        date: true,
        totalAmount: true,
        totalCost: true,
        grossProfit: true,
        amountPaid: true,
        balancePending: true,
        invoiceNumber: true,
        paymentStatus: true,
        customer: { select: { name: true } },
        items: { select: { productName: true, quantity: true, lineTotal: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
      select: { id: true, date: true, amount: true, category: true, description: true },
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
    }),
    prisma.sale.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.sale.findMany({
      where: { userId, balancePending: { gt: 0 }, customerId: { not: null } },
      include: { customer: true },
      orderBy: { date: 'asc' },
      take: 8,
    }),
  ])

  const todaySalesTotal = addMoney(...todaySales.map((s) => s.totalAmount))
  const monthSalesTotal = addMoney(...monthSales.map((s) => s.totalAmount))
  const monthCogs = addMoney(...monthSales.map((s) => s.totalCost))
  const monthExpensesTotal = addMoney(...monthExpenses.map((e) => e.amount))
  const monthGross = subMoney(monthSalesTotal, monthCogs)
  const monthNet = subMoney(monthGross, monthExpensesTotal)

  const periodRevenue = addMoney(...periodSales.map((s) => s.totalAmount))
  const periodCogs = addMoney(...periodSales.map((s) => s.totalCost))
  const periodGross = subMoney(periodRevenue, periodCogs)
  const periodExpenseTotal = addMoney(...periodExpenses.map((e) => e.amount))
  const periodNet = subMoney(periodGross, periodExpenseTotal)
  const pendingPayments = addMoney(...pendingSales.map((s) => s.balancePending))
  const stockValue = addMoney(...products.map((p) => money(p.costPrice).times(p.currentStock)))
  const lowStock = products.filter((p) => p.currentStock <= p.lowStockLevel)

  const productSalesMap = new Map<string, number>()
  for (const sale of periodSales) {
    for (const item of sale.items) {
      productSalesMap.set(
        item.productName,
        moneyNumber(money(productSalesMap.get(item.productName) || 0).plus(item.lineTotal)),
      )
    }
  }

  const expenseByCategory = new Map<string, number>()
  for (const exp of periodExpenses) {
    expenseByCategory.set(
      exp.category,
      moneyNumber(money(expenseByCategory.get(exp.category) || 0).plus(exp.amount)),
    )
  }

  const monthlyNet = buildMonthlyNet(periodSales, periodExpenses)

  return {
    range,
    cards: {
      todaySales: moneyNumber(todaySalesTotal),
      monthSales: moneyNumber(monthSalesTotal),
      monthExpenses: moneyNumber(monthExpensesTotal),
      grossProfit: moneyNumber(monthGross),
      netProfit: moneyNumber(monthNet),
      pendingPayments: moneyNumber(pendingPayments),
      stockValue: moneyNumber(stockValue),
      lowStockCount: lowStock.length,
      periodRevenue: moneyNumber(periodRevenue),
      periodExpenses: moneyNumber(periodExpenseTotal),
      periodGross: moneyNumber(periodGross),
      periodNet: moneyNumber(periodNet),
    },
    recentSales,
    recentExpenses,
    lowStock,
    pendingCustomers: pendingSales,
    charts: {
      salesVsExpenses: [
        { name: 'Sales', value: moneyNumber(periodRevenue) },
        { name: 'Expenses', value: moneyNumber(periodExpenseTotal) },
      ],
      monthlyNet,
      salesByProduct: [...productSalesMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      expensesByCategory: [...expenseByCategory.entries()].map(([name, value]) => ({
        name,
        value,
      })),
    },
  }
}

function buildMonthlyNet(
  sales: { date: Date; totalAmount: unknown; totalCost: unknown }[],
  expenses: { date: Date; amount: unknown }[],
) {
  const map = new Map<string, { sales: ReturnType<typeof money>; cogs: ReturnType<typeof money>; expenses: ReturnType<typeof money> }>()
  for (const s of sales) {
    const key = `${s.date.getUTCFullYear()}-${String(s.date.getUTCMonth() + 1).padStart(2, '0')}`
    const row = map.get(key) || { sales: money(0), cogs: money(0), expenses: money(0) }
    row.sales = row.sales.plus(money(s.totalAmount as never))
    row.cogs = row.cogs.plus(money(s.totalCost as never))
    map.set(key, row)
  }
  for (const e of expenses) {
    const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`
    const row = map.get(key) || { sales: money(0), cogs: money(0), expenses: money(0) }
    row.expenses = row.expenses.plus(money(e.amount as never))
    map.set(key, row)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, row]) => ({
      name,
      value: moneyNumber(subMoney(subMoney(row.sales, row.cogs), row.expenses)),
    }))
}
