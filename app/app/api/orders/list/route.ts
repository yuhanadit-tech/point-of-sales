import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { OrderService } from '@/services/order.service'
import type { NextRequestWithUser } from '@/lib/auth'

// GET /api/orders
// Query: search, status, dateFrom, dateTo, page, limit
export const GET = withAuth(async (req: NextRequestWithUser) => {
  const { searchParams } = new URL(req.url)

  const result = await OrderService.list({
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    page: Number(searchParams.get('page') ?? '1'),
    limit: Number(searchParams.get('limit') ?? '25'),
  })

  return NextResponse.json(result)
})
