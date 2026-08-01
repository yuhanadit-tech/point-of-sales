import { prisma } from '@/lib/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderListParams {
  search?: string        // order number or cashier name
  status?: string        // PENDING | COMPLETED | VOIDED | '' (all)
  dateFrom?: string      // ISO date string YYYY-MM-DD
  dateTo?: string        // ISO date string YYYY-MM-DD
  page?: number
  limit?: number
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const OrderService = {
  async list(params?: OrderListParams) {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 25
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (params?.status && params.status !== 'all') {
      where.status = params.status
    }

    if (params?.search) {
      where.OR = [
        { orderNumber: { contains: params.search, mode: 'insensitive' } },
        { cashier: { name: { contains: params.search, mode: 'insensitive' } } },
      ]
    }

    if (params?.dateFrom || params?.dateTo) {
      where.createdAt = {
        ...(params.dateFrom && { gte: new Date(params.dateFrom) }),
        ...(params.dateTo && { lte: new Date(`${params.dateTo}T23:59:59.999Z`) }),
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          cashier: { select: { id: true, name: true } },
          payment: { select: { method: true, amountPaid: true, changeAmount: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total, page, limit }
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        payment: true,
      },
    })
  },

  async voidOrder(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      })

      if (!order) throw new Error('Order not found')
      if (order.status === 'VOIDED') throw new Error('Order is already voided')

      // Restore stock for each item
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }

      const voided = await tx.order.update({
        where: { id },
        data: { status: 'VOIDED' },
      })

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ORDER_VOIDED',
          entityType: 'Order',
          entityId: id,
          metadata: { orderNumber: order.orderNumber },
        },
      })

      return voided
    })
  },
}
