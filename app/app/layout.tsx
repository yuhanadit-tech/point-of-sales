import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'POS MVP',
  description: 'Point of Sales — MVP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
