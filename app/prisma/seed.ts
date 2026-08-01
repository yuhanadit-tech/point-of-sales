import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'food' },
      update: {},
      create: { name: 'Food', slug: 'food' },
    }),
    prisma.category.upsert({
      where: { slug: 'drinks' },
      update: {},
      create: { name: 'Drinks', slug: 'drinks' },
    }),
    prisma.category.upsert({
      where: { slug: 'snacks' },
      update: {},
      create: { name: 'Snacks', slug: 'snacks' },
    }),
    prisma.category.upsert({
      where: { slug: 'other' },
      update: {},
      create: { name: 'Other', slug: 'other' },
    }),
  ])

  console.log(`✅ ${categories.length} categories seeded`)

  // ── Admin user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pos.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@pos.local',
      passwordHash,
      role: 'ADMIN',
    },
  })

  console.log(`✅ Admin user seeded: ${admin.email}`)

  // ── Sample cashier ──────────────────────────────────────────────────────────
  const cashierHash = await bcrypt.hash('cashier123', 12)

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@pos.local' },
    update: {},
    create: {
      name: 'Cashier Demo',
      email: 'cashier@pos.local',
      passwordHash: cashierHash,
      role: 'CASHIER',
    },
  })

  console.log(`✅ Cashier user seeded: ${cashier.email}`)

  // ── Sample products ─────────────────────────────────────────────────────────
  const drinkCategory = categories.find((c) => c.slug === 'drinks')!
  const foodCategory = categories.find((c) => c.slug === 'food')!

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'DRINK-001' },
      update: {},
      create: {
        sku: 'DRINK-001',
        name: 'Iced Coffee',
        price: 25000,
        stock: 100,
        lowStockThreshold: 10,
        categoryId: drinkCategory.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'DRINK-002' },
      update: {},
      create: {
        sku: 'DRINK-002',
        name: 'Mineral Water',
        price: 8000,
        stock: 200,
        lowStockThreshold: 20,
        categoryId: drinkCategory.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'FOOD-001' },
      update: {},
      create: {
        sku: 'FOOD-001',
        name: 'Croissant',
        price: 22000,
        stock: 30,
        lowStockThreshold: 5,
        categoryId: foodCategory.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'FOOD-002' },
      update: {},
      create: {
        sku: 'FOOD-002',
        name: 'Sandwich',
        price: 35000,
        stock: 3,  // intentionally low for testing alert
        lowStockThreshold: 5,
        categoryId: foodCategory.id,
      },
    }),
  ])

  console.log(`✅ ${products.length} sample products seeded`)
  console.log('\n🎉 Seed complete!')
  console.log('\nTest credentials:')
  console.log('  Admin   → admin@pos.local / admin123')
  console.log('  Cashier → cashier@pos.local / cashier123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
