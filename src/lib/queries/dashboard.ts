import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns'
import { prisma } from '@/lib/prisma'
import { prismaDateFilter } from '@/lib/dates'
import {
  chartGroupingForRange,
  comparePeriodValues,
  getDashboardDateRange,
  toDashboardDateRangeCompat,
  toLocalDateInput,
  type DashboardDateParams,
} from '@/lib/dashboard-date-range'
import { addMoney, money, moneyNumber, subMoney } from '@/lib/money'
import { buildKpiSummaries } from '@/lib/queries/kpi-summaries'

async function sumSales(
  userId: string,
  from: Date | null,
  to: Date | null,
): Promise<{ total: number; cost: number; paid: number; pending: number; count: number }> {
  const date =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined
  const where = { userId, ...(date ? { date } : {}) }
  const [agg, count] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: { totalAmount: true, totalCost: true, amountPaid: true, balancePending: true },
    }),
    prisma.sale.count({ where }),
  ])
  return {
    total: moneyNumber(agg._sum.totalAmount || 0),
    cost: moneyNumber(agg._sum.totalCost || 0),
    paid: moneyNumber(agg._sum.amountPaid || 0),
    pending: moneyNumber(agg._sum.balancePending || 0),
    count,
  }
}

async function sumExpenses(userId: string, from: Date | null, to: Date | null): Promise<number> {
  const date =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined
  const agg = await prisma.expense.aggregate({
    where: { userId, ...(date ? { date } : {}) },
    _sum: { amount: true },
  })
  return moneyNumber(agg._sum.amount || 0)
}

const saleSummarySelect = {
  id: true,
  date: true,
  totalAmount: true,
  amountPaid: true,
  balancePending: true,
  invoiceNumber: true,
  paymentStatus: true,
  customer: { select: { name: true } },
} as const

function bucketKey(date: Date, grouping: 'day' | 'month' | 'year') {
  if (grouping === 'year') return format(date, 'yyyy')
  if (grouping === 'month') return format(date, 'yyyy-MM')
  return format(date, 'yyyy-MM-dd')
}

function bucketLabel(date: Date, grouping: 'day' | 'month' | 'year') {
  if (grouping === 'year') return format(date, 'yyyy')
  if (grouping === 'month') return format(date, 'MMM yyyy')
  return format(date, 'd MMM')
}

