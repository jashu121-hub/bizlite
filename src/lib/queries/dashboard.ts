import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getDateRange, prismaDateFilter, type DateFilterPreset } from '@/lib/dates'
import { addMoney, money, moneyNumber, subMoney } from '@/lib/money'
import { expenseCategoryLabel } from '@/lib/labels'

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

async function sumSales(
  userId: string,
  from: Date,
  to?: Date,
): Promise<{ total: number; cost: number }> {
  const agg = await prisma.sale.aggregate({
    where: {
      userId,
      date: to ? { gte: from, lte: to } : { gte: from },
    },
    _sum: { totalAmount: true, totalCost: true },
  })
  return {
    total: moneyNumber(agg._sum.totalAmount || 0),
    cost: moneyNumber(agg._sum.totalCost || 0),
  }
}

async function sumExpenses(userId: string, from: Date, to?: Date): Promise<number> {
  const agg = await prisma.expense.aggregate({
    where: {
      userId,
      date: to ? { gte: from, lte: to } : { gte: from },
    },
    _sum: { amount: true },
  })
  return moneyNumber(agg._sum.amount || 0)
}

export async function getDashboardData(
  userId: string,
  preset: DateFilterPreset = 'month',
  customFrom?: string | null,
  customTo?: string | null,
) {
  const range = getDateRange(preset, customFrom, customTo)
  const dateFilter = prismaDateFilter(range)
  const todayStart = startOfDay(new Date())
  const yesterdayStart = startOfDay(subDays(new Date(), 1))
  const yesterdayEnd = endOfDay(subDays(new Date(), 1))
  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())
  const prevMonthStart = startOfMonth(subMonths(new Date(), 1))
  const prevMonthEnd = endOfMonth(subMonths(new Date(), 1))

  // Fully sequential to avoid exhausting serverless DB pools
  const todaySales = await sumSales(userId, todayStart)
  const yesterdaySales = await sumSales(userId, yesterdayStart, yesterdayEnd)
  const monthSales = await sumSales(userId, monthStart, monthEnd)
  const monthExpensesTotal = await sumExpenses(userId, monthStart, monthEnd)
  const prevMonthSales = await sumSales(userId, prevMonthStart, prevMonthEnd)
  const prevMonthExpensesTotal = await sumExpenses(userId, prevMonthStart, prevMonthEnd)

  const periodSales = await prisma.sale.findMany({
    where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
    select: {
      id: true,
      date: true,
      totalAmount: true,
      totalCost: true,
      balancePending: true,
      invoiceNumber: true,
      paymentStatus: true,
      customer: { select: { name: true } },
      items: { select: { productName: true, lineTotal: true } },
    },
    orderBy: { date: 'desc' },
  })
  const periodExpenses = await prisma.expense.findMany({
    where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
    select: { id: true, date: true, amount: true, category: true, description: true },
    orderBy: { date: 'desc' },
  })
  const products = await prisma.product.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      currentStock: true,
      lowStockLevel: true,
      costPrice: true,
    },
  })
  const recentSales = await prisma.sale.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { customer: { select: { name: true } } },
  })
  const recentExpenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })
  const pendingSales = await prisma.sale.findMany({
    where: { userId, balancePending: { gt: 0 }, customerId: { not: null } },
    include: { customer: true },
    orderBy: { date: 'asc' },
    take: 8,
  })

  const todaySalesTotal = todaySales.total
  const yesterdaySalesTotal = yesterdaySales.total
  const monthSalesTotal = monthSales.total
  const monthGross = moneyNumber(subMoney(monthSales.total, monthSales.cost))
  const monthNet = moneyNumber(subMoney(monthGross, monthExpensesTotal))

  const prevMonthGross = moneyNumber(subMoney(prevMonthSales.total, prevMonthSales.cost))
  const prevMonthNet = moneyNumber(subMoney(prevMonthGross, prevMonthExpensesTotal))

  const periodRevenue = moneyNumber(addMoney(...periodSales.map((s) => s.totalAmount)))
  const periodCogs = addMoney(...periodSales.map((s) => s.totalCost))
  const periodGross = moneyNumber(subMoney(periodRevenue, periodCogs))
  const periodExpenseTotal = moneyNumber(addMoney(...periodExpenses.map((e) => e.amount)))
  const periodNet = moneyNumber(subMoney(periodGross, periodExpenseTotal))
  const pendingPayments = moneyNumber(addMoney(...pendingSales.map((s) => s.balancePending)))
  const stockValue = moneyNumber(
    addMoney(...products.map((p) => money(p.costPrice).times(p.currentStock))),
  )
  const lowStock = products.filter((p) => p.currentStock <= p.lowStockLevel)

  const expenseByCategory = new Map<string, number>()
  for (const exp of periodExpenses) {
    const label = expenseCategoryLabel(exp.category)
    expenseByCategory.set(
      label,
      moneyNumber(money(expenseByCategory.get(label) || 0).plus(exp.amount)),
    )
  }

  const chartStart = range.from ?? monthStart
  const chartEnd = range.to ?? new Date()
  const days = eachDayOfInterval({
    start: startOfDay(chartStart),
    end: startOfDay(chartEnd > new Date() ? new Date() : chartEnd),
  }).slice(-31)

  const dailyNet = days.map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    const daySales = periodSales.filter((s) => format(s.date, 'yyyy-MM-dd') === key)
    const dayExpenses = periodExpenses.filter((e) => format(e.date, 'yyyy-MM-dd') === key)
    const sales = addMoney(...daySales.map((s) => s.totalAmount))
    const cogs = addMoney(...daySales.map((s) => s.totalCost))
    const expenses = addMoney(...dayExpenses.map((e) => e.amount))
    return {
      name: format(day, 'd MMM'),
      value: moneyNumber(subMoney(subMoney(sales, cogs), expenses)),
      sales: moneyNumber(sales),
      expenses: moneyNumber(expenses),
    }
  })

  return {
    range,
    cards: {
      todaySales: todaySalesTotal,
      monthSales: monthSalesTotal,
      monthExpenses: monthExpensesTotal,
      grossProfit: monthGross,
      netProfit: monthNet,
      pendingPayments,
      stockValue,
      lowStockCount: lowStock.length,
      periodRevenue,
      periodExpenses: periodExpenseTotal,
      periodGross,
      periodNet,
      trends: {
        todaySales: pctChange(todaySalesTotal, yesterdaySalesTotal),
        monthSales: pctChange(monthSalesTotal, prevMonthSales.total),
        monthExpenses: pctChange(monthExpensesTotal, prevMonthExpensesTotal),
        netProfit: pctChange(monthNet, prevMonthNet),
      },
    },
    recentSales,
    recentExpenses,
    lowStock,
    pendingCustomers: pendingSales,
    charts: {
      salesVsExpenses: [
        { name: 'Sales', value: periodRevenue },
        { name: 'Expenses', value: periodExpenseTotal },
      ],
      dailyNet,
      expensesByCategory: [...expenseByCategory.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    },
  }
}
