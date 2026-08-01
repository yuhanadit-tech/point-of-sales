import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Orders — POS MVP' }

export default function OrdersPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-heading)' }}>
          Orders
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Transaction history
        </p>
      </div>
      <div
        className="rounded-xl border-2 border-dashed flex items-center justify-center h-80"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p style={{ color: 'var(--color-muted)' }} className="text-sm">
          Orders — coming in T-08
        </p>
      </div>
    </div>
  )
}
