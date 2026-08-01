import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { CategoryService } from '@/services/category.service'

// GET /api/categories — list all categories (all authenticated users)
export const GET = withAuth(async () => {
  const categories = await CategoryService.list()
  return NextResponse.json(categories)
})
