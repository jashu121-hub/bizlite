import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type MoneyInput = string | number | Decimal | Prisma.Decimal | null | undefined

export function D(value: MoneyInput = 0): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0)
  return new Decimal(value.toString())
}

export function money(value: MoneyInput = 0): Decimal {
  return D(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

export function moneyNumber(value: MoneyInput = 0): number {
  return money(value).toNumber()
}

export function moneyString(value: MoneyInput = 0): string {
  return money(value).toFixed(2)
}

export function addMoney(...values: MoneyInput[]): Decimal {
  let total = new Decimal(0)
  for (const value of values) {
    total = total.plus(D(value))
  }
  return money(total)
}

export function subMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return money(D(a).minus(D(b)))
}

export function mulMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return money(D(a).times(D(b)))
}

export function divMoney(a: MoneyInput, b: MoneyInput): Decimal {
  const denom = D(b)
  if (denom.isZero()) return money(0)
  return money(D(a).div(denom))
}

export function percent(numerator: MoneyInput, denominator: MoneyInput): Decimal {
  const denom = D(denominator)
  if (denom.isZero()) return money(0)
  return money(D(numerator).div(denom).times(100))
}

export function determinePaymentStatus(
  total: MoneyInput,
  paid: MoneyInput,
): 'PAID' | 'PARTIALLY_PAID' | 'PENDING' {
  const t = money(total)
  const p = money(paid)
  if (p.lte(0)) return 'PENDING'
  if (p.gte(t) && t.gt(0)) return 'PAID'
  if (t.lte(0) && p.lte(0)) return 'PAID'
  return 'PARTIALLY_PAID'
}

export function formatCurrency(value: MoneyInput, currency = 'AED'): string {
  const amount = moneyNumber(value)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${currency} ${formatted}`
}

export function prismaDecimal(value: MoneyInput): Prisma.Decimal {
  return new Prisma.Decimal(moneyString(value))
}
