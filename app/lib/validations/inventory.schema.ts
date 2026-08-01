import { z } from 'zod'

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  delta: z.number().int().refine((n) => n !== 0, { message: 'Delta cannot be zero' }),
  reason: z.string().min(1, 'Reason is required').max(500),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
