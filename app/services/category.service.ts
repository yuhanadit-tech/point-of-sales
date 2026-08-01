import { prisma } from '@/lib/prisma'

export const CategoryService = {
  async list() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } })
  },
}
