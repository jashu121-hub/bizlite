import { z } from 'zod'
import { dateStringSchema, moneySchema, requiredPositiveMoneySchema } from './common'

export const cashAccountTypeSchema = z.enum(['CASH', 'BANK', 'OTHER'])
export const cashBalanceSourceSchema = z.enum([
  'OWNER_CAPITAL',
  'PREVIOUS_BUSINESS_BALANCE',
  'LOAN_RECEIVED',
  'OTHER_FUNDING',
])

export const createCashAccountSchema = z
  .object({
    name: z.string().trim().min(1, 'Account name is required').max(160),
    type: cashAccountTypeSchema,
    bankName: z.string().trim().max(160).optional().or(z.literal('')),
    accountNumber: z.string().trim().max(40).optional().or(z.literal('')),
    openingBalance: moneySchema,
    openingBalanceDate: dateStringSchema.optional().or(z.literal('')),
    balanceSource: cashBalanceSourceSchema.optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const hasBalance = data.openingBalance !== '' && Number(data.openingBalance) > 0
    if (hasBalance && !data.balanceSource) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a balance source',
        path: ['balanceSource'],
      })
    }
    if (hasBalance && !data.openingBalanceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Opening balance date is required',
        path: ['openingBalanceDate'],
      })
    }
    if (data.type === 'BANK' && data.bankName === '' && data.accountNumber === '') {
      // Bank details optional — user may add later
    }
  })

export const updateCashAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(160),
  type: cashAccountTypeSchema,
  bankName: z.string().trim().max(160).optional().or(z.literal('')),
  accountNumber: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  isActive: z.boolean(),
})

export const startingBalanceSchema = z.object({
  accountId: z.string().min(1),
  date: dateStringSchema,
  amount: requiredPositiveMoneySchema,
  balanceSource: cashBalanceSourceSchema,
  reference: z.string().max(120).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const moneyMovementSchema = z.object({
  accountId: z.string().min(1),
  date: dateStringSchema,
  amount: requiredPositiveMoneySchema,
  reference: z.string().max(120).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'Select source account'),
  toAccountId: z.string().min(1, 'Select destination account'),
  date: dateStringSchema,
  amount: requiredPositiveMoneySchema,
  reference: z.string().max(120).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Choose two different accounts',
      path: ['toAccountId'],
    })
  }
})

export const balanceAdjustmentSchema = z.object({
  accountId: z.string().min(1),
  date: dateStringSchema,
  amount: requiredPositiveMoneySchema,
  direction: z.enum(['IN', 'OUT']),
  reference: z.string().max(120).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type CreateCashAccountInput = z.infer<typeof createCashAccountSchema>
export type UpdateCashAccountInput = z.infer<typeof updateCashAccountSchema>
export type StartingBalanceInput = z.infer<typeof startingBalanceSchema>
export type MoneyMovementInput = z.infer<typeof moneyMovementSchema>
export type TransferInput = z.infer<typeof transferSchema>
export type BalanceAdjustmentInput = z.infer<typeof balanceAdjustmentSchema>
