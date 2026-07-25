import { z } from 'zod'
import { dateStringSchema, moneySchema, paymentMethodSchema } from './common'

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unitSellingPrice: moneySchema,
})

export const saleSchema = z.object({
  date: dateStringSchema,
  customerId: z.string().optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'Add at least one product'),
  discount: moneySchema.default('0'),
  amountPaid: moneySchema.default('0'),
  paymentMethod: paymentMethodSchema,
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type SaleInput = z.infer<typeof saleSchema>
export type SaleItemInput = z.infer<typeof saleItemSchema>
