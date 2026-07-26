import type { CashBalanceSource, CashTransactionType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { money, prismaDecimal, subMoney } from '@/lib/money'
import { toDateOnly } from '@/lib/dates'
import type {
  BalanceAdjustmentInput,
  CreateCashAccountInput,
  MoneyMovementInput,
  StartingBalanceInput,
  TransferInput,
  UpdateCashAccountInput,
} from '@/lib/validations/cash-account'

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const

async function getOwnedAccount(userId: string, accountId: string, tx: Prisma.TransactionClient) {
  const account = await tx.cashAccount.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')
  return account
}

async function postTransaction(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    accountId: string
    type: CashTransactionType
    date: Date
    /** Signed amount */
    amount: ReturnType<typeof money>
    balanceSource?: CashBalanceSource | null
    reference?: string | null
    notes?: string | null
    transferGroupId?: string | null
    saleId?: string | null
    expenseId?: string | null
    stockMovementId?: string | null
  },
) {
  const account = await getOwnedAccount(input.userId, input.accountId, tx)
  const nextBalance = money(account.currentBalance).plus(input.amount)

  await tx.cashAccount.update({
    where: { id: account.id },
    data: { currentBalance: prismaDecimal(nextBalance) },
  })

  return tx.cashTransaction.create({
    data: {
      userId: input.userId,
      accountId: input.accountId,
      type: input.type,
      date: input.date,
      amount: prismaDecimal(input.amount),
      balanceSource: input.balanceSource ?? null,
      reference: input.reference || null,
      notes: input.notes || null,
      transferGroupId: input.transferGroupId ?? null,
      saleId: input.saleId ?? null,
      expenseId: input.expenseId ?? null,
      stockMovementId: input.stockMovementId ?? null,
    },
  })
}

/**
 * Pay for inventory purchase from cash/bank.
 * This is an asset swap (cash ↓ inventory ↑), not an operating expense.
 */
export async function postPurchasePaymentInTx(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    accountId: string
    amount: string | number
    date: Date
    stockMovementId?: string | null
    reference?: string | null
    notes?: string | null
  },
) {
  const paid = money(input.amount)
  if (paid.lte(0)) throw new Error('Purchase payment must be greater than zero')
  const account = await getOwnedAccount(input.userId, input.accountId, tx)
  if (money(account.currentBalance).lt(paid)) {
    throw new Error('Insufficient account balance for this stock purchase')
  }
  return postTransaction(tx, {
    userId: input.userId,
    accountId: input.accountId,
    type: 'PURCHASE_PAYMENT',
    date: input.date,
    amount: paid.negated(),
    stockMovementId: input.stockMovementId,
    reference: input.reference,
    notes: input.notes ?? 'Stock purchase payment',
  })
}

/**
 * Pay production batch costs from cash/bank.
 * Does not create an operating expense — cost sits in inventory until sold.
 */
export async function postProductionPaymentInTx(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    accountId: string
    amount: string | number
    date: Date
    expenseId?: string | null
    stockMovementId?: string | null
    reference?: string | null
    notes?: string | null
  },
) {
  const paid = money(input.amount)
  if (paid.lte(0)) throw new Error('Production payment must be greater than zero')
  const account = await getOwnedAccount(input.userId, input.accountId, tx)
  if (money(account.currentBalance).lt(paid)) {
    throw new Error('Insufficient account balance for this production payment')
  }
  return postTransaction(tx, {
    userId: input.userId,
    accountId: input.accountId,
    type: 'PRODUCTION_PAYMENT',
    date: input.date,
    amount: paid.negated(),
    expenseId: input.expenseId,
    stockMovementId: input.stockMovementId,
    reference: input.reference,
    notes: input.notes ?? 'Production payment',
  })
}

