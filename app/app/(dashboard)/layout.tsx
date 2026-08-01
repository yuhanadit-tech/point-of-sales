import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/Sidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'POS MVP',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="layout-dashboard">
      <Sidebar
        userRole={session.user.role as 'ADMIN' | 'CASHIER'}
        userName={session.user.name ?? session.user.email ?? 'User'}
      />
      <main className="min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
