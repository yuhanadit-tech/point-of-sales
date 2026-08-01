import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'POS — Cashier' }

export default async function PosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-heading)' }}>
          Cashier
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Select products to add to the cart
        </p>
      </div>

      {/* Placeholder — built in T-06 */}
      <div
        className="rounded-xl border-2 border-dashed flex items-center justify-center h-80"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p style={{ color: 'var(--color-muted)' }} className="text-sm">
          POS screen — coming in T-06
        </p>
      </div>
    </div>
  )
}
