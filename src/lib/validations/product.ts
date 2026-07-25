import { z } from 'zod'
import { dateStringSchema, moneySchema } from './common'

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
})

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['ADD', 'REDUCE']),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  date: dateStringSchema,
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type ProductInput = z.infer<typeof productSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
