import { PrismaClient, Prisma } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { ensureExpenseCategories } from '../src/lib/expense-categories'

const prisma = new PrismaClient()
const email = 'demo@bizlite.app'
const password = 'Demo1234!'
const decimal = (value: number | string) => new Prisma.Decimal(value)

const products = [
  { name: 'Scented Soy Candle', category: 'Candles', sku: 'CND-001', cost: 18, price: 45, stock: 80, low: 12 },
  { name: 'Oud Soy Candle', category: 'Candles', sku: 'CND-002', cost: 24, price: 60, stock: 65, low: 10 },
  { name: 'Macramé Wall Hanging', category: 'Home Decor', sku: 'MCR-001', cost: 42, price: 110, stock: 35, low: 6 },
  { name: 'Palm Leaf Basket', category: 'Home Decor', sku: 'BKT-001', cost: 28, price: 75, stock: 50, low: 8 },
  { name: 'Personalised Gift Box', category: 'Gift Sets', sku: 'GFT-001', cost: 55, price: 145, stock: 40, low: 6 },
  { name: 'Hand-Painted Mug', category: 'Ceramics', sku: 'MUG-001', cost: 20, price: 55, stock: 70, low: 10 },
  { name: 'Linen Table Runner', category: 'Textiles', sku: 'TXT-001', cost: 35, price: 95, stock: 45, low: 7 },
  { name: 'Embroidered Cushion Cover', category: 'Textiles', sku: 'TXT-002', cost: 30, price: 85, stock: 55, low: 8 },
]

const customers = [
  { name: 'Mariam Al Suwaidi', phone: '+971 50 123 4567', email: 'mariam@example.ae' },
  { name: 'Noura Boutique', phone: '+971 4 555 0132', email: 'orders@nouraboutique.ae' },
  { name: 'Omar Hassan', phone: '+971 55 321 9876', email: 'omar@example.ae' },
  { name: 'The Green Palm Café', phone: '+971 4 555 0488', email: 'hello@greenpalm.ae' },
  { name: 'Fatima Ali', phone: '+971 52 777 1919', email: 'fatima@example.ae' },
  { name: 'Desert Rose Events', phone: '+971 56 404 2100', email: 'bookings@desertrose.ae' },
]

async function getOrCreateDemoUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add both before running the seed.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  const existing = listed.users.find((user) => user.email?.toLowerCase() === email)
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (error || !data.user) throw error ?? new Error('Could not update demo auth user')
    return data.user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw error ?? new Error('Could not create demo auth user')
  return data.user
}