export async function createCashAccount(userId: string, input: CreateCashAccountInput) {
  return prisma.$transaction(async (tx) => {
    const opening = input.openingBalance === '' ? money(0) : money(input.openingBalance)
    const hasOpening = opening.gt(0)

    const account = await tx.cashAccount.create({
      data: {
        userId,
        name: input.name.trim(),
        type: input.type,
        bankName: input.bankName?.trim() || null,
        accountNumber: input.accountNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        currentBalance: prismaDecimal(0),
        isActive: true,
      },
    })

    // Only create an opening-balance transaction when the user entered an amount
    if (hasOpening) {
      if (!input.balanceSource) throw new Error('Select a balance source')
      if (!input.openingBalanceDate) throw new Error('Opening balance date is required')
      await postTransaction(tx, {
        userId,
        accountId: account.id,
        type: 'OPENING_BALANCE',
        date: toDateOnly(input.openingBalanceDate),
        amount: opening,
        balanceSource: input.balanceSource as CashBalanceSource,
        notes: input.notes?.trim() || null,
      })
    }

    return tx.cashAccount.findFirstOrThrow({ where: { id: account.id } })
  }, TX_OPTIONS)
}

export async function updateCashAccount(
  userId: string,
  accountId: string,
  input: UpdateCashAccountInput,
) {
  const existing = await prisma.cashAccount.findFirst({ where: { id: accountId, userId } })
  if (!existing) throw new Error('Account not found')

  return prisma.cashAccount.update({
    where: { id: accountId },
    data: {
      name: input.name.trim(),
      type: input.type,
      bankName: input.bankName?.trim() || null,
      accountNumber: input.accountNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive,
    },
  })
}

export async function setCashAccountActive(userId: string, accountId: string, isActive: boolean) {
  const existing = await prisma.cashAccount.findFirst({ where: { id: accountId, userId } })
  if (!existing) throw new Error('Account not found')
  return prisma.cashAccount.update({
    where: { id: accountId },
    data: { isActive },
  })
}

export async function addStartingBalance(userId: string, input: StartingBalanceInput) {
  return prisma.$transaction(async (tx) => {
    await getOwnedAccount(userId, input.accountId, tx)
    return postTransaction(tx, {
      userId,
      accountId: input.accountId,
      type: 'STARTING_BALANCE',
      date: toDateOnly(input.date),
      amount: money(input.amount),
      balanceSource: input.balanceSource,
      reference: input.reference,
      notes: input.notes,
    })
  }, TX_OPTIONS)
}

export async function recordMoneyIn(userId: string, input: MoneyMovementInput) {
  return prisma.$transaction(async (tx) => {
    await getOwnedAccount(userId, input.accountId, tx)
    return postTransaction(tx, {
      userId,
      accountId: input.accountId,
      type: 'MONEY_IN',
      date: toDateOnly(input.date),
      amount: money(input.amount),
      reference: input.reference,
      notes: input.notes,
    })
  }, TX_OPTIONS)
}

export async function recordMoneyOut(userId: string, input: MoneyMovementInput) {
  return prisma.$transaction(async (tx) => {
    const account = await getOwnedAccount(userId, input.accountId, tx)
    const amount = money(input.amount)
    if (money(account.currentBalance).lt(amount)) {
      throw new Error('Insufficient account balance')
    }
    return postTransaction(tx, {
      userId,
      accountId: input.accountId,
      type: 'MONEY_OUT',
      date: toDateOnly(input.date),
      amount: amount.negated(),
      reference: input.reference,
      notes: input.notes,
    })
  }, TX_OPTIONS)
}

