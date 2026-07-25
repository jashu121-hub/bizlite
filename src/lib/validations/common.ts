import { z } from 'zod'

export const paymentMethodSchema = z.enum([
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'OTHER',
])

export const expenseCategorySchema = z.enum([
  'MATERIALS',
  'TRANSPORT',
  'RENT',
  'UTILITIES',
  'PACKAGING',
  'MARKETING',
  'SALARY',
  'MAINTENANCE',
  'OTHER',
])

export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Must be a valid amount')

export const positiveIntSchema = z.coerce.number().int().positive()

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
