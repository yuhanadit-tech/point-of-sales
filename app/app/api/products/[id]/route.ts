import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateProductSchema } from '@/lib/validations/product.schema'
import { ProductService } from '@/services/product.service'

// GET /api/products/[id]
export const GET = withAuth(async (_req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => {
  const params = await ctx!.params
  const product = await ProductService.findById(params.id)
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  return NextResponse.json(product)
})

// PATCH /api/products/[id] — update (admin only)
export const PATCH = withAuth(
  async (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => {
    const params = await ctx!.params
    const body = await req.json()
    const parsed = updateProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    try {
      const product = await ProductService.update(params.id, parsed.data)
      return NextResponse.json(product)
    } catch (err) {
      console.error('[PATCH /api/products/[id]]', err)
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
  },
  { roles: ['ADMIN'] },
)

// DELETE /api/products/[id] — soft delete / deactivate (admin only)
export const DELETE = withAuth(
  async (_req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => {
    const params = await ctx!.params
    try {
      await ProductService.deactivate(params.id)
      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[DELETE /api/products/[id]]', err)
      return NextResponse.json({ error: 'Failed to deactivate product' }, { status: 500 })
    }
  },
  { roles: ['ADMIN'] },
)
