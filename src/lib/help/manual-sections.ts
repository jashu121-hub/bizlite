import { APP_NAME, APP_TAGLINE } from '@/lib/constants'
import type { ManualSection } from '@/lib/help/types'

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'about',
    slug: 'about-bizlite-2026',
    title: `About ${APP_NAME}`,
    icon: 'book',
    summary: `${APP_NAME} — ${APP_TAGLINE}.`,
    keywords: [
      'about',
      'bizlite',
      'bizlite 2026',
      'owner',
      'jamshad',
      'business made simple',
    ],
    content: [
      {
        type: 'info',
        text: `${APP_NAME} is a simple business management application created to help small-business owners record sales, control expenses, manage products, maintain customer information, and understand business performance without complicated accounting procedures.`,
      },
      {
        type: 'p',
        text: `${APP_NAME} is a web-based small-business management application designed to simplify sales, expenses, products, inventory, customers, cash and bank accounts, costing, and business reporting.`,
      },
      {
        type: 'dl',
        items: [
          { term: 'Application Name', definition: APP_NAME },
          { term: 'Tagline', definition: APP_TAGLINE },
          { term: 'Created For', definition: 'Small Business Owners' },
          { term: 'Created and owned by', definition: 'Jamshad RA' },
          { term: 'Professional Background', definition: 'Senior Accountant' },
          { term: 'Location', definition: 'United Arab Emirates' },
        ],
      },
      {
        type: 'tip',
        text: 'Your own business details from Settings appear below this section. When you update your Business Profile, those details update here automatically.',
      },
    ],
  },
  {
    id: 'getting-started',
    slug: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket',
    summary: `Set up ${APP_NAME} step by step for your business.`,
    keywords: [
      'getting started',
      'setup',
      'login',
      'business profile',
      'currency',
      'first product',
      'first customer',
      'first sale',
      'first expense',
      'cash account',
      'bank account',
    ],
    content: [
      {
        type: 'p',
        text: `Follow these steps when you start using ${APP_NAME}. You do not need accounting experience — just enter what happens in your business each day.`,
      },
      { type: 'h3', text: 'How to get started' },
      {
        type: 'ol',
        items: [
          `Open ${APP_NAME} in your browser or from the installed app on your phone.`,
          'Log in with your email and password.',
          'Go to Settings and complete your Business Profile (business name, owner name, phone, and currency).',
          'Select the currency you use for prices and reports (for example AED).',
          'Create income-related product categories and expense categories you will use often.',
          'Open Cash & Bank and create at least one Cash account and one Bank account. Leave the opening balance empty if you are not sure — you can add a starting balance later.',
          'Add your first product with name, cost price, selling price, and opening stock if you already have stock.',
          'Add your first customer with name and phone number.',
          'Record your first sale from Sales or the Quick + button.',
          'Record your first expense from Expenses or the Quick + button.',
        ],
      },
      { type: 'h3', text: 'Recommended initial setup' },
      {
        type: 'checklist',
        items: [
          'Complete Business Profile',
          'Create Cash Account',
          'Create Bank Account',
          'Create product categories',
          'Create expense categories',
          'Add products',
          'Add customers',
          'Enter sales',
          'Enter expenses',
        ],
      },
      {
        type: 'tip',
        text: 'You can start with only a few products and customers. Add more as your business grows.',
      },
    ],
  },
  {
    id: 'dashboard',
    slug: 'dashboard',
    title: 'Dashboard',
    icon: 'layout',
    summary: 'See a clear summary of how your business is performing.',
    keywords: [
      'dashboard',
      'total sales',
      'total expenses',
      'net profit',
      'cash balance',
      'bank balance',
      'low stock',
      'pending payments',
      'date filter',
      'this month',
      'kpi',
    ],
    content: [
      {
        type: 'p',
        text: 'The Dashboard is your home screen. It shows a summary of business performance for the date range you select.',
      },
      { type: 'h3', text: 'What you can see' },
      {
        type: 'ul',
        items: [
          'Total Sales — money from sales in the selected period.',
          'Total Expenses — money spent in the selected period.',
          'Net Profit — sales minus expenses for the period (a simple view of result).',
          'Cash Balance — current total in your cash-type accounts.',
          'Bank Balance — current total in your bank-type accounts.',
          'Total Customers — how many customers you have.',
          'Products — how many products you manage.',
          'Low Stock — products that need restocking.',
          'Pending Payments — amounts customers still owe.',
          'Sales versus Expenses chart — compares sales and spending over time.',
          'Expense Category breakdown — where money is going.',
          'Sales by Product — which products sell best.',
          'Recent Sales and Recent Expenses — latest activity.',
        ],
      },
      {
        type: 'info',
        text: 'KPI cards on the Dashboard are clickable. Tap a card to open a short summary popup with more detail.',
      },
      { type: 'h3', text: 'Date filters' },
      {
        type: 'ul',
        items: [
          'Today',
          'This Week',
          'This Month',
          'This Year',
          'Lifetime',
          'Custom Date Range',
        ],
      },
      {
        type: 'tip',
        text: 'All Dashboard cards, charts, and summaries update based on the selected date filter. If numbers look wrong, check the date filter first.',
      },
    ],
  },
  {
    id: 'quick-add',
    slug: 'quick-add',
    title: 'Quick Add Button',
    icon: 'plus',
    summary: 'Add a sale, expense, product, or customer without leaving the page.',
    keywords: ['quick add', 'quick +', 'new sale', 'new expense', 'new product', 'new customer', 'popup'],
    content: [
      {
        type: 'p',
        text: 'The Quick + button lets you create common records quickly. Forms open as popups so you can stay on the Dashboard or current page.',
      },
      { type: 'h3', text: 'Available shortcuts' },
      {
        type: 'ul',
        items: ['New Sale', 'New Expense', 'New Product', 'New Customer'],
      },
      { type: 'h3', text: 'How to use Quick Add' },
      {
        type: 'ol',
        items: [
          'Click or tap the Quick + button.',
          'Select the action you need (for example New Sale).',
          'Enter the required information in the popup form.',
          'Save the record.',
          'Close the popup when finished, or continue with another action.',
        ],
      },
      {
        type: 'tip',
        text: 'Quick Add is ideal during a busy day when you want to record a sale or expense in a few taps.',
      },
    ],
  },
  {
    id: 'sales',
    slug: 'sales',
    title: 'Sales',
    icon: 'receipt',
    summary: 'Record customer sales, payments, and balances.',
    keywords: [
      'add sale',
      'create sale',
      'discount',
      'payment status',
      'paid',
      'partially paid',
      'unpaid',
      'payment method',
      'deposit to account',
      'edit sale',
      'delete sale',
      'search sales',
      'filter sales',
    ],
    content: [
      {
        type: 'p',
        text: 'Use Sales to record what you sell to customers. Each sale can include products, discounts, payment status, and the Cash or Bank account that received the money.',
      },
      { type: 'h3', text: 'How to create a sale' },
      {
        type: 'ol',
        items: [
          'Go to Sales and choose New Sale (or use Quick +).',
          'Select a customer, or leave blank for a walk-in sale if allowed.',
          'Select a product and enter the quantity.',
          'Apply a discount if needed.',
          'Select the payment status: Paid, Partially Paid, or Unpaid.',
          'Select the payment method (Cash, Card, Bank Transfer, and so on).',
          'Select the receiving Cash or Bank account when money was received.',
          'Enter a reference number if useful (receipt or invoice note).',
          'Add notes if needed, then save.',
        ],
      },
      { type: 'h3', text: 'Payment status explained' },
      {
        type: 'dl',
        items: [
          {
            term: 'Paid',
            definition: 'The customer paid the full amount. The sale should update the selected Cash or Bank account when an account is chosen.',
          },
          {
            term: 'Partially Paid',
            definition: 'The customer paid part of the total. The remaining amount stays as outstanding until more payment is recorded.',
          },
          {
            term: 'Unpaid',
            definition: 'No payment yet. The amount stays under pending customer payments until payment is recorded.',
          },
        ],
      },
      { type: 'h3', text: 'Other sales actions' },
      {
        type: 'ul',
        items: [
          'Edit a sale to correct products, amounts, or payment details.',
          'Delete a sale only when you are sure — this can affect stock and reports.',
          'View sale details for a full invoice-style summary.',
          'Search sales by invoice or customer.',
          'Filter by date, customer, product, and payment status.',
        ],
      },
      {
        type: 'warning',
        text: 'An unpaid sale does not increase your Cash or Bank balance. Profit on the Dashboard may include the sale, but cash only rises when payment is received and linked to an account.',
      },
    ],
  },
  {
    id: 'expenses',
    slug: 'expenses',
    title: 'Expenses',
    icon: 'wallet',
    summary: 'Track money your business spends.',
    keywords: [
      'add expense',
      'record expense',
      'expense category',
      'rent',
      'utilities',
      'pay from account',
      'supplier',
      'receipt',
      'edit expense',
      'delete expense',
    ],
    content: [
      {
        type: 'p',
        text: 'Expenses are costs of running your business — rent, materials, transport, salaries, and more. Recording them helps you see true profit.',
      },
      { type: 'h3', text: 'How to record an expense' },
      {
        type: 'ol',
        items: [
          'Go to Expenses and choose New Expense (or use Quick +).',
          'Select an expense category.',
          'Enter the supplier or payee if useful.',
          'Select the Cash or Bank account the money came from.',
          'Enter the expense date and amount.',
          'Add a reference number if you have an invoice or receipt number.',
          'Add notes if needed.',
          'Upload a receipt when the form supports attachments.',
          'Save the expense.',
        ],
      },
      {
        type: 'info',
        text: 'Recording an expense with a Cash or Bank account selected reduces that account balance.',
      },
      { type: 'h3', text: 'Common expense categories' },
      {
        type: 'ul',
        items: [
          'Rent',
          'Utilities',
          'Transportation',
          'Salaries',
          'Marketing',
          'Production Cost',
          'Materials',
          'Stitching',
          'Design',
          'Delivery',
          'Repairs',
          'Office Expenses',
          'Other Expenses',
        ],
      },
      {
        type: 'p',
        text: 'You can edit or delete expenses, search the list, filter by date or category, and review category breakdowns on the Dashboard and Reports.',
      },
    ],
  },
  {
    id: 'products',
    slug: 'products-and-inventory',
    title: 'Products and Inventory',
    icon: 'package',
    summary: 'Manage products, prices, and stock levels.',
    keywords: [
      'add product',
      'add stock',
      'adjust stock',
      'sku',
      'cost price',
      'selling price',
      'opening stock',
      'low stock',
      'edit product',
      'delete product',
      'inventory',
      'product history',
    ],
    content: [
      {
        type: 'p',
        text: 'Products are what you sell. Inventory (stock) shows how many units you have left.',
      },
      { type: 'h3', text: 'How to add a product' },
      {
        type: 'ol',
        items: [
          'Go to Products and choose New Product.',
          'Add or choose a product category.',
          'Enter SKU or product code if you use one.',
          'Enter the product name.',
          'Enter cost price (what one unit costs you).',
          'Enter selling price (what you charge the customer).',
          'Enter opening stock if you already have units on hand. Leave the field empty if stock is zero or unknown — do not force 0.00 into the box.',
          `Enter a minimum stock level so ${APP_NAME} can warn you when stock is low.`,
          'Save the product.',
        ],
      },
      { type: 'h3', text: 'Stock actions' },
      {
        type: 'ul',
        items: [
          'Add Stock — increase quantity when you buy or produce more.',
          'Adjust Stock — correct the quantity when a count does not match.',
          'View — see product details and history.',
          'Edit — change name, prices, or settings.',
          'Delete — remove a product (use with care).',
        ],
      },
      {
        type: 'info',
        text: 'When you record a product sale, stock reduces automatically by the quantity sold.',
      },
      {
        type: 'warning',
        text: 'Deleting a product already used in sales may affect reports. Prefer marking the product inactive when you no longer sell it.',
      },
    ],
  },
  {
    id: 'product-costing',
    slug: 'product-costing',
    title: 'Product Costing',
    icon: 'calculator',
    summary: 'Understand production cost, unit cost, and profit per item.',
    keywords: [
      'product cost',
      'cost calculator',
      'unit cost',
      'gross profit',
      'margin',
      'material cost',
      'stitching',
      'production cost',
      'overhead',
      'selling price',
    ],
    content: [
      {
        type: 'p',
        text: 'Product costing helps you know how much it really costs to make or prepare one item before you set a selling price.',
      },
      {
        type: 'example',
        title: 'Example: making a shirt',
        text: 'Add Material Cost, Stitching Cost, Design Cost, Transportation Cost, Packaging Cost, Marketing Allocation, and Other Direct Cost. These pieces together show what the shirt costs to produce.',
      },
      {
        type: 'formula',
        text: 'Total Production Cost = Materials + Stitching + Design + Transportation + Packaging + Other Direct Costs',
      },
      {
        type: 'formula',
        text: 'Unit Cost = Total Production Cost ÷ Number of Units Produced',
      },
      {
        type: 'formula',
        text: 'Gross Profit per Unit = Selling Price − Unit Cost',
      },
      {
        type: 'formula',
        text: 'Gross Profit Margin % = Gross Profit ÷ Selling Price × 100',
      },
      { type: 'h3', text: 'Simple meaning of cost words' },
      {
        type: 'dl',
        items: [
          {
            term: 'Production Cost',
            definition: 'Direct costs to make or prepare the product (materials, stitching, packaging for production, and similar).',
          },
          {
            term: 'Selling Cost',
            definition: 'Costs to sell and deliver (delivery, sales marketing, commission-style selling costs).',
          },
          {
            term: 'Overhead Cost',
            definition: 'General running costs that support the business (rent, utilities, office costs).',
          },
          {
            term: 'Total Cost',
            definition: 'Production + Selling + Overhead costs for the period or product view you are checking.',
          },
          {
            term: 'Selling Price',
            definition: 'What the customer pays for one unit. This is income, not an expense.',
          },
          {
            term: 'Gross Profit',
            definition: 'Sales revenue minus the direct cost of what was sold.',
          },
          {
            term: 'Net Profit',
            definition: 'What remains after production, selling, and overhead expenses are considered.',
          },
        ],
      },
      {
        type: 'warning',
        text: 'Do not treat the selling price as an expense. Selling price is what the customer pays you.',
      },
    ],
  },
  {
    id: 'customers',
    slug: 'customers',
    title: 'Customers',
    icon: 'users',
    summary: 'Keep customer details and track what they owe.',
    keywords: [
      'add customer',
      'customer payment',
      'outstanding',
      'outstanding payment',
      'outstanding balance',
      'purchase history',
      'edit customer',
      'delete customer',
      'search customers',
    ],
    content: [
      {
        type: 'p',
        text: 'Customers are the people or businesses who buy from you. Keeping their details helps you track sales and unpaid balances.',
      },
      { type: 'h3', text: 'How to add a customer' },
      {
        type: 'ol',
        items: [
          'Go to Customers and choose New Customer.',
          'Enter the customer name.',
          'Enter phone number and email if available.',
          'Enter address if useful.',
          `Enter an opening balance only when the customer already owed you money before you started ${APP_NAME}.`,
          'Save the customer.',
        ],
      },
      { type: 'h3', text: 'What you can review' },
      {
        type: 'ul',
        items: [
          'Purchase history',
          'Total sales',
          'Total paid',
          'Outstanding balance (amount still unpaid)',
          'Record a customer payment against the relevant sale and receiving Cash or Bank account',
          'Search customers by name or phone',
        ],
      },
      {
        type: 'info',
        text: 'Customer payments should be connected to the relevant sale and the Cash or Bank account that received the money.',
      },
      {
        type: 'tip',
        text: 'If you no longer deal with a customer, prefer deactivating rather than deleting when they have past sales.',
      },
    ],
  },
  {
    id: 'cash-bank',
    slug: 'cash-and-bank',
    title: 'Cash and Bank Accounts',
    icon: 'landmark',
    summary: 'Track money in cash, bank, and other payment accounts.',
    keywords: [
      'cash account',
      'bank account',
      'petty cash',
      'opening balance',
      'transfer',
      'money in',
      'money out',
      'closing balance',
      'payment account',
    ],
    content: [
      {
        type: 'p',
        text: 'Cash & Bank shows where your money sits — cash drawer, bank account, petty cash, or other payment accounts.',
      },
      { type: 'h3', text: 'Accounts you can create' },
      {
        type: 'ul',
        items: ['Cash Account', 'Bank Account', 'Petty Cash Account', 'Additional payment accounts'],
      },
      {
        type: 'tip',
        text: 'When creating a new account, leave the opening balance empty if you do not want to set one yet. Do not automatically enter 0.00 — type an amount only when you know it.',
      },
      {
        type: 'formula',
        text: 'Closing Balance = Opening Balance + Money Received − Money Paid',
      },
      { type: 'h3', text: 'How balances change' },
      {
        type: 'ul',
        items: [
          'Paid sales increase the selected account.',
          'Customer collections increase the selected account.',
          'Expenses reduce the selected account.',
          'Transfers reduce one account and increase the other.',
          'Cash and Bank balances must not be counted twice — each amount belongs to one account.',
        ],
      },
      { type: 'h3', text: 'How to transfer money' },
      {
        type: 'ol',
        items: [
          'Open Cash & Bank.',
          'Choose Transfer.',
          'Select the account money leaves and the account money enters.',
          'Enter the amount and date, then save.',
        ],
      },
    ],
  },
  {
    id: 'reports',
    slug: 'reports',
    title: 'Reports',
    icon: 'bar-chart',
    summary: 'Review sales, expenses, profit, stock, and payments.',
    keywords: [
      'reports',
      'sales report',
      'expense report',
      'profit report',
      'inventory report',
      'customer report',
      'outstanding payments report',
      'cost report',
      'export',
      'print',
      'date filter',
    ],
    content: [
      {
        type: 'p',
        text: 'Reports help you understand performance over a period you choose. Totals always follow the selected date range and filters.',
      },
      { type: 'h3', text: 'Available reports' },
      {
        type: 'ul',
        items: [
          'Sales Report',
          'Expense Report',
          'Profit Report',
          'Product Performance Report',
          'Inventory Report',
          'Customer Report',
          'Outstanding Payments Report',
          'Cash and Bank Report',
          'Cost Report',
        ],
      },
      { type: 'h3', text: 'How to use filters and export' },
      {
        type: 'ul',
        items: [
          'Date filters — choose the period you want to review.',
          'Category, product, customer, and payment-status filters — narrow the results.',
          'Export — download data when available.',
          'Print — print a clean view for your records.',
        ],
      },
      { type: 'h3', text: 'Cost Report sections' },
      {
        type: 'ul',
        items: [
          'Production Cost',
          'Selling and Distribution Cost',
          'Overhead Cost',
          'Total Cost',
          'Sales Revenue',
          'Gross Profit',
          'Net Profit',
        ],
      },
      {
        type: 'tip',
        text: 'If a report looks empty, widen the date range or clear filters. Report totals always update with the selected date range.',
      },
    ],
  },
  {
    id: 'settings',
    slug: 'settings',
    title: 'Settings',
    icon: 'settings',
    summary: 'Manage your business profile, categories, and preferences.',
    keywords: [
      'settings',
      'business profile',
      'user profile',
      'categories',
      'product categories',
      'expense categories',
      'currency',
      'financial year',
      'invoice settings',
      'delete category',
      'edit category',
    ],
    content: [
      {
        type: 'p',
        text: `Settings is where you control your business details and lists used across ${APP_NAME}.`,
      },
      { type: 'h3', text: 'Settings areas' },
      {
        type: 'ul',
        items: [
          'Business Profile — name, owner, phone, currency, and related details.',
          'User Profile — your login identity used in the app.',
          'Categories — shared lists used for organization.',
          'Product Categories — groups for products.',
          'Expense Categories — groups for spending.',
          'Cash and Bank Accounts — managed mainly under Cash & Bank.',
          'Currency — the money unit used for amounts and reports.',
          'Financial Year — business year settings when available.',
          'Invoice Settings — invoice preferences when available.',
          'Data Settings — data-related options when available.',
          'Security — password and account access.',
          'Appearance — display preferences when available.',
        ],
      },
      { type: 'h3', text: 'Working with categories' },
      {
        type: 'ol',
        items: [
          'Open Settings and find the category list you need.',
          'Add a category with a clear name.',
          'Use Edit on a row to change it.',
          'Use Save to keep changes, or Cancel to discard them.',
          'Use Delete or deactivate when a category is no longer needed.',
        ],
      },
      {
        type: 'info',
        text: 'Every category row should offer clear Edit, Save, Cancel, and Delete actions so you always know what will happen.',
      },
    ],
  },
  {
    id: 'editing-deleting',
    slug: 'editing-and-deleting',
    title: 'Editing and Deleting Records',
    icon: 'edit',
    summary: 'Change records safely and confirm before deleting.',
    keywords: ['edit', 'delete', 'cancel', 'deactivate', 'confirmation', 'are you sure'],
    content: [
      {
        type: 'dl',
        items: [
          { term: 'Edit', definition: 'Change an existing record and save the update.' },
          {
            term: 'Delete',
            definition: 'Remove a record permanently. Always confirm first.',
          },
          {
            term: 'Cancel',
            definition: 'Leave a form without saving changes.',
          },
          {
            term: 'Deactivate',
            definition: 'Keep history but stop using the item (preferred for products or customers with past transactions).',
          },
        ],
      },
      {
        type: 'warning',
        text: `${APP_NAME} shows a confirmation popup before deleting. The message should name the record, for example: “Are you sure you want to delete the product ‘Classic Shirt’? This action may affect related reports.” Never delete without reading the confirmation.`,
      },
    ],
  },
  {
    id: 'understanding-results',
    slug: 'understanding-business-results',
    title: 'Understanding Business Results',
    icon: 'trending',
    summary: 'Simple meanings of profit, cash, and receivables.',
    keywords: [
      'profit',
      'sales revenue',
      'cost of goods sold',
      'gross profit',
      'operating expenses',
      'net profit',
      'outstanding receivable',
      'cash flow',
    ],
    content: [
      {
        type: 'dl',
        items: [
          {
            term: 'Sales Revenue',
            definition: 'Total value of sales recorded during the selected period.',
          },
          {
            term: 'Cost of Goods Sold',
            definition: 'Direct cost of the products sold.',
          },
          {
            term: 'Gross Profit',
            definition: 'Sales Revenue minus Cost of Goods Sold.',
          },
          {
            term: 'Operating Expenses',
            definition: 'Expenses required to run the business.',
          },
          {
            term: 'Net Profit',
            definition: 'Gross Profit minus Operating Expenses.',
          },
          {
            term: 'Outstanding Receivable',
            definition: 'Amount customers still need to pay.',
          },
          {
            term: 'Cash Flow',
            definition: 'Money received and money paid during a period.',
          },
        ],
      },
      {
        type: 'formula',
        text: 'Net Profit = Sales Revenue − Production Cost − Selling Cost − Overhead Expenses',
      },
      {
        type: 'info',
        text: 'Profit and cash balance are not always the same. Some sales may remain unpaid, so profit can rise before cash arrives.',
      },
    ],
  },
  {
    id: 'common-problems',
    slug: 'common-problems',
    title: 'Common Problems',
    icon: 'help',
    summary: 'Quick fixes for everyday issues.',
    keywords: [
      'troubleshoot',
      'product not appearing',
      'dashboard not updating',
      'account balance incorrect',
      'stock incorrect',
      '0.00',
      'numbers display',
      'common problems',
    ],
    content: [
      { type: 'h3', text: 'Product is not appearing in a sale' },
      {
        type: 'ul',
        items: [
          'Check whether the product is active.',
          'Check whether stock is available.',
          'Check whether the correct category is selected.',
          'Confirm the product was saved successfully.',
        ],
      },
      { type: 'h3', text: 'Dashboard is not updating' },
      {
        type: 'ul',
        items: [
          'Check whether the correct date filter is selected.',
          'Check whether the transaction date is correct.',
          'Refresh the page.',
          'Confirm the transaction was saved.',
        ],
      },
      { type: 'h3', text: 'Account balance is incorrect' },
      {
        type: 'ul',
        items: [
          'Check whether the correct payment account was selected.',
          'Check whether a transaction was entered twice.',
          'Check whether a transaction was deleted.',
          'Check whether an opening balance was entered correctly.',
          'Check whether transfers were recorded correctly.',
        ],
      },
      { type: 'h3', text: 'Stock is incorrect' },
      {
        type: 'ul',
        items: [
          'Review opening stock.',
          'Review added stock.',
          'Review sales quantities.',
          'Check deleted sales.',
          'Review stock adjustments.',
        ],
      },
      { type: 'h3', text: 'Numbers display as 0.00' },
      {
        type: 'p',
        text: 'Editable amount fields should remain empty until you enter a value. Placeholder text may show 0.00 as a hint, but it must disappear when you select the field so you can type freely.',
      },
    ],
  },
]

export function getManualSectionBySlug(slug: string): ManualSection | undefined {
  return MANUAL_SECTIONS.find((section) => section.slug === slug || section.id === slug)
}

export function flattenSectionText(section: ManualSection): string {
  const parts = [section.title, section.summary, ...section.keywords]
  for (const block of section.content) {
    switch (block.type) {
      case 'p':
      case 'h3':
      case 'tip':
      case 'info':
      case 'warning':
      case 'formula':
        parts.push(block.text)
        break
      case 'example':
        if (block.title) parts.push(block.title)
        parts.push(block.text)
        break
      case 'ol':
      case 'ul':
      case 'checklist':
        parts.push(...block.items)
        break
      case 'dl':
        for (const item of block.items) {
          parts.push(item.term, item.definition)
        }
        break
    }
  }
  return parts.join(' ')
}
