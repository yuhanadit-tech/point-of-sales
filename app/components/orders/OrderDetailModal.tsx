'use client'

import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { formatCurrency } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  productName: string
  unitPrice: string
  quantity: number
  subtotal: string
  product: { id: string; name: string; imageUrl: string | null } | null
}

interface Payment {
  method: 'CASH' | 'CARD' | 'QRIS'
  amountPaid: string
  changeAmount: string
  referenceNumber: string | null
}

interface OrderDetail {
  id: string
  orderNumber: string
  status: 'PENDING' | 'COMPLETED' | 'VOIDED'
  subtotal: string
  discountAmount: string
  totalAmount: string
  notes: string | null
  createdAt: string
  cashier: { id: string; name: string } | null
  items: OrderItem[]
  payment: Payment | null
}

interface OrderDetailModalProps {
  order: OrderDetail
  userRole: 'ADMIN' | 'CASHIER'
  onClose: () => void
  onVoided: (orderId: string) => void
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  COMPLETED: { backgroundColor: 'oklch(97% 0.04 145)', color: 'var(--color-success)' },
  VOIDED: { backgroundColor: 'oklch(97% 0.04 25)', color: 'var(--color-danger)' },
  PENDING: { backgroundColor: 'oklch(97% 0.04 80)', color: 'var(--color-warning)' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderDetailModal({ order, userRole, onClose, onVoided }: OrderDetailModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidLoading, setVoidLoading] = useState(false)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receipt-${order.orderNumber}`,
  })

  async function handleVoid() {
    setVoidLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void' }),
      })
      if (res.ok) {
        onVoided(order.id)
        onClose()
      }
    } finally {
      setVoidLoading(false)
      setVoidOpen(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-xl flex flex-col"
          style={{ backgroundColor: 'var(--color-background)', maxHeight: '90dvh' }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--color-heading)' }}>
                {order.orderNumber}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {new Date(order.createdAt).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                style={STATUS_STYLES[order.status]}
              >
                {order.status}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-neutral-100"
                style={{ color: 'var(--color-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Body (scrollable) ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Printable receipt */}
            <div ref={printRef}>
              {/* Items */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                      <th className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: 'var(--color-heading)' }}>Product</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-xs" style={{ color: 'var(--color-heading)' }}>Qty</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-xs" style={{ color: 'var(--color-heading)' }}>Price</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-xs" style={{ color: 'var(--color-heading)' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ '--tw-divide-color': 'var(--color-border)' } as React.CSSProperties}>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5" style={{ color: 'var(--color-text)' }}>{item.productName}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums" style={{ color: 'var(--color-muted)' }}>{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--color-muted)' }}>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium" style={{ color: 'var(--color-heading)' }}>
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals + payment */}
              <div
                className="rounded-xl border mt-3 divide-y text-sm"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {parseFloat(order.discountAmount) > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span style={{ color: 'var(--color-muted)' }}>Discount</span>
                    <span className="tabular-nums" style={{ color: 'var(--color-danger)' }}>
                      − {formatCurrency(order.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 font-semibold">
                  <span style={{ color: 'var(--color-heading)' }}>Total</span>
                  <span className="tabular-nums" style={{ color: 'var(--color-heading)' }}>
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
                {order.payment && (
                  <>
                    <div className="flex justify-between px-4 py-2.5">
                      <span style={{ color: 'var(--color-muted)' }}>
                        {order.payment.method === 'CASH' ? 'Cash received' : order.payment.method}
                      </span>
                      <span className="tabular-nums" style={{ color: 'var(--color-muted)' }}>
                        {formatCurrency(order.payment.amountPaid)}
                      </span>
                    </div>
                    {order.payment.method === 'CASH' && parseFloat(order.payment.changeAmount) > 0 && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span style={{ color: 'var(--color-muted)' }}>Change</span>
                        <span className="tabular-nums" style={{ color: 'var(--color-success)' }}>
                          {formatCurrency(order.payment.changeAmount)}
                        </span>
                      </div>
                    )}
                    {order.payment.referenceNumber && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span style={{ color: 'var(--color-muted)' }}>Reference</span>
                        <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                          {order.payment.referenceNumber}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Cashier */}
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--color-muted)' }}>
                Cashier: {order.cashier?.name ?? 'Unknown'}
              </p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            className="flex-shrink-0 flex gap-2 px-5 py-4 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => handlePrint()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] focus-visible:outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
            >
              Print Receipt
            </button>
            {userRole === 'ADMIN' && order.status === 'COMPLETED' && (
              <button
                onClick={() => setVoidOpen(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] focus-visible:outline-none"
                style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'oklch(99% 0.01 25)' }}
              >
                Void Order
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={voidOpen}
        title="Void Order"
        description={`Void order ${order.orderNumber}? Stock will be restored. This cannot be undone.`}
        confirmLabel="Void Order"
        variant="danger"
        loading={voidLoading}
        onConfirm={handleVoid}
        onCancel={() => setVoidOpen(false)}
      />
    </>
  )
}
