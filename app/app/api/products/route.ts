import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { createProductSchema } from '@/lib/validations/product.schema'
import { ProductService } from '@/services/product.service'

// GET /api/products — list products (all authenticated users)
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)

  const search = searchParams.get('search') ?? undefined
  const categoryId = searchParams.get('categoryId') ?? undefined
  const activeParam = searchParams.get('isActive')
  const isActive = activeParam === null ? true : activeParam === 'true'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const result = await ProductService.list({ search, categoryId, isActive, page, limit })
  return NextResponse.json(result)
})

// POST /api/products — create product (admin only)
export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json()
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    try {
      const product = await ProductService.create(parsed.data)
      return NextResponse.json(product, { status: 201 })
    } catch (err) {
      console.error('[POST /api/products]', err)
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }
  },
  { roles: ['ADMIN'] },
)
