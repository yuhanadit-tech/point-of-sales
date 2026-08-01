'use client'

import { useState, useEffect, useCallback } from 'react'
import { StockBadge } from '@/components/shared/StockBadge'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
}

interface Adjustment {
  id: string
  delta: number
  reason: string
  createdAt: string
  user: { name: string } | null
}

interface InventoryProduct {
  id: string
  name: string
  sku: string | null
  stock: number
  lowStockThreshold: number
  imageUrl: string | null
  category: Category | null
  stockAdjustments: Adjustment[]
}

interface InventoryClientProps {
  userRole: 'ADMIN' | 'CASHIER'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryClient({ userRole }: InventoryClientProps) {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')   // '' | 'low' | 'out'

  const [adjustTarget, setAdjustTarget] = useState<InventoryProduct | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      if (stockFilter) params.set('stock', stockFilter)

      const res = await fetch(`/api/inventory?${params.toString()}`)
      const data = await res.json()
      setProducts(data.products ?? [])
      setCategories(data.categories ?? [])
    } catch {
      // empty
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, stockFilter])

  useEffect(() => {
    const t = setTimeout(fetchInventory, 300)
    return () => clearTimeout(t)
  }, [fetchInventory])

  function handleSaved(productId: string, newStock: number) {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-colors
              border-neutral-300 bg-white focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none border-neutral-300 bg-white focus:border-[var(--color-primary)]"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Stock filter */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none border-neutral-300 bg-white focus:border-[var(--color-primary)]"
          aria-label="Filter by stock"
        >
          <option value="">All Stock Levels</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <TableSkeleton />
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Product</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--color-heading)' }}>Category</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Stock</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <>
                  <tr
                    key={product.id}
                    className="border-t transition-colors hover:bg-neutral-50"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-heading)' }}>{product.name}</p>
                      {product.sku && (
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
                          {product.sku}
                        </p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-muted)' }}>
                      {product.category?.name ?? '—'}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-center">
                      <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Expand adjustment history */}
                        {product.stockAdjustments.length > 0 && (
                          <button
                            onClick={() => setExpandedId(expandedId === product.id ? null : product.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-neutral-50"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                          >
                            {expandedId === product.id ? 'Hide' : 'History'}
                          </button>
                        )}
                        {/* Adjust stock — admin only */}
                        {userRole === 'ADMIN' && (
                          <button
                            onClick={() => setAdjustTarget(product)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-neutral-50"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            Adjust
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded adjustment history */}
                  {expandedId === product.id && (
                    <tr
                      key={`${product.id}-history`}
                      style={{ borderColor: 'var(--color-border)' }}
                      className="border-t"
                    >
                      <td colSpan={4} className="px-8 py-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>
                          RECENT ADJUSTMENTS
                        </p>
                        <ul className="space-y-1.5">
                          {product.stockAdjustments.map((adj) => (
                            <li key={adj.id} className="flex items-start gap-2 text-xs">
                              <span
                                className="font-semibold tabular-nums flex-shrink-0"
                                style={{ color: adj.delta > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                              >
                                {adj.delta > 0 ? `+${adj.delta}` : adj.delta}
                              </span>
                              <span style={{ color: 'var(--color-text)' }}>{adj.reason}</span>
                              <span className="ml-auto flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
                                {adj.user?.name ?? 'System'} · {new Date(adj.createdAt).toLocaleDateString('id-ID')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Adjust modal ── */}
      {adjustTarget && (
        <StockAdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: 'var(--color-border)' }}>
      <div className="h-11" style={{ backgroundColor: 'var(--color-surface)' }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded w-40" style={{ backgroundColor: 'var(--color-surface)' }} />
            <div className="h-3 rounded w-24" style={{ backgroundColor: 'var(--color-surface)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-20 text-center"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <svg
        className="w-10 h-10"
        style={{ color: 'var(--color-neutral-300)' }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <p className="text-sm font-medium" style={{ color: 'var(--color-heading)' }}>No products found</p>
    </div>
  )
}
