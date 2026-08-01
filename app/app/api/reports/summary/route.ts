import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NextRequestWithUser } from '@/lib/auth'

function startOf(unit: 'day' | 'week' | 'month'): Date {
  const now = new Date()
  if (unit === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (unit === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// GET /api/reports/summary
export const GET = withAuth(async (_req: NextRequestWithUser, _ctx?) => {
  const todayStart = startOf('day')
  const weekStart = startOf('week')
  const monthStart = startOf('month')

  // ── KPI aggregates ──────────────────────────────────────────────────────────
  const [todayOrders, weekOrders, monthOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: weekStart } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
  ])

  // ── Top 10 products by revenue (month) ─────────────────────────────────────
  const topProducts = await prisma.orderItem.groupBy({
    by: ['productId', 'productName'],
    where: {
      order: { status: 'COMPLETED', createdAt: { gte: monthStart } },
    },
    _sum: { subtotal: true, quantity: true },
    orderBy: { _sum: { subtotal: 'desc' } },
    take: 10,
  })

  // ── Daily revenue — last 14 days ────────────────────────────────────────────
  // We pull daily-grouped totals using raw date truncation via groupBy on createdAt.
  // Prisma doesn't support DATE_TRUNC natively; we do a client-side grouping.
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const recentOrders = await prisma.order.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: fourteenDaysAgo } },
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // Group client-side by ISO date (YYYY-MM-DD)
  const dailyMap: Record<string, number> = {}
  for (const order of recentOrders) {
    const key = order.createdAt.toISOString().slice(0, 10)
    dailyMap[key] = (dailyMap[key] ?? 0) + Number(order.totalAmount)
  }

  // Fill all 14 days (0 if no data)
  const dailyRevenue: { date: string; total: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyRevenue.push({ date: key, total: dailyMap[key] ?? 0 })
  }

  return NextResponse.json({
    kpi: {
      today: {
        revenue: Number(todayOrders._sum.totalAmount ?? 0),
        orders: todayOrders._count.id,
      },
      week: {
        revenue: Number(weekOrders._sum.totalAmount ?? 0),
        orders: weekOrders._count.id,
        avgOrderValue:
          weekOrders._count.id > 0
            ? Number(weekOrders._sum.totalAmount ?? 0) / weekOrders._count.id
            : 0,
      },
      month: {
        revenue: Number(monthOrders._sum.totalAmount ?? 0),
        orders: monthOrders._count.id,
        avgOrderValue:
          monthOrders._count.id > 0
            ? Number(monthOrders._sum.totalAmount ?? 0) / monthOrders._count.id
            : 0,
      },
    },
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      revenue: Number(p._sum.subtotal ?? 0),
      quantity: Number(p._sum.quantity ?? 0),
    })),
    dailyRevenue,
  })
})
