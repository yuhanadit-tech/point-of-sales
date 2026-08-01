'use client'

import { useState, useEffect, useCallback } from 'react'
import { StockBadge } from '@/components/shared/StockBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ProductDrawer } from '@/components/products/ProductDrawer'
import { formatCurrency } from '@/lib/utils'
import type { CreateProductInput } from '@/lib/validations/product.schema'

interface Category {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  price: string
  costPrice: string | null
  stock: number
  lowStockThreshold: number
  imageUrl: string | null
  isActive: boolean
  categoryId: string | null
  category: Category | null
}

export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      params.set('isActive', showInactive ? 'all' : 'true')
      params.set('limit', '100')

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      // silently handled — empty list shown
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, showInactive])

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSave(data: CreateProductInput, id?: string) {
    const url = id ? `/api/products/${id}` : '/api/products'
    const method = id ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Save failed')
    }

    await fetchProducts()
  }

  async function handleDeactivate() {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      await fetch(`/api/products/${confirmTarget.id}`, { method: 'DELETE' })
      await fetchProducts()
    } finally {
      setConfirmLoading(false)
      setConfirmOpen(false)
      setConfirmTarget(null)
    }
  }

  function openEdit(product: Product) {
    setEditTarget(product)
    setDrawerOpen(true)
  }

  function openAdd() {
    setEditTarget(null)
    setDrawerOpen(true)
  }

  function openConfirm(product: Product) {
    setConfirmTarget(product)
    setConfirmOpen(true)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
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
              border-neutral-300 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-primary),transparent_80%)]"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none border-neutral-300
            focus:border-[var(--color-primary)] bg-white"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Show inactive toggle */}
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none"
          style={{ color: 'var(--color-text)' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Show inactive
        </label>

        {/* Add button */}
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white
            transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <TableSkeleton />
      ) : products.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Product</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--color-heading)' }}>Category</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Price</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Stock</th>
                <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--color-heading)' }}>Status</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-heading)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={`transition-colors hover:bg-neutral-50 ${!product.isActive ? 'opacity-50' : ''}`}
                >
                  {/* Product info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Image / placeholder */}
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
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
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5" style={{ color: 'var(--color-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--color-heading)' }}>{product.name}</p>
                        {product.sku && (
                          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
                            {product.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-muted)' }}>
                    {product.category?.name ?? '—'}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-right font-medium tabular-nums" style={{ color: 'var(--color-heading)' }}>
                    {formatCurrency(product.price)}
                  </td>

                  {/* Stock badge */}
                  <td className="px-4 py-3">
                    <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={product.isActive
                        ? { backgroundColor: 'oklch(97% 0.04 145)', color: 'var(--color-success)' }
                        : { backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)' }
                      }
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        aria-label={`Edit ${product.name}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      >
                        Edit
                      </button>
                      {product.isActive && (
                        <button
                          onClick={() => openConfirm(product)}
                          aria-label={`Deactivate ${product.name}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2"
                          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Product Drawer ── */}
      <ProductDrawer
        open={drawerOpen}
        product={editTarget}
        categories={categories}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />

      {/* ── Confirm Deactivate Dialog ── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Deactivate Product"
        description={`"${confirmTarget?.name}" will be hidden from the POS. Historical data is preserved.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleDeactivate}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null) }}
      />
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: 'var(--color-border)' }}>
      <div className="h-11" style={{ backgroundColor: 'var(--color-surface)' }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-40" style={{ backgroundColor: 'var(--color-surface)' }} />
            <div className="h-3 rounded w-24" style={{ backgroundColor: 'var(--color-surface)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 py-20 text-center"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <svg className="w-6 h-6" style={{ color: 'var(--color-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div>
        <p className="font-medium" style={{ color: 'var(--color-heading)' }}>No products yet</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Add your first product to start selling.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98]"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Product
      </button>
    </div>
  )
}
