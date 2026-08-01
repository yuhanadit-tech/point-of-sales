import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory — POS MVP' }

export default function InventoryPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-heading)' }}>
          Inventory
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Stock management and adjustments
        </p>
      </div>
      <div
        className="rounded-xl border-2 border-dashed flex items-center justify-center h-80"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p style={{ color: 'var(--color-muted)' }} className="text-sm">
          Inventory — coming in T-09
        </p>
      </div>
    </div>
  )
}
