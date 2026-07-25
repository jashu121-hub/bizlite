import { z } from 'zod'
import { dateStringSchema, moneySchema } from './common'

const customCostLineSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(120).optional().or(z.literal('')),
  amount: moneySchema,
})

export const productCostBreakdownSchema = z.object({
  productionQuantity: z.coerce.number().int().positive('Production quantity must be greater than 0'),
  materials: moneySchema,
  stitching: moneySchema,
  design: moneySchema,
  packaging: moneySchema,
  inwardTransport: moneySchema,
  customs: moneySchema,
  otherProduction: moneySchema,
  customProductionCosts: z.array(customCostLineSchema).default([]),
  marketing: moneySchema,
  commission: moneySchema,
  outwardDelivery: moneySchema,
  marketplaceFees: moneySchema,
  otherSelling: moneySchema,
  totalProductionCost: moneySchema.optional(),
  inventoryCostPerUnit: moneySchema.optional(),
  totalSellingCost: moneySchema.optional(),
  sellingCostPerUnit: moneySchema.optional(),
  fullCostPerUnit: moneySchema.optional(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(160),
  category: z.string().min(1, 'Category is required'),
  sku: z.string().max(60).optional().or(z.literal('')),
  costPrice: moneySchema,
  sellingPrice: moneySchema,
  openingStock: z.coerce.number().int().min(0),
  currentStock: z.coerce.number().int().min(0).optional(),
  lowStockLevel: z.coerce.number().int().min(0),
  notes: z.string().max(1000).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  costBreakdown: productCostBreakdownSchema.nullable().optional(),
})

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['ADD', 'REDUCE']),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  date: dateStringSchema,
  notes: z.string().max(500).optional().or(z.literal('')),
})

export const STOCK_REASONS = [
  'New Purchase',
  'Customer Return',
  'Damaged Item',
  'Expired Item',
  'Lost Item',
  'Manual Correction',
  'Opening Balance Correction',
  'Other',
] as const

export const addStockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  date: dateStringSchema,
  purchaseCost: moneySchema.optional().or(z.literal('')),
  supplier: z.string().max(160).optional().or(z.literal('')),
  reference: z.string().max(120).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  costBreakdown: productCostBreakdownSchema.nullable().optional(),
})

export const adjustStockDetailedSchema = z
  .object({
    productId: z.string().min(1),
    mode: z.enum(['INCREASE', 'DECREASE', 'SET']),
    quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
    reason: z.enum(STOCK_REASONS),
    date: dateStringSchema,
    notes: z.string().max(500).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== 'SET' && data.quantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quantity must be greater than 0',
        path: ['quantity'],
      })
    }
  })

export type ProductInput = z.infer<typeof productSchema>
export type ProductCostBreakdownInput = z.infer<typeof productCostBreakdownSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
export type AddStockInput = z.infer<typeof addStockSchema>
export type AdjustStockDetailedInput = z.infer<typeof adjustStockDetailedSchema>
