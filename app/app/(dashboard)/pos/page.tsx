import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PosClient } from '@/components/pos/PosClient'

export const metadata: Metadata = { title: 'POS — Cashier' }

export default async function PosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const cashierName = session.user.name ?? session.user.email ?? 'Cashier'

  return (
    // Fill the remaining viewport height (dashboard layout already sets min-h-screen via sidebar)
    <div className="flex flex-col" style={{ height: '100%', minHeight: '100vh' }}>
      {/* ── Page header ── */}
      <div
        className="flex-shrink-0 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h1 className="text-lg font-bold" style={{ color: 'var(--color-heading)' }}>
          Cashier
        </h1>
      </div>

      {/* ── POS layout (flex-1 so it fills remaining height) ── */}
      <div className="flex-1 overflow-hidden">
        <PosClient cashierName={cashierName} />
      </div>
    </div>
  )
}
