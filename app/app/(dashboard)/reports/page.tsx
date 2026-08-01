import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReportsClient } from '@/components/reports/ReportsClient'

export const metadata: Metadata = { title: 'Reports — POS MVP' }

export default async function ReportsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-heading)' }}>
          Reports
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Sales analytics and performance
        </p>
      </div>
      <ReportsClient />
    </div>
  )
}
