'use client'

import { useCartStore } from '@/stores/cart.store'
import { formatCurrency } from '@/lib/utils'

interface CartPanelProps {
  onCheckout: () => void
}

export function CartPanel({ onCheckout }: CartPanelProps) {
  const { items, subtotal, totalItems, removeItem, setQuantity } = useCartStore()

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="font-semibold text-sm" style={{ color: 'var(--color-heading)' }}>
          Cart
        </h2>
        {totalItems > 0 && (
          <span
            className="text-xs font-semibold rounded-full px-2 py-0.5 text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {totalItems}
          </span>
        )}
      </div>

      {/* ── Items ── */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16 px-4 text-center">
            <svg
              className="w-10 h-10"
              style={{ color: 'var(--color-neutral-300)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.687-7.5H5.106M7.5 14.25 5.106 5.25M7.5 14.25l-2.25 9M16.5 14.25l2.25 9M10.5 21a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
              />
            </svg>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              No items yet.
              <br />Tap a product to add it.
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ '--tw-divide-color': 'var(--color-border)' } as React.CSSProperties}>
            {items.map((item) => (
              <li key={item.productId} className="flex items-start gap-3 px-4 py-3">
                {/* Product image placeholder */}
                <div
                  className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: 'var(--color-neutral-200)' }}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-4 h-4" style={{ color: 'var(--color-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>

                {/* Name + subtotal */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-heading)' }}>
                    {item.productName}
                  </p>
                  <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--color-muted)' }}>
                    {formatCurrency(item.unitPrice)} × {item.quantity}
                  </p>
                </div>

                {/* Right: subtotal + qty controls */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-heading)' }}>
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors hover:bg-neutral-200"
                      style={{ color: 'var(--color-text)' }}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums" style={{ color: 'var(--color-heading)' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      aria-label="Increase quantity"
                      className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: 'var(--color-text)' }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      aria-label={`Remove ${item.productName}`}
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-100 ml-1"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Footer / Summary ── */}
      <div
        className="flex-shrink-0 border-t px-4 py-4 space-y-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Subtotal row */}
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Subtotal</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-heading)' }}>
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all
            active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {items.length === 0 ? 'Cart is empty' : `Charge  ${formatCurrency(subtotal)}`}
        </button>
      </div>
    </div>
  )
}
