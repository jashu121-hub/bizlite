import { z } from 'zod'
import {
  dateStringSchema,
  moneySchema,
  optionalIntSchema,
  requiredPositiveMoneySchema,
} from './common'

const customCostLineSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(120).optional().or(z.literal('')),
  amount: moneySchema,
})

export const productCostBreakdownSchema = z.object({
  productionQuantity: optionalIntSchema(0, 0),
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

export const productTypeSchema = z.enum(['RESALE', 'MANUFACTURED', 'SERVICE'])

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'RESALE' as const, label: 'Resale Product' },
  { value: 'MANUFACTURED' as const, label: 'Manufactured Product' },
  { value: 'SERVICE' as const, label: 'Service' },
]

export const productSchema = z
  .object({
    name: z.string().min(1, 'Product name is required').max(160),
    category: z.string().min(1, 'Category is required'),
    sku: z.string().max(60).optional().or(z.literal('')),
    productType: productTypeSchema.default('RESALE'),
    unitOfMeasure: z.string().min(1).max(40).default('pcs'),
    /** Current inventory / WAC cost — may be 0 for new manufactured products. */
    costPrice: moneySchema,
    defaultPurchaseCost: moneySchema.optional().or(z.literal('')),
    standardProductionCost: moneySchema.optional().or(z.literal('')),
    /** Default suggested selling price — may be 0 until priced. */
    sellingPrice: moneySchema,
    openingStock: optionalIntSchema(0, 0),
    openingStockUnitCost: moneySchema.optional().or(z.literal('')),
    currentStock: optionalIntSchema(0, 0).optional(),
    lowStockLevel: optionalIntSchema(0, 0),
    notes: z.string().max(1000).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
    costBreakdown: productCostBreakdownSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const opening = Number(data.openingStock || 0)
    const openingUnit = Number(data.openingStockUnitCost || 0)
    const sell = Number(data.sellingPrice === '' ? 0 : data.sellingPrice)

    if (sell < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selling price cannot be negative',
        path: ['sellingPrice'],
      })
    }

    if (data.productType === 'SERVICE') {
      if (opening > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Services cannot have opening stock',
          path: ['openingStock'],
        })
      }
      return
    }

    if (opening > 0 && !(openingUnit > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Opening stock greater than zero requires a unit cost greater than zero',
        path: ['openingStockUnitCost'],
      })
    }

    if (data.productType === 'RESALE' && data.sellingPrice !== '' && sell <= 0) {
      // Allow 0 for draft; warn only if they entered invalid negative (handled above)
    }
  })

const positiveQuantitySchema = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().positive('Quantity must be greater than 0'),
)

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['ADD', 'REDUCE']),
  quantity: positiveQuantitySchema,
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
  'Production',
  'Other',
] as const

export const addStockSchema = z.object({
  productId: z.string().min(1),
  quantity: positiveQuantitySchema,
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
    quantity: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().int().min(0, 'Quantity cannot be negative'),
    ),
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

/** @deprecated Prefer moneySchema for selling price — kept for external imports */
export { requiredPositiveMoneySchema }
