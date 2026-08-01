'use client'

import { useCartStore } from '@/stores/cart.store'
import { formatCurrency } from '@/lib/utils'
import { StockBadge } from '@/components/shared/StockBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
}

interface PosProduct {
  id: string
  name: string
  price: string
  stock: number
  lowStockThreshold: number
  imageUrl: string | null
  category: Category | null
}

interface ProductGridProps {
  products: PosProduct[]
  categories: Category[]
  search: string
  categoryFilter: string
  loading: boolean
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductGrid({
  products,
  categories,
  search,
  categoryFilter,
  loading,
  onSearchChange,
  onCategoryChange,
}: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  function cartQty(productId: string) {
    return cartItems.find((i) => i.productId === productId)?.quantity ?? 0
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-44">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--color-muted)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-colors
              border-neutral-300 bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-primary),transparent_80%)]"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap">
          <CategoryChip
            label="All"
            active={categoryFilter === ''}
            onClick={() => onCategoryChange('')}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              active={categoryFilter === c.id}
              onClick={() => onCategoryChange(c.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <GridSkeleton />
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              No products found.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const outOfStock = product.stock === 0
              const inCart = cartQty(product.id)
              const price = parseFloat(product.price)

              return (
                <button
                  key={product.id}
                  onClick={() => {
                    if (outOfStock) return
                    addItem({
                      productId: product.id,
                      productName: product.name,
                      unitPrice: price,
                      stock: product.stock,
                      imageUrl: product.imageUrl,
                    })
                  }}
                  disabled={outOfStock}
                  className="relative flex flex-col rounded-xl border text-left transition-all
                    active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2
                    disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
                  style={{
                    borderColor: inCart > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                  }}
                >
                  {/* In-cart badge */}
                  {inCart > 0 && (
                    <span
                      className="absolute top-2 right-2 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center z-10"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {inCart}
                    </span>
                  )}

                  {/* Image */}
                  <div
                    className="w-full aspect-square rounded-t-xl overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-8 h-8"
                        style={{ color: 'var(--color-neutral-300)' }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex-1 flex flex-col gap-1">
                    <p
                      className="text-xs font-medium leading-tight line-clamp-2"
                      style={{ color: 'var(--color-heading)' }}
                    >
                      {product.name}
                    </p>
                    <p
                      className="text-xs font-semibold tabular-nums mt-auto"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {formatCurrency(price)}
                    </p>
                    <StockBadge stock={product.stock} threshold={product.lowStockThreshold} size="xs" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Category chip ────────────────────────────────────────────────────────────

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2"
      style={
        active
          ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
          : {
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }
      }
    >
      {label}
    </button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="aspect-square" style={{ backgroundColor: 'var(--color-surface)' }} />
          <div className="p-2.5 space-y-2">
            <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--color-surface)' }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--color-surface)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
