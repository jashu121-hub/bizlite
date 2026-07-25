import type { PaymentMethod, Prisma } from '@prisma/client'
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
  stockMap?: Map<string, number>,
) {
  const lines = []
  for (const item of items) {
    const product = await tx.product.findFirst({
      where: { id: item.productId, userId, isActive: true },
    })
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
    const lines = await buildSaleLines(userId, input.items, tx)
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

    for (const line of lines) {
      await tx.product.update({
        where: { id: line.product.id },
        data: { currentStock: { decrement: line.quantity } },
      })
      await tx.stockMovement.create({
        data: {
          userId,
          productId: line.product.id,
          type: 'SALE',
          quantity: -line.quantity,
          date,
          notes: `Sale ${invoiceNumber}`,
          saleId: sale.id,
        },
      })
    }

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
  })
}

export async function updateSaleTransaction(userId: string, saleId: string, input: SaleInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { id: saleId, userId },
      include: { items: true, payments: true },
    })
    if (!existing) throw new Error('Sale not found')

    for (const item of existing.items) {
      if (!item.productId) continue
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      })
      await tx.stockMovement.create({
        data: {
          userId,
          productId: item.productId,
          type: 'SALE_REVERSAL',
          quantity: item.quantity,
          date: toDateOnly(input.date),
          notes: `Edit reversal for ${existing.invoiceNumber}`,
          saleId: existing.id,
        },
      })
    }

    await tx.stockMovement.deleteMany({
      where: { saleId: existing.id, type: 'SALE', userId },
    })
    await tx.saleItem.deleteMany({ where: { saleId: existing.id } })

    const products = await tx.product.findMany({
      where: { userId, id: { in: input.items.map((i) => i.productId) } },
    })
    const stockMap = new Map(products.map((p) => [p.id, p.currentStock]))
    const lines = await buildSaleLines(userId, input.items, tx, stockMap)
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

    for (const line of lines) {
      await tx.product.update({
        where: { id: line.product.id },
        data: { currentStock: { decrement: line.quantity } },
      })
      await tx.stockMovement.create({
        data: {
          userId,
          productId: line.product.id,
          type: 'SALE',
          quantity: -line.quantity,
          date,
          notes: `Sale ${existing.invoiceNumber}`,
          saleId: existing.id,
        },
      })
    }

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

    return sale
  })
}

export async function deleteSaleTransaction(userId: string, saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, userId },
      include: { items: true },
    })
    if (!sale) throw new Error('Sale not found')

    for (const item of sale.items) {
      if (!item.productId) continue
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      })
      await tx.stockMovement.create({
        data: {
          userId,
          productId: item.productId,
          type: 'SALE_REVERSAL',
          quantity: item.quantity,
          date: sale.date,
          notes: `Deleted sale ${sale.invoiceNumber}`,
          saleId: sale.id,
        },
      })
    }

    await tx.customerPayment.deleteMany({ where: { saleId: sale.id, userId } })
    await tx.sale.delete({ where: { id: sale.id } })
    return { id: sale.id }
  })
}
