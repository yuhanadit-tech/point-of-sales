import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOrderSchema } from '@/lib/validations/order.schema'
import { generateOrderNumber } from '@/lib/utils'
import type { NextRequestWithUser } from '@/lib/auth'

// ── Optional rate limiter (Upstash) ──────────────────────────────────────────
// Gracefully disabled when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// env vars are not set (local development).

async function checkRateLimit(userId: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return true // rate-limiting disabled

  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')

    const ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.fixedWindow(10, '1 m'), // 10 checkouts per user per minute
      prefix: 'pos:checkout',
    })

    const { success } = await ratelimit.limit(userId)
    return success
  } catch {
    return true // fail open — never block a valid checkout due to Redis issues
  }
}

// POST /api/orders
// Atomic checkout: validate cart, guard stock, create order+items+payment, decrement stock
export const POST = withAuth(async (req: NextRequestWithUser) => {
  // Rate limit check
  const allowed = await checkRateLimit(req.user.id)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = createOrderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { items, subtotal, discountAmount, totalAmount, notes, payment } = parsed.data

  // ── Run everything in a single transaction ─────────────────────────────────
  const order = await prisma.$transaction(async (tx) => {
    // 1. Lock and validate each product's stock
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, stock: true, isActive: true },
      })

      if (!product || !product.isActive) {
        throw new Error(`Product not found or inactive: ${item.productName}`)
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.stock}`,
        )
      }
    }

    // 2. Create order
    const orderNumber = generateOrderNumber()
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        cashierId: req.user.id,
        subtotal,
        discountAmount,
        totalAmount,
        status: 'COMPLETED',
        notes,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            subtotal: i.subtotal,
          })),
        },
        payment: {
          create: {
            method: payment.method,
            amountPaid: payment.amountPaid,
            changeAmount: payment.changeAmount,
            referenceNumber: payment.referenceNumber ?? null,
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    })

    // 3. Decrement stock for each item
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    // 4. Write audit log
    await tx.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ORDER_CREATED',
        entityType: 'Order',
        entityId: newOrder.id,
        metadata: {
          orderNumber: newOrder.orderNumber,
          totalAmount,
          itemCount: items.length,
          paymentMethod: payment.method,
        },
      },
    })

    return newOrder
  })

  return NextResponse.json({ order }, { status: 201 })
})
