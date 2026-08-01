import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NextRequestWithUser } from '@/lib/auth'

// GET /api/pos/products
// Returns active products with stock > 0 (or low stock) for the POS grid
export const GET = withAuth(async (req: NextRequestWithUser) => {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''

  const where = {
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(search && {
      name: { contains: search, mode: 'insensitive' as const },
    }),
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      lowStockThreshold: true,
      imageUrl: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    take: 200,
  })

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ products, categories })
})
