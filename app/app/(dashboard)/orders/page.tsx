import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OrdersClient } from '@/components/orders/OrdersClient'

export const metadata: Metadata = { title: 'Orders — POS MVP' }

export default async function OrdersPage() {
  const session = await auth()
  if (!session) redirect('/login')

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
      <OrdersClient userRole={session.user.role as 'ADMIN' | 'CASHIER'} />
    </div>
  )
}
