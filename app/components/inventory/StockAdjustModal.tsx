'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockAdjustmentSchema } from '@/lib/validations/inventory.schema'
import type { StockAdjustmentInput } from '@/lib/validations/inventory.schema'

interface Product {
  id: string
  name: string
  stock: number
  sku: string | null
}

interface StockAdjustModalProps {
  product: Product
  onClose: () => void
  onSaved: (productId: string, newStock: number) => void
}

export function StockAdjustModal({ product, onClose, onSaved }: StockAdjustModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockAdjustmentInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(stockAdjustmentSchema) as any,
    defaultValues: {
      productId: product.id,
      delta: 1,
      reason: '',
    },
  })

  const delta = Number(watch('delta') ?? 0)
  const preview = product.stock + delta

  async function onSubmit(data: StockAdjustmentInput) {
    setServerError(null)
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      setServerError(typeof err.error === 'string' ? err.error : 'Adjustment failed')
      return
    }

    const { newStock } = await res.json()
    onSaved(product.id, newStock)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--color-heading)' }}>
              Adjust Stock
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {product.name}
            </p>
          </div>
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

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-5 space-y-4">
          {/* Hidden productId */}
          <input type="hidden" {...register('productId')} />

          {/* Current / preview stock */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Current</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-heading)' }}>
                {product.stock}
              </p>
            </div>
            <svg className="w-5 h-5" style={{ color: 'var(--color-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>After</p>
              <p
                className="text-xl font-bold tabular-nums"
                style={{ color: preview < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}
              >
                {preview}
              </p>
            </div>
          </div>

          {/* Delta input */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>
              ADJUSTMENT (positive to add, negative to remove)
            </label>
            <input
              type="number"
              {...register('delta', { valueAsNumber: true })}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors
                border-neutral-300 bg-white focus:border-[var(--color-primary)]"
            />
            {errors.delta && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.delta.message}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>
              REASON
            </label>
            <textarea
              {...register('reason')}
              rows={2}
              placeholder="e.g. Damaged goods, manual count correction…"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors resize-none
                border-neutral-300 bg-white focus:border-[var(--color-primary)]"
            />
            {errors.reason && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                {errors.reason.message}
              </p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{ backgroundColor: 'oklch(97% 0.04 25)', color: 'var(--color-danger)' }}
            >
              {serverError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || preview < 0}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
              active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {isSubmitting ? 'Saving…' : 'Save Adjustment'}
          </button>
        </form>
      </div>
    </div>
  )
}
