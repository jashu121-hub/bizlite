import type {
  ExpenseCategory,
  ExpenseCostType,
  ExpenseSubcategory,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client'
import { costTypeLabel, subcategoryLabel } from '@/lib/expense-cost'

export function paymentMethodLabel(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    CASH: 'Cash',
    CARD: 'Card',
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_MONEY: 'Mobile Money',
    OTHER: 'Other',
  }
  return map[method]
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const map: Record<PaymentStatus, string> = {
    PAID: 'Paid',
    PARTIALLY_PAID: 'Partial',
    PENDING: 'Pending',
  }
  return map[status]
}

export function expenseCategoryLabel(category: ExpenseCategory): string {
  const map: Record<ExpenseCategory, string> = {
    MATERIALS: 'Materials',
    TRANSPORT: 'Transport',
    RENT: 'Rent',
    UTILITIES: 'Utilities',
    PACKAGING: 'Packaging',
    MARKETING: 'Marketing',
    SALARY: 'Salary',
    MAINTENANCE: 'Maintenance',
    OTHER: 'Other',
  }
  return map[category]
}

export function expenseCostTypeLabel(costType: ExpenseCostType | null | undefined): string {
  return costTypeLabel(costType)
}

export function expenseSubcategoryLabel(
  subcategory: ExpenseSubcategory | null | undefined,
): string {
  return subcategoryLabel(subcategory)
}

export function stockStatus(current: number, low: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (current <= 0) return 'Out of Stock'
  if (current <= low) return 'Low Stock'
  return 'In Stock'
}
