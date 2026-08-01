import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { OrderService } from '@/services/order.service'
import type { NextRequestWithUser } from '@/lib/auth'

// GET /api/orders/[id]
export const GET = withAuth(async (req: NextRequestWithUser, context) => {
  const params = await context!.params
  const order = await OrderService.findById(params.id)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ order })
})

// PATCH /api/orders/[id] — void an order (ADMIN only)
export const PATCH = withAuth(
  async (req: NextRequestWithUser, context) => {
    const params = await context!.params
    const body = await req.json()

    if (body.action !== 'void') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    try {
      const order = await OrderService.voidOrder(params.id, req.user.id)
      return NextResponse.json({ order })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Void failed'
      return NextResponse.json({ error: message }, { status: 422 })
    }
  },
  { roles: ['ADMIN'] },
)
