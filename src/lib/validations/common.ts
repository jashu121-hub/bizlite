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

/** Optional money: empty allowed (treated as 0 in calculations). */
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (v === '' || v === null || v === undefined) return ''
    return String(v)
  })
  .refine(
    (v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0),
    'Must be a valid amount',
  )

/** Required money: must be greater than zero. */
export const requiredPositiveMoneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v ?? '').trim())
  .refine(
    (v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0,
    'Enter an amount greater than zero.',
  )

export const positiveIntSchema = z.coerce.number().int().positive()

/** Coerce empty string to a default integer (for optional qty fields). */
export const optionalIntSchema = (min = 0, emptyAs = 0) =>
  z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return emptyAs
    return v
  }, z.coerce.number().int().min(min))

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
