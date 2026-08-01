'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { Receipt } from '@/components/pos/Receipt'
import { useCartStore } from '@/stores/cart.store'
import type { ReceiptData } from '@/components/pos/Receipt'

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

// ─── Component ────────────────────────────────────────────────────────────────

export function PosClient({ cashierName }: { cashierName: string }) {
  const [products, setProducts] = useState<PosProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Mobile: show cart panel as bottom drawer
  const [cartOpen, setCartOpen] = useState(false)
  const totalItems = useCartStore((s) => s.totalItems)

  // Payment & receipt modals
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      const res = await fetch(`/api/pos/products?${params.toString()}`)
      const data = await res.json()
      setProducts(data.products ?? [])
      setCategories(data.categories ?? [])
    } catch {
      // show empty grid
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 250)
    return () => clearTimeout(t)
  }, [fetchProducts])

  // ── Checkout → open payment modal ─────────────────────────────────────────
  function handleCheckout() {
    setCartOpen(false)
    setPaymentOpen(true)
  }

  function handlePaymentSuccess(data: ReceiptData) {
    setPaymentOpen(false)
    setReceipt(data)
    // Refresh product list so stock counts update
    void fetchProducts()
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/*
        Desktop: two-column layout [product grid | cart panel]
        Mobile: product grid fills screen, cart panel is a bottom drawer
      */}
      <div className="flex h-full overflow-hidden">
        {/* ── Product grid (left / main) ── */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <ProductGrid
            products={products}
            categories={categories}
            search={search}
            categoryFilter={categoryFilter}
            loading={loading}
            onSearchChange={setSearch}
            onCategoryChange={setCategoryFilter}
          />
        </div>

        {/* ── Cart panel (right — desktop only) ── */}
        <div
          className="hidden lg:flex flex-col w-80 xl:w-96 border-l flex-shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <CartPanel onCheckout={handleCheckout} />
        </div>
      </div>

      {/* ── Payment modal ── */}
      {paymentOpen && (
        <PaymentModal
          cashierName={cashierName}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentOpen(false)}
        />
      )}

      {/* ── Receipt modal ── */}
      {receipt && (
        <Receipt
          data={receipt}
          onClose={() => setReceipt(null)}
        />
      )}

      {/* ── Mobile: FAB cart button ── */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setCartOpen(true)}
          className="relative w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2"
          style={{ backgroundColor: 'var(--color-primary)' }}
          aria-label="Open cart"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.687-7.5H5.106M7.5 14.25 5.106 5.25M7.5 14.25l-2.25 9M16.5 14.25l2.25 9M10.5 21a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
            />
          </svg>
          {totalItems > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-xs font-bold flex items-center justify-center"
              style={{ color: 'var(--color-primary)' }}
            >
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile: cart bottom drawer ── */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* Backdrop */}
          <button
            aria-label="Close cart"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'default' }}
            onClick={() => setCartOpen(false)}
          />
          {/* Drawer */}
          <div
            className="relative rounded-t-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-background)',
              maxHeight: '80dvh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: 'var(--color-border)' }}
              />
            </div>
            <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
              <CartPanel onCheckout={() => { setCartOpen(false); handleCheckout() }} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
