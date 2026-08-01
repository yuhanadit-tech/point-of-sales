import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOrderSchema } from '@/lib/validations/order.schema'
import { generateOrderNumber } from '@/lib/utils'
import type { NextRequestWithUser } from '@/lib/auth'

// POST /api/orders
// Atomic checkout: validate cart, guard stock, create order+items+payment, decrement stock
export const POST = withAuth(async (req: NextRequestWithUser) => {
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
