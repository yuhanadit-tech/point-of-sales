import { z } from 'zod'

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(1).max(200),
  unitPrice: z.number().min(0),
  quantity: z.number().int().min(1),
  subtotal: z.number().min(0),
})

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  notes: z.string().optional().nullable(),
  payment: z.object({
    method: z.enum(['CASH', 'CARD', 'QRIS']),
    amountPaid: z.number().min(0),
    changeAmount: z.number().min(0).default(0),
    referenceNumber: z.string().optional().nullable(),
  }),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