async function main() {
  const authUser = await getOrCreateDemoUser()
  const userId = authUser.id

  await prisma.$transaction(async (tx) => {
    await tx.customerPayment.deleteMany({ where: { userId } })
    await tx.stockMovement.deleteMany({ where: { userId } })
    await tx.sale.deleteMany({ where: { userId } })
    await tx.expense.deleteMany({ where: { userId } })
    await tx.expenseCategoryItem.deleteMany({ where: { userId } })
    await tx.customer.deleteMany({ where: { userId } })
    await tx.product.deleteMany({ where: { userId } })

    await tx.userProfile.upsert({
      where: { id: userId },
      update: {
        email,
        setupCompleted: true,
        businessName: 'Demo Crafts UAE',
        ownerName: 'Aisha Khan',
        currency: 'AED',
      },
      create: {
        id: userId,
        email,
        setupCompleted: true,
        businessName: 'Demo Crafts UAE',
        ownerName: 'Aisha Khan',
        currency: 'AED',
      },
    })
    await ensureExpenseCategories(userId, tx)
    const categoryIds = new Map(
      (await tx.expenseCategoryItem.findMany({ where: { userId }, select: { id: true, systemKey: true } }))
        .map((category) => [category.systemKey!, category.id]),
    )

    const createdProducts = await Promise.all(
      products.map((product) =>
        tx.product.create({
          data: {
            userId,
            name: product.name,
            category: product.category,
            sku: product.sku,
            costPrice: decimal(product.cost),
            sellingPrice: decimal(product.price),
            openingStock: product.stock,
            currentStock: product.stock,
            lowStockLevel: product.low,
          },
        }),
      ),
    )
    const createdCustomers = await Promise.all(
      customers.map((customer) => tx.customer.create({ data: { userId, ...customer } })),
    )

    const start = new Date('2026-03-10T12:00:00.000Z')
    for (const product of createdProducts) {
      const source = products.find((item) => item.sku === product.sku)!
      await tx.stockMovement.create({
        data: {
          userId,
          productId: product.id,
          type: 'OPENING',
          quantity: source.stock,
          date: start,
          notes: 'Opening inventory for demo business',
        },
      })
    }

    const remainingStock = new Map(createdProducts.map((product) => [product.id, product.currentStock]))
    for (let index = 0; index < 20; index += 1) {
      const first = createdProducts[index % createdProducts.length]
      const second = createdProducts[(index + 3) % createdProducts.length]
      const firstSource = products[index % products.length]
      const secondSource = products[(index + 3) % products.length]
      const firstQuantity = (index % 3) + 1
      const secondQuantity = ((index + 1) % 2) + 1
      const firstTotal = decimal(firstSource.price).mul(firstQuantity)
      const secondTotal = decimal(secondSource.price).mul(secondQuantity)
      const firstCost = decimal(firstSource.cost).mul(firstQuantity)
      const secondCost = decimal(secondSource.cost).mul(secondQuantity)
      const subtotal = firstTotal.plus(secondTotal)
      const discount = index % 5 === 0 ? decimal(10) : decimal(0)
      const totalAmount = subtotal.minus(discount)
      const totalCost = firstCost.plus(secondCost)
      const grossProfit = totalAmount.minus(totalCost)
      const paymentStatus = index % 5 === 0 ? 'PENDING' : index % 3 === 0 ? 'PARTIALLY_PAID' : 'PAID'
      const amountPaid =
        paymentStatus === 'PAID'
          ? totalAmount
          : paymentStatus === 'PARTIALLY_PAID'
            ? totalAmount.mul('0.5')
            : decimal(0)
      const balancePending = totalAmount.minus(amountPaid)
      const date = new Date(start)
      date.setUTCDate(start.getUTCDate() + index * 7)
      const customer = createdCustomers[index % createdCustomers.length]
      const paymentMethod = index % 4 === 0 ? 'BANK_TRANSFER' : index % 2 === 0 ? 'CARD' : 'CASH'

      const sale = await tx.sale.create({
        data: {
          userId,
          customerId: customer.id,
          invoiceNumber: `INV-2026-${String(index + 1).padStart(5, '0')}`,
          date,
          subtotal,
          discount,
          totalAmount,
          amountPaid,
          balancePending,
          totalCost,
          grossProfit,
          paymentMethod,
          paymentStatus,
          notes: index % 4 === 0 ? 'Online order' : 'Demo sale',
          items: {
            create: [
              {
                productId: first.id,
                productName: first.name,
                quantity: firstQuantity,
                unitCost: decimal(firstSource.cost),
                unitSellingPrice: decimal(firstSource.price),
                lineTotal: firstTotal,
                lineCost: firstCost,
                lineProfit: firstTotal.minus(firstCost),
              },
              {
                productId: second.id,
                productName: second.name,
                quantity: secondQuantity,
                unitCost: decimal(secondSource.cost),
                unitSellingPrice: decimal(secondSource.price),
                lineTotal: secondTotal,
                lineCost: secondCost,
                lineProfit: secondTotal.minus(secondCost),
              },
            ],
          },
        },
      })

      if (amountPaid.gt(0)) {
        await tx.customerPayment.create({
          data: {
            userId,
            customerId: customer.id,
            saleId: sale.id,
            date,
            amount: amountPaid,
            paymentMethod,
            notes: 'Initial payment on sale',
          },
        })
      }
      for (const [product, quantity] of [[first, firstQuantity], [second, secondQuantity]] as const) {
        remainingStock.set(product.id, (remainingStock.get(product.id) ?? 0) - quantity)
        await tx.stockMovement.create({
          data: {
            userId,
            productId: product.id,
            saleId: sale.id,
            type: 'SALE',
            quantity: -quantity,
            date,
            notes: `Sale ${sale.invoiceNumber}`,
          },
        })
      }
    }

    await Promise.all(
      createdProducts.map((product) =>
        tx.product.update({
          where: { id: product.id },
          data: { currentStock: remainingStock.get(product.id) ?? 0 },
        }),
      ),
    )

    const expenses = [
      ['2026-03-11', 'MATERIALS', 'Soy wax and fragrance oils', 680],
      ['2026-03-18', 'PACKAGING', 'Branded gift boxes and tissue paper', 320],
      ['2026-03-28', 'MARKETING', 'Instagram campaign', 450],
      ['2026-04-01', 'RENT', 'Studio rent', 2200],
      ['2026-04-08', 'TRANSPORT', 'Courier deliveries', 185],
      ['2026-04-16', 'UTILITIES', 'Studio electricity and internet', 275],
      ['2026-04-23', 'MATERIALS', 'Cotton cord and linen fabric', 740],
      ['2026-05-01', 'RENT', 'Studio rent', 2200],
      ['2026-05-05', 'SALARY', 'Part-time workshop assistant', 1200],
      ['2026-05-13', 'MARKETING', 'Craft market booth fee', 600],
      ['2026-05-22', 'MAINTENANCE', 'Sewing machine service', 180],
      ['2026-06-01', 'RENT', 'Studio rent', 2200],
      ['2026-06-09', 'PACKAGING', 'Ribbon and labels', 260],
      ['2026-06-18', 'TRANSPORT', 'Supplier pickup fuel', 140],
      ['2026-07-03', 'UTILITIES', 'Studio electricity and internet', 290],
      ['2026-07-12', 'OTHER', 'Trade license renewal', 850],
    ] as const
    await tx.expense.createMany({
      data: expenses.map(([date, category, description, amount], index) => ({
        userId,
        date: new Date(`${date}T12:00:00.000Z`),
        categoryId: categoryIds.get(category === 'TRANSPORT' ? 'CUSTOMER_DELIVERY' : category)!,
        description,
        amount: decimal(amount),
        paymentMethod: index % 2 === 0 ? 'CARD' : 'BANK_TRANSFER',
      })),
    })
  })

  console.log(`Demo data seeded for ${email}`)
}

main()
  .catch((error) => {
    console.error('Failed to seed demo data:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
