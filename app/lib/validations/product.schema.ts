import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  imageUrl: z.string().url().optional().nullable(),
})

export const updateProductSchema = createProductSchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
