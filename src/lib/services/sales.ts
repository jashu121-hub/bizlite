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

async function buildSaleLines(
  userId: string,
  items: SaleInput['items'],
  tx: Prisma.TransactionClient,
  options?: {
    stockMap?: Map<string, number>
    productMap?: Map<string, Product>
  },
) {
  const stockMap = options?.stockMap
  const productMap = options?.productMap
  const lines = []

  for (const item of items) {
    let product = productMap?.get(item.productId) ?? null
    if (!product) {
      product = await tx.product.findFirst({
        where: { id: item.productId, userId, isActive: true },
      })
    }
    if (!product) throw new Error('One or more products were not found')

    const available = stockMap?.get(product.id) ?? product.currentStock
    if (item.quantity > available) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${available}`)
    }

    const unitPrice = money(item.unitSellingPrice)
    const unitCost = money(product.costPrice)
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
    })
    if (stockMap) stockMap.set(product.id, available - item.quantity)
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

export async function createSaleTransaction(userId: string, input: SaleInput) {
  return prisma.$transaction(async (tx) => {
    const productIds = [...new Set(input.items.map((item) => item.productId))]
    const products = await tx.product.findMany({
      where: { userId, id: { in: productIds }, isActive: true },
    })
    const productMap = new Map(products.map((product) => [product.id, product]))
    const stockMap = new Map(products.map((product) => [product.id, product.currentStock]))

    const lines = await buildSaleLines(userId, input.items, tx, { stockMap, productMap })
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

    const stockByProduct = new Map<string, number>()
    for (const line of lines) {
      stockByProduct.set(
        line.product.id,
        (stockByProduct.get(line.product.id) ?? 0) + line.quantity,
      )
    }

    await Promise.all(
      [...stockByProduct.entries()].map(([productId, quantity]) =>
        tx.product.update({
          where: { id: productId },
          data: { currentStock: { decrement: quantity } },
        }),
      ),
    )

    await tx.stockMovement.createMany({
      data: lines.map((line) => ({
        userId,
        productId: line.product.id,
        type: 'SALE' as const,
        quantity: -line.quantity,
        date,
        notes: `Sale ${invoiceNumber}`,
        saleId: sale.id,
      })),
    })

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

    const reservedByProduct = new Map<string, number>()
    for (const item of existing.items) {
      if (!item.productId) continue
      reservedByProduct.set(
        item.productId,
        (reservedByProduct.get(item.productId) ?? 0) + item.quantity,
      )
    }

    // Stock as if this sale were reversed, so validation matches the edit form
    const stockMap = new Map(
      products.map((product) => [
        product.id,
        product.currentStock + (reservedByProduct.get(product.id) ?? 0),
      ]),
    )

    const lines = await buildSaleLines(userId, input.items, tx, { stockMap, productMap })
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

    const affectedProductIds = new Set([
      ...reservedByProduct.keys(),
      ...lines.map((line) => line.product.id),
    ])

    await Promise.all(
      [...affectedProductIds].map((productId) => {
        const product = productMap.get(productId)
        if (!product) return Promise.resolve()
        const newStock = stockMap.get(productId) ?? product.currentStock
        return tx.product.update({
          where: { id: productId },
          data: { currentStock: newStock },
        })
      }),
    )

    await Promise.all([
      tx.stockMovement.deleteMany({
        where: { saleId: existing.id, type: 'SALE', userId },
      }),
      tx.saleItem.deleteMany({ where: { saleId: existing.id } }),
    ])

    const reversalItems = existing.items.filter((item) => item.productId)
    if (reversalItems.length > 0) {
      await tx.stockMovement.createMany({
        data: reversalItems.map((item) => ({
          userId,
          productId: item.productId!,
          type: 'SALE_REVERSAL' as const,
          quantity: item.quantity,
          date,
          notes: `Edit reversal for ${existing.invoiceNumber}`,
          saleId: existing.id,
        })),
      })
    }

    await tx.stockMovement.createMany({
      data: lines.map((line) => ({
        userId,
        productId: line.product.id,
        type: 'SALE' as const,
        quantity: -line.quantity,
        date,
        notes: `Sale ${existing.invoiceNumber}`,
        saleId: existing.id,
      })),
    })

    const cashAccountId = input.cashAccountId || null
    if (cashAccountId) {
      const cashAccount = await tx.cashAccount.findFirst({
        where: { id: cashAccountId, userId, isActive: true },
      })
      if (!cashAccount) throw new Error('Selected cash/bank account was not found')
    }

    // Reverse prior sale cash postings before rewriting
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

    const stockByProduct = new Map<string, number>()
    for (const item of sale.items) {
      if (!item.productId) continue
      stockByProduct.set(
        item.productId,
        (stockByProduct.get(item.productId) ?? 0) + item.quantity,
      )
    }

    await Promise.all(
      [...stockByProduct.entries()].map(([productId, quantity]) =>
        tx.product.update({
          where: { id: productId },
          data: { currentStock: { increment: quantity } },
        }),
      ),
    )

    const reversalItems = sale.items.filter((item) => item.productId)
    if (reversalItems.length > 0) {
      await tx.stockMovement.createMany({
        data: reversalItems.map((item) => ({
          userId,
          productId: item.productId!,
          type: 'SALE_REVERSAL' as const,
          quantity: item.quantity,
          date: sale.date,
          notes: `Deleted sale ${sale.invoiceNumber}`,
          saleId: sale.id,
        })),
      })
    }

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
