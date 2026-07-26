/** Measurement units and compatible conversions for bulk usage costing. */

export type MeasureUnit =
  | 'pcs'
  | 'kg'
  | 'g'
  | 'L'
  | 'ml'
  | 'm'
  | 'cm'
  | 'box'
  | 'pack'
  | 'roll'
  | 'hour'
  | 'fixed'

export const MEASURE_UNIT_OPTIONS: { value: MeasureUnit; label: string }[] = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'g', label: 'Grams' },
  { value: 'L', label: 'Litres' },
  { value: 'ml', label: 'Millilitres' },
  { value: 'm', label: 'Metres' },
  { value: 'cm', label: 'Centimetres' },
  { value: 'box', label: 'Boxes' },
  { value: 'pack', label: 'Packs' },
  { value: 'roll', label: 'Rolls' },
  { value: 'hour', label: 'Hours' },
  { value: 'fixed', label: 'Fixed amount' },
]

/** Base factor within a compatible family (to smallest unit). */
const UNIT_BASE: Partial<Record<MeasureUnit, { family: string; toBase: number }>> = {
  kg: { family: 'mass', toBase: 1000 },
  g: { family: 'mass', toBase: 1 },
  L: { family: 'volume', toBase: 1000 },
  ml: { family: 'volume', toBase: 1 },
  m: { family: 'length', toBase: 100 },
  cm: { family: 'length', toBase: 1 },
}

export function unitLabel(unit: string): string {
  return MEASURE_UNIT_OPTIONS.find((u) => u.value === unit)?.label ?? unit
}

export function unitsCompatible(from: string, to: string): boolean {
  if (!from || !to) return false
  if (from === to) return true
  const a = UNIT_BASE[from as MeasureUnit]
  const b = UNIT_BASE[to as MeasureUnit]
  if (a && b) return a.family === b.family
  return false
}

/**
 * Convert a quantity from one unit to another within a compatible family.
 * Returns null if units are incompatible.
 */
export function convertQuantity(quantity: number, from: string, to: string): number | null {
  if (!Number.isFinite(quantity)) return null
  if (from === to) return quantity
  const a = UNIT_BASE[from as MeasureUnit]
  const b = UNIT_BASE[to as MeasureUnit]
  if (!a || !b || a.family !== b.family) return null
  return (quantity * a.toBase) / b.toBase
}

/** Convert purchase qty into the same base as usage unit for comparison/costing. */
export function toSharedBase(
  purchaseQty: number,
  purchaseUnit: string,
  usageQty: number,
  usageUnit: string,
): { purchaseBase: number; usageBase: number; baseUnit: string } | null {
  if (purchaseUnit === usageUnit) {
    return {
      purchaseBase: purchaseQty,
      usageBase: usageQty,
      baseUnit: purchaseUnit,
    }
  }
  const a = UNIT_BASE[purchaseUnit as MeasureUnit]
  const b = UNIT_BASE[usageUnit as MeasureUnit]
  if (!a || !b || a.family !== b.family) return null
  // Use smallest unit of the family as base
  const baseUnit =
    a.family === 'mass' ? 'g' : a.family === 'volume' ? 'ml' : a.family === 'length' ? 'cm' : purchaseUnit
  const purchaseBase = purchaseQty * a.toBase
  const usageBase = usageQty * b.toBase
  return { purchaseBase, usageBase, baseUnit }
}
