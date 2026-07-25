import { PrismaClient } from '@prisma/client'
import { subDays } from 'date-fns'

const prisma = new PrismaClient()
const email = 'demo@bizlite.app'

const profile = await prisma.userProfile.findFirst({ where: { email } })
if (!profile) {
  console.error('Demo profile not found. Run create-demo-user.mjs first.')
  process.exit(1)
}

const userId = profile.id

await prisma.userProfile.update({
  where: { id: userId },
  data: {
    ownerName: 'Demo User',
    businessName: 'Demo Crafts UAE',
    setupCompleted: true,
  },
})

// Clear light seed and rebuild richer dataset
await prisma.customerPayment.deleteMany({ where: { userId } })
await prisma.saleItem.deleteMany({ where: { sale: { userId } } })
await prisma.stockMovement.deleteMany({ where: { userId } })
await prisma.sale.deleteMany({ where: { userId } })
await prisma.expense.deleteMany({ where: { userId } })
await prisma.product.deleteMany({ where: { userId } })
await prisma.customer.deleteMany({ where: { userId } })

const products = await Promise.all(
  [
    ['Handmade Soap Set', 'Beauty', 18, 45, 28, 10],
    ['Ceramic Mug', 'Home', 12, 35, 8, 15],
    ['Cotton Tote Bag', 'Clothing', 8, 25, 35, 12],
    ['Gift Wrapping', 'Services', 2, 15, 90, 20],
    ['Scented Candle', 'Home', 10, 30, 22, 8],
    ['Face Cream', 'Beauty', 22, 65, 14, 6],
  ].map(([name, category, cost, sell, stock, low]) =>
    prisma.product.create({
      data: {
        userId,
        name,
        category,
        costPrice: cost,
        sellingPrice: sell,
        openingStock: stock + 10,
        currentStock: stock,
        lowStockLevel: low,
        isActive: true,
      },
    }),
  ),
)

const customers = await Promise.all(
  [
    ['Ali Khan', '+971 50 111 2233'],
    ['Sara Ahmed', '+971 55 222 3344'],
    ['Walk-in Customer', ''],
    ['Omar Farid', '+971 52 333 4455'],
  ].map(([name, phone]) =>
    prisma.customer.create({
      data: { userId, name, phone: phone || null },
    }),
  ),
)

const year = new Date().getFullYear()
let invoice = 1

async function makeSale({ daysAgo, customer, product, qty, paidRatio, method }) {
  const date = subDays(new Date(), daysAgo)
  const unit = Number(product.sellingPrice)
  const cost = Number(product.costPrice)
  const total = unit * qty
  const paid = Math.round(total * paidRatio * 100) / 100
  const balance = Math.round((total - paid) * 100) / 100
  const status = paid <= 0 ? 'PENDING' : paid >= total ? 'PAID' : 'PARTIALLY_PAID'
  const sale = await prisma.sale.create({
    data: {
      userId,
      customerId: customer.id,
      invoiceNumber: `INV-${year}-${String(invoice++).padStart(5, '0')}`,
      date,
      subtotal: total,
      discount: 0,
      totalAmount: total,
      amountPaid: paid,
      balancePending: balance,
      totalCost: cost * qty,
      grossProfit: total - cost * qty,
      paymentMethod: method,
      paymentStatus: status,
      items: {
        create: [
          {
            productId: product.id,
            productName: product.name,
            quantity: qty,
            unitCost: cost,
            unitSellingPrice: unit,
            lineTotal: total,
            lineCost: cost * qty,
            lineProfit: total - cost * qty,
          },
        ],
      },
    },
  })
  await prisma.product.update({
    where: { id: product.id },
    data: { currentStock: { decrement: qty } },
  })
  return sale
}

await makeSale({
  daysAgo: 0,
  customer: customers[2],
  product: products[0],
  qty: 2,
  paidRatio: 1,
  method: 'CASH',
})
await makeSale({
  daysAgo: 1,
  customer: customers[0],
  product: products[1],
  qty: 3,
  paidRatio: 0.5,
  method: 'CARD',
})
await makeSale({
  daysAgo: 2,
  customer: customers[1],
  product: products[2],
  qty: 4,
  paidRatio: 1,
  method: 'BANK_TRANSFER',
})
await makeSale({
  daysAgo: 3,
  customer: customers[3],
  product: products[4],
  qty: 2,
  paidRatio: 0,
  method: 'CASH',
})
await makeSale({
  daysAgo: 5,
  customer: customers[0],
  product: products[5],
  qty: 1,
  paidRatio: 1,
  method: 'CARD',
})

const expenseRows = [
  [0, 'MATERIALS', 'Shop supplies restock', 250],
  [1, 'SALARY', 'Part-time helper', 120],
  [1, 'TRANSPORT', 'Delivery runs', 50],
  [2, 'MARKETING', 'Instagram ads', 30],
  [3, 'UTILITIES', 'Electricity share', 100],
  [4, 'PACKAGING', 'Boxes and bags', 40],
  [5, 'OTHER', 'Miscellaneous', 16],
]

for (const [daysAgo, category, description, amount] of expenseRows) {
  await prisma.expense.create({
    data: {
      userId,
      date: subDays(new Date(), daysAgo),
      category,
      description,
      amount,
      paymentMethod: 'CARD',
    },
  })
}

console.log('Demo data enriched for', email)
await prisma.$disconnect()
