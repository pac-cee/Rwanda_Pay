import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rwanda Pay Admin',
  description: 'Admin dashboard for Rwanda Pay',
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