export async function transferBetweenAccounts(userId: string, input: TransferInput) {
  return prisma.$transaction(async (tx) => {
    const from = await getOwnedAccount(userId, input.fromAccountId, tx)
    await getOwnedAccount(userId, input.toAccountId, tx)
    const amount = money(input.amount)
    if (money(from.currentBalance).lt(amount)) {
      throw new Error('Insufficient balance in source account')
    }
    const date = toDateOnly(input.date)
    const transferGroupId = `xfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    await postTransaction(tx, {
      userId,
      accountId: input.fromAccountId,
      type: 'TRANSFER_OUT',
      date,
      amount: amount.negated(),
      reference: input.reference,
      notes: input.notes,
      transferGroupId,
    })
    await postTransaction(tx, {
      userId,
      accountId: input.toAccountId,
      type: 'TRANSFER_IN',
      date,
      amount,
      reference: input.reference,
      notes: input.notes,
      transferGroupId,
    })

    return { transferGroupId }
  }, TX_OPTIONS)
}

export async function adjustAccountBalance(userId: string, input: BalanceAdjustmentInput) {
  return prisma.$transaction(async (tx) => {
    const account = await getOwnedAccount(userId, input.accountId, tx)
    const amount = money(input.amount)
    const signed = input.direction === 'IN' ? amount : amount.negated()
    if (input.direction === 'OUT' && money(account.currentBalance).lt(amount)) {
      throw new Error('Insufficient account balance')
    }
    return postTransaction(tx, {
      userId,
      accountId: input.accountId,
      type: 'BALANCE_ADJUSTMENT',
      date: toDateOnly(input.date),
      amount: signed,
      reference: input.reference,
      notes: input.notes,
    })
  }, TX_OPTIONS)
}

/** Post sale receipt into a cash/bank account (does not affect sales totals). */
export async function postSaleReceipt(
  userId: string,
  accountId: string,
  amount: string | number,
  date: Date,
  saleId: string,
  notes?: string | null,
) {
  const paid = money(amount)
  if (paid.lte(0)) return null
  return prisma.$transaction(async (tx) => {
    await getOwnedAccount(userId, accountId, tx)
    return postTransaction(tx, {
      userId,
      accountId,
      type: 'SALE_RECEIPT',
      date,
      amount: paid,
      saleId,
      notes: notes ?? `Sale receipt`,
    })
  }, TX_OPTIONS)
}

/** Post expense payment from a cash/bank account. */
export async function postExpensePayment(
  userId: string,
  accountId: string,
  amount: string | number,
  date: Date,
  expenseId: string,
  notes?: string | null,
) {
  const paid = money(amount)
  if (paid.lte(0)) return null
  return prisma.$transaction(async (tx) => {
    const account = await getOwnedAccount(userId, accountId, tx)
    if (money(account.currentBalance).lt(paid)) {
      throw new Error('Insufficient account balance for this expense')
    }
    return postTransaction(tx, {
      userId,
      accountId,
      type: 'EXPENSE_PAYMENT',
      date,
      amount: paid.negated(),
      expenseId,
      notes: notes ?? 'Expense payment',
    })
  }, TX_OPTIONS)
}

/** Remove sale receipts for a sale and restore account balances (used on sale delete/update). */
export async function clearSaleReceipts(userId: string, saleId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.cashTransaction.findMany({
      where: { userId, saleId },
    })
    for (const row of rows) {
      const account = await getOwnedAccount(userId, row.accountId, tx)
      const next = subMoney(account.currentBalance, row.amount)
      await tx.cashAccount.update({
        where: { id: account.id },
        data: { currentBalance: prismaDecimal(next) },
      })
    }
    await tx.cashTransaction.deleteMany({ where: { userId, saleId } })
  }, TX_OPTIONS)
}

export async function clearExpensePayments(userId: string, expenseId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.cashTransaction.findMany({
      where: { userId, expenseId },
    })
    for (const row of rows) {
      const account = await getOwnedAccount(userId, row.accountId, tx)
      // row.amount is negative for expense; subtracting negative restores balance
      const next = subMoney(account.currentBalance, row.amount)
      await tx.cashAccount.update({
        where: { id: account.id },
        data: { currentBalance: prismaDecimal(next) },
      })
    }
    await tx.cashTransaction.deleteMany({ where: { userId, expenseId } })
  }, TX_OPTIONS)
}
