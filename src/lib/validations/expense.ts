import { z } from 'zod'
import { dateStringSchema, paymentMethodSchema, requiredPositiveMoneySchema } from './common'

export const expenseCostTypeSchema = z.enum(['PRODUCTION', 'SELLING', 'OVERHEAD'])
export const expenseLedgerKindSchema = z.enum([
  'OPERATING',
  'INVENTORY_PURCHASE',
  'PRODUCTION_PAYMENT',
  'ASSET_PURCHASE',
])
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
    ledgerKind: expenseLedgerKindSchema.default('OPERATING'),
    costType: expenseCostTypeSchema.optional(),
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
    costCalculationId: z.string().optional().or(z.literal('')),
    stockMovementId: z.string().optional().or(z.literal('')),
    /** User confirmed duplicate warning */
    acknowledgeDuplicate: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ledgerKind === 'OPERATING' && !data.costType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a cost type for operating expenses',
        path: ['costType'],
      })
    }

    if (data.ledgerKind === 'INVENTORY_PURCHASE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Inventory purchases must be recorded with Products → Purchase Stock, not as an expense',
        path: ['ledgerKind'],
      })
    }

    if (data.ledgerKind === 'PRODUCTION_PAYMENT') {
      if (!data.productionBatch && !data.costCalculationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Link a production batch or cost calculation for production payments',
          path: ['productionBatch'],
        })
      }
    }

    if (data.updateInventory && data.ledgerKind === 'OPERATING') {
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

    // Production payments and asset purchases never update inventory via expense form
    if (
      data.updateInventory &&
      (data.ledgerKind === 'PRODUCTION_PAYMENT' || data.ledgerKind === 'ASSET_PURCHASE')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'This expense type cannot update inventory. Use Production Batch or Purchase Stock.',
        path: ['updateInventory'],
      })
    }
  })

export type ExpenseInput = z.infer<typeof expenseSchema>
