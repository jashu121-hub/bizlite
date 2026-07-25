import { z } from 'zod'
import { dateStringSchema, paymentMethodSchema, requiredPositiveMoneySchema } from './common'

export const expenseCostTypeSchema = z.enum(['PRODUCTION', 'SELLING', 'OVERHEAD'])
export const expenseSchema = z
  .object({
    date: dateStringSchema,
    categoryId: z.string().min(1, 'Select a category'),
    costType: expenseCostTypeSchema,
    description: z.string().min(1, 'Description is required').max(200),
    amount: requiredPositiveMoneySchema,
    paymentMethod: paymentMethodSchema,
    vendor: z.string().max(160).optional().or(z.literal('')),
    reference: z.string().max(120).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
  })

export type ExpenseInput = z.infer<typeof expenseSchema>

