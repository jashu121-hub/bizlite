export const APP_NAME = 'BizLite 2026'
export const APP_NAME_MARK = 'BizLite'
export const APP_YEAR = '2026'
export const APP_SHORT_NAME = 'BizLite 2026'
export const APP_TAGLINE = 'Business Made Simple'
export const APP_DESCRIPTION =
  'BizLite 2026 is a simple business management application for managing sales, expenses, products, inventory, customers, cash, bank accounts, and business reports.'
export const APP_PAGE_TITLE = 'BizLite 2026 | Business Made Simple'
export const DEFAULT_CURRENCY = 'AED'
export const THEME_COLOR = '#0f766e'
export const BACKGROUND_COLOR = '#f4f7f6'

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'OTHER', label: 'Other' },
] as const

export const EXPENSE_CATEGORIES = [
  { value: 'MATERIALS', label: 'Materials' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'RENT', label: 'Rent' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OTHER', label: 'Other' },
] as const

export const EXPENSE_COST_TYPES = [
  { value: 'PRODUCTION', label: 'Production Cost' },
  { value: 'SELLING', label: 'Selling Cost' },
  { value: 'OVERHEAD', label: 'Overhead Cost' },
] as const

export const TRANSPORT_SUBCATEGORIES = [
  { value: 'INWARD_TRANSPORT', label: 'Inward Transport' },
  { value: 'CUSTOMER_DELIVERY', label: 'Customer Delivery' },
  { value: 'GENERAL_TRANSPORT', label: 'General Business Transport' },
] as const

export const PRODUCT_CATEGORIES = [
  'General',
  'Food & Beverage',
  'Clothing',
  'Electronics',
  'Beauty',
  'Home',
  'Services',
  'Other',
] as const

export const CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'INR'] as const

export const PAGE_SIZE = 10
