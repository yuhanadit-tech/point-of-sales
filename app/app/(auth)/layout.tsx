import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login — POS MVP',
  description: 'Sign in to your POS account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      {children}
    </div>
  )
}
