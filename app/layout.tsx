import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Study helpers | Joaquin',
  description: 'Created by Joaquin',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <main className="w-[90%] md:w-[800px] m-auto">
          <header className="fixed top-4 backdrop-blur p-4 w-full rounded">
            <Link href={'/'} className="font-bold text-base">
              Study helpers
            </Link>
          </header>
          {children}
        </main>
      </body>
    </html>
  )
}
