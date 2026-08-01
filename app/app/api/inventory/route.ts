import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stockAdjustmentSchema } from '@/lib/validations/inventory.schema'
import type { NextRequestWithUser } from '@/lib/auth'

// GET /api/inventory
// Returns all active products with stock + recent adjustments
export const GET = withAuth(async (req: NextRequestWithUser, _ctx?) => {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''
  const stockFilter = searchParams.get('stock') ?? ''   // 'low' | 'out' | ''

  const where: Record<string, unknown> = {
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  }

  if (stockFilter === 'out') {
    where.stock = 0
  } else if (stockFilter === 'low') {
    // stock > 0 but <= threshold — raw query not needed, handled client-side for simplicity
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        imageUrl: true,
        category: { select: { id: true, name: true } },
        stockAdjustments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            delta: true,
            reason: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Client-side low-stock filter post-query
  const filtered =
    stockFilter === 'low'
      ? products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold)
      : products

  return NextResponse.json({ products: filtered, categories })
})

// POST /api/inventory  — admin only
export const POST = withAuth(
  async (req: NextRequestWithUser, _ctx?) => {
    const body = await req.json()
    const parsed = stockAdjustmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const { productId, delta, reason } = parsed.data

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const nextStock = product.stock + delta
    if (nextStock < 0) {
      return NextResponse.json(
        { error: `Stock would go negative (current: ${product.stock}, delta: ${delta})` },
        { status: 422 },
      )
    }

    const [adjustment] = await prisma.$transaction([
      prisma.stockAdjustment.create({
        data: {
          productId,
          userId: req.user.id,
          delta,
          reason,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: { increment: delta } },
      }),
      prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'STOCK_ADJUSTED',
          entityType: 'Product',
          entityId: productId,
          metadata: { productName: product.name, delta, reason, newStock: nextStock },
        },
      }),
    ])

    return NextResponse.json({ adjustment, newStock: nextStock }, { status: 201 })
  },
  { roles: ['ADMIN'] },
)
