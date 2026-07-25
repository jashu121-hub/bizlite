import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

function loadEnv(file) {
  const o = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    o[line.slice(0, i).trim()] = v
  }
  return o
}

const env = loadEnv('.env')
const email = 'demo@bizlite.app'
const password = 'Demo1234!'
const prisma = new PrismaClient()

async function ensureAuthUser() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const login = await supabase.auth.signInWithPassword({ email, password })
  if (!login.error && login.data.user) {
    console.log('Demo user already works')
    return login.data.user.id
  }

  // Create confirmed user directly in auth schema (bypasses email rate limit)
  const rows = await prisma.$queryRawUnsafe(`
    WITH existing AS (
      SELECT id FROM auth.users WHERE email = $1 LIMIT 1
    ),
    created AS (
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      )
      SELECT
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        $1,
        crypt($2, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      RETURNING id
    )
    SELECT id FROM created
    UNION ALL
    SELECT id FROM existing
    LIMIT 1
  `, email, password)

  const userId = rows[0]?.id
  if (!userId) throw new Error('Failed to create or find auth user')

  await prisma.$executeRawUnsafe(`
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email',
      u.id::text,
      NOW(),
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.id = $1::uuid
      AND NOT EXISTS (
        SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
      )
  `, userId)

  // If user existed but password differs, reset password hash
  await prisma.$executeRawUnsafe(`
    UPDATE auth.users
    SET encrypted_password = crypt($2, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = $1::uuid
  `, userId, password)

  const verify = await supabase.auth.signInWithPassword({ email, password })
  if (verify.error) {
    throw new Error(`Login still failing: ${verify.error.message}`)
  }

  console.log('Demo auth user ready:', userId)
  return userId
}

async function seedDemoData(userId) {
  await prisma.userProfile.upsert({
    where: { id: userId },
    update: {
      email,
      businessName: 'Demo Crafts UAE',
      ownerName: 'Aisha Khan',
      phone: '+971 50 000 0000',
      currency: 'AED',
      setupCompleted: true,
    },
    create: {
      id: userId,
      email,
      businessName: 'Demo Crafts UAE',
      ownerName: 'Aisha Khan',
      phone: '+971 50 000 0000',
      currency: 'AED',
      setupCompleted: true,
    },
  })

  const productCount = await prisma.product.count({ where: { userId } })
  if (productCount > 0) {
    console.log('Demo business data already present')
    return
  }

  const products = await Promise.all(
    [
      ['Handmade Soap Set', 'Beauty', 18, 45, 40, 10],
      ['Ceramic Mug', 'Home', 12, 35, 60, 15],
      ['Cotton Tote Bag', 'Clothing', 8, 25, 50, 12],
      ['Gift Wrapping', 'Services', 2, 15, 100, 20],
      ['Scented Candle', 'Home', 10, 30, 35, 8],
    ].map(([name, category, cost, sell, stock, low]) =>
      prisma.product.create({
        data: {
          userId,
          name,
          category,
          costPrice: cost,
          sellingPrice: sell,
          openingStock: stock,
          currentStock: stock,
          lowStockLevel: low,
          isActive: true,
        },
      }),
    ),
  )

  const customers = await Promise.all(
    ['Amina Hassan', 'Omar Farid', 'Sara Al Mansoori'].map((name, idx) =>
      prisma.customer.create({
        data: {
          userId,
          name,
          phone: `+971 50 100 100${idx}`,
          email: `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`,
        },
      }),
    ),
  )

  const today = new Date()
  const sale = await prisma.sale.create({
    data: {
      userId,
      customerId: customers[0].id,
      invoiceNumber: `INV-${today.getFullYear()}-00001`,
      date: today,
      subtotal: 90,
      discount: 0,
      totalAmount: 90,
      amountPaid: 90,
      balancePending: 0,
      totalCost: 36,
      grossProfit: 54,
      paymentMethod: 'CARD',
      paymentStatus: 'PAID',
      notes: 'Demo sale',
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            quantity: 2,
            unitCost: 18,
            unitSellingPrice: 45,
            lineTotal: 90,
            lineCost: 36,
            lineProfit: 54,
          },
        ],
      },
    },
  })

  await prisma.product.update({
    where: { id: products[0].id },
    data: { currentStock: { decrement: 2 } },
  })

  await prisma.expense.createMany({
    data: [
      {
        userId,
        date: today,
        category: 'MATERIALS',
        description: 'Soap oils and molds',
        amount: 320,
        paymentMethod: 'CARD',
      },
      {
        userId,
        date: today,
        category: 'MARKETING',
        description: 'Instagram ads',
        amount: 150,
        paymentMethod: 'CARD',
      },
    ],
  })

  console.log('Seeded demo data, sample sale:', sale.invoiceNumber)
}

const userId = await ensureAuthUser()
await seedDemoData(userId)
await prisma.$disconnect()
console.log('\nDemo login:')
console.log('  Email:   ', email)
console.log('  Password:', password)
