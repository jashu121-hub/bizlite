import { z } from 'zod'
import { dateStringSchema, paymentMethodSchema, requiredPositiveMoneySchema } from './common'

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(160),
  phone: z.string().max(40).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(300).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export const customerPaymentSchema = z.object({
  customerId: z.string().min(1),
  saleId: z.string().optional().or(z.literal('')),
  date: dateStringSchema,
  amount: requiredPositiveMoneySchema,
  paymentMethod: paymentMethodSchema,
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type CustomerInput = z.infer<typeof customerSchema>
export type CustomerPaymentInput = z.infer<typeof customerPaymentSchema>
