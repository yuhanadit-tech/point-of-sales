'use client'

import { useState } from 'react'
import { useCartStore } from '@/stores/cart.store'
import { formatCurrency } from '@/lib/utils'
import type { ReceiptData } from '@/components/pos/Receipt'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'CASH' | 'CARD' | 'QRIS'

interface PaymentModalProps {
  cashierName: string
  onSuccess: (receipt: ReceiptData) => void
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentModal({ cashierName, onSuccess, onClose }: PaymentModalProps) {
  const { items, subtotal, clear } = useCartStore()

  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalAmount = subtotal  // discount is 0 for MVP
  const amountPaidNum = parseFloat(amountPaid) || 0
  const change = method === 'CASH' ? Math.max(0, amountPaidNum - totalAmount) : 0
  const cashInsufficient = method === 'CASH' && amountPaidNum < totalAmount

  // ── Quick-fill buttons for cash ────────────────────────────────────────────
  const quickAmounts = [
    totalAmount,
    Math.ceil(totalAmount / 10000) * 10000,
    Math.ceil(totalAmount / 50000) * 50000,
    Math.ceil(totalAmount / 100000) * 100000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= totalAmount).slice(0, 4)

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null)

    if (method === 'CASH' && amountPaidNum < totalAmount) {
      setError('Amount paid is less than the total.')
      return
    }

    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        subtotal: i.unitPrice * i.quantity,
      })),
      subtotal,
      discountAmount: 0,
      totalAmount,
      notes: null,
      payment: {
        method,
        amountPaid: method === 'CASH' ? amountPaidNum : totalAmount,
        changeAmount: change,
        referenceNumber: referenceNumber || null,
      },
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        // errors from stock guard come back as a string message
        const message =
          typeof err.error === 'string'
            ? err.error
            : 'Checkout failed. Please try again.'
        setError(message)
        return
      }

      const { order } = await res.json()

      const receipt: ReceiptData = {
        orderNumber: order.orderNumber,
        items,
        subtotal,
        discountAmount: 0,
        totalAmount,
        paymentMethod: method,
        amountPaid: payload.payment.amountPaid,
        changeAmount: change,
        cashierName,
        createdAt: order.createdAt,
      }

      clear()
      onSuccess(receipt)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-xl"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-semibold" style={{ color: 'var(--color-heading)' }}>
            Payment
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-neutral-100 disabled:opacity-40"
            style={{ color: 'var(--color-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* ── Order summary ── */}
          <div
            className="rounded-xl p-4 space-y-1"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-muted)' }}>Items</span>
              <span style={{ color: 'var(--color-text)' }}>{items.length}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span style={{ color: 'var(--color-heading)' }}>Total</span>
              <span className="text-lg tabular-nums" style={{ color: 'var(--color-heading)' }}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* ── Method tabs ── */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>
              PAYMENT METHOD
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'CARD', 'QRIS'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMethod(m); setAmountPaid(''); setError(null) }}
                  className="py-2.5 rounded-xl text-sm font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2"
                  style={
                    method === m
                      ? {
                          backgroundColor: 'var(--color-primary)',
                          borderColor: 'var(--color-primary)',
                          color: '#fff',
                        }
                      : {
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }
                  }
                >
                  {m === 'CASH' ? 'Cash' : m === 'CARD' ? 'Card' : 'QRIS'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Cash: amount input + quick fill ── */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                  AMOUNT RECEIVED (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="0"
                  value={amountPaid}
                  onChange={(e) => { setAmountPaid(e.target.value); setError(null) }}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors tabular-nums
                    border-neutral-300 bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-primary),transparent_80%)]"
                />
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountPaid(String(amt))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-neutral-50"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>

              {/* Change */}
              {amountPaidNum > 0 && !cashInsufficient && (
                <div
                  className="flex justify-between rounded-xl px-4 py-3"
                  style={{ backgroundColor: 'oklch(97% 0.04 145)', color: 'var(--color-success)' }}
                >
                  <span className="text-sm font-medium">Change</span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Card / QRIS: reference number ── */}
          {(method === 'CARD' || method === 'QRIS') && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-muted)' }}>
                REFERENCE NO. (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. TRX123456"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors
                  border-neutral-300 bg-white focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{ backgroundColor: 'oklch(97% 0.04 25)', color: 'var(--color-danger)' }}
            >
              {error}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 pb-5"
        >
          <button
            onClick={handleSubmit}
            disabled={loading || cashInsufficient}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all
              active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading
              ? 'Processing…'
              : method === 'CASH'
              ? cashInsufficient
                ? 'Enter amount received'
                : `Confirm Payment`
              : `Confirm ${method} Payment`}
          </button>
        </div>
      </div>
    </div>
  )
}
