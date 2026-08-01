import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { InventoryClient } from '@/components/inventory/InventoryClient'

export const metadata: Metadata = { title: 'Inventory — POS MVP' }

export default async function InventoryPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-heading)' }}>
          Inventory
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Stock levels and adjustments
        </p>
      </div>
      <InventoryClient userRole={session.user.role as 'ADMIN' | 'CASHIER'} />
    </div>
  )
}
