import { z } from 'zod'
import { dateStringSchema, expenseCategorySchema, moneySchema, paymentMethodSchema } from './common'

export const expenseSchema = z.object({
  date: dateStringSchema,
  category: expenseCategorySchema,
  description: z.string().min(1, 'Description is required').max(200),
  amount: moneySchema,
  paymentMethod: paymentMethodSchema,
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
