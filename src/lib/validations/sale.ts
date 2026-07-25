import { z } from 'zod'
import { dateStringSchema, moneySchema, paymentMethodSchema } from './common'

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unitSellingPrice: moneySchema,
})

export const saleSchema = z
  .object({
    date: dateStringSchema,
    customerId: z.string().optional().or(z.literal('')),
    items: z.array(saleItemSchema).min(1, 'Add at least one product'),
    discount: moneySchema.default('0'),
    amountPaid: moneySchema.default('0'),
    paymentMethod: paymentMethodSchema,
    notes: z.string().max(1000).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const subtotal = data.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitSellingPrice),
      0,
    )
    const discount = Number(data.discount) || 0
    const amountPaid = Number(data.amountPaid) || 0
    const total = Math.max(0, subtotal - discount)

    if (discount > subtotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discount cannot be greater than subtotal',
        path: ['discount'],
      })
    }
    if (amountPaid > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amount paid cannot be greater than total',
        path: ['amountPaid'],
      })
    }
  })

export type SaleInput = z.infer<typeof saleSchema>
export type SaleItemInput = z.infer<typeof saleItemSchema>
