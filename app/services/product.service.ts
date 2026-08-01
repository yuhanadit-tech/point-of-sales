import { prisma } from '@/lib/prisma'
import type { CreateProductInput, UpdateProductInput } from '@/lib/validations/product.schema'
import { generateOrderNumber } from '@/lib/utils'

export const ProductService = {
  // ── List ──────────────────────────────────────────────────────────────────
  async list(params?: {
    search?: string
    categoryId?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 50
    const skip = (page - 1) * limit

    const where = {
      ...(params?.isActive !== undefined && { isActive: params.isActive }),
      ...(params?.categoryId && { categoryId: params.categoryId }),
      ...(params?.search && {
        name: { contains: params.search, mode: 'insensitive' as const },
      }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return { products, total, page, limit }
  },

  // ── Find by ID ────────────────────────────────────────────────────────────
  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
  },

  // ── Create ────────────────────────────────────────────────────────────────
  async create(data: CreateProductInput) {
    // Auto-generate SKU if not provided
    const sku = data.sku ?? `SKU-${generateOrderNumber().slice(-8).toUpperCase()}`
    return prisma.product.create({
      data: {
        ...data,
        sku,
        price: data.price,
        costPrice: data.costPrice ?? null,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
  },

  // ── Update ────────────────────────────────────────────────────────────────
  async update(id: string, data: UpdateProductInput) {
    return prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
  },

  // ── Soft delete (deactivate) ──────────────────────────────────────────────
  async deactivate(id: string) {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
  },

  // ── Reactivate ────────────────────────────────────────────────────────────
  async reactivate(id: string) {
    return prisma.product.update({
      where: { id },
      data: { isActive: true },
    })
  },
}
