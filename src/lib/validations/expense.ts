import { z } from 'zod'
import { dateStringSchema, expenseCategorySchema, moneySchema, paymentMethodSchema } from './common'

export const expenseCostTypeSchema = z.enum(['PRODUCTION', 'SELLING', 'OVERHEAD'])
export const expenseSubcategorySchema = z.enum([
  'INWARD_TRANSPORT',
  'CUSTOMER_DELIVERY',
  'GENERAL_TRANSPORT',
])

export const expenseSchema = z
  .object({
    date: dateStringSchema,
    category: expenseCategorySchema,
    costType: expenseCostTypeSchema,
    subcategory: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      expenseSubcategorySchema.nullable().optional(),
    ),
    description: z.string().min(1, 'Description is required').max(200),
    amount: moneySchema,
    paymentMethod: paymentMethodSchema,
    vendor: z.string().max(160).optional().or(z.literal('')),
    reference: z.string().max(120).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.category === 'TRANSPORT' && !data.subcategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select Inward Transport, Customer Delivery, or General Transport',
        path: ['subcategory'],
      })
    }
  })

export type ExpenseInput = z.infer<typeof expenseSchema>

export const expenseCostDefaultsSchema = z.object({
  defaults: z.record(
    expenseCategorySchema,
    expenseCostTypeSchema.nullable(),
  ),
  updateHistorical: z.boolean().default(false),
})

export type ExpenseCostDefaultsInput = z.infer<typeof expenseCostDefaultsSchema>
