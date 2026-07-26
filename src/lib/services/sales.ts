import type { PaymentMethod, Prisma, Product } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  addMoney,
  determinePaymentStatus,
  money,
  mulMoney,
  prismaDecimal,
  subMoney,
} from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import { applyStockIssue, applyStockReceipt, tracksInventory } from '@/lib/services/inventory'
import type { SaleInput } from '@/lib/validations/sale'

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const

async function nextInvoiceNumber(userId: string, tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const latest = await tx.sale.findFirst({
    where: { userId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  const next = latest ? Number(latest.invoiceNumber.split('-').pop()) + 1 : 1
  return `${prefix}${String(next).padStart(5, '0')}`
}

async function getAllowNegativeStock(userId: string, tx: Prisma.TransactionClient) {
  const profile = await tx.userProfile.findUnique({
    where: { id: userId },
    select: { allowNegativeStock: true },
  })
  return Boolean(profile?.allowNegativeStock)
}

async function buildSaleLines(
  userId: string,
  items: SaleInput['items'],
  tx: Prisma.TransactionClient,
  options?: {
    stockMap?: Map<string, number>
    productMap?: Map<string, Product>
    /** Preserve sale-time unit cost snapshots when editing an existing sale. */
    priorUnitCostByProductId?: Map<string, ReturnType<typeof money>>
    allowNegative?: boolean
  },
) {
  const stockMap = options?.stockMap
  const productMap = options?.productMap
  const priorUnitCostByProductId = options?.priorUnitCostByProductId
  const allowNegative = Boolean(options?.allowNegative)
  const lines = []

  for (const item of items) {
    let product = productMap?.get(item.productId) ?? null
    if (!product) {
      product = await tx.product.findFirst({
        where: { id: item.productId, userId, isActive: true },
      })
    }
    if (!product) throw new Error('One or more products were not found')

    const inventoryTracked = tracksInventory(product.productType)
    const available = stockMap?.get(product.id) ?? product.currentStock
    if (inventoryTracked && item.quantity > available && !allowNegative) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${available}`)
    }
    if (item.quantity < 0) throw new Error('Quantity cannot be negative')

    const unitPrice = money(item.unitSellingPrice)
    if (unitPrice.isNeg()) throw new Error('Selling price cannot be negative')

    // Historical protection: keep the original sale-line cost when editing.
    // New products on the sale snapshot the current catalog / inventory cost.
    const priorCost = priorUnitCostByProductId?.get(product.id)
    const unitCost = priorCost ?? money(product.costPrice)
    const lineTotal = mulMoney(unitPrice, item.quantity)
    const lineCost = mulMoney(unitCost, item.quantity)
    const lineProfit = subMoney(lineTotal, lineCost)
    lines.push({
      product,
      quantity: item.quantity,
      unitSellingPrice: unitPrice,
      unitCost,
      lineTotal,
      lineCost,
      lineProfit,
      inventoryTracked,
    })
    if (stockMap && inventoryTracked) {
      stockMap.set(product.id, available - item.quantity)
    }
  }

  return lines
}

function totalsFromLines(lines: Awaited<ReturnType<typeof buildSaleLines>>, discountInput: string) {
  const subtotal = addMoney(...lines.map((l) => l.lineTotal))
  const discount = money(discountInput)
  if (discount.gt(subtotal)) throw new Error('Discount cannot exceed subtotal')
  const totalAmount = subMoney(subtotal, discount)
  const totalCost = addMoney(...lines.map((l) => l.lineCost))
  const grossProfit = subMoney(totalAmount, totalCost)
  return { subtotal, discount, totalAmount, totalCost, grossProfit }
}

async function postSaleStockIssues(
  tx: Prisma.TransactionClient,
  userId: string,
  saleId: string,
  invoiceNumber: string,
  date: Date,
  lines: Awaited<ReturnType<typeof buildSaleLines>>,
  allowNegative: boolean,
) {
  for (const line of lines) {
    if (!line.inventoryTracked) continue
    await applyStockIssue(tx, {
      userId,
      productId: line.product.id,
      quantity: line.quantity,
      unitCost: line.unitCost,
      type: 'SALE',
      date,
      notes: `Sale ${invoiceNumber}`,
      saleId,
      allowNegative,
    })
  }
}

async function reverseSaleStock(
  tx: Prisma.TransactionClient,
  userId: string,
  saleId: string,
  invoiceNumber: string,
  date: Date,
  items: Array<{ productId: string | null; quantity: number; unitCost: Prisma.Decimal | ReturnType<typeof money> }>,
  notePrefix: string,
) {
  for (const item of items) {
    if (!item.productId) continue
    const product = await tx.product.findFirst({
      where: { id: item.productId, userId },
      select: { productType: true },
    })
    if (!product || !tracksInventory(product.productType)) continue
    await applyStockReceipt(tx, {
      userId,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      type: 'SALE_REVERSAL',
      date,
      notes: `${notePrefix} ${invoiceNumber}`,
      saleId,
    })
  }
}

export async function createSaleTransaction(userId: string, input: SaleInput) {
  return prisma.$transaction(async (tx) => {
    const allowNegative = await getAllowNegativeStock(userId, tx)
    const productIds = [...new Set(input.items.map((item) => item.productId))]
    const products = await tx.product.findMany({
      where: { userId, id: { in: productIds }, isActive: true },
    })
    const productMap = new Map(products.map((product) => [product.id, product]))
    const stockMap = new Map(products.map((product) => [product.id, product.currentStock]))

    const lines = await buildSaleLines(userId, input.items, tx, {
      stockMap,
      productMap,
      allowNegative,
    })
    const totals = totalsFromLines(lines, input.discount)
    let amountPaid = money(input.amountPaid)
    if (amountPaid.gt(totals.totalAmount)) amountPaid = totals.totalAmount
    const balancePending = subMoney(totals.totalAmount, amountPaid)
    const paymentStatus = determinePaymentStatus(totals.totalAmount, amountPaid)
    const invoiceNumber = await nextInvoiceNumber(userId, tx)
    const date = toDateOnly(input.date)
    const customerId = input.customerId || null

    if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, userId } })
      if (!customer) throw new Error('Customer not found')
    }

    const cashAccountId = input.cashAccountId || null
    if (cashAccountId) {
      const cashAccount = await tx.cashAccount.findFirst({
        where: { id: cashAccountId, userId, isActive: true },
      })
      if (!cashAccount) throw new Error('Selected cash/bank account was not found')
    }

    const sale = await tx.sale.create({
      data: {
        userId,
        customerId,
        invoiceNumber,
        date,
        subtotal: prismaDecimal(totals.subtotal),
        discount: prismaDecimal(totals.discount),
        totalAmount: prismaDecimal(totals.totalAmount),
        amountPaid: prismaDecimal(amountPaid),
        balancePending: prismaDecimal(balancePending),
        totalCost: prismaDecimal(totals.totalCost),
        grossProfit: prismaDecimal(totals.grossProfit),
        paymentMethod: input.paymentMethod as PaymentMethod,
        paymentStatus,
        cashAccountId,
        notes: input.notes || null,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            productName: l.product.name,
            quantity: l.quantity,
            unitCost: prismaDecimal(l.unitCost),
            unitSellingPrice: prismaDecimal(l.unitSellingPrice),
            lineTotal: prismaDecimal(l.lineTotal),
            lineCost: prismaDecimal(l.lineCost),
            lineProfit: prismaDecimal(l.lineProfit),
          })),
        },
      },
      include: { items: true, customer: true },
    })

    if (cashAccountId && amountPaid.gt(0)) {
      await tx.cashAccount.update({
        where: { id: cashAccountId },
        data: { currentBalance: { increment: prismaDecimal(amountPaid) } },
      })
      await tx.cashTransaction.create({
        data: {
          userId,
          accountId: cashAccountId,
          type: 'SALE_RECEIPT',
          date,
          amount: prismaDecimal(amountPaid),
          saleId: sale.id,
          notes: `Sale ${invoiceNumber}`,
        },
      })
    }

    await postSaleStockIssues(tx, userId, sale.id, invoiceNumber, date, lines, allowNegative)

    if (customerId && amountPaid.gt(0)) {
      await tx.customerPayment.create({
        data: {
          userId,
          customerId,
          saleId: sale.id,
          date,
          amount: prismaDecimal(amountPaid),
          paymentMethod: input.paymentMethod as PaymentMethod,
          notes: 'Initial payment on sale',
        },
      })
    }

    return sale
  }, TX_OPTIONS)
}

export async function updateSaleTransaction(userId: string, saleId: string, input: SaleInput) {
  return prisma.$transaction(async (tx) => {
    const allowNegative = await getAllowNegativeStock(userId, tx)
    const existing = await tx.sale.findFirst({
      where: { id: saleId, userId },
      include: { items: true, payments: true },
    })
    if (!existing) throw new Error('Sale not found')

    const productIds = [
      ...new Set([
        ...existing.items
          .map((item) => item.productId)
          .filter((id): id is string => Boolean(id)),
        ...input.items.map((item) => item.productId),
      ]),
    ]

    const products = await tx.product.findMany({
      where: { userId, id: { in: productIds } },
    })
    const productMap = new Map(products.map((product) => [product.id, product]))

    // Reverse original stock first (using original COGS snapshots)
    await reverseSaleStock(
      tx,
      userId,
      existing.id,
      existing.invoiceNumber,
      toDateOnly(input.date),
      existing.items,
      'Edit reversal for',
    )

    // Refresh stock map after reversal
    const refreshed = await tx.product.findMany({
      where: { userId, id: { in: productIds } },
    })
    for (const product of refreshed) {
      productMap.set(product.id, product)
    }
    const stockMap = new Map(refreshed.map((product) => [product.id, product.currentStock]))

    const priorUnitCostByProductId = new Map<string, ReturnType<typeof money>>()
    for (const item of existing.items) {
      if (!item.productId || priorUnitCostByProductId.has(item.productId)) continue
      priorUnitCostByProductId.set(item.productId, money(item.unitCost))
    }

    const lines = await buildSaleLines(userId, input.items, tx, {
      stockMap,
      productMap,
      priorUnitCostByProductId,
      allowNegative,
    })
    const totals = totalsFromLines(lines, input.discount)

    const extraPaid = existing.payments
      .filter((p) => p.notes !== 'Initial payment on sale')
      .reduce((acc, p) => acc.plus(money(p.amount)), money(0))

    let amountPaid = money(input.amountPaid)
    if (amountPaid.gt(totals.totalAmount)) amountPaid = totals.totalAmount
    const totalPaid = money(amountPaid.plus(extraPaid))
    const cappedPaid = totalPaid.gt(totals.totalAmount) ? totals.totalAmount : totalPaid
    const balancePending = subMoney(totals.totalAmount, cappedPaid)
    const paymentStatus = determinePaymentStatus(totals.totalAmount, cappedPaid)
    const date = toDateOnly(input.date)
    const customerId = input.customerId || null

    if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, userId } })
      if (!customer) throw new Error('Customer not found')
    }

    await tx.stockMovement.deleteMany({
      where: { saleId: existing.id, type: 'SALE', userId },
    })
    await tx.saleItem.deleteMany({ where: { saleId: existing.id } })

    const cashAccountId = input.cashAccountId || null
    if (cashAccountId) {
      const cashAccount = await tx.cashAccount.findFirst({
        where: { id: cashAccountId, userId, isActive: true },
      })
      if (!cashAccount) throw new Error('Selected cash/bank account was not found')
    }

    const priorCash = await tx.cashTransaction.findMany({
      where: { userId, saleId: existing.id },
    })
    for (const row of priorCash) {
      await tx.cashAccount.update({
        where: { id: row.accountId },
        data: { currentBalance: { decrement: row.amount } },
      })
    }
    await tx.cashTransaction.deleteMany({ where: { userId, saleId: existing.id } })

    const sale = await tx.sale.update({
      where: { id: existing.id },
      data: {
        customerId,
        date,
        subtotal: prismaDecimal(totals.subtotal),
        discount: prismaDecimal(totals.discount),
        totalAmount: prismaDecimal(totals.totalAmount),
        amountPaid: prismaDecimal(cappedPaid),
        balancePending: prismaDecimal(balancePending),
        totalCost: prismaDecimal(totals.totalCost),
        grossProfit: prismaDecimal(totals.grossProfit),
        paymentMethod: input.paymentMethod as PaymentMethod,
        paymentStatus,
        cashAccountId,
        notes: input.notes || null,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            productName: l.product.name,
            quantity: l.quantity,
            unitCost: prismaDecimal(l.unitCost),
            unitSellingPrice: prismaDecimal(l.unitSellingPrice),
            lineTotal: prismaDecimal(l.lineTotal),
            lineCost: prismaDecimal(l.lineCost),
            lineProfit: prismaDecimal(l.lineProfit),
          })),
        },
      },
      include: { items: true, customer: true },
    })

    await postSaleStockIssues(tx, userId, sale.id, existing.invoiceNumber, date, lines, allowNegative)

    if (cashAccountId && amountPaid.gt(0)) {
      await tx.cashAccount.update({
        where: { id: cashAccountId },
        data: { currentBalance: { increment: prismaDecimal(amountPaid) } },
      })
      await tx.cashTransaction.create({
        data: {
          userId,
          accountId: cashAccountId,
          type: 'SALE_RECEIPT',
          date,
          amount: prismaDecimal(amountPaid),
          saleId: sale.id,
          notes: `Sale ${existing.invoiceNumber}`,
        },
      })
    }

    return sale
  }, TX_OPTIONS)
}

export async function deleteSaleTransaction(userId: string, saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, userId },
      include: { items: true },
    })
    if (!sale) throw new Error('Sale not found')

    await reverseSaleStock(
      tx,
      userId,
      sale.id,
      sale.invoiceNumber,
      sale.date,
      sale.items,
      'Deleted sale',
    )

    const priorCash = await tx.cashTransaction.findMany({
      where: { userId, saleId: sale.id },
    })
    for (const row of priorCash) {
      await tx.cashAccount.update({
        where: { id: row.accountId },
        data: { currentBalance: { decrement: row.amount } },
      })
    }
    await tx.cashTransaction.deleteMany({ where: { userId, saleId: sale.id } })

    await tx.customerPayment.deleteMany({ where: { saleId: sale.id, userId } })
    await tx.sale.delete({ where: { id: sale.id } })
    return { id: sale.id }
  }, TX_OPTIONS)
}
