import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChessBoard',
  description: 'Created with Next.js 14 and Pavan',
  generator: 'pavan',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
