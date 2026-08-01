'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { formatCurrency } from '@/lib/utils'
import type { CartItem } from '@/stores/cart.store'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiptData {
  orderNumber: string
  items: CartItem[]
  subtotal: number
  discountAmount: number
  totalAmount: number
  paymentMethod: 'CASH' | 'CARD' | 'QRIS'
  amountPaid: number
  changeAmount: number
  cashierName: string
  createdAt: string
}

interface ReceiptProps {
  data: ReceiptData
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Receipt({ data, onClose }: ReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receipt-${data.orderNumber}`,
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-xl"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--color-heading)' }}>
            Receipt
          </h2>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg border transition-colors hover:bg-neutral-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            Close
          </button>
        </div>

        {/* ── Printable area ── */}
        <div ref={printRef} className="px-5 py-4 space-y-4">
          {/* Store name */}
          <div className="text-center border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
            <p className="font-bold text-lg" style={{ color: 'var(--color-heading)' }}>POS MVP</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {new Date(data.createdAt).toLocaleString('id-ID')}
            </p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {data.orderNumber}
            </p>
          </div>

          {/* Items */}
          <ul className="space-y-1.5">
            {data.items.map((item) => (
              <li key={item.productId} className="flex items-start justify-between gap-2 text-sm">
                <span style={{ color: 'var(--color-text)' }}>
                  {item.productName}
                  <span className="ml-1" style={{ color: 'var(--color-muted)' }}>×{item.quantity}</span>
                </span>
                <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--color-heading)' }}>
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div
            className="border-t pt-3 space-y-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {data.discountAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-muted)' }}>Discount</span>
                <span className="tabular-nums" style={{ color: 'var(--color-danger)' }}>
                  − {formatCurrency(data.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span style={{ color: 'var(--color-heading)' }}>Total</span>
              <span className="tabular-nums" style={{ color: 'var(--color-heading)' }}>
                {formatCurrency(data.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-muted)' }}>
                {data.paymentMethod === 'CASH' ? 'Cash' : data.paymentMethod}
              </span>
              <span className="tabular-nums" style={{ color: 'var(--color-muted)' }}>
                {formatCurrency(data.amountPaid)}
              </span>
            </div>
            {data.paymentMethod === 'CASH' && data.changeAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-muted)' }}>Change</span>
                <span className="tabular-nums" style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(data.changeAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-1">
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Cashier: {data.cashierName}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              Thank you!
            </p>
          </div>
        </div>

        {/* ── Print button ── */}
        <div
          className="px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={() => handlePrint()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98] focus-visible:outline-none"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
