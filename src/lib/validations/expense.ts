import { z } from 'zod'
import { dateStringSchema, paymentMethodSchema, requiredPositiveMoneySchema } from './common'

export const expenseCostTypeSchema = z.enum(['PRODUCTION', 'SELLING', 'OVERHEAD'])
export const inventoryDestinationSchema = z.enum([
  'RAW_MATERIALS',
  'WIP',
  'FINISHED_GOODS',
  'NONE',
])

const optionalPositiveInt = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  if (typeof value === 'number' && Number.isNaN(value)) return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}, z.number().int().positive().optional())

export const expenseSchema = z
  .object({
    date: dateStringSchema,
    categoryId: z.string().min(1, 'Select a category'),
    costType: expenseCostTypeSchema,
    description: z.string().min(1, 'Description is required').max(200),
    amount: requiredPositiveMoneySchema,
    paymentMethod: paymentMethodSchema,
    cashAccountId: z.string().optional().or(z.literal('')),
    vendor: z.string().max(160).optional().or(z.literal('')),
    reference: z.string().max(120).optional().or(z.literal('')),
    notes: z.string().max(1000).optional().or(z.literal('')),
    productId: z.string().optional().or(z.literal('')),
    productionQuantity: optionalPositiveInt,
    productionUnit: z.string().max(40).optional().or(z.literal('')),
    productionUnitCost: z.string().optional().or(z.literal('')),
    inventoryDestination: inventoryDestinationSchema.optional().or(z.literal('')),
    productionBatch: z.string().max(120).optional().or(z.literal('')),
    updateInventory: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.updateInventory) {
      if (!data.productId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a related product when Update inventory is Yes',
          path: ['productId'],
        })
      }
      if (!data.productionQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter quantity produced or purchased to update inventory',
          path: ['productionQuantity'],
        })
      }
    }
  })

export type ExpenseInput = z.infer<typeof expenseSchema>