export async function getDashboardData(userId: string, params: DashboardDateParams = {}) {
  const dashboardRange = getDashboardDateRange(params)
  const range = toDashboardDateRangeCompat(dashboardRange)
  const dateFilter = prismaDateFilter(range)
  const grouping = chartGroupingForRange(dashboardRange)

  const todayStart = startOfDay(new Date())
  const yesterdayStart = startOfDay(subDays(new Date(), 1))
  const yesterdayEnd = endOfDay(subDays(new Date(), 1))
  const isCurrentMonthView =
    dashboardRange.periodType === 'month' && !dashboardRange.showStockAsCurrent

  // Resolve lifetime start from earliest transaction when needed for charts
  let effectiveStart = dashboardRange.startDate
  let effectiveEnd = dashboardRange.endDate ?? endOfDay(new Date())
  if (dashboardRange.periodType === 'lifetime') {
    const [earliestSale, earliestExpense] = await Promise.all([
      prisma.sale.findFirst({
        where: { userId },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
      prisma.expense.findFirst({
        where: { userId },
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
    ])
    const candidates = [earliestSale?.date, earliestExpense?.date].filter(Boolean) as Date[]
    effectiveStart = candidates.length
      ? startOfDay(new Date(Math.min(...candidates.map((d) => d.getTime()))))
      : startOfDay(new Date())
    effectiveEnd = endOfDay(new Date())
  }

  const pendingWhere = {
    userId,
    balancePending: { gt: 0 },
    customerId: { not: null },
    ...(dateFilter ? { date: dateFilter } : {}),
  } as const

  const emptySalesAgg = { total: 0, cost: 0, paid: 0, pending: 0, count: 0 }
  const [
    periodSalesAgg,
    periodExpenseTotal,
    prevSales,
    prevExpenseTotal,
    todaySales,
    yesterdaySales,
    periodSales,
    periodExpenses,
    products,
    pendingAgg,
    pendingSalesAll,
    todaySalesRowsRaw,
  ] = await Promise.all([
    sumSales(userId, dashboardRange.startDate, dashboardRange.endDate),
    sumExpenses(userId, dashboardRange.startDate, dashboardRange.endDate),
    dashboardRange.previousStartDate && dashboardRange.previousEndDate
      ? sumSales(userId, dashboardRange.previousStartDate, dashboardRange.previousEndDate)
      : Promise.resolve(emptySalesAgg),
    dashboardRange.previousStartDate && dashboardRange.previousEndDate
      ? sumExpenses(userId, dashboardRange.previousStartDate, dashboardRange.previousEndDate)
      : Promise.resolve(0),
    isCurrentMonthView
      ? sumSales(userId, todayStart, endOfDay(new Date()))
      : Promise.resolve(null),
    isCurrentMonthView
      ? sumSales(userId, yesterdayStart, yesterdayEnd)
      : Promise.resolve(emptySalesAgg),
    prisma.sale.findMany({
      where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
      select: {
        id: true,
        date: true,
        totalAmount: true,
        totalCost: true,
        amountPaid: true,
        balancePending: true,
        invoiceNumber: true,
        paymentStatus: true,
        customer: { select: { name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.expense.findMany({
      where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
      select: {
        id: true,
        date: true,
        amount: true,
        category: { select: { name: true } },
        description: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.product.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        currentStock: true,
        lowStockLevel: true,
        costPrice: true,
      },
    }),
    prisma.sale.aggregate({
      where: pendingWhere,
      _sum: { balancePending: true },
    }),
    prisma.sale.findMany({
      where: pendingWhere,
      select: saleSummarySelect,
      orderBy: { date: 'asc' },
    }),
    isCurrentMonthView
      ? prisma.sale.findMany({
          where: { userId, date: { gte: todayStart, lte: endOfDay(new Date()) } },
          select: saleSummarySelect,
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve(null),
  ])

  // Derive list widgets from period rows — avoids duplicate DB round-trips
  const recentSales = periodSales.slice(0, 5)
  const recentExpenses = periodExpenses.slice(0, 5)

  const resolvedTodaySales = todaySales ?? periodSalesAgg
  const todaySalesRows = todaySalesRowsRaw
    ?? periodSales.map((s) => ({
        id: s.id,
        date: s.date,
        totalAmount: s.totalAmount,
        amountPaid: s.amountPaid,
        balancePending: s.balancePending,
        invoiceNumber: s.invoiceNumber,
        paymentStatus: s.paymentStatus,
        customer: s.customer,
      }))

  const periodRevenue = periodSalesAgg.total
  // Inventory gross (sales − product COGS) — used for product economics, not KPI net profit
  const periodGross = moneyNumber(subMoney(periodSalesAgg.total, periodSalesAgg.cost))
  // Accounting net profit matches Reports: Sales − Total Expenses
  const periodNet = moneyNumber(subMoney(periodRevenue, periodExpenseTotal))
  const prevNet = moneyNumber(subMoney(prevSales.total, prevExpenseTotal))

  const pendingPayments = moneyNumber(pendingAgg._sum.balancePending || 0)
  const stockValue = moneyNumber(
    addMoney(...products.map((p) => money(p.costPrice).times(p.currentStock))),
  )
  const lowStock = products.filter((p) => p.currentStock <= p.lowStockLevel)

  const expenseByCategory = new Map<string, number>()
  for (const exp of periodExpenses) {
    const label = exp.category.name
    expenseByCategory.set(
      label,
      moneyNumber(money(expenseByCategory.get(label) || 0).plus(exp.amount)),
    )
  }

  const chartStart = startOfDay(effectiveStart ?? todayStart)
  const chartEnd = startOfDay(effectiveEnd > new Date() ? new Date() : effectiveEnd)
  const intervals =
    grouping === 'year'
      ? eachYearOfInterval({ start: startOfYear(chartStart), end: chartEnd })
      : grouping === 'month'
        ? eachMonthOfInterval({ start: startOfMonth(chartStart), end: chartEnd })
        : eachDayOfInterval({ start: chartStart, end: chartEnd })

  const profitTrend = intervals.map((point) => {
    const key = bucketKey(point, grouping)
    const daySales = periodSales.filter((s) => bucketKey(s.date, grouping) === key)
    const dayExpenses = periodExpenses.filter((e) => bucketKey(e.date, grouping) === key)
    const sales = addMoney(...daySales.map((s) => s.totalAmount))
    const expenses = addMoney(...dayExpenses.map((e) => e.amount))
    return {
      name: bucketLabel(point, grouping),
      value: moneyNumber(subMoney(sales, expenses)),
      sales: moneyNumber(sales),
      expenses: moneyNumber(expenses),
    }
  })

  const lifetime = dashboardRange.periodType === 'lifetime'
  const todayComparison = isCurrentMonthView
    ? comparePeriodValues(resolvedTodaySales.total, yesterdaySales.total)
    : comparePeriodValues(periodRevenue, lifetime ? null : prevSales.total, { lifetime })
  const salesComparison = comparePeriodValues(periodRevenue, lifetime ? null : prevSales.total, {
    lifetime,
  })
  const expensesComparison = comparePeriodValues(
    periodExpenseTotal,
    lifetime ? null : prevExpenseTotal,
    { lifetime, invertFavourable: true },
  )
  const netComparison = comparePeriodValues(periodNet, lifetime ? null : prevNet, { lifetime })

  const firstCardValue = isCurrentMonthView ? resolvedTodaySales.total : periodSalesAgg.paid
  const firstCardLabel = isCurrentMonthView ? "Today's Sales" : 'Paid Amount'

  const cards = {
    todaySales: firstCardValue,
    monthSales: periodRevenue,
    monthExpenses: periodExpenseTotal,
    grossProfit: periodGross,
    netProfit: periodNet,
    pendingPayments,
    stockValue,
    lowStockCount: lowStock.length,
    periodRevenue,
    periodExpenses: periodExpenseTotal,
    periodGross,
    periodNet,
    periodPaid: periodSalesAgg.paid,
    periodPending: periodSalesAgg.pending,
    periodInvoiceCount: periodSalesAgg.count,
    labels: {
      firstCard: firstCardLabel,
      sales: dashboardRange.salesLabel,
      expenses: dashboardRange.expensesLabel,
      period: dashboardRange.displayLabel,
    },
    trends: {
      todaySales: todayComparison,
      monthSales: salesComparison,
      monthExpenses: expensesComparison,
      netProfit: netComparison,
    },
    showStockAsCurrent: dashboardRange.showStockAsCurrent,
  }

  const kpiSummaries = buildKpiSummaries({
    todaySalesRows,
    periodSalesRows: periodSales,
    periodExpenseRows: periodExpenses,
    pendingSalesAll,
    products,
    cards: {
      todaySales: firstCardValue,
      monthSales: periodRevenue,
      monthExpenses: periodExpenseTotal,
      netProfit: periodNet,
      pendingPayments,
      stockValue,
      lowStockCount: lowStock.length,
      periodPaid: periodSalesAgg.paid,
      periodPending: periodSalesAgg.pending,
      periodInvoiceCount: periodSalesAgg.count,
      trends: {
        todaySales: todayComparison,
        monthSales: salesComparison,
        monthExpenses: expensesComparison,
        netProfit: netComparison,
      },
    },
    periodSalesTotal: periodRevenue,
    prevPeriodSalesTotal: prevSales.total,
    prevPeriodExpensesTotal: prevExpenseTotal,
    prevPeriodNet: prevNet,
    periodLabel: dashboardRange.displayLabel,
    firstCardTitle: firstCardLabel,
    firstCardRangeLabel: isCurrentMonthView
      ? format(new Date(), 'dd MMM yyyy')
      : dashboardRange.displayLabel,
    salesTitle: dashboardRange.salesLabel,
    expensesTitle: dashboardRange.expensesLabel,
    isTodayFirstCard: isCurrentMonthView,
    periodType: dashboardRange.periodType,
    customFrom: dashboardRange.customFrom,
    customTo: dashboardRange.customTo,
    year: dashboardRange.year,
    month: dashboardRange.month,
  })

  return {
    range: {
      ...range,
      label: dashboardRange.displayLabel,
      year: dashboardRange.year,
      month: dashboardRange.month,
      from: dashboardRange.startDate
        ? toLocalDateInput(dashboardRange.startDate)
        : null,
      to: dashboardRange.endDate ? toLocalDateInput(dashboardRange.endDate) : null,
      periodType: dashboardRange.periodType,
      displayLabel: dashboardRange.displayLabel,
    },
    cards,
    kpiSummaries,
    recentSales,
    recentExpenses,
    lowStock,
    pendingCustomers: pendingSalesAll.slice(0, 8),
    charts: {
      salesVsExpenses: [
        { name: 'Sales', value: periodRevenue },
        { name: 'Expenses', value: periodExpenseTotal },
      ],
      dailyNet: profitTrend,
      profitTrendGrouping: grouping,
      expensesByCategory: [...expenseByCategory.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    },
  }
}
