import type { Metadata } from 'next'
import { ProductsClient } from '@/components/products/ProductsClient'

export const metadata: Metadata = { title: 'Products — POS MVP' }

export default function ProductsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-heading)' }}>
          Products
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Manage your product catalog
        </p>
      </div>
      <ProductsClient />
    </div>
  )
}
