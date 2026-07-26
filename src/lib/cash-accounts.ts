export const CASH_ACCOUNT_TYPES = [
  { value: 'CASH' as const, label: 'Cash' },
  { value: 'BANK' as const, label: 'Bank' },
  { value: 'OTHER' as const, label: 'Other' },
]

export const CASH_BALANCE_SOURCES = [
  { value: 'OWNER_CAPITAL' as const, label: 'Owner Capital' },
  { value: 'PREVIOUS_BUSINESS_BALANCE' as const, label: 'Previous Business Balance' },
  { value: 'LOAN_RECEIVED' as const, label: 'Loan Received' },
  { value: 'OTHER_FUNDING' as const, label: 'Other Funding' },
]

export function cashAccountTypeLabel(type: string) {
  return CASH_ACCOUNT_TYPES.find((item) => item.value === type)?.label ?? type
}

export function cashBalanceSourceLabel(source: string | null | undefined) {
  if (!source) return '—'
  return CASH_BALANCE_SOURCES.find((item) => item.value === source)?.label ?? source
}

export function cashTransactionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    OPENING_BALANCE: 'Opening Balance',
    STARTING_BALANCE: 'Starting Balance',
    MONEY_IN: 'Money In',
    MONEY_OUT: 'Money Out',
    TRANSFER_IN: 'Transfer In',
    TRANSFER_OUT: 'Transfer Out',
    SALE_RECEIPT: 'Sale Receipt',
    EXPENSE_PAYMENT: 'Expense Payment',
    PURCHASE_PAYMENT: 'Stock Purchase Payment',
    PRODUCTION_PAYMENT: 'Production Payment',
    CUSTOMER_PAYMENT: 'Customer Payment',
    BALANCE_ADJUSTMENT: 'Balance Adjustment',
  }
  return labels[type] ?? type
}
