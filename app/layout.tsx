import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '✦ WRITER',
  description: '나만의 글쓰기 공간',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
